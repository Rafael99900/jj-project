-- ============================================================
--  Comitê João Jorge — Banco de dados (PostgreSQL / Supabase)
--  Rode este arquivo INTEIRO no SQL Editor do Supabase.
--  Depois rode o seed.sql para criar a campanha e as cores.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- tipos ----------
do $$ begin
  create type perfil_pessoa as enum ('Fixos','Panfletagem','Coordenador','Gestor','Envelopes','Colaborador','Padrão');
exception when duplicate_object then null; end $$;

do $$ begin
  create type status_pessoa as enum ('ativo','desligado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type forma_pagamento as enum ('cedulas','pix','outros');
exception when duplicate_object then null; end $$;

-- ---------- campanha e membros ----------
-- "2 pessoas usando a mesma conta" = 1 usuário no Auth, vinculado à campanha aqui.
create table if not exists campanhas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  criado_em timestamptz not null default now()
);

create table if not exists campanha_membros (
  campanha_id uuid not null references campanhas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (campanha_id, user_id)
);

-- ---------- equipes (as cores) ----------
create table if not exists equipes (
  id uuid primary key default gen_random_uuid(),
  campanha_id uuid not null references campanhas(id) on delete cascade,
  chave text not null,                 -- 'sem','azul','verde'...
  nome text not null,                  -- 'Sem cor','Azul'...
  cor text not null,                   -- hex
  is_padrao boolean not null default false,
  ordem int not null default 0,
  unique (campanha_id, chave)
);

-- ---------- pessoas (o quadro) ----------
-- Ninguém é apagado: quem sai vira status = 'desligado' e mantém histórico.
create table if not exists pessoas (
  id uuid primary key default gen_random_uuid(),
  campanha_id uuid not null references campanhas(id) on delete cascade,
  nome text not null,
  documento text,                      -- CPF ou RG
  endereco text,
  perfil perfil_pessoa not null default 'Padrão',
  equipe_id uuid references equipes(id) on delete set null,
  exige_assinatura boolean not null default true,
  assinou boolean not null default false,
  salario numeric(12,2) not null default 0,
  status status_pessoa not null default 'ativo',
  data_entrada date,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists idx_pessoas_campanha on pessoas(campanha_id);
create index if not exists idx_pessoas_status on pessoas(campanha_id, status);

-- ---------- caixa (verba que entrou) ----------
create table if not exists caixa_entradas (
  id uuid primary key default gen_random_uuid(),
  campanha_id uuid not null references campanhas(id) on delete cascade,
  origem text not null default 'Entrada',
  valor numeric(12,2) not null default 0,
  data date not null default current_date,
  criado_em timestamptz not null default now()
);
create index if not exists idx_caixa_campanha on caixa_entradas(campanha_id);

-- ---------- valores variáveis (o que você deu pra alguém) ----------
create table if not exists valores (
  id uuid primary key default gen_random_uuid(),
  campanha_id uuid not null references campanhas(id) on delete cascade,
  pessoa_id uuid not null references pessoas(id) on delete cascade,
  tipo text not null,                  -- Combustível / Vale da equipe / Alimentação / Outro
  valor numeric(12,2) not null default 0,
  forma forma_pagamento not null default 'cedulas',
  data date not null default current_date,
  criado_em timestamptz not null default now()
);
create index if not exists idx_valores_campanha on valores(campanha_id);
create index if not exists idx_valores_pessoa on valores(pessoa_id);

-- ---------- presenças (uma lista por dia) ----------
create table if not exists presencas (
  id uuid primary key default gen_random_uuid(),
  campanha_id uuid not null references campanhas(id) on delete cascade,
  data date not null,
  criado_em timestamptz not null default now(),
  unique (campanha_id, data)           -- REGRA: proíbe 2 listas no mesmo dia
);

create table if not exists presenca_marcas (
  presenca_id uuid not null references presencas(id) on delete cascade,
  pessoa_id uuid not null references pessoas(id) on delete cascade,
  presente boolean not null default false,
  primary key (presenca_id, pessoa_id)
);

-- ---------- pagamentos (listas de salário) ----------
create table if not exists pagamentos (
  id uuid primary key default gen_random_uuid(),
  campanha_id uuid not null references campanhas(id) on delete cascade,
  periodo_ini date not null,
  periodo_fim date not null,
  total_pago numeric(12,2) not null default 0,
  registrado_em timestamptz not null default now()
);
create index if not exists idx_pagamentos_campanha on pagamentos(campanha_id);

create table if not exists pagamento_itens (
  id uuid primary key default gen_random_uuid(),
  pagamento_id uuid not null references pagamentos(id) on delete cascade,
  pessoa_id uuid references pessoas(id) on delete set null,
  nome text not null,                  -- congela o nome no momento do pagamento
  valor numeric(12,2) not null default 0,
  pago boolean not null default false
);
create index if not exists idx_pgitens_pagamento on pagamento_itens(pagamento_id);

-- ---------- atualizado_em automático ----------
create or replace function set_atualizado_em() returns trigger as $$
begin new.atualizado_em = now(); return new; end; $$ language plpgsql;

drop trigger if exists trg_pessoas_upd on pessoas;
create trigger trg_pessoas_upd before update on pessoas
  for each row execute function set_atualizado_em();

-- ============================================================
--  RLS — só quem é membro da campanha enxerga e mexe nos dados
-- ============================================================
alter table campanhas         enable row level security;
alter table campanha_membros  enable row level security;
alter table equipes           enable row level security;
alter table pessoas           enable row level security;
alter table caixa_entradas    enable row level security;
alter table valores           enable row level security;
alter table presencas         enable row level security;
alter table presenca_marcas   enable row level security;
alter table pagamentos        enable row level security;
alter table pagamento_itens   enable row level security;

-- campanhas do usuário logado
create or replace function minhas_campanhas() returns setof uuid as $$
  select campanha_id from campanha_membros where user_id = auth.uid();
$$ stable language sql security definer;

drop policy if exists "campanha select" on campanhas;
create policy "campanha select" on campanhas for select using (id in (select minhas_campanhas()));

drop policy if exists "membros select" on campanha_membros;
create policy "membros select" on campanha_membros for select using (user_id = auth.uid());

-- tabelas com campanha_id: leitura e escrita para membros
do $$
declare t text;
begin
  foreach t in array array['equipes','pessoas','caixa_entradas','valores','presencas','pagamentos']
  loop
    execute format('drop policy if exists "rw" on %I;', t);
    execute format(
      'create policy "rw" on %I for all using (campanha_id in (select minhas_campanhas())) with check (campanha_id in (select minhas_campanhas()));',
      t);
  end loop;
end $$;

-- tabelas-filhas (sem campanha_id direto): via join
drop policy if exists "rw" on presenca_marcas;
create policy "rw" on presenca_marcas for all
  using (presenca_id in (select id from presencas where campanha_id in (select minhas_campanhas())))
  with check (presenca_id in (select id from presencas where campanha_id in (select minhas_campanhas())));

drop policy if exists "rw" on pagamento_itens;
create policy "rw" on pagamento_itens for all
  using (pagamento_id in (select id from pagamentos where campanha_id in (select minhas_campanhas())))
  with check (pagamento_id in (select id from pagamentos where campanha_id in (select minhas_campanhas())));

-- fim
