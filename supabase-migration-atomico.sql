-- Rode este arquivo uma única vez no SQL Editor do projeto Supabase.
-- Presença e pagamento passam a ser salvos por inteiro ou não são salvos.

create or replace function lancar_presenca_completa(
  p_campanha_id uuid, p_data date, p_marcas jsonb
) returns uuid
language plpgsql
security invoker
as $$
declare v_presenca_id uuid;
begin
  insert into presencas (campanha_id, data)
  values (p_campanha_id, p_data)
  returning id into v_presenca_id;

  insert into presenca_marcas (presenca_id, pessoa_id, presente)
  select v_presenca_id, (m->>'pessoa_id')::uuid, coalesce((m->>'presente')::boolean, false)
  from jsonb_array_elements(p_marcas) as m;

  return v_presenca_id;
end;
$$;

create or replace function registrar_pagamento_completo(
  p_campanha_id uuid, p_periodo_ini date, p_periodo_fim date,
  p_total_pago numeric, p_itens jsonb
) returns uuid
language plpgsql
security invoker
as $$
declare v_pagamento_id uuid;
begin
  if p_periodo_fim < p_periodo_ini then
    raise exception 'A data final não pode ser anterior à data inicial.';
  end if;

  insert into pagamentos (campanha_id, periodo_ini, periodo_fim, total_pago)
  values (p_campanha_id, p_periodo_ini, p_periodo_fim, p_total_pago)
  returning id into v_pagamento_id;

  insert into pagamento_itens (pagamento_id, pessoa_id, nome, valor, pago)
  select v_pagamento_id, nullif(m->>'pessoa_id', '')::uuid, m->>'nome',
         coalesce((m->>'valor')::numeric, 0), coalesce((m->>'pago')::boolean, false)
  from jsonb_array_elements(p_itens) as m;

  return v_pagamento_id;
end;
$$;

-- Atualização em tempo real para as duas pessoas que usam o mesmo login.
alter publication supabase_realtime add table pessoas, valores, caixa_entradas, presencas, pagamentos;
