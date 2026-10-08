const ENDPOINT = "https://script.google.com/macros/s/AKfycbwrCkcX0mvzbihwCQVqYVoKgnTStFOPb6qkco_47DFNLrP6o1LMoOjErDqX5LyYGgH45Q/exec";

if (!process.argv.includes("--confirm-send")) {
  console.log("Envio bloqueado. Execute novamente com --confirm-send após aplicar o patch no Apps Script.");
  process.exit(0);
}

const leadId = `codex-test-${Date.now()}`;
const payload = {
  site_id: "rendaverde-igreen",
  tipo: "licenciado",
  lead_id: leadId,
  landing_page_id: "lp-unificada",
  nome: "TESTE CODEX — APAGAR",
  email: "teste.codex.apagar@example.invalid",
  whatsapp: "(00) 00000-0000",
  cidade: "Vitória",
  uf: "ES",
  investimento_faixa: "De R$ 1.001 a R$ 1.500",
  objetivo: "empreender",
  experiencia_vendas: "sim",
  disponibilidade: "meio_periodo",
  perfil: "empreendedor",
  score: 0,
  rota_resultado: "Escolha entre atendimento e auto conexão",
  momento: "TESTE automatizado do endpoint",
  utm_source: "codex_test",
  utm_medium: "integration_test",
  utm_campaign: "lp_unificada_novos_campos",
  utm_content: "teste_apagar",
  gclid: "",
  fbclid: "",
  page_url: "https://example.invalid/lp-unificada-teste",
};

async function main() {
  const body = new URLSearchParams();
  body.set("payload", JSON.stringify(payload));
  const response = await fetch(ENDPOINT, { method: "POST", body, redirect: "follow" });
  const responseBody = await response.text();
  console.log(`HTTP ${response.status} ${response.statusText}`);
  console.log(responseBody);

  let result;
  try {
    result = JSON.parse(responseBody);
  } catch {
    throw new Error("O endpoint não retornou JSON; a gravação não foi confirmada.");
  }
  if (!response.ok || !result.ok || result.status !== "saved")
    throw new Error("O endpoint não confirmou status saved.");
  if (!Number.isInteger(result.row) || !result.columns?.cidade || !result.columns?.uf || !result.columns?.investimento_faixa)
    throw new Error("O receptor respondeu saved, mas não informou linha e colunas; confirme a implantação do patch.");

  console.log(`CONFIRMADO · aba Licenciados · linha ${result.row}`);
  console.log(`Colunas: cidade=${result.columns.cidade}, uf=${result.columns.uf}, investimento_faixa=${result.columns.investimento_faixa}`);
  console.log(`Lead ID para conferência: ${leadId}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
