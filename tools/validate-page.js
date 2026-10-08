const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "style.css"), "utf8");
const script = fs.readFileSync(path.join(root, "script.js"), "utf8");
const errors = [];

const unique = (values) => [...new Set(values)];
const matches = (source, pattern, group = 1) =>
  [...source.matchAll(pattern)].map((match) => match[group]);

function validateReferences() {
  const references = matches(
    html,
    /\b(?:href|poster|src)=["'](\.\/[^"']+)["']/g,
  ).map((reference) => decodeURIComponent(reference.slice(2).split(/[?#]/, 1)[0]));
  const missing = unique(references).filter(
    (reference) => !fs.existsSync(path.join(root, reference)),
  );
  if (missing.length) errors.push(`Arquivos locais ausentes: ${missing.join(", ")}`);
  return unique(references).length;
}

function validateIds() {
  const ids = matches(html, /\bid=["']([^"']+)["']/g);
  const duplicates = unique(ids.filter((id, index) => ids.indexOf(id) !== index));
  if (duplicates.length) errors.push(`IDs duplicados: ${duplicates.join(", ")}`);
  const labels = matches(html, /<label\b[^>]*\bfor=["']([^"']+)["']/g);
  const missingLabels = unique(labels).filter((target) => !ids.includes(target));
  if (missingLabels.length) errors.push(`Labels sem campo: ${missingLabels.join(", ")}`);
  const scriptIds = matches(script, /\$\(["']([^"']+)["']\)/g);
  const missingScriptIds = unique(scriptIds).filter((id) => !ids.includes(id));
  if (missingScriptIds.length) errors.push(`IDs do JavaScript ausentes: ${missingScriptIds.join(", ")}`);
  const anchorTargets = matches(html, /\bhref=["']#([^"']+)["']/g);
  const missingAnchors = unique(anchorTargets).filter((target) => !ids.includes(target));
  if (missingAnchors.length) errors.push(`Âncoras sem destino: ${missingAnchors.join(", ")}`);
  return ids.length;
}

function validateHtml() {
  const voidElements = new Set([
    "area", "base", "br", "col", "embed", "hr", "img", "input",
    "link", "meta", "param", "source", "track", "wbr",
  ]);
  const stack = [];
  const tokens = html.match(/<!--[\s\S]*?-->|<![^>]*>|<\/?[a-z][^>]*>/gi) || [];
  for (const token of tokens) {
    if (token.startsWith("<!--") || token.startsWith("<!")) continue;
    const tag = token.match(/^<\/?\s*([a-z][\w:-]*)/i)?.[1].toLowerCase();
    if (!tag) continue;
    if (/^<\//.test(token)) {
      const expected = stack.pop();
      if (expected !== tag) errors.push(`Fechamento inesperado: ${tag}; esperado: ${expected || "nenhum"}.`);
    } else if (!/\/>$/.test(token) && !voidElements.has(tag)) {
      stack.push(tag);
    }
  }
  if (stack.length) errors.push(`Tags sem fechamento: ${stack.join(", ")}`);
  return tokens.length;
}

function validateCss() {
  let depth = 0;
  let state = "code";
  let quote = "";
  for (let index = 0; index < css.length; index += 1) {
    const character = css[index];
    const next = css[index + 1];
    if (state === "comment") {
      if (character === "*" && next === "/") { state = "code"; index += 1; }
      continue;
    }
    if (state === "string") {
      if (character === "\\") index += 1;
      else if (character === quote) state = "code";
      continue;
    }
    if (character === "/" && next === "*") { state = "comment"; index += 1; }
    else if (character === '"' || character === "'") { state = "string"; quote = character; }
    else if (character === "{") depth += 1;
    else if (character === "}") depth -= 1;
    if (depth < 0) break;
  }
  if (state !== "code") errors.push("Comentário ou string CSS sem fechamento.");
  if (depth !== 0) errors.push(`Blocos CSS desequilibrados: ${depth}.`);
}

function validateScripts() {
  try { new vm.Script(script, { filename: "script.js" }); }
  catch (error) { errors.push(`JavaScript inválido: ${error.message}`); }
  const inlineScripts = matches(
    html,
    /<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi,
  ).filter((source) => source.trim());
  inlineScripts.forEach((source, index) => {
    try { new vm.Script(source, { filename: `index.html:inline-${index + 1}` }); }
    catch (error) { errors.push(`Script inline inválido: ${error.message}`); }
  });
  return inlineScripts.length;
}

function validateIntegrations() {
  const requirements = [
    ["Google Analytics", "G-3RQFWLHZKB"],
    ["Google Ads", "AW-18467789810"],
    ["Meta Pixel", "2117273098918269"],
    ["Microsoft Clarity", "yd7ainpuvt"],
  ];
  requirements.forEach(([name, marker]) => {
    if (!html.includes(marker)) errors.push(`${name} ausente.`);
  });
  if (!html.includes('data-clarity-mask="true"')) errors.push("Proteção do formulário no Clarity ausente.");
}

function validateJourney() {
  const requiredIds = [
    "apresentacao", "analise", "resultado", "leadForm", "presentationVideo",
    "city", "uf",
    "lp-numeros", "lp-modelo", "lp-como-funciona", "lp-institucional",
    "lp-ecossistema", "lp-perguntas", "lp-contato",
    "exploreLink", "simulador-carteira", "portfolioEstimate",
    "prova-social", "proofFilters", "proofSlider", "lightbox",
  ];
  requiredIds.forEach((id) => {
    if (!html.includes(`id="${id}"`)) errors.push(`Bloco obrigatório ausente: ${id}`);
  });
  const landingOrder = ["lp-numeros", "lp-modelo", "lp-ecossistema", "lp-como-funciona", "lp-institucional", "simulador-carteira", "prova-social", "lp-perguntas", "lp-contato"];
  const positions = landingOrder.map((id) => html.indexOf(`id="${id}"`));
  if (positions.some((position, index) => index > 0 && position <= positions[index - 1])) errors.push("Ordem das seções reveladas incorreta.");
  const modelSection = html.match(/<section[^>]*id="lp-modelo"[\s\S]*?<\/section>/)?.[0] || "";
  if ((modelSection.match(/<article>/g) || []).length !== 6) errors.push("A seção unificada deve conter seis cards.");
  if (html.includes('id="lp-estrutura"') || html.includes("APOIO PARA A OPERAÇÃO")) errors.push("A seção antiga de apoio não foi removida por completo.");
  const mediaCount = matches(html, /<(?:video|iframe)\b/gi, 0).length;
  if (mediaCount !== 1) errors.push(`A página deve ter um único player; encontrados: ${mediaCount}.`);
  if ((script.match(/\bconst CONFIG\b/g) || []).length !== 1) errors.push("CONFIG deve existir uma única vez.");
  const questionOrder = ["name", "email", "phone", "location", "goal", "experience", "investment", "availability"];
  const questionPositions = questionOrder.map((question) => html.indexOf(`data-question="${question}"`));
  if (questionPositions.some((position, index) => position < 0 || (index > 0 && position <= questionPositions[index - 1]))) errors.push("Ordem das perguntas do funil incorreta.");
  const investmentStep = html.match(/<fieldset[^>]*data-question="investment"[\s\S]*?<\/fieldset>/)?.[0] || "";
  if ((investmentStep.match(/name="investment"/g) || []).length !== 5) errors.push("A pergunta de investimento deve ter cinco opções.");
  if (!script.includes('sheetSiteId: "rendaverde-igreen"')) errors.push("site_id original não foi preservado.");
  if (!script.includes('landingPageId: "lp-unificada"')) errors.push("landing_page_id novo não foi aplicado.");
  if (!script.includes('["localhost", "127.0.0.1"].includes(location.hostname)')) errors.push("Bloqueio local de leads ausente.");
  if (!/<div class="lp-content" id="lpContent" hidden inert>/.test(html)) errors.push("LP deve iniciar com hidden e inert.");
  if (!/<footer class="site-footer" id="lpFooter" hidden inert>/.test(html)) errors.push("Rodapé deve iniciar oculto.");
  if (!script.includes('$("exploreLink").addEventListener("click", scrollToLandingContent)')) errors.push("Navegação da opção de explorar a LP ausente.");
  if (!/function showResult[\s\S]*?showView\("result"\);\s*unlockLandingContent\(\)/.test(script)) errors.push("LP deve ser liberada automaticamente ao mostrar o resultado.");
  const resultOptions = html.match(/<div class="result-options"[\s\S]*?<\/div>/)?.[0] || "";
  if ((resultOptions.match(/class="option(?:\s[^"]*)?"/g) || []).length !== 3) errors.push("O resultado deve apresentar três opções equivalentes.");
  if (!/id="contactLink"[\s\S]*id="exploreLink"[\s\S]*id="selfLink"/.test(resultOptions)) errors.push("A opção de explorar deve ocupar a posição central fixa.");
  if (script.includes("shuffleResultOptions") || script.includes(".sort(() => Math.random()")) errors.push("As opções do resultado não podem ser embaralhadas.");
  const landingMarkup = html.slice(html.indexOf('<div class="lp-content"'), html.indexOf("</main>"));
  if (landingMarkup.includes("data-start-quiz")) errors.push("CTA da LP não pode reiniciar o funil.");
  if ((landingMarkup.match(/data-lp-contact/g) || []).length < 2 || (landingMarkup.match(/data-lp-self/g) || []).length < 2) errors.push("CTAs da LP devem oferecer WhatsApp e auto conexão.");
  ["--bg: #070909", "--bg2: #0d1010", "--panel: #111515", "--panel2: #0b0f0d", "--green: #00e110", "--green2: #00f572"].forEach((token) => {
    if (!css.includes(token)) errors.push(`Token original ausente: ${token}`);
  });
  ["tipo", "lead_id", "landing_page_id", "nome", "email", "whatsapp", "cidade", "uf", "investimento_faixa", "objetivo", "experiencia_vendas", "disponibilidade", "perfil", "score", "rota_resultado", "momento"].forEach((field) => {
    if (!script.includes(`${field}:`)) errors.push(`Campo do payload ausente: ${field}`);
  });
}

function validateContentPolicy() {
  const withoutComments = html.replace(/<!--[\s\S]*?-->/g, "");
  const withoutInlineScripts = withoutComments.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  const forbidden = /R\$|%|gratuit|grátis|à vista|12x|investimento|bônus|royalt|comiss/i;
  let outsideAllowedHtml = ["lp-numeros", "simulador-carteira", "prova-social"].reduce(
    (source, id) => source.replace(new RegExp(`<section[^>]*id=["']${id}["'][\\s\\S]*?<\\/section>`, "i"), ""),
    withoutInlineScripts,
  );
  outsideAllowedHtml = outsideAllowedHtml.replace(/<fieldset[^>]*data-question="investment"[\s\S]*?<\/fieldset>/i, "");
  const outsideAllowedScript = script.split("// 08 · Simulador de carteira recorrente")[0].replace(/investimento_faixa/g, "");
  const htmlMatch = outsideAllowedHtml.match(forbidden);
  const scriptMatch = outsideAllowedScript.match(forbidden);
  if (htmlMatch) errors.push(`Termo não aprovado no HTML público: ${htmlMatch[0]}`);
  if (scriptMatch) errors.push(`Termo não aprovado no JavaScript: ${scriptMatch[0]}`);
}

const references = validateReferences();
const ids = validateIds();
const elements = validateHtml();
validateCss();
const inlineScripts = validateScripts();
validateIntegrations();
validateJourney();
validateContentPolicy();

if (errors.length) {
  console.error("Validação reprovada:\n");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Validação concluída sem erros.");
console.log(`- ${elements} elementos HTML analisados`);
console.log(`- ${ids} IDs únicos verificados`);
console.log(`- ${references} arquivos locais encontrados`);
console.log(`- ${inlineScripts} scripts inline verificados`);
console.log("- Funil, payload, integrações e política de conteúdo verificados");
