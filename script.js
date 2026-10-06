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
  if (isLocalPreview) return "local";
  if (!CONFIG.sheetEndpoint) return false;
  const body = new URLSearchParams();
  body.set("payload", JSON.stringify({ site_id: CONFIG.sheetSiteId, ...data }));
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
  const PORTFOLIO_PROFILES = {
    licensee: {
      energyRates: [0.02, 0.04],
      energyLabel: "2%–4%",
      energyNote: "Conforme categoria de bônus e contrato.",
      telecomValue: 7,
      telecomLabel: "R$ 7,00",
      telecomNote: "Por conexão elegível e paga.",
      insuranceRate: 0.05,
      insuranceLabel: "5%",
      insuranceNote: "Referência informada; confirme a regra vigente.",
      profileNote: "Valores de geração própria usados como referência. Confirme a categoria de bônus e as regras vigentes com o especialista.",
    },
    referrer: {
      energyRates: [0.01, 0.02],
      energyLabel: "1%–2%",
      energyNote: "Referência do fluxo de indicação.",
      telecomValue: 3.5,
      telecomLabel: "R$ 3,50",
      telecomNote: "Por indicação elegível e paga.",
      insuranceRate: 0.025,
      insuranceLabel: "2,5%",
      insuranceNote: "Referência informada; confirme a regra vigente.",
      profileNote: "Valores de indicação usados como referência. Confirme as condições vigentes com o especialista antes de aderir.",
    },
  };
  const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const profileButtons = [...portfolioSimulator.querySelectorAll("[data-portfolio-profile]")];
  const clientFields = [...portfolioSimulator.querySelectorAll("[data-portfolio-field]")];
  const energyRate = $("portfolioEnergyRate");
  const energyNote = $("portfolioEnergyNote");
  const telecomRate = $("portfolioTelecomRate");
  const telecomNote = $("portfolioTelecomNote");
  const insuranceRate = $("portfolioInsuranceRate");
  const insuranceNote = $("portfolioInsuranceNote");
  const profileNote = $("portfolioProfileNote");
  const estimate = $("portfolioEstimate");
  const breakdown = $("portfolioBreakdown");
  let activeProfile = "licensee";
  let simulatorTracked = false;
  const formatCurrency = (value) => currency.format(value);
  const formatRange = (minimum, maximum) => minimum === maximum ? formatCurrency(minimum) : `${formatCurrency(minimum)} a ${formatCurrency(maximum)}`;
  const getClientCount = (fieldName) => {
    const field = portfolioSimulator.querySelector(`[data-portfolio-field="${fieldName}"]`);
    const value = Number.parseInt(field?.value, 10);
    return Number.isFinite(value) ? Math.min(1000, Math.max(0, value)) : 0;
  };
  function updatePortfolioSimulator() {
    const profile = PORTFOLIO_PROFILES[activeProfile];
    const energyClients = getClientCount("energy");
    const insuranceClients = getClientCount("insurance");
    const telecomClients = getClientCount("telecom");
    const energyMinimum = energyClients * 500 * profile.energyRates[0];
    const energyMaximum = energyClients * 500 * profile.energyRates[1];
    const insuranceTotal = insuranceClients * 300 * profile.insuranceRate;
    const telecomTotal = telecomClients * profile.telecomValue;
    energyRate.textContent = profile.energyLabel;
    energyNote.textContent = profile.energyNote;
    telecomRate.textContent = profile.telecomLabel;
    telecomNote.textContent = profile.telecomNote;
    insuranceRate.textContent = profile.insuranceLabel;
    insuranceNote.textContent = profile.insuranceNote;
    profileNote.textContent = profile.profileNote;
    estimate.textContent = formatRange(energyMinimum + insuranceTotal + telecomTotal, energyMaximum + insuranceTotal + telecomTotal);
    breakdown.textContent = `Energia: ${formatRange(energyMinimum, energyMaximum)} · Seguros: ${formatCurrency(insuranceTotal)} · Telecom: ${formatCurrency(telecomTotal)}`;
  }
  profileButtons.forEach((button) => button.addEventListener("click", () => {
    activeProfile = button.dataset.portfolioProfile;
    profileButtons.forEach((item) => {
      const active = item === button;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    updatePortfolioSimulator();
    eventTrack("simulador_carteira_perfil", { simulator_profile: activeProfile });
  }));
  clientFields.forEach((field) => {
    field.addEventListener("input", () => {
      updatePortfolioSimulator();
      if (!simulatorTracked) {
        simulatorTracked = true;
        eventTrack("simulador_carteira_iniciado", { simulator_profile: activeProfile });
      }
    });
    field.addEventListener("blur", () => {
      field.value = String(getClientCount(field.dataset.portfolioField));
      updatePortfolioSimulator();
    });
  });
  $("portfolioSimulatorCta").addEventListener("click", () => eventTrack("simulador_carteira_cta", { simulator_profile: activeProfile }));
  updatePortfolioSimulator();
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
