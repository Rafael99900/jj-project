-- ============================================================
--  SEED — rode DEPOIS do schema.sql
--  Faça em 3 passos (o SQL Editor mostra o resultado de cada um).
-- ============================================================

-- PASSO 1 — cria a campanha e mostra o id
insert into campanhas (nome) values ('Comitê João Jorge 2026')
returning id;
--  >>> COPIE o id que apareceu e troque CAMPANHA_ID abaixo.


-- PASSO 2 — cria as cores (Cinza é o padrão)
insert into equipes (campanha_id, chave, nome, cor, is_padrao, ordem) values
  ('CAMPANHA_ID','sem','Cinza','#94A3B8', true, 0),
  ('CAMPANHA_ID','azul','Azul','#2563EB', false, 1),
  ('CAMPANHA_ID','verde','Verde','#16A34A', false, 2),
  ('CAMPANHA_ID','amarela','Amarela','#CA8A04', false, 3),
  ('CAMPANHA_ID','laranja','Laranja','#EA580C', false, 4),
  ('CAMPANHA_ID','lilas','Lilás','#7C3AED', false, 5),
  ('CAMPANHA_ID','vermelha','Vermelha','#DC2626', false, 6),
  ('CAMPANHA_ID','rosa','Rosa','#DB2777', false, 7),
  ('CAMPANHA_ID','ciano','Ciano','#0891B2', false, 8),
  ('CAMPANHA_ID','marrom','Marrom','#92400E', false, 9),
  ('CAMPANHA_ID','preta','Preta','#334155', false, 10);


-- PASSO 3 — vincula a conta compartilhada à campanha
--  Antes: em Authentication > Users, crie o usuário (ex.: gestor@campanha.com).
--  Pegue o "User UID" dele e troque USER_ID abaixo.
insert into campanha_membros (campanha_id, user_id)
values ('CAMPANHA_ID','USER_ID');
