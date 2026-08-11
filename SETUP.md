# Comitê João Jorge — Backend e Banco de Dados

Guia direto pra ligar o app (React) num banco de verdade que funciona 24h.
Stack: **Supabase** (banco Postgres + login + segurança) e **Vercel** (hospedagem).

---

## 1. Criar o banco no Supabase

1. Acesse supabase.com, crie uma conta e um **New project**. Guarde a senha do banco.
2. No menu lateral, abra **SQL Editor**.
3. Cole o conteúdo de `schema.sql` inteiro e clique em **Run**. Isso cria todas as tabelas e a segurança (RLS).
4. Abra `seed.sql` e siga os 3 passos que estão comentados dentro dele:
   - Passo 1: cria a campanha e devolve um `id`. Copie esse id.
   - Passo 2: troque `CAMPANHA_ID` pelo id e rode (cria as 11 cores).
   - Passo 3: você faz depois do item 2 abaixo.

## 2. Criar a conta compartilhada (as ~2 pessoas usam o mesmo login)

1. No Supabase, vá em **Authentication > Users > Add user**.
2. Crie com e-mail e senha (ex.: `gestor@campanha.com`). Marque como confirmado.
3. Copie o **User UID** que aparece.
4. Volte no SQL Editor e rode o **Passo 3** do `seed.sql`, trocando `CAMPANHA_ID` e `USER_ID`.

Pronto: as duas pessoas entram com esse mesmo e-mail e senha. Como é o mesmo usuário, os dois veem e editam os mesmos dados, em tempo real.

## 3. Pegar as chaves e configurar o projeto

1. No Supabase, vá em **Project Settings > API**. Copie a **Project URL** e a **anon public key**.
2. Na raiz do seu projeto React, crie um arquivo `.env`:

```
VITE_SUPABASE_URL=coloque_a_url_aqui
VITE_SUPABASE_ANON_KEY=coloque_a_anon_key_aqui
```

3. Instale a biblioteca:

```
npm install @supabase/supabase-js
```

4. Copie `supabase.js` e `api.js` para dentro de `src/lib/` no seu projeto.

## 4. Ligar o front no banco (troca o "dado de mentira" pelo real)

Hoje seu `App` começa com listas de exemplo (`PESSOAS_INI`, etc.). A ideia é:
carregar do banco quando abre, e chamar a API a cada ação.

No topo do `App`, importe e carregue:

```jsx
import * as api from "./lib/api";

const [pessoas, setPessoas] = useState([]);
const [valores, setValores] = useState([]);
const [caixa, setCaixa] = useState([]);
const [presencas, setPresencas] = useState([]);
const [pagamentos, setPagamentos] = useState([]);

useEffect(() => {
  if (!logged) return;
  api.carregarTudo()
    .then((d) => { setPessoas(d.pessoas); setValores(d.valores); setCaixa(d.caixa); setPresencas(d.presencas); setPagamentos(d.pagamentos); })
    .catch((e) => setGlobalError(e.message));
}, [logged]);
```

Depois, cada ação passa a chamar a API (exemplos, um por tela):

- Login: `await api.entrar(email, senha)` e então `setLogged(true)`.
- Sair: `await api.sair()` e `setLogged(false)`.
- Novo funcionário: `const novo = await api.criarPessoa(p); setPessoas(x => [...x, novo]);`
- Salvar/editar pessoa: `const atu = await api.atualizarPessoa(id, patch); setPessoas(x => x.map(p => p.id===id?atu:p));`
- Desativar/reativar: `await api.definirStatus(id, "desligado" | "ativo")`.
- Caixa: `api.adicionarCaixa`, `api.removerCaixa`.
- Valor: `api.adicionarValor`, `api.removerValor`.
- Presença: `api.lancarPresenca(data, marks)` (o banco já barra 2 listas no mesmo dia e volta a mensagem certa), `api.removerPresenca`.
- Pagamento: `api.registrarPagamento(run)`, `api.removerPagamento`.

Regra de ouro: envolva as chamadas em `try/catch` e no catch faça `setGlobalError(e.message)`. Assim seu modal de erro global que você já criou mostra tudo em português.

> Dica: o `api.js` já devolve os dados nos mesmos campos que suas telas usam (`personId`, `team`, `exigeAssin`, `ini/fim/itens`, etc.), então na maioria dos lugares é só trocar o `setState` local pela chamada da API.

## 5. Subir 24h num domínio (Vercel)

1. Suba seu projeto pro GitHub (o Claude Code faz o git pra você).
2. Em vercel.com, **Add New > Project** e importe o repositório.
3. Em **Environment Variables**, coloque as mesmas `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
4. Deploy. A Vercel serve o site 24h, de graça no plano inicial, e o Supabase mantém o banco no ar junto.
5. Depois, em **Settings > Domains**, você pode apontar um domínio próprio (ex.: `comite.jj.com.br`).

## Sobre downloads das tabelas

Sua escolha atual (baixar CSV direto no aparelho) é a certa pra agora: funciona offline, abre no Excel e no Google Sheets, e não depende de servidor de e-mail. O caminho de "mandar link no e-mail" só compensa quando o arquivo fica grande ou quando você quer histórico de envios, e isso vira uma função de backend pra depois (o Supabase tem Storage + Edge Functions pra isso quando chegar a hora). Recomendação: mantenha o download direto e deixe o e-mail como melhoria futura.

## Segurança (resumo)

O RLS liga uma trava: só quem é membro da campanha (a conta compartilhada) enxerga e altera os dados. A `anon key` pode ir pro front sem medo, porque sozinha ela não abre nada, quem manda é o login e as políticas do banco.
