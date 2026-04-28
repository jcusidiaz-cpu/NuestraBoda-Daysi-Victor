/* ══════════════════════════════════════════════════════════
   CONFIGURACIÓN — SOLO CAMBIA ESTO
══════════════════════════════════════════════════════════ */

// 1. Pega aquí la URL de tu Google Apps Script (ver README.md)
const SHEETS_URL = "https://script.google.com/macros/s/AKfycbzst8Fc8PRkXF7zQIdZS2uKJAOYxSzmBXp9gpe-Rys6tawIEyHiVQlnCBdt1j9cD1jA/exec";

/* ══════════════════════════════════════════════════════════
   PARÁMETROS DE LA URL
   Ejemplo de enlace: index.html?familia=García&pases=4
══════════════════════════════════════════════════════════ */
const params  = new URLSearchParams(window.location.search);
const FAMILIA = params.get("familia") || "Invitado";
const PASES   = parseInt(params.get("pases")) || 1;

// Muestra el pase en la tarjeta
document.getElementById("pase-nombre").textContent = FAMILIA;
document.getElementById("pase-cupo").textContent   =
  PASES === 1 ? "1 persona" : `${PASES} personas`;

/* ══════════════════════════════════════════════════════════
   REVEAL SECUENCIAL — cada .seq aparece según data-delay
══════════════════════════════════════════════════════════ */
document.querySelectorAll(".seq").forEach(el => {
  const delay = parseInt(el.dataset.delay) || 0;
  setTimeout(() => el.classList.add("visible"), delay);
});

/* ══════════════════════════════════════════════════════════
   AUDIO — autoplay al cargar
══════════════════════════════════════════════════════════ */
const audio    = document.getElementById("audio");
const btn      = document.getElementById("playBtn");
const fill     = document.getElementById("fill");
const dot      = document.getElementById("dot");
const tiempoEl = document.getElementById("tiempo");
const track    = document.getElementById("track");

function fmt(s) {
  if (!s || isNaN(s)) return "0:00";
  return Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
}

window.addEventListener("load", () => {
  audio.play()
    .then(() => { btn.innerHTML = "&#10074;&#10074;"; })
    .catch(() => { /* navegador bloqueó autoplay → botón ▶ listo */ });
});

function togglePlay() {
  if (audio.paused) { audio.play(); btn.innerHTML = "&#10074;&#10074;"; }
  else              { audio.pause(); btn.innerHTML = "&#9654;"; }
}
function retroceder() { audio.currentTime = Math.max(0, audio.currentTime - 10); }
function avanzar()    { audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10); }

audio.addEventListener("timeupdate", () => {
  const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
  fill.style.width = pct + "%";
  dot.style.left   = pct + "%";
  tiempoEl.textContent = fmt(audio.currentTime) + " / " + fmt(audio.duration);
});
audio.addEventListener("ended", () => {
  btn.innerHTML = "&#9654;";
  fill.style.width = "0%"; dot.style.left = "0%";
});

// Clic en la barra para saltar
track.addEventListener("click", e => seek(e));
let dragging = false;
track.addEventListener("mousedown", e => { dragging = true; seek(e); });
document.addEventListener("mousemove", e => { if (dragging) seek(e); });
document.addEventListener("mouseup", () => { dragging = false; });
function seek(e) {
  const r = track.getBoundingClientRect();
  audio.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * (audio.duration || 0);
}

/* ══════════════════════════════════════════════════════════
   CUENTA REGRESIVA
══════════════════════════════════════════════════════════ */
const BODA = new Date("2026-07-25T16:00:00");
function tick() {
  const diff = BODA - new Date();
  if (diff <= 0) { ["cd-d","cd-h","cd-m","cd-s"].forEach(id => document.getElementById(id).textContent = "0"); return; }
  document.getElementById("cd-d").textContent = Math.floor(diff / 86400000);
  document.getElementById("cd-h").textContent = String(Math.floor((diff % 86400000) / 3600000)).padStart(2,"0");
  document.getElementById("cd-m").textContent = String(Math.floor((diff % 3600000) / 60000)).padStart(2,"0");
  document.getElementById("cd-s").textContent = String(Math.floor((diff % 60000) / 1000)).padStart(2,"0");
}
tick(); setInterval(tick, 1000);

/* ══════════════════════════════════════════════════════════
   FORMULARIO DE CONFIRMACIÓN
══════════════════════════════════════════════════════════ */
let cantActual = 1;

function elegirAsistencia(asiste) {
  document.getElementById("paso-1").classList.add("oculto");
  if (asiste) {
    cantActual = 1;
    renderNombres(1);
    document.getElementById("paso-2").classList.remove("oculto");
  } else {
    document.getElementById("paso-2b").classList.remove("oculto");
  }
}

function cambiarCant(delta) {
  const nueva = Math.max(1, Math.min(PASES, cantActual + delta));
  if (nueva === cantActual) return;
  cantActual = nueva;
  document.getElementById("cant-num").textContent = cantActual;
  renderNombres(cantActual);
}

function renderNombres(n) {
  const wrap = document.getElementById("nombres-wrap");
  // conservar valores ya escritos
  const viejos = Array.from(wrap.querySelectorAll(".campo-input")).map(i => i.value);
  wrap.innerHTML = "";
  for (let i = 0; i < n; i++) {
    const div = document.createElement("div");
    div.className = "campo-wrap";
    div.innerHTML = `
      <label class="campo-label">Nombre ${i + 1}${n === 1 ? "" : " de " + n}</label>
      <input class="campo-input" type="text" placeholder="Nombre completo"
             id="nombre-${i}" value="${viejos[i] || ""}">
    `;
    wrap.appendChild(div);
  }
}

function getNombres() {
  return Array.from({ length: cantActual }, (_, i) =>
    (document.getElementById(`nombre-${i}`)?.value || "").trim()
  ).filter(Boolean);
}

function mostrarEstado(id) {
  ["paso-1","paso-2","paso-2b","estado-enviando","estado-ok","estado-error"]
    .forEach(s => document.getElementById(s).classList.add("oculto"));
  document.getElementById(id).classList.remove("oculto");
}

async function enviarFormulario() {
  const nombres = getNombres();
  const tel     = document.getElementById("f-tel").value.trim();
  const msg     = document.getElementById("f-msg").value.trim();

  if (nombres.length === 0) {
    alert("Por favor ingresa al menos un nombre."); return;
  }

  const data = {
    familia:   FAMILIA,
    pasesTotales: PASES,
    asiste:    "Sí",
    cantidad:  cantActual,
    nombres:   nombres.join(", "),
    telefono:  tel,
    mensaje:   msg,
    fecha:     new Date().toLocaleString("es-PE", { timeZone: "America/Lima" })
  };

  await enviar(data);
}

async function enviarNoAsiste() {
  const msg  = document.getElementById("f-msg-no").value.trim();
  const data = {
    familia:   FAMILIA,
    pasesTotales: PASES,
    asiste:    "No",
    cantidad:  0,
    nombres:   "",
    telefono:  "",
    mensaje:   msg,
    fecha:     new Date().toLocaleString("es-PE", { timeZone: "America/Lima" })
  };
  await enviar(data);
}

async function enviar(data) {
  mostrarEstado("estado-enviando");
  try {
    const resp = await fetch(SHEETS_URL, {
      method: "POST",
      mode: "no-cors",           // Apps Script requiere no-cors
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    // no-cors siempre devuelve opaque → asumimos éxito
    mostrarEstado("estado-ok");
  } catch (err) {
    console.error(err);
    mostrarEstado("estado-error");
  }
}
