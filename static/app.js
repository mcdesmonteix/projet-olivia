let userId = null;
let userLang = null;
let ws = null;
let mediaRecorder = null;
let audioChunks = [];

const USERS = {
  louise: { lang: "fr", flag: "🇫🇷", label: "Louise" },
  olivia: { lang: "en", flag: "🇺🇸", label: "Olivia" },
};

function connect(id) {
  userId = id;
  userLang = USERS[id].lang;

  // Masquer l'écran de sélection, afficher le chat
  document.getElementById("screen-select").classList.add("hidden");
  document.getElementById("screen-chat").classList.remove("hidden");

  // Connexion WebSocket
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  ws = new WebSocket(`${protocol}//${location.host}/ws/${userId}`);

  ws.onopen = () => {
    addSystemMessage("Connexion établie ✓");
    requestMicPermission();
  };

  ws.onclose = () => addSystemMessage("Déconnecté du serveur.");

  ws.onerror = () => addSystemMessage("Erreur de connexion.");

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);

    if (msg.type === "status") {
      updateStatus(msg.user, msg.online);
      const info = USERS[msg.user];
      addSystemMessage(
        msg.online
          ? `${info.flag} ${info.label} est connecté(e)`
          : `${info.flag} ${info.label} s'est déconnecté(e)`
      );
    }

    if (msg.type === "message") {
      addMessage(msg);
    }
  };
}

function updateStatus(user, online) {
  const dot = document.getElementById(`status-${user}`);
  if (!dot) return;
  dot.classList.toggle("online", online);
  dot.classList.toggle("offline", !online);
}

function addSystemMessage(text) {
  const div = document.createElement("div");
  div.className = "msg-system";
  div.textContent = text;
  appendToMessages(div);
}

function addMessage(msg) {
  const isMe = msg.user === userId;
  const info = USERS[msg.user];

  // Texte que MOI je vois en premier (ma langue)
  // Si c'est mon message : original en premier
  // Si c'est l'autre : traduction en premier (ma langue)
  const mainText  = isMe ? msg.original  : msg.translated;
  const subText   = isMe ? msg.translated : msg.original;

  const wrapper = document.createElement("div");
  wrapper.className = `message ${isMe ? "me" : "other"}`;

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  bubble.textContent = mainText;

  const translation = document.createElement("div");
  translation.className = "message-translation";
  translation.textContent = `→ ${subText}`;

  const meta = document.createElement("div");
  meta.className = "message-meta";
  meta.textContent = `${info.flag} ${info.label} · ${msg.timestamp}`;

  wrapper.appendChild(bubble);
  wrapper.appendChild(translation);
  wrapper.appendChild(meta);

  appendToMessages(wrapper);
}

function appendToMessages(el) {
  const container = document.getElementById("messages");
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
}

// ── Microphone ──

async function requestMicPermission() {
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    addSystemMessage("⚠️ Accès au microphone refusé.");
  }
}

async function startRecording() {
  if (mediaRecorder && mediaRecorder.state === "recording") return;

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    addSystemMessage("⚠️ Impossible d'accéder au microphone.");
    return;
  }

  audioChunks = [];

  // Choisir le format selon le navigateur
  const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
    ? "audio/webm;codecs=opus"
    : "audio/mp4";

  mediaRecorder = new MediaRecorder(stream, { mimeType });

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) audioChunks.push(e.data);
  };

  mediaRecorder.onstop = () => {
    stream.getTracks().forEach((t) => t.stop());
    sendAudio();
  };

  mediaRecorder.start();

  document.getElementById("btn-mic").classList.add("recording");
  document.getElementById("recording-indicator").classList.remove("hidden");
}

function stopRecording() {
  if (!mediaRecorder || mediaRecorder.state !== "recording") return;
  mediaRecorder.stop();

  document.getElementById("btn-mic").classList.remove("recording");
  document.getElementById("recording-indicator").classList.add("hidden");
}

function sendAudio() {
  if (!audioChunks.length) return;
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    addSystemMessage("⚠️ Non connecté au serveur.");
    return;
  }

  const blob = new Blob(audioChunks, { type: audioChunks[0].type });
  const reader = new FileReader();

  reader.onloadend = () => {
    const base64 = reader.result.split(",")[1];
    ws.send(JSON.stringify({ type: "audio", data: base64, lang: userLang }));
    addSystemMessage("⏳ Transcription en cours…");
  };

  reader.readAsDataURL(blob);
  audioChunks = [];
}
