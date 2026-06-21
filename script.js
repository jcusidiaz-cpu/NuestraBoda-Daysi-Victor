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

function updatePlayBtnUI() {
  if (!btn) return;
  const iconPlay = btn.querySelector(".icon-play");
  const iconPause = btn.querySelector(".icon-pause");
  if (audio.paused) {
    if (iconPlay) iconPlay.style.display = "block";
    if (iconPause) iconPause.style.display = "none";
    btn.classList.remove("playing");
  } else {
    if (iconPlay) iconPlay.style.display = "none";
    if (iconPause) iconPause.style.display = "block";
    btn.classList.add("playing");
  }
}

window.addEventListener("load", () => {
  revisarRSVPGuerdado();
  audio.play()
    .then(() => { updatePlayBtnUI(); })
    .catch(() => { /* navegador bloqueó autoplay */ });
});

function togglePlay() {
  if (audio.paused) {
    audio.play();
  } else {
    audio.pause();
  }
  updatePlayBtnUI();
}

function retroceder() { audio.currentTime = Math.max(0, audio.currentTime - 10); }
function avanzar()    { audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10); }

let isShuffling = false;
function toggleShuffle() {
  isShuffling = !isShuffling;
  const shuffleBtn = document.getElementById("shuffleBtn");
  if (shuffleBtn) {
    if (isShuffling) shuffleBtn.classList.add("active");
    else shuffleBtn.classList.remove("active");
  }
}

let isRepeating = false;
function toggleRepeat() {
  isRepeating = !isRepeating;
  audio.loop = isRepeating;
  const repeatBtn = document.getElementById("repeatBtn");
  if (repeatBtn) {
    if (isRepeating) repeatBtn.classList.add("active");
    else repeatBtn.classList.remove("active");
  }
}

audio.addEventListener("play", updatePlayBtnUI);
audio.addEventListener("pause", updatePlayBtnUI);

audio.addEventListener("timeupdate", () => {
  const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
  fill.style.width = pct + "%";
  dot.style.left   = pct + "%";
  tiempoEl.textContent = fmt(audio.currentTime) + " / " + fmt(audio.duration);
});

audio.addEventListener("ended", () => {
  updatePlayBtnUI();
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
    localStorage.setItem("rsvp_confirmed_" + FAMILIA, JSON.stringify(data));
    revisarRSVPGuerdado();
  } catch (err) {
    console.error(err);
    mostrarEstado("estado-error");
  }
}

function revisarRSVPGuerdado() {
  const saved = localStorage.getItem("rsvp_confirmed_" + FAMILIA);
  if (saved) {
    try {
      const data = JSON.parse(saved);
      document.getElementById("paso-1").classList.add("oculto");
      document.getElementById("paso-2").classList.add("oculto");
      document.getElementById("paso-2b").classList.add("oculto");
      
      const estadoOk = document.getElementById("estado-ok");
      estadoOk.classList.remove("oculto");
      
      const estadoSub = estadoOk.querySelector(".estado-sub");
      if (estadoSub) {
        if (data.asiste === "Sí") {
          estadoSub.innerHTML = `
            Ya has confirmado tu asistencia para <strong>${data.cantidad} ${data.cantidad === 1 ? 'persona' : 'personas'}</strong>.<br>
            Nombres: <em>${data.nombres}</em>.<br>
            ¡Nos alegra mucho contar contigo!<br>
            <div style="margin-top: 18px;">
              <button type="button" onclick="reiniciarRSVP()" style="background: none; border: none; font-family: var(--ff-body); color: var(--gold); text-decoration: underline; cursor: pointer; font-size: 13.5px; font-weight: 700;">¿Deseas cambiar tu respuesta?</button>
            </div>
          `;
        } else {
          const estadoTitle = estadoOk.querySelector(".estado-titulo");
          if (estadoTitle) {
            estadoTitle.textContent = "Respuesta Registrada";
          }
          estadoSub.innerHTML = `
            Registraste que no podías asistir.<br>
            ¡Gracias por avisarnos!<br>
            <div style="margin-top: 18px;">
              <button type="button" onclick="reiniciarRSVP()" style="background: none; border: none; font-family: var(--ff-body); color: var(--gold); text-decoration: underline; cursor: pointer; font-size: 13.5px; font-weight: 700;">¿Deseas cambiar tu respuesta?</button>
            </div>
          `;
        }
      }
    } catch (e) {
      console.error("Error al cargar RSVP guardado:", e);
    }
  }
}

function reiniciarRSVP() {
  localStorage.removeItem("rsvp_confirmed_" + FAMILIA);
  // Restablecer el formulario
  document.getElementById("estado-ok").classList.add("oculto");
  const estadoTitle = document.getElementById("estado-ok").querySelector(".estado-titulo");
  if (estadoTitle) {
    estadoTitle.textContent = "¡Confirmado!";
  }
  const estadoSub = document.getElementById("estado-ok").querySelector(".estado-sub");
  if (estadoSub) {
    estadoSub.textContent = "Nos alegra mucho contar contigo. ¡Hasta pronto!";
  }
  document.getElementById("paso-1").classList.remove("oculto");
  
  // Limpiar campos
  const fTel = document.getElementById("f-tel");
  if (fTel) fTel.value = "";
  const fMsg = document.getElementById("f-msg");
  if (fMsg) fMsg.value = "";
  const fMsgNo = document.getElementById("f-msg-no");
  if (fMsgNo) fMsgNo.value = "";
}

/* ══════════════════════════════════════════════════════════
   REEMPLAZO DE IMÁGENES VACÍAS CON ARTE VECTORIAL NITIDO (SVGs)
══════════════════════════════════════════════════════════ */
const SVG_FALLBACKS = {
  "flores.png": `
    <svg viewBox="0 0 800 240" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: auto; display: block;">
      <path d="M0 0 L800 0 L800 40 C750 60, 720 20, 680 50 C620 90, 580 30, 520 60 C460 90, 420 50, 400 50 C380 50, 340 90, 280 60 C220 30, 180 90, 120 50 C80 20, 50 60, 0 40 Z" fill="url(#flowerGrad)" opacity="0.12"/>
      <g stroke="#d0af58" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <!-- Central floral monogram/crown -->
        <path d="M400 40 C392 25, 375 18, 355 24 C335 30, 315 22, 295 10 M400 40 C408 25, 425 18, 445 24 C465 30, 485 22, 505 10" />
        <path d="M400 40 C400 25, 388 15, 368 10 C348 -2, 328 10, 318 20 M400 40 C400 25, 412 15, 432 10 C452 -2, 472 10, 482 20" />
        <circle cx="400" cy="40" r="3" fill="#d0af58" />
        <!-- Left Flourishes & Leaves -->
        <path d="M300 46 C240 70, 180 40, 140 50 C100 60, 60 30, 20 46" />
        <path d="M220 46 C180 30, 150 30, 120 46" />
        <path d="M190 35 C175 22, 160 25, 165 35 Z" fill="#f5dede" opacity="0.7" />
        <path d="M120 40 C110 30, 95 32, 100 40 Z" fill="#f5dede" opacity="0.7" />
        <!-- Right Flourishes & Leaves -->
        <path d="M500 46 C560 70, 620 40, 660 50 C700 60, 740 30, 780 46" />
        <path d="M580 46 C620 30, 650 30, 680 46" />
        <path d="M610 35 C625 22, 640 25, 635 35 Z" fill="#f5dede" opacity="0.7" />
        <path d="M680 40 C690 30, 705 32, 700 40 Z" fill="#f5dede" opacity="0.7" />
      </g>
      <defs>
        <linearGradient id="flowerGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#c98a8b"/>
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
        </linearGradient>
      </defs>
    </svg>
  `,
  "novios.jpg": `
    <svg viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: auto; display: block; margin: 0 auto; outline: none;">
      <!-- Soft romantic double ring aura -->
      <circle cx="150" cy="140" r="105" fill="#fffdfb" />
      <circle cx="150" cy="140" r="100" stroke="#f4ebd0" stroke-width="1.5" />
      <circle cx="150" cy="140" r="95" stroke="#d0af58" stroke-dasharray="4 4" stroke-width="1" />
      
      <!-- Interlocking continuous line silhouette of couple -->
      <g stroke="#16243d" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <!-- Groom head & profile -->
        <path d="M125 185 C122 170, 118 155, 126 142 C130 134, 138 132, 138 122 C138 114, 134 108, 128 100 C124 94, 127 82, 136 80 C144 78, 150 82, 152 88 C155 96, 150 104, 154 112 C156 118, 161 120, 168 120 C176 120, 180 134, 175 142 C169 152, 162 160, 164 175 C165 180, 170 185, 175 190" />
        <path d="M138 122 L150 122" stroke-width="1.5"/>
        <!-- Bride veil contour -->
        <path d="M148 78 C160 74, 185 82, 192 102 C198 120, 190 148, 198 178" stroke="#c98a8b" stroke-width="2" stroke-dasharray="2 2" />
        <!-- Soft background rose coloring behind them -->
        <path d="M115 115 C100 115, 100 135, 115 135 C130 135, 130 115, 115 115 Z" fill="#c98a8b" opacity="0.12" />
        <path d="M185 115 C170 115, 170 135, 185 135 C200 135, 200 115, 185 115 Z" fill="#c98a8b" opacity="0.08" />
      </g>
      <!-- Sparkles -->
      <path d="M70 80 L73 87 L80 90 L73 93 L70 100 L67 93 L60 90 L67 87 Z" fill="#d0af58" />
      <path d="M230 80 L233 87 L240 90 L233 93 L230 100 L227 93 L220 90 L227 87 Z" fill="#d0af58" />
    </svg>
  `,
  "paloma.png": `
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%; display: block;">
      <circle cx="50" cy="50" r="46" fill="#ffffff" stroke="#f4ebd0" stroke-width="1.5" />
      <circle cx="50" cy="50" r="42" stroke="#d0af58" stroke-width="1" stroke-dasharray="3 2" />
      <!-- Flying dove -->
      <g stroke="#c98a8b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <!-- Body, wing & tail -->
        <path d="M32 52 C29 48, 25 47, 23 43 C21 38, 23 32, 28 30 C31 29, 36 31, 38 33 C41 32, 45 30, 49 28 C53 26, 58 24, 62 24 C59 34, 50 44, 42 50 C34 58, 26 68, 24 78 M23 43 C25 44, 27 46, 28 49 C29 52, 27 55, 31 57 C35 60, 45 64, 52 60 C59 56, 65 45, 69 38" />
        <path d="M38 33 C43 22, 55 12, 65 10 C62 20, 53 30, 45 36" fill="#ffffff" />
        <!-- Olive branch in gold -->
        <path d="M62 24 C68 22, 74 15, 78 12" stroke="#d0af58" stroke-width="1.5" />
        <circle cx="74" cy="14" r="2" fill="#d0af58" stroke="none" />
        <circle cx="78" cy="10" r="2" fill="#d0af58" stroke="none" />
      </g>
    </svg>
  `,
  "padres.png": `
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%; display: block;">
      <g stroke="#d0af58" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <!-- Interlocked hearts represent blessing and families -->
        <path d="M38 58 C28 48, 14 36, 14 24 C14 14, 24 8, 32 14 C36 17, 38 22, 38 22 C38 22, 40 17, 44 14 C52 8, 62 14, 62 24 C62 36, 48 48, 38 58 Z" fill="#fffdfb" />
        <path d="M62 76 C54 68, 40 56, 40 44 C40 34, 50 28, 58 34 C62 37, 64 42, 64 42 C64 42, 66 37, 70 34 C78 28, 88 34, 88 44 C88 56, 74 68, 62 76 Z" fill="#fffdfb" opacity="0.9" />
      </g>
    </svg>
  `,
  "padrinos.png": `
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%; display: block;">
      <!-- Elegant guiding crown/crest -->
      <g stroke="#d0af58" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <path d="M20 65 L28 42 L42 54 L56 42 L64 65 Z" fill="#fffdfb" />
        <line x1="15" y1="69" x2="69" y2="69" stroke-width="3" />
        <circle cx="28" cy="38" r="2.5" fill="#d0af58" />
        <circle cx="42" cy="50" r="2.5" fill="#d0af58" />
        <circle cx="56" cy="38" r="2.5" fill="#d0af58" />
        <path d="M42 77 Q50 72, 58 77" stroke="#c98a8b" stroke-width="1.5" />
      </g>
    </svg>
  `,
  "anillos.png": `
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%; display: block;">
      <g stroke="#d0af58" stroke-width="2" fill="none" stroke-linecap="round">
        <!-- Groom band -->
        <circle cx="40" cy="56" r="21" stroke-width="3.5" />
        <!-- Bride band -->
        <circle cx="58" cy="44" r="17" stroke-width="2" />
        <!-- Solitaire diamond -->
        <path d="M58 23 L63 27 L58 31 L53 27 Z" fill="#f4ebd0" stroke-width="1" />
        <!-- Sparkling stars -->
        <path d="M38 12 L38 20 M34 16 L42 16" stroke="#c98a8b" stroke-width="1.5" />
      </g>
    </svg>
  `,
  "iglesia.png": `
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%; display: block;">
      <g stroke="#d0af58" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <!-- Sanctuary chapel -->
        <path d="M18 85 L18 52 L50 24 L82 52 L82 85 Z" fill="#fffdfb" />
        <path d="M34 85 L34 62 C34 50, 66 50, 66 62 L66 85" fill="#fcfaf6" />
        <!-- Cathedral cross steeple -->
        <line x1="50" y1="8" x2="50" y2="24" stroke-width="2.5" />
        <line x1="41" y1="14" x2="59" y2="14" stroke-width="2.5" />
        <!-- Bell tower ornament -->
        <circle cx="50" cy="38" r="6.5" stroke="#c98a8b" stroke-width="1.5" />
      </g>
    </svg>
  `,
  "resepcion.png": `
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%; display: block;">
      <!-- Clinking champagne celebratory flutes -->
      <g stroke="#d0af58" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <!-- Left Glass -->
        <path d="M32 30 L43 38 L43 55 Q43 65, 32 68 L32 82 M24 82 L40 82" fill="#fffdfb" />
        <!-- Right Glass -->
        <path d="M68 30 L57 38 L57 55 Q57 65, 68 68 L68 82 M60 82 L76 82" fill="#fffdfb" />
        <!-- Bubbles & Sparkles -->
        <path d="M50 14 L50 20 M46 17 L54 17" stroke="#c98a8b" stroke-width="1.5" />
        <circle cx="42" cy="22" r="2.2" fill="#d0af58" stroke="none" />
        <circle cx="58" cy="22" r="2.2" fill="#d0af58" stroke="none" />
      </g>
    </svg>
  `,
  "ubicacion.png": `
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 18px; height: 18px; display: inline-block; vertical-align: middle; margin-right: 6px;">
      <!-- Tiny search map pin -->
      <g stroke="#c98a8b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <path d="M50 85 C50 85, 80 58, 80 36 C80 16, 66 6, 50 6 C34 6, 20 16, 20 36 C20 58, 50 85, 50 85 Z" fill="#ffffff" />
        <circle cx="50" cy="36" r="10" stroke="#d0af58" fill="#f4ebd0" />
      </g>
    </svg>
  `,
  "cena.png": `
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%; display: block;">
      <!-- Plate & cover dome with fork & knife -->
      <g stroke="#d0af58" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <circle cx="50" cy="54" r="30" />
        <!-- Cloche dome -->
        <path d="M28 54 C28 35, 72 35, 72 54 Z" fill="#fffdfb" />
        <circle cx="50" cy="33" r="3.5" fill="#d0af58" />
        <!-- Fork -->
        <path d="M15 35 L15 50 M11 35 L11 44 M19 35 L19 44 M15 44 L15 75" />
        <!-- Knife -->
        <path d="M85 35 L85 54 M81 35 L81 54 Q83 56, 85 54 L85 75" />
      </g>
    </svg>
  `,
  "bailando.png": `
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%; display: block;">
      <!-- Elegant music celebration silhouette -->
      <g stroke="#d0af58" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <path d="M30 70 C30 58, 45 52, 45 36 L45 18 L74 12 L74 32 L45 38" fill="#fffdfb" />
        <circle cx="30" cy="70" r="8" fill="#d0af58" />
        <circle cx="66" cy="32" r="6" fill="#d0af58" />
        <path d="M15 32 L21 34 M80 44 L86 41" stroke="#c98a8b" stroke-width="1.5" />
      </g>
    </svg>
  `,
  "sello.png": `
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: auto; display: block; margin: 0 auto; outline: none;">
      <!-- Royal wax seal badge -->
      <path d="M100 10 C50 10, 10 50, 10 100 C10 150, 50 190, 100 190 C150 190, 190 150, 190 100 C190 50, 150 10, 100 10 Z" fill="#d0af58" opacity="0.1" />
      <circle cx="100" cy="100" r="78" stroke="#d0af58" stroke-width="3" fill="#ffffff" />
      <circle cx="100" cy="100" r="70" stroke="#d0af58" stroke-width="1" stroke-dasharray="6 4" />
      <text x="100" y="106" font-family="'Great Vibes', cursive" font-size="68" fill="#16243d" text-anchor="middle">D &amp; V</text>
      <path d="M62 136 C72 144, 128 144, 138 136" stroke="#d0af58" stroke-width="2.2" stroke-linecap="round" />
      <path d="M100 32 L102 38 L108 40 L102 42 L100 48 L98 42 L92 40 L98 38 Z" fill="#d0af58" />
    </svg>
  `
};

function checkAndReplaceBrokenImages() {
  document.querySelectorAll(".hoja img").forEach(img => {
    const src = img.getAttribute("src") || "";
    let fileName = src.split("/").pop(); // plucks e.g. "paloma.png"
    if (!fileName) return;

    // Normalization to handle base key vs duplicates
    if (fileName.includes("-1")) {
      fileName = fileName.replace("-1", "");
    }

    const fallbackSvg = SVG_FALLBACKS[fileName];
    if (fallbackSvg) {
      const parent = img.parentElement;

      const replaceWithSvg = () => {
        const div = document.createElement("div");
        div.className = img.className;
        div.innerHTML = fallbackSvg;

        // Preserve transition state and triggers
        if (img.classList.contains("seq")) {
          div.classList.add("seq");
          if (img.classList.contains("visible")) {
            div.classList.add("visible");
          }
          div.dataset.delay = img.dataset.delay;
        }

        if (parent) {
          parent.replaceChild(div, img);
        }
      };

      // Replace immediately if empty/broken, else wait for error trigger
      if (img.complete && (img.naturalWidth === 0 || img.naturalHeight === 0)) {
        replaceWithSvg();
      } else {
        img.addEventListener("error", replaceWithSvg);
        // Timeout check for empty media responses that dont fire error
        setTimeout(() => {
          if (img.complete && (img.naturalWidth === 0 || img.naturalHeight === 0)) {
            replaceWithSvg();
          }
        }, 500);
      }
    }
  });
}

// Attach image checks on load & fast checks
window.addEventListener("load", checkAndReplaceBrokenImages);
document.addEventListener("DOMContentLoaded", checkAndReplaceBrokenImages);
setTimeout(checkAndReplaceBrokenImages, 300);
setTimeout(checkAndReplaceBrokenImages, 1500);

// ══════════════════════════════════════
// MODAL & COPIADO DE REGALOS
// ══════════════════════════════════════
function openGiftModal(option) {
  const modal = document.getElementById("giftModal");
  if (!modal) return;
  
  // Ocultar todos los sub-contenidos del modal
  document.querySelectorAll(".gift-modal-inner").forEach(el => {
    el.classList.add("hidden");
  });
  
  // Mostrar el contenido seleccionado
  const targetId = `gift-content-${option}`;
  const targetView = document.getElementById(targetId);
  if (targetView) {
    targetView.classList.remove("hidden");
    modal.classList.add("active");
    // Desactivar scroll del body principal al estar abierto
    document.body.style.overflow = "hidden";
  }
}

function closeGiftModal() {
  const modal = document.getElementById("giftModal");
  if (!modal) return;
  
  modal.classList.remove("active");
  document.body.style.overflow = "";
}

function handleOutsideClick(event) {
  const modalOverlay = document.getElementById("giftModal");
  // Si el click fue exactamente en el fondo oscuro (overlay), cerrar
  if (event.target === modalOverlay) {
    closeGiftModal();
  }
}

function copyValue(elementId, btnElement) {
  const textElement = document.getElementById(elementId);
  if (!textElement) return;
  
  // Quitar espacios vacíos del número de cuenta/CCI/teléfono para que sea fácil pegar
  const rawText = textElement.innerText || textElement.textContent;
  const textToCopy = rawText.replace(/\s+/g, "");
  
  const showFeedback = () => {
    const span = btnElement.querySelector("span");
    const originalText = span ? span.textContent : "Copiar";
    btnElement.classList.add("copied");
    if (span) span.textContent = "¡Copiado!";
    
    setTimeout(() => {
      btnElement.classList.remove("copied");
      if (span) span.textContent = originalText;
    }, 2000);
  };

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(textToCopy).then(() => {
      showFeedback();
    }).catch(() => {
      fallbackCopy(textToCopy, showFeedback);
    });
  } else {
    fallbackCopy(textToCopy, showFeedback);
  }
}

function fallbackCopy(text, callback) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  textArea.style.top = "-9999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand("copy");
    callback();
  } catch (err) {
    console.error("No se pudo copiar el texto", err);
  }
  document.body.removeChild(textArea);
}

// ══════════════════════════════════════
// MODAL DE DETALLES DE LUGARES
// ══════════════════════════════════════
function openLugarModal(lugarOption) {
  const modal = document.getElementById("lugarModal");
  if (!modal) return;
  
  // Ocultar todos los sub-contenidos del modal de lugares
  document.querySelectorAll(".lugar-modal-inner").forEach(el => {
    el.classList.add("hidden");
  });
  
  // Mostrar el contenido seleccionado (ceremonia / recepcion)
  const targetId = `lugar-content-${lugarOption}`;
  const targetView = document.getElementById(targetId);
  if (targetView) {
    targetView.classList.remove("hidden");
    modal.classList.add("active");
    // Desactivar scroll del body principal al estar abierto
    document.body.style.overflow = "hidden";
  }
}

function closeLugarModal() {
  const modal = document.getElementById("lugarModal");
  if (!modal) return;
  
  modal.classList.remove("active");
  document.body.style.overflow = "";
}

function handleLugarOutsideClick(event) {
  const modalOverlay = document.getElementById("lugarModal");
  if (event.target === modalOverlay) {
    closeLugarModal();
  }
}
