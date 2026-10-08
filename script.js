/*
  SCRIPT · ÍNDICE
  01 Configuração e estado · 02 Navegação do funil · 03 Validação
  04 Player e progresso · 05 Classificação · 06 Payload e envio
  07 Resultado e revelação da LP · 08 Simulador · 09 Prova social e lightbox
*/

// 01 · Configuração única da página.
const CONFIG = {
  videoId: "qdeblguZdGc",
  checkoutUrl: "https://expansao.igreenenergy.com.br/?id=29284&checkout=true",
  whatsappNumber: "5527988021747",
  sheetEndpoint:
    "https://script.google.com/macros/s/AKfycbwrCkcX0mvzbihwCQVqYVoKgnTStFOPb6qkco_47DFNLrP6o1LMoOjErDqX5LyYGgH45Q/exec",
  sheetSiteId: "rendaverde-igreen",
  landingPageId: "lp-unificada",
};

const $ = (id) => document.getElementById(id);
const form = $("leadForm");
const errorBox = $("formError");
const questionSteps = [...form.querySelectorAll(".quiz-step")];
const sections = {
  intro: $("apresentacao"),
  quiz: $("analise"),
  result: $("resultado"),
};
const isLocalPreview =
  location.protocol === "file:" ||
  ["localhost", "127.0.0.1"].includes(location.hostname);
let currentQuestionIndex = 0;
let lead = null;

function eventTrack(name, params = {}) {
  if (typeof window.gtag === "function") window.gtag("event", name, params);
  if (typeof window.clarity === "function") window.clarity("event", name);
}
function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
}
function clearError() {
  errorBox.textContent = "";
  errorBox.hidden = true;
}
function selected(name) {
  return form.querySelector(`input[name="${name}"]:checked`)?.value || "";
}
function focusHeading(id) {
  $(id).focus({ preventScroll: true });
}

// Cada fase substitui a anterior na mesma posição, sem deslocamento animado da página.
function showView(view) {
  for (const [name, section] of Object.entries(sections))
    section.hidden = name !== view;
  document.body.dataset.view = view;
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  if (view === "quiz") focusHeading("quiz-title");
  if (view === "result") focusHeading("result-title");
}
function showQuestion(index) {
  currentQuestionIndex = index;
  questionSteps.forEach((step, position) => {
    step.hidden = position !== index;
  });
  const step = questionSteps[index];
  $("quiz-title").textContent = step.dataset.title;
  $("quizSubtitle").textContent = step.dataset.subtitle;
  $("nextQuestion").hidden = index === questionSteps.length - 1;
  $("submitLead").hidden = index !== questionSteps.length - 1;
  $("backQuestion").textContent = index === 0 ? "VOLTAR AO VÍDEO" : "VOLTAR";
  clearError();
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  focusHeading("quiz-title");
}
function startQuiz() {
  hideLandingContent();
  if (player?.pauseVideo) player.pauseVideo();
  else iframe.src = iframe.src; // Interrompe o áudio quando a API externa ainda não carregou.
  showView("quiz");
  showQuestion(0);
  eventTrack("quiz_iniciado", { lp: CONFIG.landingPageId });
}
document
  .querySelectorAll("[data-start-quiz]")
  .forEach((button) => button.addEventListener("click", startQuiz));
document.querySelector(".brand").addEventListener("click", (event) => {
  if (document.body.dataset.view === "intro") return;
  event.preventDefault();
  hideLandingContent();
  showView("intro");
});

function validateQuestion(index, includeConsent = false) {
  const name = $("name").value.trim();
  const email = $("email").value.trim();
  const phone = $("phone").value.replace(/\D/g, "");
  switch (questionSteps[index].dataset.question) {
    case "name":
      if (name.length < 2) {
        showError("Informe seu nome para continuar.");
        $("name").focus();
        return false;
      }
      break;
    case "email":
      if (!email || !$("email").checkValidity()) {
        showError("Informe um e-mail válido.");
        $("email").focus();
        return false;
      }
      break;
    case "phone":
      if (phone.length !== 10 && phone.length !== 11) {
        showError("Informe um WhatsApp com DDD.");
        $("phone").focus();
        return false;
      }
      break;
    case "location": {
      const city = $("city").value.trim();
      if ((city.match(/\p{L}/gu) || []).length < 2) {
        showError("Informe uma cidade com pelo menos duas letras.");
        $("city").focus();
        return false;
      }
      if (!$("uf").value) {
        showError("Selecione a UF para continuar.");
        $("uf").focus();
        return false;
      }
      break;
    }
    case "goal":
      if (!selected("goal")) {
        showError("Escolha o que você busca agora.");
        return false;
      }
      break;
    case "experience":
      if (!selected("experience")) {
        showError("Escolha uma resposta para continuar.");
        return false;
      }
      break;
    case "investment":
      if (!selected("investment")) {
        showError("Escolha uma faixa para continuar.");
        return false;
      }
      break;
    case "availability":
      if (!selected("availability")) {
        showError("Escolha quanto tempo pode dedicar.");
        return false;
      }
      if (includeConsent && !$("consent").checked) {
        showError("Confirme a autorização de contato para continuar.");
        $("consent").focus();
        return false;
      }
      break;
  }
  clearError();
  return true;
}
function advanceQuestion() {
  if (!validateQuestion(currentQuestionIndex)) return;
  if (currentQuestionIndex === 2)
    eventTrack("quiz_contato_preenchido", { lp: CONFIG.landingPageId });
  if (currentQuestionIndex < questionSteps.length - 1)
    showQuestion(currentQuestionIndex + 1);
}
$("nextQuestion").addEventListener("click", advanceQuestion);
$("backQuestion").addEventListener("click", () => {
  if (currentQuestionIndex === 0) showView("intro");
  else showQuestion(currentQuestionIndex - 1);
});
form.addEventListener("keydown", (event) => {
  if (
    event.key === "Enter" &&
    event.target.matches(
      'input[type="text"], input[type="email"], input[type="tel"]',
    )
  ) {
    event.preventDefault();
    advanceQuestion();
  }
});
form.querySelectorAll('input[type="radio"]').forEach((input) =>
  input.addEventListener("change", () => {
    const activeIndex = currentQuestionIndex;
    if (
      activeIndex >= questionSteps.length - 1 ||
      input.name !== questionSteps[activeIndex].dataset.question
    )
      return;
    window.setTimeout(() => {
      if (currentQuestionIndex === activeIndex) advanceQuestion();
    }, 180);
  }),
);
$("phone").addEventListener("input", (event) => {
  const digits = event.target.value.replace(/\D/g, "").slice(0, 11);
  event.target.value =
    digits.length <= 2
      ? digits
      : digits.length <= 6
        ? `(${digits.slice(0, 2)}) ${digits.slice(2)}`
        : digits.length <= 10
          ? `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
          : `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
});

// Player oficial: o acompanhamento do vídeo é informativo e não bloqueia o quiz.
let player = null;
let progressTimer = null;
const iframe = $("presentationVideo");
if (!iframe.src.includes(`/embed/${CONFIG.videoId}?`))
  iframe.src = `https://www.youtube.com/embed/${encodeURIComponent(CONFIG.videoId)}?enablejsapi=1&playsinline=1&rel=0`;
$("videoFallback").href =
  `https://www.youtube.com/watch?v=${encodeURIComponent(CONFIG.videoId)}`;
function refreshWatchProgress() {
  if (!player || typeof player.getDuration !== "function") return;
  const duration = Number(player.getDuration());
  const time = Number(player.getCurrentTime());
  if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(time))
    return;
  const progress = Math.min(
    100,
    Math.max(0, Math.round((time / duration) * 100)),
  );
  $("watchProgress").style.setProperty("--watch-progress", progress / 100);
  if (progress >= 90)
    $("watchStatus").textContent = "Você já pode descobrir seu próximo passo.";
  else if (progress >= 40)
    $("watchStatus").textContent =
      "Continue assistindo. Há mais para descobrir.";
}
window.onYouTubeIframeAPIReady = () => {
  if (!window.YT?.Player) return;
  player = new YT.Player("presentationVideo", {
    events: {
      onReady: () => {
        progressTimer = window.setInterval(refreshWatchProgress, 1000);
      },
      onStateChange: (event) => {
        if (event.data === window.YT.PlayerState.PLAYING)
          eventTrack("video_iniciado", { lp: CONFIG.landingPageId });
        if (event.data === window.YT.PlayerState.ENDED) {
          $("watchProgress").style.setProperty("--watch-progress", 1);
          $("watchStatus").textContent =
            "Apresentação concluída. Descubra seu próximo passo.";
          eventTrack("video_concluido", { lp: CONFIG.landingPageId });
        }
      },
    },
  });
};
$("videoCover").addEventListener("click", () => {
  $("videoCover").hidden = true;
  if (player?.playVideo) player.playVideo();
  eventTrack("video_capa_clicada", { lp: CONFIG.landingPageId });
});
const youtubeApi = document.createElement("script");
youtubeApi.src = "https://www.youtube.com/iframe_api";
youtubeApi.async = true;
document.head.appendChild(youtubeApi);
window.addEventListener("pagehide", () => {
  if (progressTimer) clearInterval(progressTimer);
});

function classify(goal, experience, availability) {
  if (
    goal === "empreender" ||
    (goal === "renda_principal" && availability === "integral")
  )
    return {
      id: "empreendedor",
      text: "Seu perfil aponta para uma construção mais ampla. Vale entender como o licenciamento pode entrar no seu plano de crescimento e quais condições fazem sentido para você.",
    };
  if (experience === "sim" && goal === "renda_principal")
    return {
      id: "comercial",
      text: "Sua experiência comercial pode ajudar a começar com clareza. Conheça o modelo, o suporte e as possibilidades antes de decidir como avançar.",
    };
  return {
    id: "renda_extra",
    text: "Você pode começar conhecendo o modelo no seu ritmo. Veja como a iGreen reúne soluções essenciais e escolha a melhor forma de tirar suas dúvidas.",
  };
}
function tracking() {
  const params = new URLSearchParams(location.search);
  return {
    utm_source: params.get("utm_source") || "",
    utm_medium: params.get("utm_medium") || "",
    utm_campaign: params.get("utm_campaign") || "",
    utm_content: params.get("utm_content") || "",
    gclid: params.get("gclid") || "",
    fbclid: params.get("fbclid") || "",
    page_url: location.href,
  };
}
function makeLead() {
  const goal = selected("goal"),
    experience = selected("experience"),
    availability = selected("availability");
  const profile = classify(goal, experience, availability);
  return {
    tipo: "licenciado",
    lead_id:
      lead?.lead_id ||
      window.crypto?.randomUUID?.() ||
      `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    landing_page_id: CONFIG.landingPageId,
    nome: $("name").value.trim(),
    email: $("email").value.trim(),
    whatsapp: $("phone").value.trim(),
    cidade: $("city").value.trim(),
    uf: $("uf").value,
    investimento_faixa: selected("investment"),
    objetivo: goal,
    experiencia_vendas: experience,
    disponibilidade: availability,
    perfil: profile.id,
    score: 0,
    rota_resultado: "Escolha entre atendimento e auto conexão",
    momento: "Concluiu LP de vídeo e triagem",
    ...tracking(),
  };
}
async function sendLead(data) {
  const payload = { site_id: CONFIG.sheetSiteId, ...data };
  if (isLocalPreview) {
    console.info("Lead local (não enviado):", payload);
    return "local";
  }
  if (!CONFIG.sheetEndpoint) return false;
  const body = new URLSearchParams();
  body.set("payload", JSON.stringify(payload));
  try {
    if (navigator.sendBeacon?.(CONFIG.sheetEndpoint, body)) return true;
    await fetch(CONFIG.sheetEndpoint, {
      method: "POST",
      mode: "no-cors",
      body,
      keepalive: true,
    });
    return true;
  } catch (error) {
    console.warn("Transmissão do lead indisponível", error);
    return false;
  }
}
function whatsappLink(data) {
  const goals = {
    renda_extra: "renda extra",
    renda_principal: "renda principal",
    empreender: "empreender",
  };
  const message = [
    `Olá! Sou ${data.nome} e conheci a oportunidade iGreen pela LP de vídeo.`,
    `Meu objetivo: ${goals[data.objetivo] || data.objetivo}.`,
    `Experiência com vendas: ${data.experiencia_vendas === "sim" ? "sim" : "ainda não"}.`,
    `Disponibilidade: ${data.disponibilidade.replace(/_/g, " ")}.`,
    "Gostaria de entender os próximos passos para o licenciamento.",
  ].join("\n");
  return `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
}
function hideLandingContent() {
  $("lpContent").hidden = true;
  $("lpContent").inert = true;
  $("lpFooter").hidden = true;
  $("lpFooter").inert = true;
  stopProofAutoplay?.();
}
function syncLandingActions(data) {
  const contactHref = whatsappLink(data);
  document.querySelectorAll("[data-lp-contact]").forEach((link) => {
    link.href = contactHref;
  });
  document.querySelectorAll("[data-lp-self]").forEach((link) => {
    link.href = CONFIG.checkoutUrl;
  });
}
function unlockLandingContent() {
  $("lpContent").hidden = false;
  $("lpContent").inert = false;
  $("lpFooter").hidden = false;
  $("lpFooter").inert = false;
  startProofAutoplay();
}
function scrollToLandingContent(event) {
  event.preventDefault();
  $("lp-numeros").scrollIntoView({ behavior: "smooth", block: "start" });
  eventTrack("conteudo_lp_acessado", { lp: CONFIG.landingPageId });
}
function showResult(data) {
  const profile = classify(
    data.objetivo,
    data.experiencia_vendas,
    data.disponibilidade,
  );
  $("firstName").textContent = data.nome.split(/\s+/)[0];
  $("profileMessage").textContent = profile.text;
  $("contactLink").href = whatsappLink(data);
  $("selfLink").href = CONFIG.checkoutUrl;
  syncLandingActions(data);
  showView("result");
  unlockLandingContent();
  eventTrack("quiz_concluido", {
    lp: CONFIG.landingPageId,
    perfil: profile.id,
  });
}
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  for (let index = 0; index < questionSteps.length; index++) {
    if (!validateQuestion(index, index === questionSteps.length - 1)) {
      showQuestion(index);
      validateQuestion(index, index === questionSteps.length - 1);
      return;
    }
  }
  const button = $("submitLead");
  button.disabled = true;
  button.textContent = "PREPARANDO SEU RESULTADO...";
  lead = makeLead();
  const transmitted = await sendLead(lead);
  if (transmitted === "local")
    eventTrack("lead_teste_local", { lp: CONFIG.landingPageId });
  else if (!transmitted)
    eventTrack("lead_transmissao_falhou", { lp: CONFIG.landingPageId });
  else eventTrack("lead_transmissao_tentada", { lp: CONFIG.landingPageId });
  showResult(lead);
  button.disabled = false;
  button.innerHTML = 'VER MEU PRÓXIMO PASSO <span aria-hidden="true">→</span>';
});
$("contactLink").addEventListener("click", () =>
  eventTrack("whatsapp_aberto", {
    lp: CONFIG.landingPageId,
    perfil: lead?.perfil,
  }),
);
$("selfLink").addEventListener("click", () =>
  eventTrack("auto_conexao_aberta", {
    lp: CONFIG.landingPageId,
    perfil: lead?.perfil,
  }),
);
$("exploreLink").addEventListener("click", scrollToLandingContent);
$("editAnswers").addEventListener("click", () => {
  hideLandingContent();
  showView("quiz");
  showQuestion(0);
});

// 08 · Simulador de carteira recorrente
const portfolioSimulator = $("simulador-carteira");
if (portfolioSimulator) {
  const SIM_SETTINGS = Object.freeze({
    licensee: Object.freeze({
      energyBasisPoints: Object.freeze([200, 400]),
      telecomCashbackCents: 700,
      insuranceBasisPoints: 500,
    }),
    referrer: Object.freeze({
      energyBasisPoints: Object.freeze({
        range: Object.freeze([100, 200]),
        A: Object.freeze([200, 200]),
        B: Object.freeze([100, 100]),
        C: Object.freeze([50, 50]),
      }),
      telecomMinimumCents: 5490,
      telecomCashbackCents: 350,
      insuranceBasisPoints: 250,
    }),
    maxClients: 1000,
    maxAmount: 100000,
  });
  const simState = {
    licensee: { energyBase: 500, energyCount: 10, energyRule: "range", telecomPlan: 54.9, telecomCount: 10, insuranceBase: 300, insuranceCount: 10 },
    referrer: { energyBase: 200, energyCount: 10, energyRule: "range", telecomPlan: 54.9, telecomCount: 10, insuranceBase: 200, insuranceCount: 10 },
  };
  const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const simFields = [...portfolioSimulator.querySelectorAll("[data-sim-field]")];
  const simField = Object.fromEntries(simFields.map((field) => [field.dataset.simField, field]));
  const profileButtons = [...portfolioSimulator.querySelectorAll("[data-sim-profile]")];
  let activeProfile = "licensee";
  let simulatorTracked = false;

  const simMoney = (cents) => currency.format(cents / 100);
  const simRange = (minimum, maximum) => minimum === maximum ? simMoney(minimum) : `${simMoney(minimum)} a ${simMoney(maximum)}`;
  const simPercent = (basisPoints) => `${String(basisPoints / 100).replace(".", ",")}%`;
  function simSetText(selector, value) {
    portfolioSimulator.querySelector(selector).textContent = value;
  }
  function simReadCount(name) {
    const value = simField[name].valueAsNumber;
    if (!Number.isInteger(value) || value < 0 || value > SIM_SETTINGS.maxClients)
      throw new RangeError("Informe de 0 a 1.000 clientes, sem casas decimais.");
    return value;
  }
  function simReadAmount(name, minimum = 0) {
    const value = simField[name].valueAsNumber;
    if (!Number.isFinite(value) || value < minimum || value > SIM_SETTINGS.maxAmount || Math.abs(value * 100 - Math.round(value * 100)) > 0.000001)
      throw new RangeError(`Informe valores entre ${currency.format(minimum)} e ${currency.format(SIM_SETTINGS.maxAmount)}, com até duas casas decimais.`);
    return value;
  }
  function calculateSimulation(input) {
    const settings = SIM_SETTINGS[input.profile];
    const energyRates = input.profile === "licensee" ? settings.energyBasisPoints : settings.energyBasisPoints[input.energyRule];
    if (!energyRates) throw new RangeError("Selecione uma regra válida de energia.");
    const energyCents = Math.round(input.energyBase * 100);
    const insuranceCents = Math.round(input.insuranceBase * 100);
    const energyMin = input.energyCount * Math.round((energyCents * energyRates[0]) / 10000);
    const energyMax = input.energyCount * Math.round((energyCents * energyRates[1]) / 10000);
    const telecom = input.telecomCount * settings.telecomCashbackCents;
    const insurance = input.insuranceCount * Math.round((insuranceCents * settings.insuranceBasisPoints) / 10000);
    const result = { energyMin, energyMax, telecom, insurance, totalMin: energyMin + telecom + insurance, totalMax: energyMax + telecom + insurance };
    if (input.profile === "referrer") {
      const telecomPlanCents = Math.round(input.telecomPlan * 100);
      result.telecomPlanCents = telecomPlanCents;
      result.telecomRemaining = Math.max(0, telecomPlanCents - telecom);
      result.telecomCredit = Math.max(0, telecom - telecomPlanCents);
      result.telecomTarget = Math.ceil(telecomPlanCents / settings.telecomCashbackCents);
    }
    return result;
  }
  function readSimulation() {
    return {
      profile: activeProfile,
      energyBase: simReadAmount("energyBase"),
      energyCount: simReadCount("energyCount"),
      energyRule: simField.energyRule.value,
      telecomPlan: activeProfile === "referrer" ? simReadAmount("telecomPlan", 54.9) : simField.telecomPlan.valueAsNumber,
      telecomCount: simReadCount("telecomCount"),
      insuranceBase: simReadAmount("insuranceBase"),
      insuranceCount: simReadCount("insuranceCount"),
    };
  }
  function saveSimulationState() {
    for (const [name, field] of Object.entries(simField))
      simState[activeProfile][name] = field.tagName === "SELECT" ? field.value : field.valueAsNumber;
  }
  function loadSimulationState(profile) {
    for (const [name, value] of Object.entries(simState[profile])) simField[name].value = String(value);
  }
  function configureSimulationProfile() {
    const referrer = activeProfile === "referrer";
    $("sim-energy-rule-wrap").hidden = !referrer;
    $("sim-telecom-plan-wrap").hidden = !referrer;
    $("sim-licensee-actions").hidden = referrer;
    $("sim-referrer-actions").hidden = !referrer;
    $("sim-licensee-sources").hidden = referrer;
    $("sim-referrer-sources").hidden = !referrer;
    portfolioSimulator.querySelector("[data-sim-goal]").hidden = !referrer;
    $("sim-energy-base-label").textContent = referrer ? "Boleto mensal (R$)" : "Conta mensal (R$)";
    $("sim-energy-note").textContent = referrer ? "Cashback conforme a distribuidora." : "Conforme categoria de bônus e contrato.";
    $("sim-energy-help").textContent = referrer ? "Parcela elegível por cliente." : "Base elegível por cliente.";
    $("sim-telecom-rate").textContent = referrer ? "R$ 3,50" : "R$ 7,00";
    $("sim-telecom-note").textContent = referrer ? "Cashback fixo por indicação paga." : "Por conexão elegível e paga.";
    $("sim-insurance-rate").textContent = referrer ? "2,5%" : "5%";
    $("sim-insurance-note").textContent = referrer ? "Taxa de simulação a confirmar." : "Referência informada; confirme a regra vigente.";
    $("sim-insurance-term").textContent = referrer ? "Seguros · a confirmar" : "Seguros";
    $("sim-result-note").textContent = referrer ? "Estimativa com indicações pagas. Seguros a confirmar." : "Estimativa com clientes ativos e pagamentos elegíveis.";
    $("sim-disclaimer").textContent = referrer
      ? "Estimativa condicionada a clientes ativos, pagamentos e elegibilidade. Os benefícios têm regras de uso próprias e não representam uma renda garantida ou um saldo único para saque. Em Telecom, o cashback abate sua fatura e o excedente fica para as próximas."
      : "Cálculo ilustrativo, sem garantia de renda. O resultado depende de clientes ativos, pagamentos, elegibilidade, categoria de bônus e regras contratuais vigentes. Valores de geração própria usados como referência.";
  }
  function updateSimulation() {
    const error = $("sim-error");
    try {
      const input = readSimulation();
      const result = calculateSimulation(input);
      saveSimulationState();
      error.hidden = true;
      error.textContent = "";
      simSetText("[data-sim-total]", simRange(result.totalMin, result.totalMax));
      simSetText("[data-sim-energy]", simRange(result.energyMin, result.energyMax));
      simSetText("[data-sim-telecom]", simMoney(result.telecom));
      simSetText("[data-sim-insurance]", simMoney(result.insurance));
      const energyRates = activeProfile === "licensee" ? SIM_SETTINGS.licensee.energyBasisPoints : SIM_SETTINGS.referrer.energyBasisPoints[input.energyRule];
      $("sim-energy-rate").textContent = energyRates[0] === energyRates[1] ? simPercent(energyRates[0]) : `${simPercent(energyRates[0])} a ${simPercent(energyRates[1])}`;
      if (activeProfile === "referrer") {
        const telecomGoal = result.telecomRemaining > 0
          ? `Telecom: restam ${simMoney(result.telecomRemaining)} do seu plano de ${simMoney(result.telecomPlanCents)}. Meta para cobri-lo: ${result.telecomTarget} indicações pagas.`
          : `Telecom: plano de ${simMoney(result.telecomPlanCents)} coberto neste cenário. Crédito para próximas faturas: ${simMoney(result.telecomCredit)}.`;
        simSetText("[data-sim-goal]", telecomGoal);
      }
      portfolioSimulator.querySelectorAll(".sim-result a").forEach((link) => link.removeAttribute("aria-disabled"));
    } catch (reason) {
      error.textContent = reason.message;
      error.hidden = false;
      ["[data-sim-total]", "[data-sim-energy]", "[data-sim-telecom]", "[data-sim-insurance]"].forEach((selector) => simSetText(selector, "—"));
      if (activeProfile === "referrer") simSetText("[data-sim-goal]", "Revise os campos para atualizar a estimativa.");
      portfolioSimulator.querySelectorAll(".sim-result a").forEach((link) => link.setAttribute("aria-disabled", "true"));
    }
    portfolioSimulator.querySelectorAll("[data-sim-step]").forEach((button) => {
      const value = $(button.dataset.simTarget).valueAsNumber;
      button.disabled = Number(button.dataset.simStep) < 0 ? value <= 0 : value >= SIM_SETTINGS.maxClients;
    });
  }
  function setSimulationProfile(profile, track = true) {
    activeProfile = profile;
    loadSimulationState(profile);
    profileButtons.forEach((button) => {
      const active = button.dataset.simProfile === profile;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    configureSimulationProfile();
    updateSimulation();
    if (track) eventTrack("simulador_carteira_perfil", { simulator_profile: activeProfile });
  }
  profileButtons.forEach((button) => button.addEventListener("click", () => setSimulationProfile(button.dataset.simProfile)));
  simFields.forEach((field) => field.addEventListener("input", () => {
    updateSimulation();
    if (!simulatorTracked) {
      simulatorTracked = true;
      eventTrack("simulador_carteira_iniciado", { simulator_profile: activeProfile });
    }
  }));
  portfolioSimulator.querySelectorAll("[data-sim-step]").forEach((button) => button.addEventListener("click", () => {
    const field = $(button.dataset.simTarget);
    const previous = Number.isFinite(field.valueAsNumber) ? Math.trunc(field.valueAsNumber) : 0;
    field.value = String(Math.min(SIM_SETTINGS.maxClients, Math.max(0, previous + Number(button.dataset.simStep))));
    field.dispatchEvent(new Event("input", { bubbles: true }));
  }));
  portfolioSimulator.querySelectorAll(".sim-result a").forEach((link) => link.addEventListener("click", (event) => {
    if (link.getAttribute("aria-disabled") === "true") event.preventDefault();
    else eventTrack("simulador_carteira_cta", { simulator_profile: activeProfile });
  }));
  setSimulationProfile("licensee", false);
}

// 09 · Prova social, filtros e lightbox
const proofSlider = $("proofSlider");
const proofSlides = [...document.querySelectorAll(".proof-slide")];
const proofFilterButtons = [...document.querySelectorAll(".proof-filter")];
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let activeProofFilter = "Todos";
let visibleProofSlides = [...proofSlides];
let proofIndex = 0;
let proofTimer = null;
let proofProgressTimer = null;
let proofProgress = 0;
const proofIntervalMs = 5200;
const pad2 = (value) => String(value).padStart(2, "0");
function updateProof(index, resetProgress = true) {
  if (!visibleProofSlides.length) return;
  proofIndex = (index + visibleProofSlides.length) % visibleProofSlides.length;
  proofSlides.forEach((slide) => slide.classList.remove("is-active"));
  const active = visibleProofSlides[proofIndex];
  active.classList.add("is-active");
  $("proofCategory").textContent = active.dataset.category || "Resultado";
  $("proofTitle").textContent = active.dataset.title || "Destaque";
  $("proofLocation").textContent = active.dataset.location || "";
  $("proofMetric").textContent = active.dataset.metric || "Resultado em destaque";
  $("proofCurrent").textContent = pad2(proofIndex + 1);
  $("proofTotal").textContent = pad2(visibleProofSlides.length);
  if (resetProgress) {
    proofProgress = 0;
    $("proofProgressBar").style.width = "0%";
  }
}
function stopProofAutoplay() {
  if (proofTimer) window.clearInterval(proofTimer);
  if (proofProgressTimer) window.clearInterval(proofProgressTimer);
  proofTimer = null;
  proofProgressTimer = null;
}
function startProofAutoplay() {
  if (prefersReducedMotion || visibleProofSlides.length < 2 || $("lpContent").hidden) return;
  stopProofAutoplay();
  proofProgress = 0;
  proofTimer = window.setInterval(() => updateProof(proofIndex + 1), proofIntervalMs);
  proofProgressTimer = window.setInterval(() => {
    proofProgress += 100 / (proofIntervalMs / 100);
    if (proofProgress >= 100) proofProgress = 0;
    $("proofProgressBar").style.width = `${proofProgress}%`;
  }, 100);
}
function rebuildVisibleProofs() {
  visibleProofSlides = proofSlides.filter((slide) => activeProofFilter === "Todos" || slide.dataset.category === activeProofFilter);
  proofSlides.forEach((slide) => slide.classList.toggle("is-filtered-out", !visibleProofSlides.includes(slide)));
  proofIndex = 0;
  updateProof(0);
  startProofAutoplay();
}
proofFilterButtons.forEach((button) => button.addEventListener("click", () => {
  activeProofFilter = button.dataset.filter || "Todos";
  proofFilterButtons.forEach((item) => item.classList.toggle("is-active", item === button));
  rebuildVisibleProofs();
}));
$("proofPrev").addEventListener("click", () => { updateProof(proofIndex - 1); startProofAutoplay(); });
$("proofNext").addEventListener("click", () => { updateProof(proofIndex + 1); startProofAutoplay(); });
proofSlider.addEventListener("mouseenter", stopProofAutoplay);
proofSlider.addEventListener("mouseleave", startProofAutoplay);
proofSlider.addEventListener("focusin", stopProofAutoplay);
proofSlider.addEventListener("focusout", startProofAutoplay);
const lightbox = $("lightbox");
const lightboxImage = $("lightboxImage");
let lastLightboxTrigger = null;
function openLightbox(img, trigger) {
  lastLightboxTrigger = trigger;
  lightboxImage.src = img.src;
  lightboxImage.alt = img.alt;
  lightbox.classList.add("is-open");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.classList.add("lightbox-open");
  $("lightboxClose").focus();
}
function closeLightbox() {
  lightbox.classList.remove("is-open");
  lightbox.setAttribute("aria-hidden", "true");
  document.body.classList.remove("lightbox-open");
  lastLightboxTrigger?.focus();
}
document.querySelectorAll(".proof-image-button").forEach((button) => button.addEventListener("click", () => {
  const img = button.querySelector("img");
  if (img) {
    eventTrack("prova_social_ampliada", { proof_category: button.closest(".proof-slide")?.dataset.category || "" });
    openLightbox(img, button);
  }
}));
$("proofOpenCase").addEventListener("click", () => visibleProofSlides[proofIndex]?.querySelector(".proof-image-button")?.click());
$("lightboxClose").addEventListener("click", closeLightbox);
lightbox.addEventListener("click", (event) => { if (event.target === lightbox) closeLightbox(); });
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && lightbox.classList.contains("is-open")) closeLightbox();
  if (!lightbox.classList.contains("is-open") && document.activeElement?.closest?.("#proofSlider")) {
    if (event.key === "ArrowRight") { updateProof(proofIndex + 1); startProofAutoplay(); }
    if (event.key === "ArrowLeft") { updateProof(proofIndex - 1); startProofAutoplay(); }
  }
});
updateProof(0);
