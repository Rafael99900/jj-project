-- Rode este arquivo uma única vez no SQL Editor do Supabase de produção.
-- Adiciona a situação Reserva e atualiza o nome da equipe padrão para Cinza.

alter type status_pessoa add value if not exists 'reserva' before 'desligado';

update equipes
set nome = 'Cinza'
where chave = 'sem';
