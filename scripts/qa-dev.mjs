import { chromium, selectors } from "playwright-core";
import { mkdir } from "node:fs/promises";

const baseURL = process.env.QA_BASE_URL || "http://127.0.0.1:5173";
const email = process.env.QA_EMAIL;
const password = process.env.QA_PASSWORD;
const edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
if (!email || !password) throw new Error("Defina QA_EMAIL e QA_PASSWORD antes de rodar o QA.");
selectors.setTestIdAttribute("data-cy");

await mkdir("qa-artifacts", { recursive: true });
await mkdir("qa-artifacts/videos", { recursive: true });
const browser = await chromium.launch({ executablePath: edge, headless: true });
const resultados = [];
const esperarTitulo = (page, titulo) => page.getByRole("heading", { name: titulo, exact: true }).waitFor({ state: "visible", timeout: 15000 });

async function executar(nome, viewport, roteiro) {
  const context = await browser.newContext({
    viewport,
    recordVideo: { dir: "qa-artifacts/videos", size: viewport },
  });
  const page = await context.newPage();
  const mensagensConsole = [];
  const respostasComErro = [];
  page.on("console", (mensagem) => {
    if (mensagem.type() === "error") mensagensConsole.push(mensagem.text());
  });
  page.on("response", (resposta) => {
    if (resposta.status() >= 400) respostasComErro.push({ status: resposta.status(), url: resposta.url() });
  });
  try {
    await page.goto(baseURL, { waitUntil: "networkidle" });
    await page.getByTestId("login-email").fill(email);
    await page.getByTestId("login-senha").fill(password);
    await page.getByTestId("login-entrar").click();
    await esperarTitulo(page, "Painel");
    await roteiro(page, nome);
    resultados.push({ nome, status: "aprovado", errosConsole: mensagensConsole, respostasComErro });
  } catch (error) {
    await page.screenshot({ path: `qa-artifacts/${nome}-falha.png`, fullPage: true });
    resultados.push({ nome, status: "falhou", erro: error.message });
  } finally {
    await context.close();
  }
}

async function roteiroDesktop(page, nome) {
  const capturar = (etapa) => page.screenshot({ path: `qa-artifacts/${nome}-${etapa}.png`, fullPage: true });
  await capturar("painel");
  await page.getByTestId("nav-valores").click(); await esperarTitulo(page, "Valores lançados"); await capturar("valores");
  await page.getByTestId("novo-valor").click(); await page.waitForTimeout(250); await capturar("modal-registrar-pagamento");
  await page.getByTestId("modal-fechar").click().catch(() => page.keyboard.press("Escape"));
  await page.getByTestId("nav-salario").click(); await esperarTitulo(page, "Salário"); await page.getByTestId("nova-lista-pagamento").click(); await esperarTitulo(page, "Nova lista de pagamento"); await capturar("nova-lista-salario");
  await page.getByText("Cancelar", { exact: true }).click(); await page.waitForTimeout(150); await capturar("aviso-saida-salario");
  await page.getByTestId("confirmar-cancelar").click(); await capturar("continua-editando-salario");
  await page.getByText("Cancelar", { exact: true }).click(); await page.getByTestId("confirmar-perigo").click();
  await page.getByTestId("nav-presenca").click(); await esperarTitulo(page, "Presença"); await page.getByTestId("nova-lista").click(); await esperarTitulo(page, "Nova lista"); await capturar("nova-lista-presenca");
  await page.getByTestId("marcar-todos").click(); await capturar("presenca-marcada");
  await page.getByText("Cancelar", { exact: true }).click(); await page.getByTestId("confirmar-perigo").click();
  await page.getByTestId("nav-equipe").click(); await esperarTitulo(page, "Equipe"); await capturar("equipe");
  await page.getByTestId("novo-funcionario").click(); await page.waitForTimeout(250); await capturar("novo-funcionario");
}

async function roteiroMobile(page, nome) {
  const capturar = (etapa) => page.screenshot({ path: `qa-artifacts/${nome}-${etapa}.png`, fullPage: true });
  await capturar("painel");
  await page.getByTestId("tab-valores").click(); await esperarTitulo(page, "Valores lançados"); await capturar("valores");
  await page.getByTestId("tab-salario").click(); await esperarTitulo(page, "Salário"); await page.getByTestId("nova-lista-pagamento").click(); await esperarTitulo(page, "Nova lista de pagamento"); await capturar("nova-lista-salario");
  await page.getByText("Cancelar", { exact: true }).click(); await page.getByTestId("confirmar-perigo").click();
  await page.getByTestId("tab-presenca").click(); await esperarTitulo(page, "Presença"); await page.getByTestId("nova-lista").click(); await esperarTitulo(page, "Nova lista"); await capturar("nova-lista-presenca");
}

// Repetimos a navegação três vezes para identificar falhas de sessão, rota ou renderização.
const totalRodadas = Number(process.env.QA_LOOPS || 3);
for (let rodada = 1; rodada <= totalRodadas; rodada += 1) {
  await executar(`desktop-loop-${rodada}`, { width: 1440, height: 900 }, roteiroDesktop);
  await executar(`mobile-loop-${rodada}`, { width: 390, height: 844 }, roteiroMobile);
}
await browser.close();
console.log(JSON.stringify(resultados, null, 2));
if (resultados.some((r) => r.status === "falhou")) process.exit(1);
