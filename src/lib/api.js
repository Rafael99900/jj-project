// src/lib/api.js
// Camada de acesso a dados. Cada função devolve os dados JÁ no formato
// que as suas telas usam (mesmos nomes de campo do protótipo).
// Todos os erros voltam com mensagem em português.
import { supabase, supabaseConfigured } from "./supabase";

function falhar(e, msg) {
  console.error(e);
  throw new Error(msg || "Algo deu errado. Tente novamente.");
}

/* ============ AUTENTICAÇÃO ============ */
export async function entrar(email, senha) {
  if (!supabaseConfigured) {
    throw new Error("Banco não configurado: crie o arquivo .env com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
  }
  let resp;
  try {
    resp = await supabase.auth.signInWithPassword({ email, password: senha });
  } catch (e) {
    console.error("Falha de rede ao contatar o Supabase:", e);
    throw new Error("Não foi possível conectar ao servidor. Verifique sua internet e tente de novo. (" + (e?.message || "erro de rede") + ")");
  }
  const { data, error } = resp;
  if (error) {
    console.error("Erro do Supabase ao entrar:", error);
    if (error.message === "Invalid login credentials") throw new Error("E-mail ou senha inválidos.");
    throw new Error("Erro ao entrar: " + error.message);
  }
  return data;
}
export async function sair() {
  const { error } = await supabase.auth.signOut();
  if (error) falhar(error, "Não foi possível sair agora.");
}
export async function sessao() {
  const { data } = await supabase.auth.getSession();
  return data.session; // null se não logado
}

/* ============ CAMPANHA + EQUIPES (cache) ============ */
let _campanhaId = null;
let _equipesPorChave = null; // chave -> id
let _equipes = null;

export async function campanhaAtual() {
  if (_campanhaId) return _campanhaId;
  const { data, error } = await supabase.from("campanha_membros").select("campanha_id").limit(1).maybeSingle();
  if (error || !data) falhar(error, "Não foi possível carregar sua campanha.");
  _campanhaId = data.campanha_id;
  return _campanhaId;
}

export async function listarEquipes() {
  if (_equipes) return _equipes;
  const cid = await campanhaAtual();
  const { data, error } = await supabase.from("equipes").select("*").eq("campanha_id", cid).order("ordem");
  if (error) falhar(error, "Não foi possível carregar as equipes (cores).");
  _equipes = data;
  _equipesPorChave = Object.fromEntries(data.map((e) => [e.chave, e.id]));
  return data;
}
async function equipeIdPorChave(chave) {
  if (!_equipesPorChave) await listarEquipes();
  return _equipesPorChave[chave] || _equipesPorChave["sem"] || null;
}

/* ============ PESSOAS ============ */
const mapPessoa = (r) => ({
  id: r.id,
  nome: r.nome,
  doc: r.documento || "",
  endereco: r.endereco || "",
  perfil: r.perfil,
  funcao: r.perfil,               // seu protótipo usa funcao só pra exibir
  team: r.equipe?.chave || "sem",
  status: r.status,               // 'ativo' | 'desligado'
  exigeAssin: r.exige_assinatura,
  assinou: r.assinou,
  salario: Number(r.salario),
  entrada: r.data_entrada || "",
});

export async function listarPessoas() {
  const cid = await campanhaAtual();
  const { data, error } = await supabase
    .from("pessoas")
    .select("*, equipe:equipes(chave,nome,cor)")
    .eq("campanha_id", cid)
    .order("nome");
  if (error) falhar(error, "Não foi possível carregar os funcionários.");
  return data.map(mapPessoa);
}

export async function criarPessoa(p) {
  const cid = await campanhaAtual();
  const equipe_id = await equipeIdPorChave(p.team || "sem");
  const { data, error } = await supabase
    .from("pessoas")
    .insert({
      campanha_id: cid, nome: p.nome, documento: p.doc, endereco: p.endereco,
      perfil: p.perfil, equipe_id, exige_assinatura: p.exigeAssin,
      assinou: p.assinou ?? false, salario: p.salario || 0, data_entrada: p.entrada || null,
    })
    .select("*, equipe:equipes(chave,nome,cor)")
    .single();
  if (error) falhar(error, "Não foi possível cadastrar o funcionário.");
  return mapPessoa(data);
}

export async function atualizarPessoa(id, p) {
  const patch = {};
  if (p.nome !== undefined) patch.nome = p.nome;
  if (p.doc !== undefined) patch.documento = p.doc;
  if (p.endereco !== undefined) patch.endereco = p.endereco;
  if (p.perfil !== undefined) patch.perfil = p.perfil;
  if (p.team !== undefined) patch.equipe_id = await equipeIdPorChave(p.team);
  if (p.exigeAssin !== undefined) patch.exige_assinatura = p.exigeAssin;
  if (p.assinou !== undefined) patch.assinou = p.assinou;
  if (p.salario !== undefined) patch.salario = p.salario;
  if (p.entrada !== undefined) patch.data_entrada = p.entrada || null;
  if (p.status !== undefined) patch.status = p.status;
  const { data, error } = await supabase
    .from("pessoas").update(patch).eq("id", id)
    .select("*, equipe:equipes(chave,nome,cor)").single();
  if (error) falhar(error, "Não foi possível salvar as alterações.");
  return mapPessoa(data);
}

// desativar / reativar (nunca apaga)
export async function definirStatus(id, status) {
  const { error } = await supabase.from("pessoas").update({ status }).eq("id", id);
  if (error) falhar(error, "Não foi possível atualizar o status.");
}

/* ============ CAIXA ============ */
export async function listarCaixa() {
  const cid = await campanhaAtual();
  const { data, error } = await supabase.from("caixa_entradas").select("*").eq("campanha_id", cid).order("criado_em", { ascending: false });
  if (error) falhar(error, "Não foi possível carregar o caixa.");
  return data.map((c) => ({ id: c.id, origem: c.origem, valor: Number(c.valor), data: c.data }));
}
export async function adicionarCaixa({ origem, valor }) {
  const cid = await campanhaAtual();
  const { data, error } = await supabase.from("caixa_entradas").insert({ campanha_id: cid, origem: origem || "Entrada", valor: valor || 0 }).select().single();
  if (error) falhar(error, "Não foi possível adicionar a entrada de caixa.");
  return { id: data.id, origem: data.origem, valor: Number(data.valor), data: data.data };
}
export async function removerCaixa(id) {
  const { error } = await supabase.from("caixa_entradas").delete().eq("id", id);
  if (error) falhar(error, "Não foi possível remover a entrada.");
}

/* ============ VALORES (variáveis) ============ */
export async function listarValores() {
  const cid = await campanhaAtual();
  const { data, error } = await supabase.from("valores").select("*").eq("campanha_id", cid).order("criado_em", { ascending: false });
  if (error) falhar(error, "Não foi possível carregar os valores.");
  return data.map((v) => ({ id: v.id, personId: v.pessoa_id, tipo: v.tipo, valor: Number(v.valor), forma: v.forma }));
}
export async function adicionarValor({ personId, tipo, valor, forma }) {
  const cid = await campanhaAtual();
  const { data, error } = await supabase.from("valores").insert({ campanha_id: cid, pessoa_id: personId, tipo, valor: valor || 0, forma }).select().single();
  if (error) falhar(error, "Não foi possível salvar o valor.");
  return { id: data.id, personId: data.pessoa_id, tipo: data.tipo, valor: Number(data.valor), forma: data.forma };
}
export async function removerValor(id) {
  const { error } = await supabase.from("valores").delete().eq("id", id);
  if (error) falhar(error, "Não foi possível excluir o valor.");
}

/* ============ PRESENÇAS ============ */
export async function listarPresencas() {
  const cid = await campanhaAtual();
  const { data, error } = await supabase
    .from("presencas")
    .select("id, data, marcas:presenca_marcas(pessoa_id, presente)")
    .eq("campanha_id", cid)
    .order("data", { ascending: false });
  if (error) falhar(error, "Não foi possível carregar as presenças.");
  return data.map((pr) => ({
    id: pr.id, data: pr.data,
    marks: Object.fromEntries((pr.marcas || []).map((m) => [m.pessoa_id, m.presente])),
  }));
}
// marks = { pessoaId: boolean }
export async function lancarPresenca(dataDia, marks) {
  const cid = await campanhaAtual();
  const { data: pres, error } = await supabase.from("presencas").insert({ campanha_id: cid, data: dataDia }).select().single();
  if (error) {
    if (error.code === "23505") throw new Error("Já existe uma lista de presença nesse dia.");
    falhar(error, "Não foi possível lançar a presença.");
  }
  const rows = Object.entries(marks).map(([pessoa_id, presente]) => ({ presenca_id: pres.id, pessoa_id, presente: !!presente }));
  if (rows.length) {
    const { error: e2 } = await supabase.from("presenca_marcas").insert(rows);
    if (e2) falhar(e2, "A lista foi criada, mas houve erro ao salvar as marcações.");
  }
  return { id: pres.id, data: pres.data, marks };
}
export async function removerPresenca(id) {
  const { error } = await supabase.from("presencas").delete().eq("id", id);
  if (error) falhar(error, "Não foi possível excluir a lista de presença.");
}

/* ============ PAGAMENTOS (salário) ============ */
export async function listarPagamentos() {
  const cid = await campanhaAtual();
  const { data, error } = await supabase
    .from("pagamentos")
    .select("id, periodo_ini, periodo_fim, total_pago, itens:pagamento_itens(pessoa_id, nome, valor, pago, pessoa:pessoas(equipe:equipes(chave)))")
    .eq("campanha_id", cid)
    .order("registrado_em", { ascending: false });
  if (error) falhar(error, "Não foi possível carregar os pagamentos.");
  return data.map((r) => ({
    id: r.id, ini: r.periodo_ini, fim: r.periodo_fim, totalPago: Number(r.total_pago),
    itens: (r.itens || []).map((i) => ({
      personId: i.pessoa_id, nome: i.nome, valor: Number(i.valor), pago: i.pago,
      team: i.pessoa?.equipe?.chave || "sem",
    })),
  }));
}
// run = { ini, fim, totalPago, itens: [{ personId, nome, valor, pago }] }
export async function registrarPagamento(run) {
  const cid = await campanhaAtual();
  const { data: pg, error } = await supabase
    .from("pagamentos")
    .insert({ campanha_id: cid, periodo_ini: run.ini, periodo_fim: run.fim, total_pago: run.totalPago || 0 })
    .select().single();
  if (error) falhar(error, "Não foi possível registrar o pagamento.");
  const itens = run.itens.map((i) => ({ pagamento_id: pg.id, pessoa_id: i.personId, nome: i.nome, valor: i.valor || 0, pago: !!i.pago }));
  const { error: e2 } = await supabase.from("pagamento_itens").insert(itens);
  if (e2) falhar(e2, "O pagamento foi criado, mas houve erro ao salvar os itens.");
  return { id: pg.id, ini: run.ini, fim: run.fim, totalPago: run.totalPago, itens: run.itens };
}
export async function removerPagamento(id) {
  const { error } = await supabase.from("pagamentos").delete().eq("id", id);
  if (error) falhar(error, "Não foi possível excluir o pagamento.");
}

/* ============ CARGA INICIAL (tudo de uma vez) ============ */
export async function carregarTudo() {
  const [equipes, pessoas, caixa, valores, presencas, pagamentos] = await Promise.all([
    listarEquipes(), listarPessoas(), listarCaixa(), listarValores(), listarPresencas(), listarPagamentos(),
  ]);
  return { equipes, pessoas, caixa, valores, presencas, pagamentos };
}
