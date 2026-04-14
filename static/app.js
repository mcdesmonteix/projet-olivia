// ── Configuration des langues ──
const LANGUAGES = {
  fr: { name: "Français",   flag: "🇫🇷", ttsLang: "fr-FR" },
  en: { name: "English",    flag: "🇬🇧", ttsLang: "en-US" },
  es: { name: "Español",    flag: "🇪🇸", ttsLang: "es-ES" },
  de: { name: "Deutsch",    flag: "🇩🇪", ttsLang: "de-DE" },
  it: { name: "Italiano",   flag: "🇮🇹", ttsLang: "it-IT" },
  pt: { name: "Português",  flag: "🇵🇹", ttsLang: "pt-PT" },
  nl: { name: "Nederlands", flag: "🇳🇱", ttsLang: "nl-NL" },
  pl: { name: "Polski",     flag: "🇵🇱", ttsLang: "pl-PL" },
  ru: { name: "Русский",    flag: "🇷🇺", ttsLang: "ru-RU" },
  zh: { name: "中文",        flag: "🇨🇳", ttsLang: "zh-CN" },
  ja: { name: "日本語",      flag: "🇯🇵", ttsLang: "ja-JP" },
  ar: { name: "العربية",    flag: "🇸🇦", ttsLang: "ar-SA" },
  ko: { name: "한국어",      flag: "🇰🇷", ttsLang: "ko-KR" },
  tr: { name: "Türkçe",     flag: "🇹🇷", ttsLang: "tr-TR" },
};

// ── État ──
let sessionId  = null;
let userName   = null;
let userLang   = null;
let ws         = null;
let mediaRecorder = null;
let audioChunks   = [];

// Utilisateurs en ligne : { sessionId: { name, lang } }
let onlineUsers = {};

// TTS
const isMobile  = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
let ttsEnabled  = !isMobile;
let ttsUnlocked = false;

// VAD
const VAD_THRESHOLD    = 18;
const VAD_SILENCE_DELAY = 1500;
const VAD_MAX_DURATION  = 30000;
let vadActive      = false;
let vadStream      = null;
let vadAudioCtx    = null;
let vadAnalyser    = null;
let vadDetecting   = false;
let vadSpeaking    = false;
let vadSilenceTimer = null;
let vadMaxTimer    = null;

// ── Connexion ──

function connectUser() {
  const nameInput = document.getElementById("input-name").value.trim();
  const lang      = document.getElementById("select-lang").value;

  if (!nameInput) {
    document.getElementById("input-name").focus();
    return;
  }

  userName  = nameInput;
  userLang  = lang;
  sessionId = Math.random().toString(36).substr(2, 9);

  document.getElementById("screen-select").classList.add("hidden");
  document.getElementById("screen-chat").classList.remove("hidden");

  updateTTSButton();
  updateVADButton();

  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  ws = new WebSocket(`${protocol}//${location.host}/ws/${sessionId}`);

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: "join", name: userName, lang: userLang }));
    addSystemMessage("Connexion établie ✓");
    requestMicPermission();
  };

  ws.onclose = () => addSystemMessage("Déconnecté du serveur.");
  ws.onerror = () => addSystemMessage("Erreur de connexion.");

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);

    if (msg.type === "status") {
      if (msg.online) {
        onlineUsers[msg.session_id] = { name: msg.name, lang: msg.lang };
      } else {
        delete onlineUsers[msg.session_id];
      }
      updateHeaderUsers();
      const langInfo = LANGUAGES[msg.lang] || {};
      addSystemMessage(msg.online
        ? `${langInfo.flag || ""} ${msg.name} est connecté(e)`
        : `${msg.name} s'est déconnecté(e)`);
    }

    if (msg.type === "message") {
      addMessage(msg);
      // Lire la traduction dans MA langue si c'est l'autre qui parle
      if (msg.session_id !== sessionId && ttsEnabled) {
        const translated = msg.translations?.[userLang] || msg.original;
        speak(translated, LANGUAGES[userLang]?.ttsLang || "fr-FR");
      }
    }
  };
}

// ── Header — liste des utilisateurs en ligne ──

function updateHeaderUsers() {
  const container = document.getElementById("header-users");
  container.innerHTML = "";

  // Ajouter soi-même en premier
  const meLang = LANGUAGES[userLang] || {};
  const meEl = document.createElement("span");
  meEl.className = "header-user me";
  meEl.textContent = `${meLang.flag || ""} ${userName}`;
  container.appendChild(meEl);

  // Autres utilisateurs
  for (const [sid, info] of Object.entries(onlineUsers)) {
    if (sid === sessionId) continue;
    const langInfo = LANGUAGES[info.lang] || {};
    const el = document.createElement("span");
    el.className = "header-user";
    el.textContent = `${langInfo.flag || ""} ${info.name}`;
    container.appendChild(el);
  }
}

// ── Messages ──

function addSystemMessage(text) {
  const div = document.createElement("div");
  div.className   = "msg-system";
  div.textContent = text;
  appendToMessages(div);
}

function addMessage(msg) {
  const isMe     = msg.session_id === sessionId;
  const langInfo = LANGUAGES[msg.lang] || {};

  // Texte principal : dans MA langue
  const mainText = isMe
    ? msg.original
    : (msg.translations?.[userLang] || msg.original);

  // Sous-texte : l'original si c'est l'autre, ma version traduite si c'est moi
  const subText = isMe
    ? (msg.translations?.[Object.keys(msg.translations || {})[0]] || "")
    : msg.original;

  const wrapper = document.createElement("div");
  wrapper.className = `message ${isMe ? "me" : "other"}`;

  const bubble = document.createElement("div");
  bubble.className   = "message-bubble";
  bubble.textContent = mainText;

  const wrapper2 = document.createElement("div");
  wrapper2.className = "message-footer";

  if (subText && subText !== mainText) {
    const translation = document.createElement("div");
    translation.className   = "message-translation";
    translation.textContent = `→ ${subText}`;
    wrapper2.appendChild(translation);
  }

  const meta = document.createElement("div");
  meta.className   = "message-meta";
  meta.textContent = `${langInfo.flag || ""} ${msg.name} · ${msg.timestamp}`;
  wrapper2.appendChild(meta);

  wrapper.appendChild(bubble);
  wrapper.appendChild(wrapper2);
  appendToMessages(wrapper);
}

function appendToMessages(el) {
  const c = document.getElementById("messages");
  c.appendChild(el);
  c.scrollTop = c.scrollHeight;
}

// ── TTS ──

function speak(text, lang) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = lang;
  utt.rate = 0.95;
  window.speechSynthesis.speak(utt);
}

function unlockTTS() {
  if (!ttsUnlocked && window.speechSynthesis) {
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    window.speechSynthesis.speak(u);
    ttsUnlocked = true;
  }
}

function toggleTTS() {
  ttsEnabled = !ttsEnabled;
  if (!ttsEnabled) window.speechSynthesis?.cancel();
  else unlockTTS();
  updateTTSButton();
}

function updateTTSButton() {
  const btn = document.getElementById("btn-tts");
  if (!btn) return;
  btn.classList.toggle("active", ttsEnabled);
  btn.classList.toggle("muted",  !ttsEnabled);
}

// ── Microphone (push-to-talk) ──

async function requestMicPermission() {
  try { await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch (e) { addSystemMessage("⚠️ Accès au microphone refusé."); }
}

async function startRecording() {
  if (vadActive) return;
  if (mediaRecorder && mediaRecorder.state === "recording") return;
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch (e) { addSystemMessage("⚠️ Impossible d'accéder au microphone."); return; }

  audioChunks = [];
  const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
    ? "audio/webm;codecs=opus" : "audio/mp4";
  mediaRecorder = new MediaRecorder(stream, { mimeType });
  mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.push(e.data); };
  mediaRecorder.onstop = () => { stream.getTracks().forEach(t => t.stop()); sendAudio(); };
  mediaRecorder.start();
  document.getElementById("btn-mic").classList.add("recording");
  document.getElementById("recording-indicator").classList.remove("hidden");
}

function stopRecording() {
  if (vadActive) return;
  if (!mediaRecorder || mediaRecorder.state !== "recording") return;
  mediaRecorder.stop();
  document.getElementById("btn-mic").classList.remove("recording");
  document.getElementById("recording-indicator").classList.add("hidden");
}

// ── VAD ──

async function toggleVAD() {
  if (vadActive) stopVAD(); else await startVAD();
}

async function startVAD() {
  try { vadStream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch (e) { addSystemMessage("⚠️ Impossible d'accéder au microphone."); return; }
  unlockTTS();
  vadAudioCtx = new AudioContext();
  vadAnalyser = vadAudioCtx.createAnalyser();
  vadAnalyser.fftSize = 512;
  vadAudioCtx.createMediaStreamSource(vadStream).connect(vadAnalyser);
  vadActive = true; vadDetecting = true;
  document.getElementById("btn-mic").disabled = true;
  document.getElementById("vad-listening").classList.remove("hidden");
  updateVADButton();
  addSystemMessage("🎙️ Mode auto activé — parle naturellement");
  requestAnimationFrame(detectVoice);
}

function stopVAD() {
  vadDetecting = false; vadActive = false; vadSpeaking = false;
  clearTimeout(vadSilenceTimer); clearTimeout(vadMaxTimer);
  if (mediaRecorder && mediaRecorder.state === "recording") mediaRecorder.stop();
  if (vadAudioCtx) { vadAudioCtx.close(); vadAudioCtx = null; }
  if (vadStream)   { vadStream.getTracks().forEach(t => t.stop()); vadStream = null; }
  document.getElementById("btn-mic").disabled = false;
  document.getElementById("vad-listening").classList.add("hidden");
  document.getElementById("recording-indicator").classList.add("hidden");
  updateVADButton();
  addSystemMessage("🎙️ Mode auto désactivé");
}

function getVolume() {
  const data = new Uint8Array(vadAnalyser.frequencyBinCount);
  vadAnalyser.getByteFrequencyData(data);
  return data.reduce((a, b) => a + b, 0) / data.length;
}

function detectVoice() {
  if (!vadDetecting) return;
  if (getVolume() > VAD_THRESHOLD) {
    clearTimeout(vadSilenceTimer);
    if (!vadSpeaking) { vadSpeaking = true; startVADRecording(); }
    vadSilenceTimer = setTimeout(() => { vadSpeaking = false; stopVADRecording(); }, VAD_SILENCE_DELAY);
  }
  requestAnimationFrame(detectVoice);
}

function startVADRecording() {
  if (mediaRecorder && mediaRecorder.state === "recording") return;
  audioChunks = [];
  const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
    ? "audio/webm;codecs=opus" : "audio/mp4";
  mediaRecorder = new MediaRecorder(vadStream, { mimeType });
  mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.push(e.data); };
  mediaRecorder.onstop = sendAudio;
  mediaRecorder.start();
  document.getElementById("recording-indicator").classList.remove("hidden");
  vadMaxTimer = setTimeout(() => { if (vadSpeaking) { vadSpeaking = false; stopVADRecording(); } }, VAD_MAX_DURATION);
}

function stopVADRecording() {
  clearTimeout(vadMaxTimer);
  if (mediaRecorder && mediaRecorder.state === "recording") mediaRecorder.stop();
  document.getElementById("recording-indicator").classList.add("hidden");
}

function updateVADButton() {
  const btn = document.getElementById("btn-vad");
  if (!btn) return;
  btn.classList.toggle("active", vadActive);
}

// ── Envoi audio ──

function sendAudio() {
  if (!audioChunks.length) return;
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    addSystemMessage("⚠️ Non connecté au serveur."); return;
  }
  const blob = new Blob(audioChunks, { type: audioChunks[0].type });
  const reader = new FileReader();
  reader.onloadend = () => {
    ws.send(JSON.stringify({ type: "audio", data: reader.result.split(",")[1] }));
    addSystemMessage("⏳ Transcription en cours…");
  };
  reader.readAsDataURL(blob);
  audioChunks = [];
}
