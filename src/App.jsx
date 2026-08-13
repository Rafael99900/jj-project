import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  LayoutDashboard, Users, CalendarCheck, Wallet, Coins, Plus, Search, Check, X,
  Fuel, Utensils, MoreHorizontal, AlertTriangle, Banknote, QrCode, LogIn,
  Eye, EyeOff, Settings2, UserMinus, UserCheck, ArrowLeftRight, PenLine,
  ChevronRight, ChevronDown, MoreVertical, Trash2, CalendarPlus, Table2, Download,
  MapPin, FileText, LogOut, WifiOff
} from "lucide-react";
import * as api from "./lib/api"; // <- camada de acesso ao Supabase

/* ===== paleta MDB ===== */
const G = "#009640", G_DARK = "#0B4D2C", G_SOFT = "#E6F4EA", G_CANVAS = "#F1F8F3", Y = "#FFC20E";
const AZUL = "#2563EB", VERDE = "#16A34A", FRIO = "#0D9488";

/* 10 cores + Cinza como padrão do comitê */
const TEAMS = {
  sem: { nome: "Cinza", cor: "#94A3B8" },
  azul: { nome: "Azul", cor: "#2563EB" }, verde: { nome: "Verde", cor: "#16A34A" },
  amarela: { nome: "Amarela", cor: "#CA8A04" }, laranja: { nome: "Laranja", cor: "#EA580C" },
  lilas: { nome: "Lilás", cor: "#7C3AED" }, vermelha: { nome: "Vermelha", cor: "#DC2626" },
  rosa: { nome: "Rosa", cor: "#DB2777" }, ciano: { nome: "Ciano", cor: "#0891B2" },
  marrom: { nome: "Marrom", cor: "#92400E" }, preta: { nome: "Preta", cor: "#334155" },
};
const PERFIS = ["Fixos", "Panfletagem", "Coordenador", "Gestor", "Envelopes", "Colaborador", "Padrão"];
const FORMA = { cedulas: { l: "Cédulas", c: AZUL }, pix: { l: "Pix", c: VERDE }, outros: { l: "Outros", c: FRIO } };

const brl = (n) => "R$ " + (Number(n) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const FONT = { fontFamily: "'Inter', system-ui, -apple-system, sans-serif" };
const FONTS = <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');`}</style>;
const fmtData = (iso) => { const [y, m, d] = (iso || "").split("-"); return d ? `${d}/${m}` : iso; };
const hojeISO = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
const maskTelefone = (v) => { const d = v.replace(/\D/g, "").slice(0, 11); return d.length <= 10 ? d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2") : d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2"); };

// input de dinheiro
function MoneyInput({ value, onChange, className, placeholder, cy }) {
  const display = value === "" || value == null ? "" : Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return <input data-cy={cy} value={display} inputMode="numeric" placeholder={placeholder} className={className}
    onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); onChange(d ? Number(d) / 100 : ""); }} />;
}

// Lógica de download robusta para Web e Celular
function baixarCSV(nome, cabecalho, linhas, onError) {
  try {
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [cabecalho.map(esc).join(";"), ...linhas.map((l) => l.map(esc).join(";"))].join("\n");
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isIOS || isMobile) {
      const uri = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csv);
      const a = document.createElement('a'); a.href = uri; a.download = nome + '.csv';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } else {
      const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = nome + ".csv";
      document.body.appendChild(a); a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 150);
    }
  } catch (e) {
    if (onError) onError("O navegador do seu celular bloqueou o download. Tente abrir no Google Chrome ou Safari.");
  }
}
const money2 = (n) => "BRL " + (Number(n) || 0).toFixed(2).replace(".", ",");

function maskDoc(v) {
  if (!v) return "";
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 9) return d.replace(/(\d{2})(\d)/, "$1.$2").replace(/(\d{2}\.\d{3})(\d)/, "$1.$2").replace(/(\d{2}\.\d{3}\.\d{3})(\d)/, "$1-$2");
  return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3}\.\d{3})(\d)/, "$1.$2").replace(/(\d{3}\.\d{3}\.\d{3})(\d)/, "$1-$2");
}

function LogoJJ({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <defs><linearGradient id="jj" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={G} /><stop offset="100%" stopColor={Y} /></linearGradient></defs>
      <circle cx="50" cy="50" r="48" fill="url(#jj)" /><circle cx="50" cy="50" r="40" fill="#0B4D2C" />
      <text x="50" y="66" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="800" fontSize="42" fill="#FFC20E">JJ</text>
    </svg>
  );
}

/* ===================== APP PRINCIPAL ===================== */
export default function App() {
  const [logged, setLogged] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [page, setPage] = useState("dashboard");
  const [pessoas, setPessoas] = useState([]);
  const [valores, setValores] = useState([]);
  const [caixa, setCaixa] = useState([]);
  const [presencas, setPresencas] = useState([]);
  const [pagamentos, setPagamentos] = useState([]);
  const [dadosCarregados, setDadosCarregados] = useState(false);
  const [painelOculto, setPainelOculto] = useState(() => sessionStorage.getItem("painel-valores-visiveis") !== "sim");
  const [edicaoCritica, setEdicaoCritica] = useState(false);
  const [paginaPendente, setPaginaPendente] = useState(null);

  const [valorOpen, setValorOpen] = useState(false);
  const [valorPerson, setValorPerson] = useState(null);
  const [detailFor, setDetailFor] = useState(null);
  const [novoOpen, setNovoOpen] = useState(false);
  const [caixaOpen, setCaixaOpen] = useState(false);
  const [saidasOpen, setSaidasOpen] = useState(false);

  const [globalError, setGlobalError] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const off = () => setIsOffline(true), on = () => setIsOffline(false);
    window.addEventListener('offline', off); window.addEventListener('online', on);
    return () => { window.removeEventListener('offline', off); window.removeEventListener('online', on); };
  }, []);

  useEffect(() => {
    const avisar = (e) => { if (edicaoCritica) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [edicaoCritica]);

  // já logado? tenta restaurar a sessão ao abrir
  useEffect(() => {
    api.sessao().then((s) => { if (s) setLogged(true); }).catch(() => {});
  }, []);

  // carrega tudo do banco quando entra
  useEffect(() => {
    if (!logged) return;
    let vivo = true;
    setCarregando(true);
    setDadosCarregados(false);
    api.carregarTudo()
      .then((d) => { if (!vivo) return; setPessoas(d.pessoas); setValores(d.valores); setCaixa(d.caixa); setPresencas(d.presencas); setPagamentos(d.pagamentos); setDadosCarregados(true); })
      .catch((e) => {
        console.warn("Carga inicial temporariamente indisponível:", e);
        setTimeout(() => {
          if (!vivo) return;
          api.carregarTudo().then((d) => { if (vivo) { setPessoas(d.pessoas); setValores(d.valores); setCaixa(d.caixa); setPresencas(d.presencas); setPagamentos(d.pagamentos); setDadosCarregados(true); } }).catch(() => {});
        }, 1200);
      })
      .finally(() => vivo && setCarregando(false));
    return () => { vivo = false; };
  }, [logged]);

  useEffect(() => {
    if (!logged || !dadosCarregados) return;
    let ativo = true;
    const atualizar = async () => {
      try {
        const d = await api.carregarTudo();
        if (ativo) { setPessoas(d.pessoas); setValores(d.valores); setCaixa(d.caixa); setPresencas(d.presencas); setPagamentos(d.pagamentos); }
      } catch (e) { console.warn("Atualização em segundo plano indisponível:", e); }
    };
    let cancelar;
    api.assinarMudancas(atualizar).then((fn) => { if (ativo) cancelar = fn; else fn?.(); });
    return () => { ativo = false; cancelar?.(); };
  }, [logged, dadosCarregados]);

  const ativos = pessoas.filter((p) => p.status === "ativo");

  // ---- handlers ligados na API ----
  const sair = async () => { if (edicaoCritica) { setPaginaPendente("__sair__"); return; } try { await api.sair(); } catch (e) { /* segue */ } sessionStorage.removeItem("painel-valores-visiveis"); setLogged(false); };
  const navegar = (destino) => { if (destino === page) return; if (edicaoCritica) { setPaginaPendente(destino); return; } setPage(destino); };
  const confirmarSaidaCritica = async () => { const destino = paginaPendente; setPaginaPendente(null); setEdicaoCritica(false); if (destino === "__sair__") { try { await api.sair(); } catch (e) { /* segue */ } sessionStorage.removeItem("painel-valores-visiveis"); setLogged(false); } else if (destino) setPage(destino); };

  const salvarValor = async (v) => {
    try { const novo = await api.adicionarValor(v); setValores((x) => [novo, ...x]); setValorOpen(false); }
    catch (e) { setGlobalError(e.message); }
  };
  const excluirValor = async (id) => {
    try { await api.removerValor(id); setValores((x) => x.filter((v) => v.id !== id)); }
    catch (e) { setGlobalError(e.message); }
  };
  const upd = async (id, patch) => {
    try { const atu = await api.atualizarPessoa(id, patch); setPessoas((xs) => xs.map((p) => (p.id === id ? atu : p))); }
    catch (e) { setGlobalError(e.message); }
  };
  const criarPessoa = async (p) => {
    try { const novo = await api.criarPessoa({ ...p, assinou: false }); setPessoas((xs) => [...xs, novo]); setNovoOpen(false); }
    catch (e) { setGlobalError(e.message); }
  };
  const addCaixa = async (entrada) => {
    try { const nova = await api.adicionarCaixa(entrada); setCaixa((x) => [nova, ...x]); }
    catch (e) { setGlobalError(e.message); }
  };
  const removeCaixa = async (id) => {
    try { await api.removerCaixa(id); setCaixa((x) => x.filter((c) => c.id !== id)); }
    catch (e) { setGlobalError(e.message); }
  };
  const lancarPresenca = async (data, marks) => {
    try { const nova = await api.lancarPresenca(data, marks); setPresencas((x) => [nova, ...x]); return true; }
    catch (e) { setGlobalError(e.message); return false; }
  };
  const removerPresenca = async (id) => {
    try { await api.removerPresenca(id); setPresencas((x) => x.filter((p) => p.id !== id)); }
    catch (e) { setGlobalError(e.message); }
  };
  const registrarPagamento = async (run) => {
    try { const novo = await api.registrarPagamento(run); setPagamentos((x) => [novo, ...x]); return true; }
    catch (e) { setGlobalError(e.message); return false; }
  };
  const removerPagamento = async (id) => {
    try { await api.removerPagamento(id); setPagamentos((x) => x.filter((p) => p.id !== id)); }
    catch (e) { setGlobalError(e.message); }
  };

  if (!logged) return <Login onLogin={async (email, senha) => { await api.entrar(email, senha); setLogged(true); }} />;

  const abrirValor = (pid) => { setValorPerson(pid); setValorOpen(true); setPage("valores"); };

  return (
    <div style={{ ...FONT, background: G_CANVAS }} className="min-h-screen text-slate-900 flex">
      {FONTS}
      <aside className="hidden md:flex w-60 shrink-0 flex-col p-4" style={{ background: G_DARK }}>
        <Brand light />
        <nav className="mt-6 space-y-1">
          <NavItem icon={LayoutDashboard} label="Painel" active={page === "dashboard"} onClick={() => navegar("dashboard")} />
          <NavItem icon={Coins} label="Valores" active={page === "valores"} onClick={() => navegar("valores")} />
          <NavItem icon={Wallet} label="Salário" active={page === "salario"} onClick={() => navegar("salario")} />
          <NavItem icon={Users} label="Equipe" active={page === "equipe"} onClick={() => navegar("equipe")} />
          <NavItem icon={CalendarCheck} label="Presença" active={page === "presenca"} onClick={() => navegar("presenca")} />
        </nav>
        <div className="mt-auto text-xs" style={{ color: "#8FBF9F" }}>João Jorge · 2026</div>
      </aside>

      <main className="flex-1 min-w-0 pb-20 md:pb-0 h-screen overflow-y-auto relative flex flex-col">
        <header className="md:hidden sticky top-0 z-10 px-4 py-3 flex items-center justify-between shadow-sm" style={{ background: G_DARK }}>
          <Brand light small />
          <button data-cy="sair-sistema" onClick={sair} className="flex items-center gap-1.5 text-white/90 hover:text-white text-sm font-medium transition-colors">Sair <LogOut size={16} /></button>
        </header>

        <div className="hidden md:flex justify-end p-4 shrink-0">
          <button data-cy="sair-sistema" onClick={sair} className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-red-600 transition-colors bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">Sair do sistema <LogOut size={16} /></button>
        </div>

        {isOffline && (
          <div className="bg-red-500 text-white text-xs sm:text-sm font-medium py-2 px-4 flex items-center justify-center gap-2 shadow-sm shrink-0">
            <WifiOff size={16} /> Sem conexão com a internet. Verifique sua rede.
          </div>
        )}

        <div className="w-full p-4 md:px-8 md:pt-4 md:pb-8 flex-1">
          {carregando && <div className="text-center text-sm text-slate-400 py-10">Carregando dados...</div>}
          {!carregando && page === "dashboard" && <Dashboard pessoas={pessoas} ativos={ativos} valores={valores} caixa={caixa} pagamentos={pagamentos} hide={painelOculto} onToggleHide={() => setPainelOculto((atual) => { const proximo = !atual; sessionStorage.setItem("painel-valores-visiveis", proximo ? "sim" : "nao"); return proximo; })} onEditCaixa={() => setCaixaOpen(true)} onEditSaidas={() => setSaidasOpen(true)} onEquipe={() => setPage("equipe")} />}
          {!carregando && page === "valores" && <Valores valores={valores} pessoas={pessoas} onNovo={() => { setValorPerson(null); setValorOpen(true); }} onDelete={excluirValor} onError={setGlobalError} />}
          {!carregando && page === "salario" && <Salario ativos={ativos} pagamentos={pagamentos} onRegistrar={registrarPagamento} onRemover={removerPagamento} pessoas={pessoas} onError={setGlobalError} onEdicaoChange={setEdicaoCritica} onDetail={setDetailFor} />}
          {!carregando && page === "equipe" && <Equipe pessoas={pessoas} onValor={abrirValor} onDetail={setDetailFor} onNovo={() => setNovoOpen(true)} />}
          {!carregando && page === "presenca" && <Presenca ativos={ativos} pessoas={pessoas} presencas={presencas} onLancar={lancarPresenca} onRemover={removerPresenca} onEdicaoChange={setEdicaoCritica} />}
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 grid grid-cols-5 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <Tab icon={LayoutDashboard} label="Painel" active={page === "dashboard"} onClick={() => navegar("dashboard")} />
        <Tab icon={Coins} label="Valores" active={page === "valores"} onClick={() => navegar("valores")} />
        <Tab icon={Wallet} label="Salário" active={page === "salario"} onClick={() => navegar("salario")} />
        <Tab icon={Users} label="Equipe" active={page === "equipe"} onClick={() => navegar("equipe")} />
        <Tab icon={CalendarCheck} label="Presença" active={page === "presenca"} onClick={() => navegar("presenca")} />
      </nav>

      {valorOpen && <ValorModal pessoas={ativos} pessoa={pessoas.find((p) => p.id === valorPerson)} onClose={() => setValorOpen(false)} onSave={salvarValor} />}
      {detailFor != null && <DetailModal pessoa={pessoas.find((p) => p.id === detailFor)} onClose={() => setDetailFor(null)} upd={upd} />}
      {novoOpen && <NovoModal onClose={() => setNovoOpen(false)} onSave={criarPessoa} />}
      {caixaOpen && <CaixaModal caixa={caixa} onAdd={addCaixa} onRemove={removeCaixa} onClose={() => setCaixaOpen(false)} />}
      {saidasOpen && <SaidasModal valores={valores} pagamentos={pagamentos} onClose={() => setSaidasOpen(false)} />}

      {globalError && <ConfirmModal title="Atenção" msg={globalError} confirmLabel="Entendi" cancelLabel="" onConfirm={() => setGlobalError(null)} onClose={() => setGlobalError(null)} />}
      {paginaPendente && <ConfirmModal title="Tem certeza que você vai sair?" msg="Você tem dados em preenchimento. Se sair desta tela, os dados digitados serão perdidos." confirmLabel="Sair" cancelLabel="Continuar preenchendo" danger onConfirm={confirmarSaidaCritica} onClose={() => setPaginaPendente(null)} />}
    </div>
  );
}

/* ===================== LOGIN ===================== */
function Login({ onLogin }) {
  const [email, setEmail] = useState("gestor@campanha.com");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const entrar = async () => {
    setErro(""); setCarregando(true);
    try { await onLogin(email, senha); }
    catch (e) { setErro(e.message || "Não foi possível entrar."); }
    finally { setCarregando(false); }
  };
  return (
    <div style={{ ...FONT, background: `linear-gradient(135deg, ${G_DARK} 0%, ${G} 48%, ${Y} 100%)` }} className="min-h-screen flex items-center justify-center p-4">
      {FONTS}
      <div className="w-full max-w-sm">
        <div className="text-center mb-6"><div className="inline-flex mb-3 shadow-lg rounded-full"><LogoJJ size={72} /></div>
          <h1 className="text-white text-xl font-bold drop-shadow">Comitê João Jorge</h1>
          <p className="text-white/80 text-sm mt-1">Gestão de equipe, presença e pagamentos</p></div>
        <div className="bg-white rounded-2xl p-6 shadow-2xl">
          <label className="block text-sm font-medium text-slate-700">E-mail</label>
          <input data-cy="login-email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 transition-colors" />
          <label className="block text-sm font-medium text-slate-700 mt-4">Senha</label>
          <input data-cy="login-senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} onKeyDown={(e) => e.key === "Enter" && entrar()} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 transition-colors" />
          {erro && <div className="mt-3 text-sm text-red-600 flex items-center gap-1.5"><AlertTriangle size={15} /> {erro}</div>}
          <button data-cy="login-entrar" onClick={entrar} disabled={carregando} className="mt-6 w-full rounded-lg py-2.5 text-white font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-90 shadow-md disabled:opacity-50" style={{ background: G }}><LogIn size={18} /> {carregando ? "Entrando..." : "Entrar"}</button>
        </div>
      </div>
    </div>
  );
}

/* ===================== DASHBOARD ===================== */
function Dashboard({ pessoas, ativos, valores, caixa, pagamentos, hide, onToggleHide, onEditCaixa, onEditSaidas, onEquipe }) {
  const entrou = caixa.reduce((s, c) => s + c.valor, 0);
  const semAssin = ativos.filter((p) => p.exigeAssin && !p.assinou).length;
  const soma = (f) => valores.filter((v) => v.forma === f).reduce((s, v) => s + v.valor, 0);
  const ced = soma("cedulas"), pix = soma("pix"), out = soma("outros"), tot = ced + pix + out || 1;
  const variavel = valores.reduce((s, v) => s + v.valor, 0);
  const fixoPago = pagamentos.reduce((s, r) => s + r.totalPago, 0);
  const saidas = variavel + fixoPago;
  const maxG = Math.max(variavel, fixoPago, 1);

  return (
    <div>
      <PageTitle title="Painel" sub="Reflete os dados gerais do sistema" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button data-cy="painel-entradas" onClick={onEditCaixa} className="rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-sm text-left transition-shadow hover:shadow-md" style={{ background: G_SOFT }}>
          <div className="flex items-center justify-between">
            <div className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide truncate" style={{ color: G_DARK }}>Entradas</div>
            <div className="flex gap-1 shrink-0">
              <span data-cy="toggle-caixa" onClick={(e) => { e.stopPropagation(); onToggleHide(); }} className="text-slate-500 hover:text-slate-800 transition-colors cursor-pointer">{hide ? <EyeOff size={16} /> : <Eye size={16} />}</span>
            </div>
          </div>
          <div className="text-[clamp(1rem,2.1vw,1.5rem)] font-extrabold mt-1 whitespace-nowrap" style={{ color: G_DARK }}>{hide ? "R$ ••••••" : brl(entrou)}</div>
          <div className="text-[10px] sm:text-xs text-slate-500 mt-0.5 truncate">verba recebida</div>
        </button>
        <button data-cy="painel-saidas" onClick={onEditSaidas} className="rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-sm text-left bg-white transition-shadow hover:shadow-md min-w-0"><div className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wide truncate">Saídas</div><div className="text-[clamp(1rem,2.1vw,1.5rem)] font-extrabold mt-1 whitespace-nowrap" style={{ color: "#DC2626" }}>{hide ? "R$ ••••" : brl(saidas)}</div><div className="text-[10px] sm:text-xs text-slate-400 mt-0.5 truncate">valores e salários pagos</div></button>
        <button data-cy="painel-ativos" onClick={onEquipe} className="text-left min-w-0 rounded-2xl transition-shadow hover:shadow-md"><Kpi label="Ativos" value={ativos.length} hint={`${pessoas.length - ativos.length} desligados`} /></button>
        <button data-cy="painel-sem-assinatura" onClick={onEquipe} className="text-left min-w-0 rounded-2xl transition-shadow hover:shadow-md"><Kpi label="Sem assinatura" value={semAssin} hint="doc do TSE" /></button>
      </div>

      <div className="mt-4 grid md:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-semibold text-slate-800">Como o dinheiro saiu</h3>
          <p className="text-sm text-slate-500 mb-3">Cédulas, pix e outros.</p>
          <div className="flex h-3 w-full rounded-full overflow-hidden mb-3 bg-slate-100">
            <div style={{ width: (ced / tot) * 100 + "%", background: AZUL }} />
            <div style={{ width: (pix / tot) * 100 + "%", background: VERDE }} />
            <div style={{ width: (out / tot) * 100 + "%", background: FRIO }} />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Segment cor={AZUL} label="Cédulas" val={brl(ced)} hide={hide} />
            <Segment cor={VERDE} label="Pix" val={brl(pix)} hide={hide} />
            <Segment cor={FRIO} label="Outros" val={brl(out)} hide={hide} />
          </div>
        </Card>
        <Card>
          <h3 className="font-semibold text-slate-800">Gastos Fixos e Variáveis</h3>
          <p className="text-sm text-slate-500 mb-3">Quanto já saiu de salário fixo pago e de gasto variável.</p>
          <DonutGastos fixo={fixoPago} variavel={variavel} hide={hide} />
        </Card>
      </div>
    </div>
  );
}
function DonutGastos({ fixo, variavel, hide }) {
  const total = fixo + variavel;
  const pctFixo = total ? Math.round((fixo / total) * 100) : 0;
  const pctVariavel = total ? 100 - pctFixo : 0;
  const dados = [{ nome: "Salário fixo", valor: fixo, cor: G, sombra: "#00652B" }, { nome: "Variável", valor: variavel, cor: AZUL, sombra: "#1D4ED8" }];
  const TooltipGastos = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const item = payload[0].payload; const pct = total ? Math.round((item.valor / total) * 100) : 0;
    return <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-xl text-xs"><div className="font-bold text-slate-800">{item.nome}</div><div className="text-slate-500">{pct}% · {brl(item.valor)}</div></div>;
  };
  return <div className="grid grid-cols-1 min-[500px]:grid-cols-[190px_minmax(0,1fr)] min-[500px]:items-center gap-3">
    <div className="h-44 w-full max-w-[220px] mx-0 shrink-0">
      <ResponsiveContainer width="100%" height="100%"><PieChart>
        <Pie data={dados} dataKey="valor" cx="50%" cy="53%" outerRadius={70} paddingAngle={2} stroke="none" isAnimationActive={false}>
          {dados.map((item) => <Cell key={item.nome} fill={item.sombra} />)}
        </Pie>
        <Pie data={dados} dataKey="valor" nameKey="nome" cx="50%" cy="48%" outerRadius={70} paddingAngle={2} stroke="#FFFFFF" strokeWidth={1} isAnimationActive={false}>
          {dados.map((item) => <Cell key={item.nome} fill={item.cor} />)}
        </Pie>
        <Tooltip content={<TooltipGastos />} />
      </PieChart></ResponsiveContainer>
    </div>
    <div className="grid grid-cols-2 min-[500px]:grid-cols-1 gap-2 w-full text-center min-[500px]:text-left">
      <div className="border-l-4 border-emerald-600 rounded-r-lg bg-slate-50 py-2 px-2"><div className="text-xs font-bold text-slate-700">Salário fixo · {pctFixo}%</div><div className="text-xs text-slate-500 mt-0.5">{hide ? "••••" : brl(fixo)}</div></div>
      <div className="border-l-4 border-blue-600 rounded-r-lg bg-slate-50 py-2 px-2"><div className="text-xs font-bold text-slate-700">Variável · {pctVariavel}%</div><div className="text-xs text-slate-500 mt-0.5">{hide ? "••••" : brl(variavel)}</div></div>
      <div className="col-span-2 min-[500px]:col-span-1 w-full flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total gasto</span><span className="text-base font-extrabold text-slate-800">{hide ? "R$ ••••" : brl(total)}</span></div>
    </div>
  </div>;
}
function BarLine({ label, val, max, cor, hide }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1"><span className="text-slate-600 truncate">{label}</span><span className="font-semibold text-slate-800 ml-2 whitespace-nowrap">{hide ? "R$ ••••" : brl(val)}</span></div>
      <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{ width: (val / max) * 100 + "%", background: cor }} /></div>
    </div>
  );
}
function Segment({ cor, label, val, hide }) {
  return (<div className="rounded-lg py-2" style={{ background: "#F8FAFC" }}>
    <div className="flex items-center justify-center gap-1 text-[10px] sm:text-xs text-slate-500 truncate"><span className="h-2 w-2 rounded-full shrink-0" style={{ background: cor }} />{label}</div>
    <div className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5 truncate px-1">{hide ? "••••" : val}</div></div>);
}

/* ===================== CAIXA (entradas) ===================== */
function CaixaModal({ caixa, onAdd, onRemove, onClose }) {
  const [origem, setOrigem] = useState(""); const [valor, setValor] = useState("");
  const [excluirId, setExcluirId] = useState(null);
  const itemExcluir = caixa.find((c) => c.id === excluirId);
  const add = () => { if (!valor) return; onAdd({ origem: origem || "Entrada", valor: Number(valor) }); setOrigem(""); setValor(""); };
  const total = caixa.reduce((s, c) => s + c.valor, 0);
  const baixar = () => baixarCSV("historico_entradas_caixa", ["Data", "Origem", "Valor"], [...caixa.map((c) => [fmtData(c.data), c.origem, money2(c.valor)]), ["", "TOTAL", money2(total)]]);
  return (
    <Overlay onClose={onClose}>
      <div className="flex items-center justify-between mb-3 gap-2"><h3 className="font-bold text-slate-900">Caixa que entrou</h3><div className="flex items-center gap-1"><button data-cy="entradas-baixar" onClick={baixar} className="flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"><Download size={14} /> Baixar</button><button data-cy="modal-fechar" onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button></div></div>
      <div className="space-y-2 mb-3 max-h-48 overflow-y-auto pr-1">
        {caixa.map((c) => (
          <div key={c.id} className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-white">
            <div className="flex-1 min-w-0"><div className="text-sm font-medium text-slate-800 truncate">{c.origem}</div><div className="text-xs text-slate-400">{fmtData(c.data)}</div></div>
            <div className="font-bold text-slate-900 whitespace-nowrap">{brl(c.valor)}</div>
            <button data-cy="entrada-excluir" onClick={() => setExcluirId(c.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"><Trash2 size={15} /></button>
          </div>
        ))}
        {caixa.length === 0 && <div className="text-center text-sm text-slate-400 py-4">Nenhuma entrada registrada.</div>}
      </div>
      <div className="border-t border-slate-100 pt-3">
        <input data-cy="entrada-origem" value={origem} onChange={(e) => setOrigem(e.target.value)} placeholder="Origem (ex.: Repasse tesouraria)" className="w-full mb-2 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 transition-colors" />
        <div className="flex gap-2">
          <MoneyInput value={valor} onChange={setValor} placeholder="Valor" className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 transition-colors" />
          <button data-cy="entrada-adicionar" onClick={add} className="rounded-lg px-4 text-white font-semibold transition-opacity hover:opacity-90 shadow-sm shrink-0" style={{ background: G }}>Adicionar</button>
        </div>
      </div>
      {excluirId && (
        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 text-center rounded-2xl">
          <AlertTriangle size={32} className="text-red-500 mb-2" />
          <h3 className="font-bold text-slate-900 mb-1">Excluir entrada?</h3>
          <p className="text-sm text-slate-500 mb-4">{itemExcluir?.origem} de {brl(itemExcluir?.valor)} será removido do caixa.</p>
          <div className="flex gap-2 w-full">
            <button data-cy="entrada-excluir-cancelar" onClick={() => setExcluirId(null)} className="flex-1 py-2 rounded-lg border border-slate-300 text-slate-600 font-semibold hover:bg-slate-50 transition-colors">Cancelar</button>
            <button data-cy="entrada-excluir-confirmar" onClick={() => { onRemove(excluirId); setExcluirId(null); }} className="flex-1 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors">Excluir</button>
          </div>
        </div>
      )}
    </Overlay>
  );
}

function SaidasModal({ valores, pagamentos, onClose }) {
  const variavel = valores.reduce((s, v) => s + v.valor, 0);
  const salarios = pagamentos.reduce((s, p) => s + p.totalPago, 0);
  const total = variavel + salarios;
  const baixar = () => baixarCSV("historico_saidas", ["Tipo", "Referência", "Valor"], [
    ...valores.map((v) => ["Valor variável", v.tipo, money2(v.valor)]),
    ...pagamentos.map((p) => ["Salário pago", `${fmtData(p.ini)} a ${fmtData(p.fim)}`, money2(p.totalPago)]),
    ["", "TOTAL", money2(total)],
  ]);
  return <Overlay onClose={onClose}>
    <div className="flex items-center justify-between mb-3 gap-2"><div><h3 className="font-bold text-slate-900">Saídas</h3><p className="text-xs text-slate-500">Valores variáveis e salários já pagos.</p></div><div className="flex items-center gap-1"><button onClick={baixar} className="flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"><Download size={14} /> Baixar</button><button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button></div></div>
    <div className="grid grid-cols-2 gap-3 mb-3"><Kpi label="Valores" value={brl(variavel)} accent={AZUL} /><Kpi label="Salários" value={brl(salarios)} accent={G} /></div>
    <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl mb-3">
      {valores.map((v) => <div key={v.id} className="flex items-center justify-between gap-2 p-2 text-sm"><span className="min-w-0 truncate"><span className="text-xs font-medium text-blue-600">Valor</span> · {v.tipo}</span><span className="font-semibold whitespace-nowrap">{brl(v.valor)}</span></div>)}
      {pagamentos.map((p) => <div key={p.id} className="flex items-center justify-between gap-2 p-2 text-sm"><span className="min-w-0 truncate"><span className="text-xs font-medium text-emerald-600">Salário</span> · {fmtData(p.ini)} a {fmtData(p.fim)}</span><span className="font-semibold whitespace-nowrap">{brl(p.totalPago)}</span></div>)}
      {!valores.length && !pagamentos.length && <div className="p-4 text-center text-sm text-slate-400">Nenhuma saída registrada.</div>}
    </div>
    <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 flex justify-between"><span className="text-sm font-semibold text-red-700">Total de saídas</span><span className="font-extrabold text-red-700">{brl(total)}</span></div>
  </Overlay>;
}

/* ===================== VALORES (variáveis) ===================== */
function Valores({ valores, pessoas, onNovo, onDelete, onError }) {
  const [openId, setOpenId] = useState(null);
  const [tabela, setTabela] = useState(false);
  const [excluirVal, setExcluirVal] = useState(null);
  const [pg, setPg] = useState(0);
  const perPage = 20;
  const pes = (id) => pessoas.find((p) => p.id === id) || {};
  const byP = {}; valores.forEach((v) => { (byP[v.personId] = byP[v.personId] || []).push(v); });
  const linhas = Object.keys(byP).map((pid) => {
    const it = byP[pid]; const soma = (t) => it.filter((v) => v.tipo === t).reduce((s, v) => s + v.valor, 0);
    return { pid, it, total: it.reduce((s, v) => s + v.valor, 0), comb: soma("Combustível"), vale: soma("Vale da equipe"), alim: soma("Alimentação") };
  }).sort((a, b) => b.total - a.total);
  const geral = valores.reduce((s, v) => s + v.valor, 0);
  const maxPg = Math.max(0, Math.ceil(linhas.length / perPage) - 1); const cpg = Math.min(pg, maxPg);
  const pageItems = linhas.slice(cpg * perPage, cpg * perPage + perPage);

  if (tabela) return <TabelaValores valores={valores} pessoas={pessoas} onBack={() => setTabela(false)} onError={onError} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-2">
        <div><h1 className="text-2xl font-extrabold text-slate-900">Valores lançados</h1><p className="text-sm text-slate-500">Todo valor que você deu pra alguém, somado por pessoa.</p></div>
        <div className="flex gap-2 shrink-0">
          <button data-cy="valores-tabela" onClick={() => setTabela(true)} className="flex items-center gap-1.5 text-sm font-medium rounded-lg px-3 py-2 border border-slate-300 text-slate-600 bg-white shadow-sm hover:bg-slate-50 transition-colors"><Table2 size={16} /> <span className="hidden sm:inline">Tabela</span></button>
          <button data-cy="novo-valor" onClick={onNovo} className="flex items-center gap-1.5 text-sm font-semibold text-white rounded-lg px-3 py-2 shadow-sm transition-opacity hover:opacity-90" style={{ background: G }}><Plus size={16} /> Novo <span className="hidden sm:inline">valor</span></button>
        </div>
      </div>
      <div className="grid grid-cols-1 mb-4">
        <Kpi label="Total lançado até agora" value={brl(geral)} accent={G} />
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-sm">
        {pageItems.map((l) => {
          const p = pes(l.pid); const open = openId === l.pid;
          return (
            <div key={l.pid}>
              <button onClick={() => setOpenId(open ? null : l.pid)} className="w-full flex items-center gap-2 sm:gap-3 p-3 text-left hover:bg-slate-50 transition-colors">
                <Avatar p={p} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-800 truncate">{p.nome}</div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap text-[10px] sm:text-xs text-slate-400">
                    <Chip cor={TEAMS[p.team]?.cor} label={TEAMS[p.team]?.nome} />
                    {l.comb > 0 && <span>Combustível {brl(l.comb)}</span>}{l.vale > 0 && <span>· Vale {brl(l.vale)}</span>}{l.alim > 0 && <span>· Alim. {brl(l.alim)}</span>}
                  </div>
                </div>
                <div className="text-right shrink-0"><div className="font-bold text-slate-900 whitespace-nowrap">{brl(l.total)}</div><div className="text-xs text-slate-400 flex items-center gap-0.5 justify-end">{l.it.length} lanç. {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</div></div>
              </button>
              {open && <div className="px-3 pb-2" style={{ background: "#F8FAFC" }}>
                {l.it.map((v) => (
                  <div key={v.id} className="flex items-center gap-2 py-2 text-sm border-t border-slate-100">
                    <span className="text-slate-400 w-10 sm:w-12 text-xs sm:text-sm">valor</span><span className="flex-1 text-slate-700 truncate">{v.tipo}</span>
                    <span className="text-[10px] sm:text-xs text-slate-400 whitespace-nowrap">{fmtData(v.data)}</span>
                    <button onClick={() => setExcluirVal(v)} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Excluir este valor"><Trash2 size={13} /></button>
                    <span className="text-[10px] sm:text-xs w-12 sm:w-16 text-right truncate" style={{ color: FORMA[v.forma].c }}>{FORMA[v.forma].l}</span>
                    <span className="font-semibold text-slate-800 w-20 sm:w-24 text-right whitespace-nowrap">{brl(v.valor)}</span>
                  </div>))}
              </div>}
            </div>
          );
        })}
        {linhas.length === 0 && <div className="p-8 text-center text-sm text-slate-400">Nenhum valor lançado. Toque em Novo valor.</div>}
      </div>
      {maxPg > 0 && (
        <div className="flex items-center justify-between mt-3 text-sm">
          <span className="text-slate-500">{linhas.length} pessoas · página {cpg + 1} de {maxPg + 1}</span>
          <div className="flex gap-2">
            <button onClick={() => setPg(Math.max(0, cpg - 1))} disabled={cpg === 0} className="px-3 py-1.5 rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-white transition-colors bg-white">Anterior</button>
            <button onClick={() => setPg(Math.min(maxPg, cpg + 1))} disabled={cpg === maxPg} className="px-3 py-1.5 rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-white transition-colors bg-white">Próxima</button>
          </div>
        </div>
      )}
      {excluirVal && <ConfirmModal title="Excluir este valor?" msg={`${excluirVal.tipo} de ${brl(excluirVal.valor)} será removido.`} confirmLabel="Excluir" cancelLabel="Sair" danger
        onConfirm={() => { onDelete(excluirVal.id); setExcluirVal(null); }} onClose={() => setExcluirVal(null)} />}
    </div>
  );
}

function TabelaValores({ valores, pessoas, onBack, onError }) {
  const pes = (id) => pessoas.find((p) => p.id === id) || {};
  const total = valores.reduce((s, v) => s + v.valor, 0);
  const baixar = () => baixarCSV("valores_lancados", ["Data", "Nome", "Perfil", "Referente a", "Forma", "Valor"],
    [...valores.map((v) => [fmtData(v.data), pes(v.personId).nome, pes(v.personId).perfil, v.tipo, FORMA[v.forma].l, money2(v.valor)]), ["", "", "", "", "TOTAL", money2(total)]], onError);
  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-2">
        <div><h1 className="text-2xl font-extrabold text-slate-900">Tabela de valores</h1><p className="text-sm text-slate-500 hidden sm:block">Todos os valores gastos até agora.</p></div>
        <div className="flex gap-2 shrink-0">
          <button data-cy="valores-baixar" onClick={baixar} className="flex items-center gap-1.5 text-sm font-medium rounded-lg px-3 py-2 border border-slate-300 text-slate-600 bg-white hover:bg-slate-50 transition-colors shadow-sm"><Download size={16} /> Baixar</button>
          <button data-cy="valores-voltar" onClick={onBack} className="text-sm font-medium rounded-lg px-3 py-2 border border-slate-300 text-slate-600 bg-white hover:bg-slate-50 transition-colors shadow-sm">Voltar</button>
        </div>
      </div>
      {valores.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-400 shadow-sm">Nenhum valor lançado ainda.</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto" style={{ maxHeight: '70vh' }}>
          <table className="w-full text-sm min-w-[400px]">
            <thead className="sticky top-0 bg-white shadow-sm z-10"><tr className="text-slate-500 border-b border-slate-100">
              <th className="text-left font-medium p-3">Data</th><th className="text-left font-medium p-3">Nome</th><th className="text-left font-medium p-3">Referente a</th>
              <th className="text-left font-medium p-3">Forma</th><th className="text-right font-medium p-3">Valor</th>
            </tr></thead>
            <tbody>
              {valores.map((v) => (
                <tr key={v.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="p-3 text-slate-500 whitespace-nowrap">{fmtData(v.data)}</td><td className="p-3 text-slate-700 whitespace-nowrap">{pes(v.personId).nome}</td>
                  <td className="p-3 text-slate-700">{v.tipo}</td>
                  <td className="p-3 text-xs" style={{ color: FORMA[v.forma].c }}>{FORMA[v.forma].l}</td>
                  <td className="p-3 text-right font-semibold text-slate-800 whitespace-nowrap">{brl(v.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ===================== SALÁRIO (listas de pagamento) ===================== */
function Salario({ ativos, pagamentos, onRegistrar, onRemover, pessoas, onError, onEdicaoChange, onDetail }) {
  const [nova, setNova] = useState(false);
  const [tabela, setTabela] = useState(false);
  const [detalhe, setDetalhe] = useState(null);
  const [menu, setMenu] = useState(null);
  const [excluir, setExcluir] = useState(null);
  const totalSalarios = pagamentos.reduce((s, p) => s + p.totalPago, 0);

  if (nova) return <NovaListaPagamento ativos={ativos} onClose={() => setNova(false)} onEdicaoChange={onEdicaoChange} onDetail={onDetail}
    onRegistrar={async (run) => { const ok = await onRegistrar(run); if (ok) setNova(false); }} />;
  if (tabela) return <TabelaSalarios pagamentos={pagamentos} ativos={ativos} pessoas={pessoas} onBack={() => setTabela(false)} onError={onError} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-2">
        <div><h1 className="text-2xl font-extrabold text-slate-900">Salário</h1><p className="text-sm text-slate-500">Listas de pagamento já registradas.</p></div>
        <div className="flex gap-2 shrink-0">
          <button data-cy="salarios-tabela" onClick={() => setTabela(true)} className="flex items-center gap-1.5 text-sm font-medium rounded-lg px-3 py-2 border border-slate-300 text-slate-600 bg-white shadow-sm hover:bg-slate-50 transition-colors"><Table2 size={16} /> <span className="hidden sm:inline">Tabela</span></button>
          <button data-cy="nova-lista-pagamento" onClick={() => setNova(true)} className="flex items-center gap-1.5 text-sm font-semibold text-white rounded-lg px-3 py-2 shadow-sm transition-opacity hover:opacity-90" style={{ background: G }}><Plus size={16} /> Nova <span className="hidden sm:inline">lista</span></button>
        </div>
      </div>
      <div className="grid grid-cols-1 mb-4"><Kpi label="Total pago em salários" value={brl(totalSalarios)} hint="somatória de todas as listas registradas" accent={G} /></div>
      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-sm">
        {pagamentos.map((r) => {
          const pagos = r.itens.filter((i) => i.pago).length;
          return (
            <div key={r.id} className="flex items-center gap-3 p-3">
                <button data-cy="salario-detalhe" onClick={() => setDetalhe(r)} className="flex-1 flex items-center gap-3 text-left group min-w-0">
                <div className="h-10 w-10 rounded-lg grid place-items-center transition-colors group-hover:opacity-80 shrink-0" style={{ background: G_SOFT, color: G_DARK }}><Wallet size={18} /></div>
                <div className="min-w-0"><div className="font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors truncate">{fmtData(r.ini)} a {fmtData(r.fim)}</div>
                  <div className="text-xs text-slate-500 truncate">{pagos} pagos · total {brl(r.totalPago)}</div></div>
              </button>
              <div className="relative shrink-0">
                <button data-cy="salario-menu" onClick={() => setMenu(menu === r.id ? null : r.id)} className="h-9 w-9 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-50 transition-colors"><MoreVertical size={17} /></button>
                {menu === r.id && <div className="absolute right-0 top-10 z-10 bg-white border border-slate-200 rounded-lg shadow-lg py-1 w-32">
                  <button data-cy="salario-excluir" onClick={() => { setExcluir(r); setMenu(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-slate-50 transition-colors"><Trash2 size={15} /> Excluir</button></div>}
              </div>
            </div>
          );
        })}
        {pagamentos.length === 0 && <div className="p-8 text-center text-sm text-slate-400">Nenhuma lista de pagamento. Toque em Nova lista.</div>}
      </div>

      {detalhe && (
        <Overlay onClose={() => setDetalhe(null)} tall>
          <div className="flex items-center justify-between mb-3"><h3 className="font-bold text-slate-900">Pagamento {fmtData(detalhe.ini)} a {fmtData(detalhe.fim)}</h3><button onClick={() => setDetalhe(null)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button></div>
          <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100 pr-1">
            {detalhe.itens.map((i) => (
              <div key={i.personId} className="flex items-center justify-between py-2 text-sm hover:bg-slate-50 px-1 transition-colors rounded-md">
                <span className="text-slate-700 truncate">{i.nome}</span>
                <span className="flex items-center gap-2 shrink-0 ml-2"><span className="font-semibold text-slate-800">{brl(i.valor)}</span>{i.pago ? <span className="text-xs text-emerald-600">pago</span> : <span className="text-xs text-slate-400">não pago</span>}</span>
              </div>
            ))}
          </div>
        </Overlay>
      )}
      {excluir && <ConfirmModal title="Tem certeza que deseja excluir?" msg={`O pagamento de ${fmtData(excluir.ini)} a ${fmtData(excluir.fim)} será removido.`} confirmLabel="Excluir" cancelLabel="Sair" danger
        onConfirm={() => { onRemover(excluir.id); setExcluir(null); }} onClose={() => setExcluir(null)} />}
    </div>
  );
}

function TabelaSalarios({ pagamentos, pessoas, onBack, onError }) {
  const linhas = [];
  pagamentos.forEach((pag) => {
    pag.itens.forEach((item) => {
      linhas.push({
        idUnico: `${pag.id}-${item.personId}`,
        periodo: `${fmtData(pag.ini)} a ${fmtData(pag.fim)}`,
        nome: item.nome,
        equipe: TEAMS[item.team]?.nome || "-", assinatura: item.assinatura,
        valor: item.valor,
        pago: item.pago,
      });
    });
  });
  const total = linhas.filter((l) => l.pago).reduce((s, l) => s + l.valor, 0);
  const baixar = () => baixarCSV("historico_salarios", ["Período", "Nome", "Equipe", "Assinatura", "Valor", "Status"],
    [...linhas.map((l) => [l.periodo, l.nome, l.equipe, l.assinatura || "", money2(l.valor), l.pago ? "Pago" : "Não pago"]), ["", "", "", "", money2(total), "TOTAL PAGO"]], onError);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-2">
        <div><h1 className="text-2xl font-extrabold text-slate-900">Histórico de Salários</h1><p className="text-sm text-slate-500 hidden sm:block">Todos os pagamentos registrados.</p></div>
        <div className="flex gap-2 shrink-0">
          <button data-cy="salarios-baixar" onClick={baixar} className="flex items-center gap-1.5 text-sm font-medium rounded-lg px-3 py-2 border border-slate-300 text-slate-600 bg-white hover:bg-slate-50 transition-colors shadow-sm"><Download size={16} /> Baixar</button>
          <button data-cy="salarios-voltar" onClick={onBack} className="text-sm font-medium rounded-lg px-3 py-2 border border-slate-300 text-slate-600 bg-white hover:bg-slate-50 transition-colors shadow-sm">Voltar</button>
        </div>
      </div>
      {linhas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-400 shadow-sm">Nenhum pagamento registrado ainda.</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto" style={{ maxHeight: '70vh' }}>
          <table className="w-full text-sm min-w-[500px]">
            <thead className="sticky top-0 bg-white shadow-sm z-10"><tr className="text-slate-500 border-b border-slate-100">
              <th className="text-left font-medium p-3">Período</th><th className="text-left font-medium p-3">Nome</th>
              <th className="text-left font-medium p-3">Assinatura</th><th className="text-right font-medium p-3">Valor</th><th className="text-center font-medium p-3">Status</th>
            </tr></thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.idUnico} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="p-3 text-slate-700 whitespace-nowrap">{l.periodo}</td>
                  <td className="p-3 text-slate-700">{l.nome} <span className="text-xs text-slate-400 ml-1">· {l.equipe}</span></td>
                  <td className="p-3 text-xs text-slate-500">{l.assinatura}</td><td className="p-3 text-right font-semibold text-slate-800 whitespace-nowrap">{brl(l.valor)}</td>
                  <td className="p-3 text-center">
                    {l.pago ? <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Pago</span>
                            : <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Não pago</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function NovaListaPagamento({ ativos, onClose, onRegistrar, onEdicaoChange, onDetail }) {
  const [ini, setIni] = useState(hojeISO()); const [fim, setFim] = useState(hojeISO());
  const [valorPg, setValorPg] = useState(() => Object.fromEntries(ativos.map((p) => [p.id, p.salario])));
  const [pago, setPago] = useState({}); const [confirmar, setConfirmar] = useState(false);
  const [busca, setBusca] = useState("");
  const [confirmarSaida, setConfirmarSaida] = useState(false);
  const [saldoTotal, setSaldoTotal] = useState("");
  useEffect(() => { onEdicaoChange?.(true); return () => onEdicaoChange?.(false); }, [onEdicaoChange]);
  const total = ativos.reduce((s, p) => s + (Number(valorPg[p.id]) || 0), 0);
  const jaPago = ativos.filter((p) => pago[p.id]).reduce((s, p) => s + (Number(valorPg[p.id]) || 0), 0);
  const registrar = () => onRegistrar({ ini, fim, totalPago: jaPago, itens: ativos.map((p) => ({ personId: p.id, nome: p.nome, team: p.team, valor: Number(valorPg[p.id]) || 0, pago: !!pago[p.id], assinatura: !p.exigeAssin ? "" : p.assinou ? "Assinou" : "Não assinou" })) });
  return (
    <div>
      <div className="flex items-start justify-between mb-4 gap-2">
        <div><h1 className="text-2xl font-extrabold text-slate-900">Nova lista de pagamento</h1><p className="text-sm text-slate-500 hidden sm:block">Defina o valor de cada um, marque pago e registre.</p></div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => setConfirmarSaida(true)} className="text-sm text-slate-600 rounded-lg px-3 py-2 border border-slate-300 hover:bg-slate-50 transition-colors bg-white">Cancelar</button>
          <button data-cy="registrar-pagamento" onClick={() => setConfirmar(true)} className="flex items-center gap-1.5 text-sm font-semibold text-white rounded-lg px-3 py-2 transition-opacity hover:opacity-90 shadow-sm" style={{ background: G }}><Check size={16} /> Registrar</button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-3 text-sm bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <span className="text-slate-500 font-medium">Período:</span>
        <input data-cy="pagamento-periodo-inicio" type="date" value={ini} onChange={(e) => setIni(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-emerald-500 flex-1 sm:flex-none" />
        <span className="text-slate-400">até</span>
        <input data-cy="pagamento-periodo-fim" type="date" value={fim} onChange={(e) => setFim(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-emerald-500 flex-1 sm:flex-none" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <Kpi label="Total da folha" value={brl(total)} />
        <Kpi label="Já pago" value={brl(jaPago)} accent={G} hint={`${ativos.filter((p) => pago[p.id]).length} de ${ativos.length} funcionários`} />
        <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm"><label className="text-[10px] font-semibold text-slate-500 uppercase">Saldo total (opcional)</label><MoneyInput value={saldoTotal} onChange={setSaldoTotal} placeholder="0,00" className="w-full text-lg font-extrabold outline-none" /><div className="text-xs text-slate-500 mt-1">Restante: <b>{saldoTotal === "" ? "—" : brl(Number(saldoTotal) - jaPago)}</b></div></div>
      </div>
      <div className="relative mb-3"><Search size={16} className="absolute left-3 top-2.5 text-slate-400" /><input data-cy="pagamento-busca" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar funcionário por nome" className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500" /></div>
      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-sm">
        {ativos.filter((p) => p.nome.toLowerCase().includes(busca.toLowerCase())).map((p) => (
          <div key={p.id} data-cy="pagamento-funcionario" onClick={() => onDetail(p.id)} className="w-full flex items-center gap-2 sm:gap-3 p-3 text-left hover:bg-slate-50 transition-colors cursor-pointer">
            <Avatar p={p} sm />
            <div className="flex-1 min-w-0"><div className="flex items-center gap-1.5"><div className="font-medium text-slate-800 truncate">{p.nome}</div>{p.exigeAssin && (p.assinou ? <span className="text-[10px] text-emerald-600 whitespace-nowrap">assinado</span> : <span className="text-[10px] text-amber-600 whitespace-nowrap">assinatura pendente</span>)}</div><div className="text-[10px] sm:text-xs text-slate-500 truncate">{p.perfil} · {TEAMS[p.team]?.nome}</div></div>
            <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 rounded-lg border border-slate-300 px-1 sm:px-2 py-1 bg-white focus-within:border-emerald-500 transition-colors"><span className="text-xs text-slate-400">R$</span>
              <MoneyInput value={valorPg[p.id] ?? ""} onChange={(nv) => setValorPg((m) => ({ ...m, [p.id]: nv }))} className="w-14 sm:w-20 text-sm font-semibold text-right outline-none bg-transparent" /></div>
            <button data-cy="marcar-pago" onClick={(e) => { e.stopPropagation(); setPago((x) => ({ ...x, [p.id]: !x[p.id] })); }} className="text-xs sm:text-sm font-semibold rounded-lg px-2 sm:px-3 py-1.5 transition-colors shrink-0" style={pago[p.id] ? { background: G, color: "#fff" } : { background: "#F1F5F9", color: "#475569" }}>{pago[p.id] ? "Pago" : "Pagar"}</button>
          </div>
        ))}
      </div>
      {confirmar && <ConfirmModal title="Registrar pagamento?" msg={`Salvar ${ativos.filter((p) => pago[p.id]).length} pago(s), total ${brl(jaPago)}.`} confirmLabel="Registrar" onConfirm={() => { setConfirmar(false); registrar(); }} onClose={() => setConfirmar(false)} />}
      {confirmarSaida && <ConfirmModal title="Tem certeza que você vai sair?" msg="Os valores digitados ainda não foram registrados e serão perdidos." confirmLabel="Sair" cancelLabel="Continuar preenchendo" danger onConfirm={onClose} onClose={() => setConfirmarSaida(false)} />}
    </div>
  );
}

/* ===================== EQUIPE (CRUD) ===================== */
function Equipe({ pessoas, onValor, onDetail, onNovo }) {
  const [q, setQ] = useState(""); const [teamF, setTeamF] = useState("todos"); const [perfilF, setPerfilF] = useState("todos"); const [assinF, setAssinF] = useState("todos"); const [pg, setPg] = useState(0);
  const perPage = 20;
  const filt = pessoas.filter((p) => (teamF === "todos" || p.team === teamF) && (perfilF === "todos" || p.perfil === perfilF) && (assinF === "todos" || (assinF === "assinado" && p.exigeAssin && p.assinou) || (assinF === "pendente" && p.exigeAssin && !p.assinou) || (assinF === "nao-assina" && !p.exigeAssin))
    && (!q || p.nome.toLowerCase().includes(q.toLowerCase())));
  const ordemStatus = { ativo: 0, reserva: 1, desligado: 2 };
  const sorted = [...filt].sort((a, b) => (ordemStatus[a.status] ?? 9) - (ordemStatus[b.status] ?? 9) || a.nome.localeCompare(b.nome));
  const maxPg = Math.max(0, Math.ceil(sorted.length / perPage) - 1); const cpg = Math.min(pg, maxPg);
  const pageItems = sorted.slice(cpg * perPage, cpg * perPage + perPage);
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div><h1 className="text-2xl font-extrabold text-slate-900">Equipe</h1><p className="text-sm text-slate-500">Cadastro do quadro. Desligados aparecem no fim.</p></div>
        <button data-cy="novo-funcionario" onClick={onNovo} className="flex items-center gap-1.5 text-sm font-semibold text-white rounded-lg px-3 py-2 transition-opacity hover:opacity-90 shadow-sm" style={{ background: G }}><Plus size={16} /> Novo</button>
      </div>
      <div className="flex flex-col gap-2 mb-3">
        <div className="relative flex-1"><Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input data-cy="equipe-busca" value={q} onChange={(e) => { setQ(e.target.value); setPg(0); }} placeholder="Buscar por nome" className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm outline-none focus:border-emerald-500 transition-colors shadow-sm" /></div>
        <div className="grid grid-cols-2 gap-2"><select data-cy="equipe-filtro-cor" value={teamF} onChange={(e) => { setTeamF(e.target.value); setPg(0); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:border-emerald-500 outline-none transition-colors shadow-sm">
          <option value="todos">Todas as cores</option>{Object.entries(TEAMS).map(([k, t]) => <option key={k} value={k}>{t.nome}</option>)}</select>
        <select data-cy="equipe-filtro-perfil" value={perfilF} onChange={(e) => { setPerfilF(e.target.value); setPg(0); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:border-emerald-500 outline-none transition-colors shadow-sm">
          <option value="todos">Todos os perfis</option>{PERFIS.map((t) => <option key={t} value={t}>{t}</option>)}</select>
        <select data-cy="equipe-filtro-assinatura" value={assinF} onChange={(e) => { setAssinF(e.target.value); setPg(0); }} className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:border-emerald-500 outline-none transition-colors shadow-sm"><option value="todos">Assinatura: todas</option><option value="assinado">Assinado</option><option value="pendente">Pendente</option><option value="nao-assina">Não assina</option></select></div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-sm">
        {pageItems.map((p) => (
          <button key={p.id} data-cy="funcionario-abrir" onClick={() => onDetail(p.id)} className={`w-full flex items-center gap-2 sm:gap-3 p-3 text-left hover:bg-slate-50 transition-colors ${p.status === "reserva" ? "bg-blue-50" : ""}`}>
            <Avatar p={p} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap"><span className="font-semibold text-slate-800 truncate">{p.nome}</span>
                {p.status === "reserva" && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">reserva</span>}{p.status === "desligado" && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">desligado</span>}</div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Chip cor={TEAMS[p.team]?.cor} label={TEAMS[p.team]?.nome} /><span className="text-[10px] sm:text-xs text-slate-400">{p.perfil}</span>
                {p.exigeAssin ? (p.assinou ? <span className="text-[10px] sm:text-xs text-emerald-600 flex items-center gap-0.5"><PenLine size={12} />assinado</span> : <span className="text-[10px] sm:text-xs text-amber-600 flex items-center gap-0.5"><PenLine size={12} />pendente</span>) : <span className="text-[10px] sm:text-xs text-slate-400">não assina</span>}
              </div>
            </div>
            <span className="shrink-0 h-9 w-9 grid place-items-center rounded-lg border border-slate-200 text-slate-500 bg-white shadow-sm"><Settings2 size={16} /></span>
          </button>
        ))}
        {pageItems.length === 0 && <div className="p-8 text-center text-sm text-slate-400">Ninguém encontrado.</div>}
      </div>
      {maxPg > 0 && (
        <div className="flex items-center justify-between mt-3 text-sm">
          <span className="text-slate-500">{sorted.length} pessoas · página {cpg + 1} de {maxPg + 1}</span>
          <div className="flex gap-2">
            <button onClick={() => setPg(Math.max(0, cpg - 1))} disabled={cpg === 0} className="px-3 py-1.5 rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-white transition-colors bg-white shadow-sm">Anterior</button>
            <button onClick={() => setPg(Math.min(maxPg, cpg + 1))} disabled={cpg === maxPg} className="px-3 py-1.5 rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-white transition-colors bg-white shadow-sm">Próxima</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================== PRESENÇA ===================== */
function Presenca({ ativos, pessoas, presencas, onLancar, onRemover, onEdicaoChange }) {
  const [nova, setNova] = useState(false);
  const [tabela, setTabela] = useState(false);
  const [detalhe, setDetalhe] = useState(null);
  const [menu, setMenu] = useState(null);
  const [excluir, setExcluir] = useState(null);
  const nome = (id) => pessoas.find((p) => p.id === id)?.nome || "?";

  if (nova) return <NovaLista ativos={ativos} datasUsadas={presencas.map((p) => p.data)} onClose={() => setNova(false)} onEdicaoChange={onEdicaoChange}
    onLancar={async (data, marks) => { const ok = await onLancar(data, marks); if (ok) setNova(false); }} />;
  if (tabela) return <TabelaGeral pessoas={pessoas} presencas={presencas} onBack={() => setTabela(false)} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-2">
        <div><h1 className="text-2xl font-extrabold text-slate-900">Presença</h1><p className="text-sm text-slate-500">Listas de presença já lançadas. Toque pra ver os detalhes.</p></div>
        <div className="flex gap-2 shrink-0">
          <button data-cy="presenca-tabela" onClick={() => setTabela(true)} className="flex items-center gap-1.5 text-sm font-medium rounded-lg px-3 py-2 border border-slate-300 text-slate-600 bg-white hover:bg-slate-50 transition-colors shadow-sm"><Table2 size={16} /> <span className="hidden sm:inline">Tabela</span></button>
          <button data-cy="nova-lista" onClick={() => setNova(true)} className="flex items-center gap-1.5 text-sm font-semibold text-white rounded-lg px-3 py-2 transition-opacity hover:opacity-90 shadow-sm" style={{ background: G }}><CalendarPlus size={16} /> Nova <span className="hidden sm:inline">lista</span></button>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-visible shadow-sm">
        {presencas.map((pr) => {
          const vals = Object.values(pr.marks); const foram = vals.filter(Boolean).length; const faltaram = vals.length - foram;
          return (
            <div key={pr.id} className="flex items-center gap-3 p-3">
              <button data-cy="presenca-detalhe" onClick={() => setDetalhe(pr)} className="flex-1 flex items-center gap-3 text-left group min-w-0">
                <div className="h-10 w-10 rounded-lg grid place-items-center font-bold transition-opacity group-hover:opacity-80 shrink-0" style={{ background: G_SOFT, color: G_DARK }}>{fmtData(pr.data).split("/")[0]}</div>
                <div className="min-w-0"><div className="font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors truncate">{fmtData(pr.data)}</div>
                  <div className="text-[10px] sm:text-xs text-slate-500 truncate"><span className="text-emerald-600 font-medium">{foram} Presente</span> · <span className="text-red-500 font-medium">{faltaram} Ausente</span></div></div>
              </button>
              <div className="relative shrink-0">
                <button data-cy="presenca-menu" onClick={() => setMenu(menu === pr.id ? null : pr.id)} className="h-9 w-9 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-50 transition-colors"><MoreVertical size={17} /></button>
                {menu === pr.id && (
                  <div className="absolute right-0 top-10 z-10 bg-white border border-slate-200 rounded-lg shadow-lg py-1 w-32">
                    <button data-cy="presenca-excluir" onClick={() => { setExcluir(pr); setMenu(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-slate-50 transition-colors"><Trash2 size={15} /> Excluir</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {presencas.length === 0 && <div className="p-8 text-center text-sm text-slate-400">Nenhuma lista lançada. Toque em Nova lista.</div>}
      </div>

      {detalhe && (
        <Overlay onClose={() => setDetalhe(null)}>
          <div className="flex items-center justify-between mb-3"><h3 className="font-bold text-slate-900">Presença de {fmtData(detalhe.data)}</h3><button onClick={() => setDetalhe(null)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button></div>
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 pr-1">
            {Object.entries(detalhe.marks).map(([id, ok]) => (
              <div key={id} className="flex items-center justify-between py-2 text-sm hover:bg-slate-50 px-1 rounded-md transition-colors"><span className="text-slate-700 truncate">{nome(id)}</span>
                {ok ? <span className="text-emerald-600 flex items-center gap-1 shrink-0 ml-2"><Check size={14} /> Presente</span> : <span className="text-red-500 flex items-center gap-1 shrink-0 ml-2"><X size={14} /> Ausente</span>}</div>
            ))}
          </div>
        </Overlay>
      )}
      {excluir && <ConfirmModal title="Tem certeza que deseja excluir?" msg={`A lista de ${fmtData(excluir.data)} será removida.`} confirmLabel="Excluir" cancelLabel="Sair" danger
        onConfirm={() => { onRemover(excluir.id); setExcluir(null); }} onClose={() => setExcluir(null)} />}
    </div>
  );
}

function NovaLista({ ativos, datasUsadas, onClose, onLancar, onEdicaoChange }) {
  const [data, setData] = useState(hojeISO());
  const [marks, setMarks] = useState({});
  const [q, setQ] = useState(""); const [teamF, setTeamF] = useState("todos"); const [perfilF, setPerfilF] = useState("todos");
  const [confirmar, setConfirmar] = useState(false);
  const [confirmarSaida, setConfirmarSaida] = useState(false);
  useEffect(() => { onEdicaoChange?.(true); return () => onEdicaoChange?.(false); }, [onEdicaoChange]);
  const dup = datasUsadas.includes(data);
  const list = ativos.filter((p) => (teamF === "todos" || p.team === teamF) && (perfilF === "todos" || p.perfil === perfilF) && (!q || p.nome.toLowerCase().includes(q.toLowerCase())));
  const setAll = (v) => { const o = { ...marks }; list.forEach((p) => (o[p.id] = v)); setMarks(o); };
  const lancar = () => { const full = {}; ativos.forEach((p) => (full[p.id] = !!marks[p.id])); onLancar(data, full); };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div><h1 className="text-2xl font-extrabold text-slate-900">Nova lista</h1><p className="text-sm text-slate-500 hidden sm:block">Escolha a data, marque quem foi e lance.</p></div>
        <div className="flex gap-2">
          <button onClick={() => setAll(false)} className="text-xs sm:text-sm text-slate-600 rounded-lg px-2 sm:px-3 py-1.5 border border-slate-300 hover:bg-slate-50 transition-colors bg-white">Limpar</button>
          <button data-cy="marcar-todos" onClick={() => setAll(true)} className="text-xs sm:text-sm font-semibold text-white rounded-lg px-2 sm:px-3 py-1.5 transition-opacity hover:opacity-90 shadow-sm" style={{ background: G_DARK }}>Marcar todos</button>
          <button data-cy="lancar" onClick={() => setConfirmar(true)} disabled={dup} className="text-xs sm:text-sm font-semibold text-white rounded-lg px-2 sm:px-3 py-1.5 disabled:opacity-40 transition-opacity hover:opacity-90 shadow-sm" style={{ background: G }}>Lançar</button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <input data-cy="presenca-data" type="date" value={data} onChange={(e) => setData(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-emerald-500 w-full sm:w-auto" />
        <div className="relative flex-1 min-w-[120px]"><Search size={15} className="absolute left-2.5 top-2 text-slate-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome" className="rounded-lg border border-slate-300 pl-8 pr-2 py-1.5 text-sm outline-none focus:border-emerald-500 w-full transition-colors" /></div>
        <select value={teamF} onChange={(e) => setTeamF(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm bg-white outline-none focus:border-emerald-500 transition-colors flex-1 min-w-[90px]"><option value="todos">Cor</option>{Object.entries(TEAMS).map(([k, t]) => <option key={k} value={k}>{t.nome}</option>)}</select>
        <select value={perfilF} onChange={(e) => setPerfilF(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm bg-white outline-none focus:border-emerald-500 transition-colors flex-1 min-w-[90px]"><option value="todos">Tipo</option>{PERFIS.map((t) => <option key={t} value={t}>{t}</option>)}</select>
        <button onClick={() => setConfirmarSaida(true)} className="w-full sm:w-auto mt-2 sm:mt-0 text-sm text-slate-500 underline hover:text-slate-700 transition-colors text-center">Cancelar</button>
      </div>
      {dup && <div className="mb-3 flex items-center gap-2 text-sm rounded-lg px-3 py-2 bg-red-50 text-red-600 border border-red-100 shadow-sm"><AlertTriangle size={15} className="shrink-0" /> Já existe uma lista nesse dia. Escolha outra data.</div>}
      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-sm">
        {list.map((p) => {
          const on = marks[p.id];
          return (
            <button key={p.id} onClick={() => setMarks((x) => ({ ...x, [p.id]: !x[p.id] }))} className="w-full flex items-center gap-2 sm:gap-3 p-3 text-left transition-colors hover:opacity-90" style={on ? {} : { background: "#F8FAFC" }}>
              <Avatar p={p} sm />
              <div className="flex-1 min-w-0"><div className="font-medium text-slate-800 truncate">{p.nome}</div><div className="text-[10px] sm:text-xs text-slate-500 truncate">{TEAMS[p.team]?.nome} · {p.perfil}</div></div>
              <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-full grid place-items-center transition-colors shrink-0" style={on ? { background: G, color: "#fff" } : { border: "2px solid #CBD5E1", backgroundColor: "#fff" }}>{on ? <Check size={16} /> : <X size={14} className="text-slate-300" />}</div>
            </button>
          );
        })}
      </div>
      {confirmar && <ConfirmModal title="Lançar a lista de presença?" msg={`Data ${fmtData(data)}. Depois de lançada ela entra no histórico.`} confirmLabel="Lançar"
        onConfirm={() => { setConfirmar(false); lancar(); }} onClose={() => setConfirmar(false)} />}
      {confirmarSaida && <ConfirmModal title="Tem certeza que você vai sair?" msg="As marcações ainda não foram lançadas e serão perdidas." confirmLabel="Sair" cancelLabel="Continuar preenchendo" danger onConfirm={onClose} onClose={() => setConfirmarSaida(false)} />}
    </div>
  );
}

/* ===================== TABELA GERAL DE PRESENÇA ===================== */
function TabelaGeral({ pessoas, presencas, onBack }) {
  const dias = [...presencas].sort((a, b) => a.data.localeCompare(b.data));
  const ordered = [...pessoas].sort((a, b) => (a.status === "desligado" ? 1 : 0) - (b.status === "desligado" ? 1 : 0));
  const totalPresencas = ordered.reduce((s, p) => s + dias.filter((d) => d.marks[p.id] === true).length, 0);
  const baixar = () => baixarCSV("presenca", ["Pessoa", "Status", ...dias.map((d) => fmtData(d.data)), "Total"],
    [...ordered.map((p) => [p.nome, p.status, ...dias.map((d) => d.marks[p.id] === true ? "Presente" : d.marks[p.id] === false ? "Ausente" : "-"), dias.filter((d) => d.marks[p.id] === true).length]), ["TOTAL DE PRESENÇAS", "", ...dias.map(() => ""), totalPresencas]]);
  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-2">
        <div><h1 className="text-2xl font-extrabold text-slate-900">Tabela de presença</h1><p className="text-sm text-slate-500 hidden sm:block">Todos os funcionários, inclusive desligados, em todas as listas.</p></div>
        <div className="flex gap-2 shrink-0">
          <button onClick={baixar} className="flex items-center gap-1.5 text-sm font-medium rounded-lg px-3 py-2 border border-slate-300 text-slate-600 bg-white hover:bg-slate-50 transition-colors shadow-sm"><Download size={16} /> Baixar</button>
          <button onClick={onBack} className="text-sm font-medium rounded-lg px-3 py-2 border border-slate-300 text-slate-600 bg-white hover:bg-slate-50 transition-colors shadow-sm">Voltar</button>
        </div>
      </div>
      {dias.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-400 shadow-sm">Nenhuma lista lançada ainda.</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm" style={{ maxHeight: '70vh' }}>
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] z-20"><tr className="text-slate-500 border-b border-slate-100">
              <th className="text-left font-medium p-3 sticky left-0 bg-white shadow-[1px_0_0_#f1f5f9] z-30">Pessoa</th>
              {dias.map((d) => <th key={d.id} className="p-2 font-medium whitespace-nowrap">{fmtData(d.data)}</th>)}
              <th className="p-3 font-semibold text-slate-700">Total</th>
            </tr></thead>
            <tbody>
              {ordered.map((p) => {
                const total = dias.filter((d) => d.marks[p.id] === true).length;
                return (
                  <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-3 sticky left-0 bg-white shadow-[1px_0_0_#f1f5f9] z-10">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: TEAMS[p.team]?.cor }} />
                        <span className="font-medium text-slate-800 whitespace-nowrap">{p.nome}</span>
                        {p.status === "desligado" && <span className="text-[10px] px-1 py-0.5 rounded bg-slate-200 text-slate-500">deslig.</span>}
                      </div>
                    </td>
                    {dias.map((d) => {
                      const m = d.marks[p.id];
                      return <td key={d.id} className="text-center p-2">{m === true ? <Check size={14} className="inline text-emerald-500" /> : m === false ? <X size={13} className="inline text-red-400" /> : <span className="text-slate-300">·</span>}</td>;
                    })}
                    <td className="text-center p-3 font-bold text-slate-800 bg-slate-50/50">{total}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ===================== MODAL: VALOR ===================== */
function ValorModal({ pessoas, pessoa, onClose, onSave }) {
  const [pid, setPid] = useState(pessoa?.id || "");
  const [busca, setBusca] = useState("");
  const sel = pessoas.find((p) => p.id === pid);
  const tipos = [{ k: "Combustível", icon: Fuel }, { k: "Vale da equipe", icon: Wallet }, { k: "Alimentação", icon: Utensils }, { k: "Outro", icon: MoreHorizontal }];
  const [tipo, setTipo] = useState("Vale da equipe");
  const [valor, setValor] = useState(""); const [forma, setForma] = useState("cedulas");
  const matches = busca.trim() ? pessoas.filter((p) => p.nome.toLowerCase().includes(busca.toLowerCase())).slice(0, 30) : [];

  return (
    <Overlay onClose={onClose} tall>
      <div className="flex items-center justify-between mb-1"><h3 className="font-bold text-slate-900">Registrar Pagamento</h3><button data-cy="modal-fechar" onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button></div>
      <p className="text-sm text-slate-500 mb-4">Um valor que você entregou pra alguém. Vai pra tela de Valores.</p>
      <label className="text-sm font-medium text-slate-700">Para quem</label>
      {sel ? (
        <div className="mt-1 mb-3 flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 bg-slate-50">
          <Avatar p={sel} sm />
          <span className="flex-1 text-sm font-medium text-slate-800 truncate">{sel.nome} <span className="text-xs text-slate-400">· {sel.perfil}</span></span>
          {!pessoa && <button onClick={() => { setPid(""); setBusca(""); }} className="text-slate-400 hover:text-red-500 transition-colors shrink-0 p-1"><X size={16} /></button>}
        </div>
      ) : (
        <div className="mt-1 mb-3">
          <div className="relative"><Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar funcionário..." className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm outline-none focus:border-emerald-500 transition-colors shadow-sm" /></div>
          {matches.length > 0 ? (
            <div className="mt-1 border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-44 overflow-y-auto shadow-sm bg-white">
              {matches.map((p) => (
                <button key={p.id} onClick={() => { setPid(p.id); setBusca(""); }} className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 transition-colors">
                  <Avatar p={p} sm /><span className="text-sm text-slate-700 truncate">{p.nome} <span className="text-xs text-slate-400">· {p.perfil}</span></span>
                </button>
              ))}
            </div>
          ) : busca.trim() ? (
            <div className="mt-1 text-xs text-slate-400 px-1 py-2 text-center border border-dashed rounded-lg">Ninguém encontrado.</div>
          ) : <div className="mt-1 text-xs text-slate-400 px-1 py-2 text-center">Digite um nome para pesquisar.</div>}
        </div>
      )}
      <label className="text-sm font-medium text-slate-700">Referente a</label>
      <div className="grid grid-cols-4 gap-2 mt-1 mb-3">
        {[tipos[1], tipos[0], tipos[2], tipos[3]].map(({ k, icon: Ic }) => <button key={k} onClick={() => setTipo(k)} className="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg border text-[10px] sm:text-xs text-center leading-tight transition-colors" style={tipo === k ? { borderColor: G, background: G_SOFT, color: G_DARK } : { borderColor: "#E2E8F0", color: "#64748B" }}><Ic size={18} /> <span className="truncate w-full">{k}</span></button>)}
      </div>
      <label className="text-sm font-medium text-slate-700">Valor (R$)</label>
      <MoneyInput cy="input-valor" value={valor} onChange={setValor} placeholder="0,00" className="mt-1 mb-3 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-lg font-semibold outline-none focus:border-emerald-500 transition-colors shadow-sm" />
      <label className="text-sm font-medium text-slate-700">Como pagou</label>
      <div className="grid grid-cols-3 gap-2 mt-1 mb-4">
        {Object.entries(FORMA).map(([k, f]) => <button key={k} onClick={() => setForma(k)} className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-sm transition-colors" style={forma === k ? { borderColor: f.c, color: f.c, background: "#F8FAFC" } : { borderColor: "#E2E8F0", color: "#64748B" }}>{k === "pix" ? <QrCode size={15} /> : <Banknote size={15} />} {f.l}</button>)}
      </div>
      <button data-cy="salvar-valor" onClick={() => onSave({ personId: pid, tipo, valor: Number(valor) || 0, forma })} disabled={!valor || !pid} className="w-full rounded-lg py-2.5 text-white font-semibold disabled:opacity-40 transition-opacity hover:opacity-90 shadow-sm" style={{ background: G }}>Salvar valor</button>
    </Overlay>
  );
}

/* ===================== MODAL: DETALHE ===================== */
function DetailModal({ pessoa, onClose, upd }) {
  const [nome, setNome] = useState(pessoa.nome);
  const [perfil, setPerfil] = useState(pessoa.perfil);
  const [team, setTeam] = useState(pessoa.team);
  const [salario, setSalario] = useState(pessoa.salario);
  const [doc, setDoc] = useState(pessoa.doc || "");
  const [endereco, setEndereco] = useState(pessoa.endereco || "");
  const [telefone, setTelefone] = useState(pessoa.telefone || "");
  const [confirmarSaida, setConfirmarSaida] = useState(false);
  const [exigeAssin, setExigeAssin] = useState(pessoa.exigeAssin ?? true);
  const [assinou, setAssinou] = useState(pessoa.assinou ?? false);
  const off = pessoa.status === "desligado";
  const reserva = pessoa.status === "reserva";
  return (
    <Overlay onClose={onClose} tall>
      <div className="flex items-center gap-3 mb-4"><Avatar p={{ ...pessoa, nome, team }} /><div className="flex-1"><h3 className="font-bold text-slate-900">Dados da pessoa</h3></div><button onClick={() => setConfirmarSaida(true)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button></div>
      <Field label="Nome completo"><input value={nome} onChange={(e) => setNome(e.target.value)} className="in focus:border-emerald-500 transition-colors" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="CPF ou RG"><input value={doc} onChange={(e) => setDoc(maskDoc(e.target.value))} inputMode="numeric" className="in focus:border-emerald-500 transition-colors" /></Field>
        <Field label="Salário (R$)"><MoneyInput value={salario} onChange={setSalario} className="in focus:border-emerald-500 transition-colors" /></Field>
      </div>
      <Field label="Endereço"><input value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua, número, bairro..." className="in focus:border-emerald-500 transition-colors" /></Field>
      <Field label="Telefone"><input value={telefone} onChange={(e) => setTelefone(maskTelefone(e.target.value))} inputMode="tel" placeholder="(11) 1111-1111" className="in focus:border-emerald-500 transition-colors" /></Field>
      <div className="grid grid-cols-2 gap-3 items-end">
        <Field label="Perfil"><select value={perfil} onChange={(e) => setPerfil(e.target.value)} className="in bg-white focus:border-emerald-500 transition-colors">{PERFIS.map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Equipe (cor)"><select value={team} onChange={(e) => setTeam(e.target.value)} className="in bg-white focus:border-emerald-500 transition-colors">{Object.entries(TEAMS).map(([k, t]) => <option key={k} value={k}>{t.nome}</option>)}</select></Field>
      </div>
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg mb-4">
        <label className="text-sm font-semibold text-slate-800 mb-2 block flex items-center gap-1.5"><FileText size={15} /> Assinatura (Doc. TSE)</label>
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200">
          <span className="text-sm text-slate-600">Funcionário precisa assinar?</span>
          <button onClick={() => setExigeAssin(!exigeAssin)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${exigeAssin ? 'bg-emerald-600' : 'bg-slate-300'}`}>
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${exigeAssin ? 'translate-x-5' : 'translate-x-1'}`} />
          </button>
        </div>
        <div className={`flex items-center justify-between transition-opacity ${!exigeAssin ? 'opacity-40 pointer-events-none' : ''}`}>
          <span className="text-sm text-slate-600">Documento já foi assinado?</span>
          <button onClick={() => setAssinou(!assinou)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${assinou ? 'bg-emerald-600' : 'bg-slate-300'}`}>
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${assinou ? 'translate-x-5' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>
      <div className="flex gap-2 mt-2">
        {off || reserva ? <button onClick={() => { upd(pessoa.id, { status: "ativo" }); onClose(); }} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-white font-semibold transition-opacity hover:opacity-90 shadow-sm" style={{ background: G }}><UserCheck size={16} /> Ativar</button>
          : <button onClick={() => { upd(pessoa.id, { status: "reserva" }); onClose(); }} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-slate-300 text-slate-600 font-semibold hover:bg-slate-50 transition-colors">Reserva</button>}
        {!off && <button onClick={() => { upd(pessoa.id, { status: "desligado" }); onClose(); }} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-red-200 text-red-600 font-semibold hover:bg-red-50 transition-colors"><UserMinus size={16} /> Desligar</button>}
        <button data-cy="salvar-pessoa" onClick={() => { upd(pessoa.id, { nome, perfil, team, salario: Number(salario), doc, endereco, telefone, exigeAssin, assinou }); onClose(); }} className="flex-1 py-2.5 rounded-lg text-white font-semibold transition-opacity hover:opacity-90 shadow-sm" style={{ background: G_DARK }}>Salvar</button>
      </div>
      <p className="text-xs text-slate-400 mt-3 text-center">Desativar tira da presença diária, mas mantém o histórico e pagamentos.</p>
      {confirmarSaida && <ConfirmModal title="Tem certeza que você vai sair?" msg="As alterações ainda não foram salvas e serão perdidas." confirmLabel="Sair" cancelLabel="Continuar editando" danger onConfirm={onClose} onClose={() => setConfirmarSaida(false)} />}
      <style>{`.in{margin-top:.25rem;width:100%;border:1px solid #cbd5e1;border-radius:.5rem;padding:.5rem .75rem;font-size:.875rem;outline:none}`}</style>
    </Overlay>
  );
}

/* ===================== MODAL: NOVO ===================== */
function NovoModal({ onClose, onSave }) {
  const [nome, setNome] = useState(""); const [doc, setDoc] = useState(""); const [perfil, setPerfil] = useState("Padrão");
  const [team, setTeam] = useState("sem"); const [assina, setAssina] = useState(true); const [salario, setSalario] = useState("");
  const [endereco, setEndereco] = useState(""); const [telefone, setTelefone] = useState(""); const [entrada, setEntrada] = useState(hojeISO()); const [status, setStatus] = useState("ativo"); const [confirmarSaida, setConfirmarSaida] = useState(false);
  const docTipo = doc.replace(/\D/g, "").length > 9 ? "CPF" : doc ? "RG" : "";
  const ok = nome && doc && perfil;
  return (
    <Overlay onClose={onClose} tall>
      <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-slate-900">Novo funcionário</h3><button onClick={() => setConfirmarSaida(true)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button></div>
      <Field label="Nome completo *"><input value={nome} onChange={(e) => setNome(e.target.value)} className="in focus:border-emerald-500 transition-colors" /></Field>
      <Field label={<span className="flex items-center justify-between">CPF ou RG * {docTipo && <span className="text-[10px] font-normal px-2 py-0.5 rounded-full" style={{ background: G_SOFT, color: G_DARK }}>{docTipo} detectado</span>}</span>}>
        <input data-cy="input-doc" value={doc} onChange={(e) => setDoc(maskDoc(e.target.value))} inputMode="numeric" placeholder="Digite os números" className="in focus:border-emerald-500 transition-colors" /></Field>
      <Field label={<span className="flex items-center gap-1.5"><MapPin size={14} /> Endereço</span>}><input value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua, número, bairro..." className="in focus:border-emerald-500 transition-colors" /></Field>
      <Field label="Telefone"><input value={telefone} onChange={(e) => setTelefone(maskTelefone(e.target.value))} inputMode="tel" placeholder="(11) 1111-1111" className="in focus:border-emerald-500 transition-colors" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Perfil *"><select value={perfil} onChange={(e) => setPerfil(e.target.value)} className="in bg-white text-base focus:border-emerald-500 transition-colors">{PERFIS.map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Equipe (cor)"><select value={team} onChange={(e) => setTeam(e.target.value)} className="in bg-white focus:border-emerald-500 transition-colors">{Object.entries(TEAMS).map(([k, t]) => <option key={k} value={k}>{t.nome}{k === "sem" ? " (padrão)" : ""}</option>)}</select></Field>
      </div>
      <Field label="Situação inicial"><div className="grid grid-cols-2 gap-2 mt-1"><button onClick={() => setStatus("ativo")} className="py-2 rounded-lg border text-sm" style={status === "ativo" ? { borderColor: G, background: G_SOFT, color: G_DARK } : { borderColor: "#E2E8F0", color: "#64748B" }}>Ativo</button><button onClick={() => setStatus("reserva")} className="py-2 rounded-lg border text-sm" style={status === "reserva" ? { borderColor: "#64748B", background: "#F1F5F9", color: "#334155" } : { borderColor: "#E2E8F0", color: "#64748B" }}>Reserva</button></div></Field>
      <Field label="Assinatura de registro">
        <div className="grid grid-cols-2 gap-2 mt-1">
          <button onClick={() => setAssina(true)} className="py-2 rounded-lg border text-sm transition-colors" style={assina ? { borderColor: G, background: G_SOFT, color: G_DARK } : { borderColor: "#E2E8F0", color: "#64748B" }}>Assina (padrão)</button>
          <button onClick={() => setAssina(false)} className="py-2 rounded-lg border text-sm transition-colors" style={!assina ? { borderColor: G, background: G_SOFT, color: G_DARK } : { borderColor: "#E2E8F0", color: "#64748B" }}>Não assina</button>
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Salário (R$)"><MoneyInput value={salario} onChange={setSalario} placeholder="0,00" className="in focus:border-emerald-500 transition-colors" /></Field>
        <Field label="Data de entrada"><input type="date" value={entrada} onChange={(e) => setEntrada(e.target.value)} className="in focus:border-emerald-500 transition-colors" /></Field>
      </div>
      <button data-cy="salvar-funcionario" onClick={() => onSave({ nome, doc, endereco, telefone, perfil, funcao: perfil, team, exigeAssin: assina, salario: Number(salario) || 0, entrada, status })} disabled={!ok} className="mt-2 w-full rounded-lg py-2.5 text-white font-semibold disabled:opacity-40 transition-opacity hover:opacity-90 shadow-md" style={{ background: G }}>Cadastrar</button>
      {confirmarSaida && <ConfirmModal title="Tem certeza que você vai sair?" msg="Os dados preenchidos ainda não foram salvos e serão perdidos." confirmLabel="Sair" cancelLabel="Continuar cadastrando" danger onConfirm={onClose} onClose={() => setConfirmarSaida(false)} />}
      <style>{`.in{margin-top:.25rem;width:100%;border:1px solid #cbd5e1;border-radius:.5rem;padding:.5rem .75rem;font-size:.875rem;outline:none}`}</style>
    </Overlay>
  );
}

/* ===================== GENÉRICOS ===================== */
function Overlay({ children, onClose, tall }) {
  return (<div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center sm:p-4 backdrop-blur-[2px] transition-opacity" style={{ minHeight: "100dvh" }} onClick={onClose}>
    <div className={`bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl relative max-h-[88dvh] overflow-y-auto ${tall ? "sm:max-h-[92dvh]" : ""}`} onClick={(e) => e.stopPropagation()}>{children}</div></div>);
}
function ConfirmModal({ title, msg, confirmLabel = "Confirmar", cancelLabel = "Sair", danger, onConfirm, onClose }) {
  return (<Overlay onClose={onClose}>
    <h3 className="font-bold text-slate-900 mb-1">{title}</h3><p className="text-sm text-slate-500 mb-5">{msg}</p>
    <div className="flex gap-2">
      {danger && <button data-cy="confirmar-perigo" onClick={onConfirm} className="flex-1 py-2.5 rounded-lg text-white font-semibold transition-opacity hover:opacity-90 shadow-sm bg-red-600">{confirmLabel}</button>}
      {cancelLabel && <button data-cy="confirmar-cancelar" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-600 font-semibold hover:bg-slate-50 transition-colors">{cancelLabel}</button>}
      {!danger && <button data-cy="confirmar-acao" onClick={onConfirm} className="flex-1 py-2.5 rounded-lg text-white font-semibold transition-opacity hover:opacity-90 shadow-sm" style={{ background: G }}>{confirmLabel}</button>}</div>
  </Overlay>);
}
function Field({ label, children }) { return <label className="block mb-3"><span className="text-xs sm:text-sm font-medium text-slate-700">{label}</span>{children}</label>; }
function Avatar({ p, sm }) { const s = sm ? "h-8 w-8 sm:h-9 sm:w-9" : "h-10 w-10 sm:h-11 sm:w-11"; return <div className={`${s} rounded-full grid place-items-center text-white font-bold shrink-0 shadow-sm text-sm sm:text-base`} style={{ background: TEAMS[p.team]?.cor || "#94A3B8" }}>{p.nome?.[0]}</div>; }
function Brand({ light, small }) { return <div className="flex items-center gap-2"><LogoJJ size={small ? 32 : 38} /><div className={light ? "text-white" : ""}><div className="font-bold leading-tight">João Jorge</div><div className="text-[10px] sm:text-xs leading-tight" style={{ color: light ? "#9FCBAF" : "#64748B" }}>Comitê · 2026</div></div></div>; }
const cyNome = (texto) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
function NavItem({ icon: Ic, label, active, onClick }) { return <button data-cy={`nav-${cyNome(label)}`} onClick={onClick} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-white/10" style={active ? { background: "rgba(255,255,255,.12)", color: "#fff" } : { color: "#B8D8C2" }}><Ic size={18} /> {label}</button>; }
function Tab({ icon: Ic, label, active, onClick }) { return <button data-cy={`tab-${cyNome(label)}`} onClick={onClick} className="py-2 flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors hover:bg-slate-50" style={{ color: active ? G : "#94A3B8" }}><Ic size={active ? 22 : 20} className="transition-all duration-300" /> {label}</button>; }
function PageTitle({ title, sub }) { return <div className="mb-4"><h1 className="text-2xl font-extrabold text-slate-900">{title}</h1><p className="text-xs sm:text-sm text-slate-500">{sub}</p></div>; }
function Kpi({ label, value, hint, accent = "#0F172A" }) { return <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-sm min-w-0 flex flex-col justify-center"><div className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wide truncate">{label}</div><div className="text-[1.5rem] sm:text-2xl md:text-3xl font-extrabold mt-1 truncate" style={{ color: accent }} title={value}>{value}</div>{hint && <div className="text-[10px] sm:text-xs text-slate-400 mt-0.5 truncate">{hint}</div>}</div>; }
function Card({ children }) { return <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">{children}</div>; }
function Chip({ cor, label }) { return <span className="text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-full text-white shadow-sm whitespace-nowrap" style={{ background: cor }}>{label}</span>; }
