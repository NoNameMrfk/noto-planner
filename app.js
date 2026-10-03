const STORAGE_KEY = "orbit-study-planner-v11";
const THEME_CLASSES = ["theme-ember","theme-white","theme-rose","theme-cobalt","theme-midnight","theme-forest","theme-black","theme-vermilion"];
const VALID_THEMES = ["classic","ember","white","rose","cobalt","midnight","forest","black","vermilion"];
const defaultData = {
  lessons: [],
  todos: [],
  notes: [],
  events: [],
  habits: [],
  moods: {},
  streakCheckins: {},
  dailyCompletions: {},
  theme: "classic",
  calTab: "month",
  mode: "planner",
  texture: true,
  particles: false,
  particleType: "dots",
  spaceBackground: true,
  customCursor: false,
  motionEffects: true,
  activeNoteId: null,
  spotifyEmbed: "https://open.spotify.com/embed/playlist/37i9dQZF1DWZeKCadgRdKQ?utm_source=generator&theme=0",
  spotifyPreset: "deep-focus",
  pomodoro: {
    workMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    sessionsUntilLong: 4,
    autoStart: false,
    completedFocusSessions: 0
  }
};

let data = loadData();
let currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let selectedCalendarDate = getTodayString();
let selectedMoodDate = getTodayString();
let pomodoroMode = "focus";
let timerSeconds = getModeSeconds("focus");
let timerInterval = null;
let pipWindow = null;
let expandedLessonDay = null; // day name when expanded

const MOODS = [
  { id: "great", name: "Great", emoji: "😄", color: "#36a269" },
  { id: "good", name: "Good", emoji: "🙂", color: "#78b95a" },
  { id: "okay", name: "Okay", emoji: "😐", color: "#d3a53d" },
  { id: "rough", name: "Rough", emoji: "🙁", color: "#d2784b" },
  { id: "awful", name: "Awful", emoji: "😞", color: "#b95361" }
];

const WEEK_DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const $ = (s) => document.querySelector(s);

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    const lessons = (saved?.lessons || []).map(l => {
      // migrate old single `time` field → start/end
      if (l.start && l.end) return l;
      if (l.time) {
        const [h, m] = l.time.split(":").map(Number);
        const endH = Math.min(23, h + 1);
        return {
          ...l,
          start: l.time,
          end: `${String(endH).padStart(2,"0")}:${String(m || 0).padStart(2,"0")}`
        };
      }
      return { ...l, start: l.start || "09:00", end: l.end || "10:00" };
    });
    return {
      ...defaultData,
      ...(saved || {}),
      lessons, todos: Array.isArray(saved?.todos) ? saved.todos : [], notes: Array.isArray(saved?.notes) ? saved.notes : [], events: Array.isArray(saved?.events) ? saved.events : [], moods: saved?.moods || {},
      streakCheckins: saved?.streakCheckins || {},
      dailyCompletions: saved?.dailyCompletions || {},
      habits: saved?.habits || [],
      pomodoro: { ...defaultData.pomodoro, ...(saved?.pomodoro || {}) },
      mode: saved?.mode === "study" ? "study" : "planner",
      theme: (() => {
        const t = saved?.theme;
        if (t === "sage") return "cobalt";
        if (t === "plum") return "vermilion";
        if (t === "paper") return "ember";
        return VALID_THEMES.includes(t) ? t : "classic";
      })(),
      calTab: ["month","timetable","events"].includes(saved?.calTab) ? saved.calTab : "month",
      particles: Boolean(saved?.particles),
      spaceBackground: saved?.spaceBackground !== false,
      particleType: ["dots","rain","snow"].includes(saved?.particleType) ? saved.particleType : "dots",
      customCursor: Boolean(saved?.customCursor),
      motionEffects: saved?.motionEffects !== false,
      activeNoteId: saved?.activeNoteId || null,
      spotifyEmbed: /^https:\/\/open\.spotify\.com\/embed\//.test(saved?.spotifyEmbed || "") ? saved.spotifyEmbed : defaultData.spotifyEmbed,
      spotifyPreset: saved?.spotifyPreset || "deep-focus"
    };
  } catch {
    return structuredClone(defaultData);
  }
}

let _pipUpdateTimer = null;
function saveData() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { showToast("Could not save (storage full or blocked)"); } renderAll();
  // Debounce mini-window refresh
  clearTimeout(_pipUpdateTimer);
  _pipUpdateTimer = setTimeout(updatePipWindow, 120);
}

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ========== UNDO ==========
const undoStack = [];
const UNDO_MAX = 20;
function pushUndo(label, restoreFn) {
  undoStack.push({ label, restore: restoreFn });
  if (undoStack.length > UNDO_MAX) undoStack.shift();
}
function performUndo() {
  const item = undoStack.pop();
  if (!item) { showToast("Nothing to undo"); return; }
  try { item.restore(); saveData(); showToast("Undid: " + item.label); }
  catch (e) { showToast("Could not undo"); }
}



function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function pad(n) { return String(n).padStart(2, "0"); }
function getDateString(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
function getTodayString() { return getDateString(new Date()); }
function parseLocalDate(dateString) {
  const [y, m, d] = dateString.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function formatDate(dateString, includeYear = true) {
  if (!dateString) return "No date";
  return parseLocalDate(dateString).toLocaleDateString(undefined, {
    day: "numeric", month: "short",
    ...(includeYear ? { year: "numeric" } : {})
  });
}

function showToast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => t.classList.remove("show"), 2200);
}

function playChime() {
  try {
    playChime.ctx = playChime.ctx || new (window.AudioContext || window.webkitAudioContext)(); const ctx = playChime.ctx; ctx.resume && ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = pomodoroMode === "focus" ? 880 : 523;
    gain.gain.value = 0.04;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.16);
  } catch {}
}

function getModeSeconds(mode) {
  const p = data.pomodoro;
  if (mode === "short") return Math.max(1, p.shortBreakMinutes) * 60;
  if (mode === "long") return Math.max(1, p.longBreakMinutes) * 60;
  return Math.max(1, p.workMinutes) * 60;
}

// ========== PARTICLES ==========
const canvas = $("#particleCanvas");
const ctx = canvas.getContext("2d");
let particles = []; let animId = null; let W = window.innerWidth, H = window.innerHeight, pColor = "#2d6a4f", pKey = "";

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const w = window.innerWidth;
  const h = window.innerHeight; W = w; H = h;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function getParticleColor() {
  return getComputedStyle(document.body).getPropertyValue("--particle-color").trim() || "#2d6a4f";
}

function initParticles() {
  particles = [];
  const type = data.particleType || "dots";
  // Fewer particles for smoother performance
  const count = type === "rain" ? Math.min(40, Math.floor(window.innerWidth / 28)) :
                type === "snow" ? Math.min(32, Math.floor(window.innerWidth / 36)) :
                Math.min(28, Math.floor(window.innerWidth / 48));

  for (let i = 0; i < count; i++) {
    if (type === "rain") {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        len: Math.random() * 12 + 8,
        speed: Math.random() * 4 + 6,
        opacity: Math.random() * 0.35 + 0.15
      });
    } else if (type === "snow") {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 2.8 + 1,
        speed: Math.random() * 1.2 + 0.4,
        drift: (Math.random() - 0.5) * 0.6,
        opacity: Math.random() * 0.5 + 0.25
      });
    } else {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 2.4 + 0.7,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.4 + 0.12
      });
    }
  }
}

function drawParticles() {
  if (!data.particles || document.hidden) {
    if (!data.particles) ctx.clearRect(0, 0, W, H);
    animId = null;
    return;
  }
  ctx.clearRect(0, 0, W, H);
  const color = pColor;
  const type = data.particleType || "dots";

  particles.forEach(p => {
    if (type === "rain") {
      p.y += p.speed;
      if (p.y > H) {
        p.y = -20;
        p.x = Math.random() * W;
      }
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x, p.y + p.len);
      ctx.strokeStyle = color;
      ctx.globalAlpha = p.opacity;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    } else if (type === "snow") {
      p.y += p.speed;
      p.x += p.drift;
      if (p.y > H) {
        p.y = -10;
        p.x = Math.random() * W;
      }
      if (p.x < 0) p.x = W;
      if (p.x > W) p.x = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = p.opacity;
      ctx.fill();
    } else {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = W;
      if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H;
      if (p.y > H) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = p.opacity;
      ctx.fill();
    }
  });
  ctx.globalAlpha = 1;
  animId = requestAnimationFrame(drawParticles);
}


// ========== CUSTOM CURSOR ==========
(function initCustomCursor() {
  const root = document.getElementById("customCursor");
  const dot = root && root.querySelector(".cursor-dot");
  const ring = root && root.querySelector(".cursor-ring");
  if (!root || !dot || !ring) return;

  const HOVER_SEL = "button, a, [role='button'], .map-node, .map-node-head, .habit-check, .habit-day-dot, .lesson-block, .theme-swatch, .theme-button, .mood-button, label.switch, .note-list-item, .spotify-preset-btn, .calendar-day, .particle-type-btn, .cmd-item, .header-search-btn, .nav button, .mode-switch button, .primary-button, .secondary-button, .danger-button, .ghost-button, .icon-button, .tag, input[type='checkbox'], input[type='radio'], select, .lesson-day-header, .habit-rename-btn";
  const TEXT_SEL = "input:not([type='checkbox']):not([type='radio']):not([type='range']):not([type='button']):not([type='submit']), textarea, [contenteditable='true'], .note-editor";

  let mx = -100, my = -100;
  let rx = -100, ry = -100;
  let raf = 0;
  let reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let coarse = window.matchMedia("(hover: none), (pointer: coarse)").matches;

  try {
    window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", (e) => {
      reduced = e.matches;
    });
  } catch (_) {}

  function isEnabled() {
    return Boolean(data.customCursor) && !coarse;
  }

  function setState(e) {
    if (!isEnabled()) {
      document.body.classList.remove("cursor-hover", "cursor-text", "cursor-click");
      return;
    }
    const t = e && e.target;
    const onText = Boolean(t && t.closest && t.closest(TEXT_SEL));
    const onHover = !onText && Boolean(t && t.closest && t.closest(HOVER_SEL));
    document.body.classList.toggle("cursor-text", onText);
    document.body.classList.toggle("cursor-hover", onHover);
  }

  function tick() {
    raf = 0;
    if (!isEnabled()) return;
    if (reduced) {
      rx = mx;
      ry = my;
    } else {
      rx += (mx - rx) * 0.35;
      ry += (my - ry) * 0.35;
    }
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
    if (!reduced && (Math.abs(mx - rx) > 0.15 || Math.abs(my - ry) > 0.15)) {
      raf = requestAnimationFrame(tick);
    }
  }

  function onMove(e) {
    if (!isEnabled()) return;
    mx = e.clientX;
    my = e.clientY;
    // Dot tracks pointer immediately for precision
    dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
    if (reduced) {
      ring.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
    } else if (!raf) {
      raf = requestAnimationFrame(tick);
    }
    setState(e);
  }

  function onDown(e) {
    if (!isEnabled()) return;
    document.body.classList.add("cursor-click");
    setState(e);
  }
  function onUp(e) {
    document.body.classList.remove("cursor-click");
    if (isEnabled()) setState(e);
  }
  function onLeave() {
    // Hide off-window
    if (!isEnabled()) return;
    mx = -100; my = -100; rx = -100; ry = -100;
    dot.style.transform = "translate3d(-100px, -100px, 0)";
    ring.style.transform = "translate3d(-100px, -100px, 0)";
    document.body.classList.remove("cursor-hover", "cursor-text", "cursor-click");
  }

  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("mousemove", onMove, { passive: true });
  window.addEventListener("pointerdown", onDown, { passive: true });
  window.addEventListener("pointerup", onUp, { passive: true });
  window.addEventListener("mousedown", onDown, { passive: true });
  window.addEventListener("mouseup", onUp, { passive: true });
  document.addEventListener("mouseleave", onLeave);
  window.addEventListener("blur", () => document.body.classList.remove("cursor-click"));
})();

function startParticles(force) {
  const key = [data.particles, data.particleType, data.theme].join("|");
  if (!force && key === pKey) return;
  pKey = key; pColor = getParticleColor();
  cancelAnimationFrame(animId);
  if (data.particles) {
    resizeCanvas();
    initParticles();
    drawParticles();
  } else {
    ctx.clearRect(0, 0, W, H);
  }
}

window.addEventListener("resize", () => {
  if (data.particles) {
    resizeCanvas();
    initParticles();
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    cancelAnimationFrame(animId);
    animId = null;
  } else if (data.particles) { startParticles(true);
  }
});

function updateThemeBg() {
  const bg = $("#themeBg");
  bg.className = "theme-bg " + (data.theme || "classic");
}

function applyMode() {
  const isStudy = data.mode === "study";
  document.body.classList.toggle("mode-study", isStudy);
  document.body.classList.toggle("mode-planner", !isStudy);
  $("#modePlanner").classList.toggle("active", !isStudy);
  $("#modeStudy").classList.toggle("active", isStudy);
  $("#brandTagline").textContent = isStudy ? "Focus. Learn. Finish." : "Your life, in one place.";
  $("#topEyebrow").textContent = isStudy ? "Deep work" : "Personal command center";

  document.querySelectorAll(".nav button").forEach(btn => {
    const modes = (btn.dataset.modes || "").split(" ");
    btn.hidden = !modes.includes(data.mode);
  });
  document.querySelectorAll(".mobile-nav-btn").forEach(btn => {
    if (btn.classList.contains("planner-only")) btn.hidden = isStudy;
    else if (btn.classList.contains("study-only")) btn.hidden = !isStudy;
    else btn.hidden = false;
  });
  const mPlanner = document.getElementById("mobileModePlanner");
  const mStudy = document.getElementById("mobileModeStudy");
  if (mPlanner) mPlanner.classList.toggle("active", !isStudy);
  if (mStudy) mStudy.classList.toggle("active", isStudy);
  const mLabel = document.getElementById("mobileModeLabel");
  if (mLabel) mLabel.textContent = isStudy ? "Study" : "Planner";

  const current = document.querySelector(".view.active");
  if (current) {
    const allowed = current.classList.contains(isStudy ? "study-only" : "planner-only") ||
                    (!current.classList.contains("planner-only") && !current.classList.contains("study-only"));
    if (!allowed) switchView(isStudy ? "focus" : "today");
  }
}

function applyVisualSettings() {
  
  document.body.classList.toggle("particles-on", data.particles);
  document.body.classList.toggle("space-on", data.spaceBackground !== false);
  document.body.classList.toggle("cursor-on", data.customCursor);
  if (!data.customCursor) {
    document.body.classList.remove("cursor-hover", "cursor-text", "cursor-click");
  }
  document.body.classList.toggle("motion-on", data.motionEffects !== false);
  $("#settingParticles").checked = data.particles;
  if ($("#settingSpace")) $("#settingSpace").checked = data.spaceBackground !== false;
  if ($("#settingCursor")) $("#settingCursor").checked = Boolean(data.customCursor);
  if ($("#settingMotion")) $("#settingMotion").checked = data.motionEffects !== false;
  document.querySelectorAll(".particle-type-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.ptype === data.particleType);
  });
  startParticles();
}

function renderAll() {
  applyTheme();
  applyMode();
  applyVisualSettings();
  updateThemeBg();
  renderToday();
  renderStudyFocus();
  renderCalendar();
  renderLessons();
  renderTodos();
  renderNotes();
  renderEvents();
  renderHabits();
  renderProgressHistory();
  renderPomodoroSettings();
  updateProgress();
  renderCompactStatus();
  updateTimerDisplay();
  renderSessionDots();
}

function applyTheme() {
  document.body.classList.remove(...THEME_CLASSES);
  if (data.theme && data.theme !== "classic") {
    document.body.classList.add(`theme-${data.theme}`);
  }
  document.body.classList.toggle("space-on", data.spaceBackground !== false);
  document.querySelectorAll(".theme-swatch, .theme-button").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.theme === data.theme);
  });
  updateAtmosphere();
}
// ========== POMODORO ==========
function setPomodoroMode(mode, resetTime = true) {
  pomodoroMode = mode;
  document.querySelectorAll(".study-timer-modes button").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  });
  const card = $("#studyTimerCard");
  card.classList.toggle("is-break", mode !== "focus");
  $("#studyPomoEyebrow").textContent = mode === "focus" ? "Focus session" : "Break";
  $("#studyPomoTitle").textContent =
    mode === "focus" ? "Ready when you are" :
    mode === "short" ? "Short break" : "Long break";
  $("#studyPomoCopy").textContent =
    mode === "focus"
      ? "Start a focused block. Everything else can wait."
      : "Step away. The next focus block will be waiting.";
  if (resetTime) timerSeconds = getModeSeconds(mode);
  if (!timerInterval) {
    $("#studyTimerButton").textContent = mode === "focus" ? "Start focus" : "Start break";
  }
  updateTimerDisplay();
  renderSessionDots();
}

function renderPomodoroSettings() {
  $("#pomoWork").value = data.pomodoro.workMinutes;
  $("#pomoShort").value = data.pomodoro.shortBreakMinutes;
  $("#pomoLong").value = data.pomodoro.longBreakMinutes;
  $("#pomoUntilLong").value = data.pomodoro.sessionsUntilLong;
  $("#pomoAuto").checked = data.pomodoro.autoStart;
}

function renderSessionDots() {
  const until = Math.max(1, data.pomodoro.sessionsUntilLong);
  const completed = data.pomodoro.completedFocusSessions % until;
  const running = Boolean(timerInterval) && pomodoroMode === "focus";
  $("#studySessionDots").innerHTML = Array.from({ length: until }, (_, i) => {
    const done = i < completed;
    const current = running && i === completed;
    return `<span class="session-dot ${done ? "done" : ""} ${current ? "current" : ""}"></span>`;
  }).join("");
}

function completePomodoroSession(skipped) {
  playChime();
  $("#studyTimer").classList.add("pulse");
  setTimeout(() => $("#studyTimer").classList.remove("pulse"), 500);
  if (pomodoroMode === "focus") {
    if (!skipped) data.pomodoro.completedFocusSessions += 1;
    const until = Math.max(1, data.pomodoro.sessionsUntilLong);
    const next = data.pomodoro.completedFocusSessions % until === 0 ? "long" : "short";
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setPomodoroMode(next);
    showToast(next === "long" ? "Long break time" : "Short break time");
  } else {
    setPomodoroMode("focus");
    showToast("Back to focus");
  }
  if (data.pomodoro.autoStart) startTimer(true);
  else {
    timerInterval = null;
    $("#studyTimerButton").textContent = pomodoroMode === "focus" ? "Start focus" : "Start break";
  }
}

function startTimer() {
  if (timerInterval) return;
  $("#studyTimerButton").textContent = "Pause";
  const endAt = Date.now() + timerSeconds * 1000; timerInterval = setInterval(() => { timerSeconds = Math.max(0, Math.ceil((endAt - Date.now()) / 1000)); updateTimerDisplay();
    if (timerSeconds <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      completePomodoroSession();
    }
  }, 250); renderSessionDots(); } function pauseTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  $("#studyTimerButton").textContent = "Resume";
  renderSessionDots();
}

function updateTimerDisplay() {
  const m = Math.floor(Math.max(0, timerSeconds) / 60).toString().padStart(2, "0");
  const s = (Math.max(0, timerSeconds) % 60).toString().padStart(2, "0");
  $("#studyTimer").textContent = `${m}:${s}`;
}

// ========== PLANNER ==========
function renderToday() {
  if (data.mode !== "planner") return;
  const today = getTodayString();
  const p = getDailyProgress();

  // Hub
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning." : hour < 18 ? "Good afternoon." : "Good evening.";
  if ($("#mapHubGreeting")) $("#mapHubGreeting").textContent = greeting;
  $("#pageTitle").textContent = greeting;
  if ($("#mapHubRing")) {
    $("#mapHubRing").style.setProperty("--progress", p.percentage);
    $("#mapHubPercent").textContent = p.percentage + "%";
  }
  if ($("#dailyProgressCircle")) {
    $("#dailyProgressCircle").style.setProperty("--progress", p.percentage);
    $("#dailyProgressPercent").textContent = p.percentage + "%";
  }
  if (!p.total) {
    $("#dailyProgressTitle").textContent = "Nothing due today";
    $("#dailyProgressText").textContent = "Add dated tasks to track the day.";
  } else {
    $("#dailyProgressTitle").textContent = `${p.completed} of ${p.total} complete`;
    $("#dailyProgressText").textContent =
      p.percentage === 100 ? "Everything due today is done." : `${p.total - p.completed} left today.`;
  }
  if ($("#nodeProgressMeta")) {
    $("#nodeProgressMeta").textContent = p.total ? `${p.percentage}% of today’s tasks` : "Mood & history";
  }
  if ($("#nodeProgressBadge")) $("#nodeProgressBadge").textContent = p.percentage + "%";

  // Tasks node
  const openToday = data.todos
    .filter(t => t.date === today)
    .sort((a, b) => {
      if (a.done !== b.done) return a.done - b.done;
      return (a.time || "").localeCompare(b.time || "");
    });
  const openCount = openToday.filter(t => !t.done).length;
  $("#nodeTasksBadge").textContent = String(openCount);
  const tasksNode = document.getElementById("nodeTasks");
  if (tasksNode) tasksNode.classList.toggle("has-due", openCount > 0);
  $("#nodeTasksMeta").textContent = openCount
    ? `${openCount} open · ${openToday.filter(t => t.done).length} done`
    : (openToday.length ? "All done for today" : "Nothing due — add a task");

  $("#todayTaskList").innerHTML = openToday.length
    ? openToday.map(t => `
        <div class="list-item todo-row map-task ${t.done ? "done" : ""}">
          <input type="checkbox" class="todo-check today-task-check" data-id="${t.id}" ${t.done ? "checked" : ""} />
          <div class="item-main">
            <div class="item-title">${escapeHtml(t.text)}</div>
            <div class="item-meta">${t.time ? t.time + " · " : ""}${escapeHtml(t.category || "Task")}</div>
          </div>
        </div>`).join("")
    : `<div class="map-empty">No dated tasks for today.</div>`;

  document.querySelectorAll(".today-task-check").forEach(cb => {
    cb.addEventListener("change", () => {
      const todo = data.todos.find(t => t.id === cb.dataset.id);
      if (!todo) return;
      todo.done = cb.checked;
      recordCompletion(todo, cb.checked);
      if (cb.checked) {
        const row = cb.closest(".map-task");
        if (row) {
          row.classList.add("just-done");
          setTimeout(() => row.classList.remove("just-done"), 600);
        }
        const hub = document.getElementById("mapHub");
        if (hub) {
          hub.classList.add("ring-pop");
          setTimeout(() => hub.classList.remove("ring-pop"), 500);
        }
      }
      saveData();
    });
  });

  // Schedule node
  const dayName = WEEK_DAYS[(new Date().getDay() + 6) % 7];
  const todayEvents = data.events
    .filter(e => e.date === today)
    .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  const todayLessons = data.lessons
    .filter(l => l.day === dayName)
    .sort((a, b) => (a.start || a.time || "").localeCompare(b.start || b.time || ""));

  const scheduleItems = [
    ...todayLessons.map(l => ({
      title: l.subject,
      meta: (l.start && l.end ? `${l.start}–${l.end}` : (l.time || "Time TBD")) + " · Lesson",
      kind: "lesson"
    })),
    ...todayEvents.map(e => ({
      title: e.title,
      meta: (e.time || "All day") + " · " + (e.type || "Event"),
      kind: "event"
    }))
  ];
  $("#nodeScheduleBadge").textContent = String(scheduleItems.length);
  $("#nodeScheduleMeta").textContent = scheduleItems.length
    ? `${todayLessons.length} lesson${todayLessons.length === 1 ? "" : "s"} · ${todayEvents.length} event${todayEvents.length === 1 ? "" : "s"}`
    : "Free day — nothing scheduled";

  $("#todayScheduleList").innerHTML = scheduleItems.length
    ? scheduleItems.map(i => `
        <div class="map-orbit-item is-${i.kind}">
          <span class="map-orbit-dot"></span>
          <div>
            <strong>${escapeHtml(i.title)}</strong>
            <span>${escapeHtml(i.meta)}</span>
          </div>
        </div>`).join("")
    : `<div class="map-empty">Nothing on the calendar today.</div>`;

  // Notes preview
  const notes = data.notes || [];
  $("#nodeNotesBadge").textContent = String(notes.length);
  $("#nodeNotesMeta").textContent = notes.length ? `${notes.length} note${notes.length === 1 ? "" : "s"}` : "Empty — start writing";
  $("#todayNotesPreview").innerHTML = notes.length
    ? notes.slice(0, 3).map(n => {
        const preview = (typeof noteToText === "function" ? noteToText(n.body) : "").slice(0, 60) || "Empty note";
        return `<div class="map-orbit-item"><span class="map-orbit-dot"></span><div><strong>${escapeHtml(n.title || "Untitled")}</strong><span>${escapeHtml(preview)}</span></div></div>`;
      }).join("")
    : `<div class="map-empty">No notes yet.</div>`;

  // Habits preview
  const habits = data.habits || [];
  const habitsDone = habits.filter(h => h.checks && h.checks[today]).length;
  $("#nodeHabitsBadge").textContent = habits.length ? `${habitsDone}/${habits.length}` : "0";
  $("#nodeHabitsMeta").textContent = habits.length
    ? `${habitsDone} of ${habits.length} checked today`
    : "Build a small daily habit";
  $("#todayHabitsPreview").innerHTML = habits.length
    ? habits.slice(0, 5).map(h => {
        const on = Boolean(h.checks && h.checks[today]);
        return `<div class="map-orbit-item"><span class="map-orbit-dot" style="${on ? "" : "background:var(--line)"}"></span><div><strong>${escapeHtml(h.name)}</strong><span>${on ? "Done today" : "Not yet"}</span></div></div>`;
      }).join("")
    : `<div class="map-empty">No habits yet.</div>`;

  renderLiveClock();
  renderStreak();
  updateMapHubClock();
  ensureMapObserver();
  scheduleMapDraw();
  setTimeout(scheduleMapDraw, 60);
}

function updateMapHubClock() {
  const now = new Date();
  if ($("#mapHubTime")) {
    $("#mapHubTime").textContent = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  if ($("#mapHubDate")) {
    $("#mapHubDate").textContent = now.toLocaleDateString(undefined, {
      weekday: "long", day: "numeric", month: "long"
    });
  }
}

let _mapRO = null;
let _mapDrawPending = false;

function drawMapLines() {
  const svg = document.getElementById("mapSvg");
  const stage = document.getElementById("mapStage") || document.querySelector(".map-stage");
  const hub = document.getElementById("mapHub");
  if (!svg || !stage || !hub) return;

  // Hide connectors when the layout collapses to 2-col / 1-col
  const sr = stage.getBoundingClientRect();
  const compact = window.matchMedia("(max-width: 960px)").matches || sr.width < 640;
  if (compact) {
    svg.innerHTML = "";
    svg.style.display = "none";
    return;
  }
  svg.style.display = "";

  // Use offset dimensions (layout box) so browser zoom stays consistent:
  // getBoundingClientRect is in CSS pixels; we normalize via scale factor.
  const scaleX = sr.width / Math.max(stage.offsetWidth, 1);
  const scaleY = sr.height / Math.max(stage.offsetHeight, 1);
  const w = stage.offsetWidth;
  const h = stage.offsetHeight;
  if (w < 10 || h < 10) return;

  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.style.width = "100%";
  svg.style.height = "100%";

  const toLocal = (el) => {
    const r = el.getBoundingClientRect();
    return {
      x: (r.left + r.width / 2 - sr.left) / scaleX,
      y: (r.top + r.height / 2 - sr.top) / scaleY
    };
  };

  const hubPt = toLocal(hub);
  let lines = "";
  stage.querySelectorAll(".map-node").forEach(n => {
    const pt = toLocal(n);
    lines += `<line x1="${hubPt.x.toFixed(1)}" y1="${hubPt.y.toFixed(1)}" x2="${pt.x.toFixed(1)}" y2="${pt.y.toFixed(1)}" />`;
  });
  svg.innerHTML = lines;
}

function scheduleMapDraw() {
  if (_mapDrawPending) return;
  _mapDrawPending = true;
  requestAnimationFrame(() => {
    _mapDrawPending = false;
    drawMapLines();
  });
}

function ensureMapObserver() {
  const stage = document.getElementById("mapStage");
  if (!stage || _mapRO) return;
  if (typeof ResizeObserver !== "undefined") {
    _mapRO = new ResizeObserver(() => scheduleMapDraw());
    _mapRO.observe(stage);
    const map = document.getElementById("livingMap");
    if (map) _mapRO.observe(map);
  }
  window.addEventListener("resize", scheduleMapDraw, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", scheduleMapDraw, { passive: true });
    window.visualViewport.addEventListener("scroll", scheduleMapDraw, { passive: true });
  }
}

let expandedMapNode = null;
function toggleMapNode(name) {
  document.querySelectorAll(".map-node").forEach(n => {
    const open = n.dataset.node === name && expandedMapNode !== name;
    n.classList.toggle("is-expanded", open);
    const head = n.querySelector("[data-expand]");
    if (head) head.setAttribute("aria-expanded", open ? "true" : "false");
  });
  expandedMapNode = expandedMapNode === name ? null : name;
  scheduleMapDraw();
  // slight delay so expand height is measured
  setTimeout(scheduleMapDraw, 50);
  setTimeout(scheduleMapDraw, 280);
}

function renderLiveClock() {
  const now = new Date();
  if ($("#liveTime")) {
    $("#liveTime").textContent = now.toLocaleTimeString(undefined, {
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
    $("#liveDate").textContent = now.toLocaleDateString(undefined, {
      weekday: "long", day: "numeric", month: "long", year: "numeric"
    });
  }
  if ($("#todayLabel")) {
    $("#todayLabel").textContent = now.toLocaleDateString(undefined, {
      weekday: "long", day: "numeric", month: "long", year: "numeric"
    });
  }
  if ($("#compactTime")) {
    $("#compactTime").textContent = now.toLocaleTimeString(undefined, {
      hour: "2-digit", minute: "2-digit"
    });
  }
  updateMapHubClock();
}

function getDailyProgress() {
  const today = getTodayString();
  const due = data.todos.filter(t => t.date === today);
  const done = due.filter(t => t.done).length;
  return {
    total: due.length,
    completed: done,
    percentage: due.length ? Math.round((done / due.length) * 100) : 0
  };
}

function renderDailyProgress() {
  const p = getDailyProgress();
  if (!$("#dailyProgressCircle")) return;
  $("#dailyProgressCircle").style.setProperty("--progress", p.percentage);
  $("#dailyProgressPercent").textContent = `${p.percentage}%`;
  if (!p.total) {
    $("#dailyProgressTitle").textContent = "Nothing due today";
    $("#dailyProgressText").textContent = "Add tasks for today to track progress.";
  } else {
    $("#dailyProgressTitle").textContent = `${p.completed} of ${p.total} complete`;
    $("#dailyProgressText").textContent =
      p.percentage === 100 ? "Everything due today is done." :
      `${p.total - p.completed} left today.`;
  }
}

function getTasksCompletedOn(dateStr) {
  return data.todos.filter(t => t.done && t.completedOn === dateStr);
}

function recordCompletion(todo, completed) {
  const today = getTodayString();
  if (completed) {
    todo.completedOn = today;
    data.dailyCompletions[today] = (data.dailyCompletions[today] || 0) + 1;
  } else {
    const day = todo.completedOn;
    if (day) data.dailyCompletions[day] = Math.max(0, (data.dailyCompletions[day] || 1) - 1);
    todo.completedOn = "";
  }
}

function renderCompletedToday() {
  if (!$("#completedTodayList")) return;
  const items = getTasksCompletedOn(getTodayString());
  $("#completedTodayCount").textContent = items.length;
  $("#completedTodayList").innerHTML = items.length
    ? items.map(t => `
        <div class="list-item">
          <div class="item-main">
            <div class="item-title">${escapeHtml(t.text)}</div>
            <div class="item-meta">${escapeHtml(t.category || "Task")}</div>
          </div>
          <span class="tag">Done</span>
        </div>`).join("")
    : `<div class="empty">No tasks finished yet today.</div>`;
}

function hasStreakCheckin(d) { return Boolean(data.streakCheckins?.[d]); }

function getStreak() {
  let streak = 0;
  const cursor = parseLocalDate(getTodayString()); if (!hasStreakCheckin(getDateString(cursor))) cursor.setDate(cursor.getDate() - 1); while (hasStreakCheckin(getDateString(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function renderStreak() {
  const today = getTodayString();
  const streak = getStreak();
  const checked = hasStreakCheckin(today);

  if ($("#streakNumber")) {
    $("#streakNumber").textContent = streak;
    const btn = $("#streakCheckinButton");
    btn.classList.toggle("checked", checked);
    btn.disabled = checked;
    btn.textContent = checked ? "✓ Today's streak is secured" : "Check in for today";
    $("#streakStatus").textContent = checked
      ? "Come back tomorrow to keep the chain going."
      : streak ? "Check in today to continue." : "Your first check-in starts the streak.";

    const todayDate = parseLocalDate(today);
    const mondayOffset = (todayDate.getDay() + 6) % 7;
    const monday = new Date(todayDate);
    monday.setDate(todayDate.getDate() - mondayOffset);
    const short = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    const weekHtml = short.map((d, i) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const ds = getDateString(date);
      const active = hasStreakCheckin(ds);
      const isToday = ds === today;
      return `<div class="streak-day">${d}<div class="streak-dot ${active ? "active" : ""} ${isToday ? "today" : ""}">${active ? "✓" : ""}</div></div>`;
    }).join("");
    if ($("#streakWeek")) $("#streakWeek").innerHTML = weekHtml;
    if ($("#progressStreakWeek")) $("#progressStreakWeek").innerHTML = weekHtml;
  }

  if ($("#studyStreakNumber")) {
    $("#studyStreakNumber").textContent = streak;
    const sbtn = $("#studyStreakBtn");
    if (sbtn) {
      sbtn.classList.toggle("checked", checked);
      sbtn.disabled = checked;
      sbtn.textContent = checked ? "✓ Checked in" : "Check in for today";
    }
  }

  if ($("#progressStreakNumber")) {
    $("#progressStreakNumber").textContent = streak;
    const pbtn = $("#progressStreakBtn");
    if (pbtn) {
      pbtn.classList.toggle("checked", checked);
      pbtn.disabled = checked;
      pbtn.textContent = checked ? "✓ Today's streak is secured" : "Check in for today";
    }
    if ($("#progressStreakStatus")) {
      $("#progressStreakStatus").textContent = checked
        ? "Come back tomorrow to keep the chain going."
        : streak ? "Check in today to continue." : "Your first check-in starts the streak.";
    }
  }
}

function renderMoodPanel() {
  if (!$("#moodOptions")) return;
  const moodId = data.moods?.[selectedMoodDate] || null;
  const selectedDate = parseLocalDate(selectedMoodDate);
  $("#moodSelectedDate").textContent = selectedDate.toLocaleDateString(undefined, {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });
  $("#moodOptions").innerHTML = MOODS.map(m => `
    <button type="button" class="mood-button ${moodId === m.id ? "selected" : ""}"
      data-mood-id="${m.id}" style="--mood-color:${m.color};">
      <span class="mood-emoji">${m.emoji}</span>
      <span class="mood-name">${m.name}</span>
    </button>`).join("");
  $("#moodLegend").innerHTML = MOODS.map(m => `
    <div class="mood-legend-row">
      <span class="mood-swatch" style="--mood-color:${m.color};"></span>
      <span>${m.emoji} ${m.name}</span>
    </div>`).join("");
  document.querySelectorAll(".mood-button").forEach(btn => {
    btn.addEventListener("click", () => {
      data.moods[selectedMoodDate] = btn.dataset.moodId;
      saveData();
      showToast("Mood saved");
    });
  });
}

// ========== HABITS ==========
function getHabitStreak(habit) {
  let streak = 0;
  const cursor = parseLocalDate(getTodayString()); if (!(habit.checks && habit.checks[getDateString(cursor)])) cursor.setDate(cursor.getDate() - 1); while (habit.checks && habit.checks[getDateString(cursor)]) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function getMondayOfWeek(dateStr) {
  const d = parseLocalDate(dateStr);
  const offset = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  d.setDate(d.getDate() - offset);
  return d;
}

function getHabitWeekDays(todayStr) {
  const monday = getMondayOfWeek(todayStr);
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return labels.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = getDateString(d);
    return { label, key, isToday: key === todayStr };
  });
}

function getHabitWeekRate(habit, weekDays) {
  const done = weekDays.filter(d => habit.checks?.[d.key]).length;
  return { done, total: 7 };
}

function renderHabits() {
  if (!$("#habitList")) return;
  const today = getTodayString();
  const weekDays = getHabitWeekDays(today);

  $("#habitList").innerHTML = data.habits.length
    ? data.habits.map(h => {
        const doneToday = Boolean(h.checks?.[today]);
        const streak = getHabitStreak(h);
        const rate = getHabitWeekRate(h, weekDays);
        const cells = weekDays.map(d => `
          <div class="habit-day-cell">
            <span class="habit-day-label ${d.isToday ? "is-today" : ""}">${d.label}</span>
            <button type="button"
              class="habit-day-dot ${h.checks?.[d.key] ? "on" : ""} ${d.isToday ? "is-today" : ""}"
              data-id="${h.id}" data-date="${d.key}"
              title="${d.label}${d.isToday ? " (today)" : ""}">
              ${h.checks?.[d.key] ? "✓" : ""}
            </button>
          </div>`).join("");

        return `
          <div class="habit-card">
            <button type="button" class="habit-check ${doneToday ? "done" : ""}" data-id="${h.id}" title="Toggle today">
              ${doneToday ? "✓" : ""}
            </button>
            <div class="habit-info">
              <div class="habit-name">${escapeHtml(h.name)}</div>
              <div class="habit-meta">${streak} day streak · ${rate.done}/7 this week</div>
              <div class="habit-week">${cells}</div>
              <div class="habit-week-caption">Mon → Sun · click any day to toggle</div>
            </div>
            <div class="habit-card-actions">
              <div class="habit-streak">${streak}🔥</div>
              <button type="button" class="habit-rename-btn rename-habit" data-id="${h.id}" title="Rename">✎</button>
              <button type="button" class="icon-button delete-habit" data-id="${h.id}" title="Delete">×</button>
            </div>
          </div>`;
      }).join("")
    : `<div class="empty">No habits yet. Add one to start building consistency.</div>`;

  // Toggle today via main checkbox
  document.querySelectorAll(".habit-check").forEach(btn => {
    btn.addEventListener("click", () => {
      const habit = data.habits.find(h => h.id === btn.dataset.id);
      if (!habit) return;
      if (!habit.checks) habit.checks = {};
      if (habit.checks[today]) delete habit.checks[today];
      else habit.checks[today] = true;
      saveData();
    });
  });
  // Toggle any day via week dots
  document.querySelectorAll(".habit-day-dot").forEach(btn => {
    btn.addEventListener("click", () => {
      const habit = data.habits.find(h => h.id === btn.dataset.id);
      if (!habit) return;
      const key = btn.dataset.date;
      if (!habit.checks) habit.checks = {};
      if (habit.checks[key]) delete habit.checks[key];
      else habit.checks[key] = true;
      saveData();
    });
  });
  document.querySelectorAll(".delete-habit").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!confirm("Delete this habit?")) return;
      const removed = data.habits.find(h => h.id === btn.dataset.id);
      if (!removed) return;
      data.habits = data.habits.filter(h => h.id !== btn.dataset.id);
      pushUndo("delete habit", () => { data.habits.push(removed); });
      saveData();
      showToast("Habit removed");
    });
  });
  document.querySelectorAll(".rename-habit").forEach(btn => {
    btn.addEventListener("click", () => {
      const habit = data.habits.find(h => h.id === btn.dataset.id);
      if (!habit) return;
      const next = prompt("Rename habit", habit.name);
      if (next == null) return;
      const trimmed = next.trim();
      if (!trimmed) return;
      habit.name = trimmed;
      saveData();
      showToast("Habit renamed");
    });
  });
}

// ========== SPOTIFY ==========
const SPOTIFY_PRESETS = [
  { id: "deep-focus", name: "Deep Focus", embed: "https://open.spotify.com/embed/playlist/37i9dQZF1DWZeKCadgRdKQ?utm_source=generator&theme=0" },
  { id: "lofi", name: "Lo-fi Beats", embed: "https://open.spotify.com/embed/playlist/37i9dQZF1DWWQRwui0ExPn?utm_source=generator&theme=0" },
  { id: "classical", name: "Classical Focus", embed: "https://open.spotify.com/embed/playlist/37i9dQZF1DWWEJlAGA9gs0?utm_source=generator&theme=0" },
  { id: "jazz", name: "Jazz Vibes", embed: "https://open.spotify.com/embed/playlist/37i9dQZF1DX0SM0LYsmbMT?utm_source=generator&theme=0" },
  { id: "ambient", name: "Ambient Relax", embed: "https://open.spotify.com/embed/playlist/37i9dQZF1DX3Ogo9pFvBkY?utm_source=generator&theme=0" },
  { id: "piano", name: "Peaceful Piano", embed: "https://open.spotify.com/embed/playlist/37i9dQZF1DX4sWSpwq3LiO?utm_source=generator&theme=0" }
];

function parseSpotifyEmbed(url) {
  if (!url) return null;
  url = url.trim();
  // already embed
  if (/^https:\/\/open\.spotify\.com\/embed\//.test(url)) {
    if (!url.includes("utm_source")) url += (url.includes("?") ? "&" : "?") + "utm_source=generator&theme=0";
    return url;
  }
  // open.spotify.com/playlist/ID or /album/ID or /track/ID or /artist/ID
  const m = url.match(/open\.spotify\.com\/(playlist|album|track|artist|episode|show)\/([a-zA-Z0-9]+)/);
  if (m) {
    return `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator&theme=0`;
  }
  // spotify:playlist:ID
  const m2 = url.match(/spotify:(playlist|album|track|artist):([a-zA-Z0-9]+)/);
  if (m2) {
    return `https://open.spotify.com/embed/${m2[1]}/${m2[2]}?utm_source=generator&theme=0`;
  }
  return null;
}

function renderSpotify() {
  const frame = $("#spotifyFrame");
  if (!frame) return;
  const embed = data.spotifyEmbed || defaultData.spotifyEmbed;
  if (frame.getAttribute("src") !== embed) {
    frame.setAttribute("src", embed);
  }
  const presets = $("#spotifyPresets");
  if (presets) {
    presets.innerHTML = SPOTIFY_PRESETS.map(p => `
      <button type="button" class="spotify-preset-btn ${data.spotifyPreset === p.id ? "active" : ""}" data-preset="${p.id}">
        ${p.name}
      </button>`).join("");
    presets.querySelectorAll(".spotify-preset-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const p = SPOTIFY_PRESETS.find(x => x.id === btn.dataset.preset);
        if (!p) return;
        data.spotifyPreset = p.id;
        data.spotifyEmbed = p.embed;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        renderSpotify();
        showToast(p.name);
      });
    });
  }
}

    // ========== STUDY FOCUS ==========
function renderStudyFocus() {
  if (data.mode !== "study") return;
  const hour = new Date().getHours();
  $("#pageTitle").textContent =
    hour < 12 ? "Good morning." : hour < 18 ? "Good afternoon." : "Good evening.";

  const today = getTodayString();
  const studyTasks = data.todos
    .filter(t => !t.done && (t.category === "School" || t.generatedHomework || t.date === today))
    .sort((a, b) => `${a.date || "9999"}${a.time || ""}`.localeCompare(`${b.date || "9999"}${b.time || ""}`));

  $("#studyTaskList").innerHTML = studyTasks.length
    ? studyTasks.slice(0, 8).map(t => `
        <div class="study-task-item ${t.done ? "done" : ""}">
          <input type="checkbox" class="study-task-check" data-id="${t.id}" ${t.done ? "checked" : ""} />
          <div>
            <div class="task-text">${escapeHtml(t.text)}</div>
            <div class="task-meta">
              ${t.date ? formatDate(t.date, false) : "No date"}
              ${t.time ? ` · ${t.time}` : ""}
              ${t.generatedHomework ? " · Homework" : ""}
            </div>
          </div>
        </div>`).join("")
    : `<div class="empty" style="padding:14px 0;">No open study tasks. Add some from the Tasks page.</div>`;

  document.querySelectorAll(".study-task-check").forEach(cb => {
    cb.addEventListener("change", () => {
      const todo = data.todos.find(t => t.id === cb.dataset.id);
      if (!todo) return;
      const wasDone = todo.done;
      const id = todo.id;
      const prevCompletedOn = todo.completedOn;
      todo.done = cb.checked;
      recordCompletion(todo, cb.checked);
      if (cb.checked !== wasDone) {
        pushUndo(cb.checked ? "complete task" : "uncomplete task", () => {
          const t = data.todos.find(x => x.id === id);
          if (!t) return;
          t.done = wasDone;
          t.completedOn = prevCompletedOn || "";
        });
      }
      if (cb.checked && !wasDone) {
        const row = cb.closest(".todo-row, .map-task, .study-task-item");
        if (row) {
          row.classList.add("just-done");
          setTimeout(() => row.classList.remove("just-done"), 500);
        }
      }
      saveData();
    });
  });

  const dayName = WEEK_DAYS[(new Date().getDay() + 6) % 7];
  const todayLessons = data.lessons
    .filter(l => l.day === dayName)
    .sort((a, b) => (a.start || a.time || "").localeCompare(b.start || b.time || ""));

  $("#studyLessonsToday").innerHTML = todayLessons.length
    ? todayLessons.map(l => `
        <div class="study-lesson-chip">
          <strong>${escapeHtml(l.subject)}</strong>
          <span>${l.start && l.end ? l.start + "–" + l.end : (l.time || "Time TBD")}</span>
        </div>`).join("")
    : `<div class="empty" style="padding:8px 0;">No lessons scheduled today.</div>`;

  renderStreak();
  renderSpotify();
  setPomodoroMode(pomodoroMode, false);
}

// ========== CALENDAR ==========
function getMood(dateStr) { return data.moods?.[dateStr] || null; }
function getMoodDefinition(id) { return MOODS.find(m => m.id === id) || null; }

function renderCalendar() {
  if (!$("#calendarGrid")) return;
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  $("#monthTitle").textContent = currentMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const weekdays = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  let html = weekdays.map(d => `<div class="calendar-weekday">${d}</div>`).join("");
  for (let i = 0; i < startOffset; i++) html += `<div class="calendar-day muted"></div>`;

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day);
    const ds = getDateString(date);
    const isToday = ds === getTodayString();
    const isSelected = ds === selectedCalendarDate;
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const mood = getMoodDefinition(getMood(ds));
    const events = data.events.filter(e => e.date === ds);
    const todos = data.todos.filter(t => t.date === ds);

    html += `
      <div class="calendar-day ${isToday ? "today" : ""} ${isSelected ? "selected" : ""} ${isWeekend ? "weekend" : ""} ${mood ? "has-mood" : ""}"
        data-date="${ds}" ${mood ? `style="--mood-color:${mood.color};"` : ""}>
        <div class="day-number">${day}</div>
        ${mood ? `<div class="mood-badge" style="--mood-color:${mood.color};"><span>${mood.emoji}</span></div>` : ""}
        ${events.slice(0, 2).map(e => `<div class="calendar-event">${escapeHtml(e.title)}</div>`).join("")}
        ${todos.length ? `<div class="calendar-event" style="background:var(--green-light);color:var(--green);">✓ ${todos.filter(t=>t.done).length}/${todos.length}</div>` : ""}
      </div>`;
  }
  $("#calendarGrid").innerHTML = html;

  document.querySelectorAll(".calendar-day[data-date]").forEach(day => {
    day.addEventListener("click", () => {
      selectedCalendarDate = day.dataset.date;
      selectedMoodDate = day.dataset.date;
      renderCalendar();
      renderMoodPanel();
    });
  });

  renderSelectedDay();
  const prefix = `${year}-${pad(month + 1)}`;
  const count = data.events.filter(e => e.date.startsWith(prefix)).length +
               data.todos.filter(t => (t.date || "").startsWith(prefix)).length;
  $("#calendarMonthStats").textContent = `${count} scheduled item${count === 1 ? "" : "s"}`;
}

function getDayItems(ds) {
  const events = data.events.filter(e => e.date === ds)
    .map(e => ({ title: e.title, meta: `${e.time || "All day"} · ${e.type}` }));
  const todos = data.todos.filter(t => t.date === ds)
    .map(t => ({ title: `${t.done ? "✓ " : ""}${t.text}`, meta: `Task · ${t.category}` }));
  return [...events, ...todos];
}

function renderSelectedDay() {
  const ds = selectedCalendarDate;
  const date = parseLocalDate(ds);
  const items = getDayItems(ds);
  const mood = getMoodDefinition(getMood(ds));
  $("#selectedDayTitle").textContent = date.toLocaleDateString(undefined, {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });
  $("#calendarSummary").innerHTML = `${mood ? `${mood.emoji} ${mood.name}` : "No mood"} · <strong>${items.length} item${items.length === 1 ? "" : "s"}</strong>`;
  $("#selectedDayContent").innerHTML = items.length
    ? items.map(i => `<div class="selected-day-item"><span>${escapeHtml(i.title)}</span><span>${escapeHtml(i.meta)}</span></div>`).join("")
    : `<div class="empty">Nothing scheduled.</div>`;
}

// ========== LESSONS ==========
function getDayIndex(name) { return WEEK_DAYS.indexOf(name); }
function getNextLessonDate(dayName) {
  const today = parseLocalDate(getTodayString());
  const target = getDayIndex(dayName);
  const current = (today.getDay() + 6) % 7;
  let diff = target - current;
  if (diff < 0) diff += 7;
  const result = new Date(today);
  result.setDate(today.getDate() + diff);
  return getDateString(result);
}

function createOrUpdateHomeworkTodo(lesson) {
  const has = Boolean(lesson.homework?.trim());
  let hw = data.todos.find(t => t.lessonId === lesson.id);
  if (!has) {
    if (hw) data.todos = data.todos.filter(t => t.id !== hw.id);
    return;
  }
  const date = getNextLessonDate(lesson.day);
  if (!hw) {
    data.todos.push({
      id: makeId(),
      text: `Homework: ${lesson.subject}`,
      date,
      time: lesson.start || lesson.time || "",
      category: "School",
      done: false,
      lessonId: lesson.id,
      generatedHomework: true
    });
  } else {
    hw.text = `Homework: ${lesson.subject}`;
    hw.date = date;
    hw.time = lesson.start || lesson.time || "";
  }
}


const LESSON_MIN = 8 * 60;   // 08:00
const LESSON_MAX = 21 * 60;  // 21:00

function isValidLessonTime(start, end) {
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  if (!start || !end) return { ok: false, msg: "Start and end times are required" };
  if (s < LESSON_MIN || s > LESSON_MAX) return { ok: false, msg: "Start must be between 08:00 and 21:00" };
  if (e < LESSON_MIN || e > LESSON_MAX) return { ok: false, msg: "End must be between 08:00 and 21:00" };
  if (e <= s) return { ok: false, msg: "End time must be after start" };
  return { ok: true };
}

function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}
function minutesToLabel(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}
function getLessonBounds(lessons) {
  // School day is locked to 08:00–21:00
  return { minM: LESSON_MIN, maxM: LESSON_MAX };
}
function lessonsOverlap(a, b) {
  const as = timeToMinutes(a.start || a.time || "09:00");
  const ae = timeToMinutes(a.end || a.time || "10:00");
  const bs = timeToMinutes(b.start || b.time || "09:00");
  const be = timeToMinutes(b.end || b.time || "10:00");
  return as < be && bs < ae;
}
function markCollapsedLessons(lessons) {
  // For each overlapping pair, collapse the shorter one
  const collapsed = new Set();
  const sorted = [...lessons].sort((a, b) =>
    timeToMinutes(a.start || a.time) - timeToMinutes(b.start || b.time)
  );
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      if (!lessonsOverlap(sorted[i], sorted[j])) continue;
      const durI = timeToMinutes(sorted[i].end || "10:00") - timeToMinutes(sorted[i].start || "09:00");
      const durJ = timeToMinutes(sorted[j].end || "10:00") - timeToMinutes(sorted[j].start || "09:00");
      if (durI <= durJ) collapsed.add(sorted[i].id);
      else collapsed.add(sorted[j].id);
    }
  }
  return collapsed;
}

function renderLessons() {
  const grid = $("#lessonsGrid");
  if (!grid) return;

  const allLessons = data.lessons;
  const bounds = getLessonBounds(allLessons);
  // 07:00–21:00 = 14 hours → keep columns tall enough that evening lessons stay inside
  const PX = 46; // px per hour — breathing room for labels + short blocks
  const totalHours = (bounds.maxM - bounds.minM) / 60;
  const timelineH = Math.max(Math.round(totalHours * PX), 200);
  const todayName = WEEK_DAYS[(new Date().getDay() + 6) % 7];
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();

  grid.style.setProperty("--px-per-hour", PX + "px");
  grid.style.setProperty("--timeline-h", timelineH + "px");

  grid.innerHTML = WEEK_DAYS.map(day => {
    const lessons = allLessons.filter(l => l.day === day)
      .sort((a, b) => (a.start || a.time || "").localeCompare(b.start || b.time || ""));
    const weekend = day === "Saturday" || day === "Sunday";
    const isToday = day === todayName;
    const isExpanded = expandedLessonDay === day;
    const collapsed = markCollapsedLessons(lessons);

    // hour labels
    let hourLabels = "";
    for (let m = bounds.minM; m < bounds.maxM; m += 60) {
      const top = ((m - bounds.minM) / 60) * PX;
      hourLabels += `<span class="lesson-hour-label" style="top:${top}px;">${minutesToLabel(m)}</span>`;
    }
    // end label
    hourLabels += `<span class="lesson-hour-label is-end" style="top:${timelineH}px;">${minutesToLabel(bounds.maxM)}</span>`;

    let nowLine = "";
    if (isToday && nowMins >= bounds.minM && nowMins <= bounds.maxM) {
      const top = ((nowMins - bounds.minM) / 60) * PX;
      nowLine = `<div class="lesson-now-line" style="top:${top}px;"></div>`;
    }

    const blocks = lessons.map(l => {
      const s = timeToMinutes(l.start || l.time || "09:00");
      const e = Math.max(s + 15, timeToMinutes(l.end || l.time || "10:00"));
      const top = ((s - bounds.minM) / 60) * PX;
      const height = Math.max(((e - s) / 60) * PX, 28);
      const isCol = collapsed.has(l.id);
      const isShort = height < 48;
      const range = `${l.start || l.time || "?"} – ${l.end || "?"}`;
      return `
        <div class="lesson-block ${isCol ? "is-collapsed" : ""} ${isShort && !isCol ? "is-short" : ""}"
          data-id="${l.id}"
          style="top:${top}px;height:${height}px;"
          title="${escapeHtml(l.subject)} · ${range}">
          <div class="lesson-block-top">
            <strong>${escapeHtml(l.subject)}</strong>
            <div class="lesson-actions">
              <button type="button" class="icon-button edit-lesson" data-id="${l.id}">✎</button>
              <button type="button" class="icon-button delete-lesson" data-id="${l.id}">×</button>
            </div>
          </div>
          <span class="lesson-time-range">${range}</span>
          ${l.homework ? `<button type="button" class="homework-button" data-id="${l.id}">HW</button>` : ""}
        </div>`;
    }).join("");

    const listItems = lessons.length
      ? lessons.map(l => {
          const range = `${l.start || l.time || "?"} – ${l.end || "?"}`;
          return `
            <div class="lesson-day-list-item">
              <div>
                <strong>${escapeHtml(l.subject)}</strong>
                <span>${range}${l.homework ? " · has homework" : ""}</span>
              </div>
              <div class="list-item-actions">
                ${l.homework ? `<button type="button" class="homework-button" data-id="${l.id}" style="margin:0;">HW</button>` : ""}
                <button type="button" class="icon-button edit-lesson" data-id="${l.id}">✎</button>
                <button type="button" class="icon-button delete-lesson" data-id="${l.id}">×</button>
              </div>
            </div>`;
        }).join("")
      : `<div class="lesson-day-list-empty">No lessons this day</div>`;

    return `
      <div class="lesson-day ${weekend ? "weekend-lesson" : ""} ${isToday ? "today-lesson" : ""} ${isExpanded ? "is-expanded" : ""}"
        data-day="${day}">
        <div class="lesson-day-header" data-toggle-day="${day}">
          <h4>${day}${isToday ? " · today" : ""}</h4>
          <span class="lesson-day-count">${lessons.length}</span>
          <span class="lesson-day-expand-hint">${isExpanded ? "▲" : "▼"}</span>
        </div>
        <div class="lesson-timeline" style="height:${timelineH}px;min-height:${timelineH}px;--timeline-h:${timelineH}px;">
          <div class="lesson-hours-gutter">${hourLabels}</div>
          <div class="lesson-track">
            ${nowLine}
            ${blocks || `<div class="lesson-empty-timeline">Free day</div>`}
          </div>
        </div>
        <div class="lesson-day-list">
          ${listItems}
        </div>
      </div>`;
  }).join("");

  document.querySelectorAll("[data-toggle-day]").forEach(hdr => {
    hdr.addEventListener("click", (e) => {
      e.stopPropagation();
      const day = hdr.dataset.toggleDay;
      expandedLessonDay = expandedLessonDay === day ? null : day;
      renderLessons();
    });
  });

  document.querySelectorAll(".delete-lesson").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const lesson = data.lessons.find(l => l.id === btn.dataset.id);
      if (!lesson) return;
      const removedTodos = data.todos.filter(t => t.lessonId === lesson.id);
      data.lessons = data.lessons.filter(l => l.id !== btn.dataset.id);
      data.todos = data.todos.filter(t => t.lessonId !== lesson.id);
      pushUndo("delete lesson", () => {
        data.lessons.push(lesson);
        data.todos.push(...removedTodos);
      });
      saveData();
      showToast("Lesson removed");
    });
  });
  document.querySelectorAll(".edit-lesson").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openLessonEdit(btn.dataset.id);
    });
  });
  document.querySelectorAll(".homework-button").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openHomework(btn.dataset.id);
    });
  });
  // Expand collapsed overlap bars on click
  document.querySelectorAll(".lesson-block.is-collapsed").forEach(block => {
    block.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      document.querySelectorAll(".lesson-block.is-expanded").forEach(b => {
        if (b !== block) b.classList.remove("is-expanded");
      });
      block.classList.toggle("is-expanded");
    });
  });

  // Mobile-friendly accordion (used under 720px via CSS)
  renderLessonsMobile(allLessons, todayName);
}

function renderLessonsMobile(allLessons, todayName) {
  const list = document.getElementById("lessonsMobileList");
  if (!list) return;
  const openDay = expandedLessonDay || todayName;

  list.innerHTML = WEEK_DAYS.map(day => {
    const lessons = allLessons.filter(l => l.day === day)
      .sort((a, b) => (a.start || a.time || "").localeCompare(b.start || b.time || ""));
    const isToday = day === todayName;
    const isOpen = day === openDay;
    const cards = lessons.length
      ? lessons.map(l => {
          const range = `${l.start || l.time || "?"} – ${l.end || "?"}`;
          return `
            <div class="lesson-mobile-card">
              <div>
                <strong>${escapeHtml(l.subject)}</strong>
                <em>${escapeHtml(range)}${l.homework ? " · has homework" : ""}</em>
              </div>
              <div class="lesson-mobile-actions">
                ${l.homework ? `<button type="button" class="homework-button" data-id="${l.id}" style="margin:0;">HW</button>` : ""}
                <button type="button" class="icon-button edit-lesson" data-id="${l.id}">✎</button>
                <button type="button" class="icon-button delete-lesson" data-id="${l.id}">×</button>
              </div>
            </div>`;
        }).join("")
      : `<div class="map-empty" style="padding:10px;">Free day</div>`;

    return `
      <div class="lesson-mobile-day ${isToday ? "is-today" : ""} ${isOpen ? "is-open" : ""}" data-mday="${day}">
        <button type="button" class="lesson-mobile-day-head" data-m-toggle="${day}">
          <strong>${day}${isToday ? " · today" : ""}</strong>
          <span>${lessons.length} lesson${lessons.length === 1 ? "" : "s"} · ${isOpen ? "▲" : "▼"}</span>
        </button>
        <div class="lesson-mobile-body">${cards}</div>
      </div>`;
  }).join("");

  list.querySelectorAll("[data-m-toggle]").forEach(btn => {
    btn.addEventListener("click", () => {
      const day = btn.dataset.mToggle;
      expandedLessonDay = expandedLessonDay === day ? null : day;
      renderLessons();
    });
  });
  list.querySelectorAll(".delete-lesson").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const lesson = data.lessons.find(l => l.id === btn.dataset.id);
      if (!lesson) return;
      const removedTodos = data.todos.filter(t => t.lessonId === lesson.id);
      data.lessons = data.lessons.filter(l => l.id !== btn.dataset.id);
      data.todos = data.todos.filter(t => t.lessonId !== lesson.id);
      pushUndo("delete lesson", () => {
        data.lessons.push(lesson);
        data.todos.push(...removedTodos);
      });
      saveData();
      showToast("Lesson removed");
    });
  });
  list.querySelectorAll(".edit-lesson").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openLessonEdit(btn.dataset.id);
    });
  });
  list.querySelectorAll(".homework-button").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openHomework(btn.dataset.id);
    });
  });
}

function openHomework(id) {
  const lesson = data.lessons.find(l => l.id === id);
  if (!lesson) return;
  $("#homeworkModalTitle").textContent = lesson.subject;
  $("#homeworkModalBody").textContent = lesson.homework;
  const due = getNextLessonDate(lesson.day);
  $("#homeworkModalMeta").textContent =
    `Lesson: ${lesson.day} · ${(lesson.start || lesson.time || "?")}–${(lesson.end || "?")} · Due: ${formatDate(due)}`;
  $("#homeworkModal").classList.add("open");
}
function closeHomework() { $("#homeworkModal").classList.remove("open"); }

function openLessonEdit(id) {
  const lesson = data.lessons.find(l => l.id === id);
  if (!lesson) return;
  $("#lessonEditContainer").innerHTML = `
    <form class="form-grid" id="lessonEditForm">
      <label>Day
        <select id="editLessonDay">
          ${WEEK_DAYS.map(d => `<option ${lesson.day === d ? "selected" : ""}>${d}</option>`).join("")}
        </select>
      </label>
      <label>Subject <input id="editLessonSubject" value="${escapeHtml(lesson.subject)}" required /></label>
      <label>Start time <input id="editLessonStart" type="time" min="08:00" max="21:00" value="${escapeHtml(lesson.start || lesson.time || "")}" required /></label>
      <label>End time <input id="editLessonEnd" type="time" min="08:00" max="21:00" value="${escapeHtml(lesson.end || "")}" required /></label>
      <label>Homework <textarea id="editLessonHomework">${escapeHtml(lesson.homework || "")}</textarea></label>
      <div class="form-actions">
        <button type="submit" class="primary-button">Save</button>
        <button type="button" class="secondary-button" id="cancelEditLesson">Cancel</button>
      </div>
    </form>`;
  $("#lessonEditModal").classList.add("open");
  $("#lessonEditForm").addEventListener("submit", e => {
    e.preventDefault();
    const start = $("#editLessonStart").value;
    const end = $("#editLessonEnd").value;
    const check = isValidLessonTime(start, end);
    if (!check.ok) {
      showToast(check.msg);
      return;
    }
    lesson.day = $("#editLessonDay").value;
    lesson.subject = $("#editLessonSubject").value.trim();
    lesson.start = start;
    lesson.end = end;
    lesson.time = start; // back-compat
    lesson.homework = $("#editLessonHomework").value.trim();
    createOrUpdateHomeworkTodo(lesson);
    closeLessonEdit();
    saveData();
    showToast("Lesson updated");
  });
  $("#cancelEditLesson").addEventListener("click", closeLessonEdit);
}
function closeLessonEdit() { $("#lessonEditModal").classList.remove("open"); }

// ========== TODOS ==========
function renderTodos() {
  const sorted = [...data.todos].sort((a, b) => {
    if (a.done !== b.done) return a.done - b.done;
    return `${a.date || "9999"}${a.time || ""}`.localeCompare(`${b.date || "9999"}${b.time || ""}`);
  });
  $("#todoList").innerHTML = sorted.length
    ? sorted.map(t => `
        <div class="list-item todo-row ${t.done ? "done" : ""}">
          <input type="checkbox" class="todo-check" data-id="${t.id}" ${t.done ? "checked" : ""} />
          <div class="item-main">
            <div class="item-title">${escapeHtml(t.text)}</div>
            <div class="item-meta">
              ${t.date ? "Due " + formatDate(t.date) : "No due date"}
              ${t.time ? ` at ${t.time}` : ""} · ${escapeHtml(t.category)}
              ${t.generatedHomework ? " · Homework" : ""}
            </div>
          </div>
          <button type="button" class="icon-button delete-todo" data-id="${t.id}">×</button>
        </div>`).join("")
    : `<div class="empty">Your task list is clear.</div>`;

  document.querySelectorAll(".todo-check").forEach(cb => {
    cb.addEventListener("change", () => {
      const todo = data.todos.find(t => t.id === cb.dataset.id);
      if (!todo) return;
      const wasDone = todo.done;
      const id = todo.id;
      const prevCompletedOn = todo.completedOn;
      todo.done = cb.checked;
      recordCompletion(todo, cb.checked);
      if (cb.checked !== wasDone) {
        pushUndo(cb.checked ? "complete task" : "uncomplete task", () => {
          const t = data.todos.find(x => x.id === id);
          if (!t) return;
          t.done = wasDone;
          t.completedOn = prevCompletedOn || "";
        });
      }
      if (cb.checked && !wasDone) {
        const row = cb.closest(".todo-row, .map-task, .study-task-item");
        if (row) {
          row.classList.add("just-done");
          setTimeout(() => row.classList.remove("just-done"), 500);
        }
      }
      saveData();
    });
  });
  document.querySelectorAll(".delete-todo").forEach(btn => {
    btn.addEventListener("click", () => {
      const removed = data.todos.find(t => t.id === btn.dataset.id);
      if (!removed) return;
      data.todos = data.todos.filter(t => t.id !== btn.dataset.id);
      pushUndo("delete task", () => { data.todos.push(removed); });
      saveData();
      showToast("Task removed");
    });
  });
}

// ========== NOTES ==========
function noteToText(html) {
  return new DOMParser().parseFromString(html || "", "text/html").body.textContent || "";
}
function sanitizeNoteHtml(html) {
  const template = document.createElement("template");
  template.innerHTML = html || "";
  const allowed = new Set(["P","BR","STRONG","EM","B","I","U","UL","OL","LI","H3","H4","BLOCKQUOTE","HR","DIV","SPAN","INPUT"]);
  const walk = (node) => {
    [...node.childNodes].forEach(child => {
      if (child.nodeType === 1) {
        if (!allowed.has(child.tagName)) {
          if (/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED)$/.test(child.tagName)) { child.remove(); return; }
          while (child.firstChild) node.insertBefore(child.firstChild, child);
          child.remove();
          walk(node);
          return;
        }
        [...child.attributes].forEach(attr => {
          if (!["class","type","checked","data-note-check"].includes(attr.name.toLowerCase())) {
            child.removeAttribute(attr.name);
          }
        });
        if (child.tagName === "INPUT" && child.getAttribute("type") !== "checkbox") {
          child.remove();
          return;
        }
        walk(child);
      }
    });
  };
  walk(template.content);
  return template.innerHTML.trim();
}

function renderNotes() {
  const search = ($("#noteSearch").value || "").trim().toLowerCase();
  const notes = data.notes.filter(n =>
    n.title.toLowerCase().includes(search) ||
    noteToText(n.body).toLowerCase().includes(search)
  );

  $("#notesList").innerHTML = notes.length
    ? notes.map(n => {
        const preview = noteToText(n.body).slice(0, 80) || "Empty note";
        return `
          <button type="button" class="note-list-item ${n.id === data.activeNoteId ? "active" : ""}" data-id="${n.id}">
            <h4>${escapeHtml(n.title || "Untitled")}</h4>
            <p>${escapeHtml(preview)}</p>
          </button>`;
      }).join("")
    : `<div class="empty" style="padding:20px 8px;">No notes yet.</div>`;

  document.querySelectorAll(".note-list-item").forEach(btn => {
    btn.addEventListener("click", () => {
      if (noteSaveTimer) { clearTimeout(noteSaveTimer); noteSaveTimer = null; saveCurrentNote({ silent: true, refreshList: false }); } const switching = data.activeNoteId !== btn.dataset.id;
      data.activeNoteId = btn.dataset.id;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      openNote(btn.dataset.id, switching);
      renderNotesListOnly();
    });
  });

  if (data.activeNoteId && data.notes.some(n => n.id === data.activeNoteId)) {
    openNote(data.activeNoteId); // no force — preserves cursor on re-render
  } else {
    $("#notesEmpty").style.display = "grid";
    $("#notesEditorWrap").style.display = "none";
  }
}

function openNote(id, forceReload = false) {
  const note = data.notes.find(n => n.id === id);
  if (!note) return;
  const editorVisible = $("#notesEditorWrap").style.display !== "none";
  const alreadyOpen = data.activeNoteId === id && editorVisible && !forceReload;
  data.activeNoteId = id;
  $("#notesEmpty").style.display = "none";
  $("#notesEditorWrap").style.display = "flex";
  // Only rewrite editor when switching notes or forced — preserves cursor while typing
  if (!alreadyOpen) {
    $("#noteTitle").value = note.title || "";
    $("#noteEditor").innerHTML = note.body || "";
    $("#noteSaveStatus").textContent = "";
  }
}

function saveCurrentNote(options = {}) {
  const { silent = false, refreshList = true } = options;
  if (!data.activeNoteId) return;
  const note = data.notes.find(n => n.id === data.activeNoteId);
  if (!note) return;
  note.title = $("#noteTitle").value.trim() || "Untitled";
  note.body = sanitizeNoteHtml($("#noteEditor").innerHTML);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  $("#noteSaveStatus").textContent = "Saved";
  setTimeout(() => { if ($("#noteSaveStatus")) $("#noteSaveStatus").textContent = ""; }, 1500);
  if (refreshList) renderNotesListOnly();
  if (!silent) showToast("Note saved");
}

function renderNotesListOnly() {
  const search = ($("#noteSearch").value || "").trim().toLowerCase();
  const notes = data.notes.filter(n =>
    n.title.toLowerCase().includes(search) ||
    noteToText(n.body).toLowerCase().includes(search)
  );
  $("#notesList").innerHTML = notes.length
    ? notes.map(n => {
        const preview = noteToText(n.body).slice(0, 80) || "Empty note";
        return `
          <button type="button" class="note-list-item ${n.id === data.activeNoteId ? "active" : ""}" data-id="${n.id}">
            <h4>${escapeHtml(n.title || "Untitled")}</h4>
            <p>${escapeHtml(preview)}</p>
          </button>`;
      }).join("")
    : `<div class="empty" style="padding:20px 8px;">No notes yet.</div>`;
  document.querySelectorAll(".note-list-item").forEach(btn => {
    btn.addEventListener("click", () => {
      if (noteSaveTimer) { clearTimeout(noteSaveTimer); noteSaveTimer = null; saveCurrentNote({ silent: true, refreshList: false }); } const switching = data.activeNoteId !== btn.dataset.id;
      data.activeNoteId = btn.dataset.id;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      openNote(btn.dataset.id, switching);
      renderNotesListOnly();
    });
  });
}

// ========== EVENTS ==========
function renderEvents() {
  if (!$("#eventList")) return;
  const events = [...data.events].sort((a, b) =>
    (a.date + (a.time || "")).localeCompare(b.date + (b.time || ""))
  );
  $("#eventList").innerHTML = events.length
    ? events.map(e => `
        <div class="list-item">
          <div class="item-main">
            <div class="item-title">${escapeHtml(e.title)}</div>
            <div class="item-meta">${formatDate(e.date)}${e.time ? ` at ${e.time}` : ""}</div>
          </div>
          <div>
            <span class="tag">${escapeHtml(e.type)}</span>
            <button type="button" class="icon-button delete-event" data-id="${e.id}">×</button>
          </div>
        </div>`).join("")
    : `<div class="empty">No events yet.</div>`;
  document.querySelectorAll(".delete-event").forEach(btn => {
    btn.addEventListener("click", () => {
      const removed = data.events.find(e => e.id === btn.dataset.id);
      if (!removed) return;
      data.events = data.events.filter(e => e.id !== btn.dataset.id);
      pushUndo("delete event", () => { data.events.push(removed); });
      saveData();
      showToast("Event removed");
    });
  });
}

// ========== PROGRESS ==========
function getHistory(days = 14) {
  const today = parseLocalDate(getTodayString());
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - 1 - i));
    const key = getDateString(date);
    const fromLog = data.dailyCompletions[key] || 0;
    const fromTodos = getTasksCompletedOn(key).length;
    return { date: key, count: Math.max(fromLog, fromTodos) };
  });
}

function renderProgressHistory() {
  const history = getHistory(14);
  const max = Math.max(1, ...history.map(i => i.count));
  $("#progressBars").innerHTML = history.map(item => {
    const height = item.count ? Math.max(12, Math.round((item.count / max) * 170)) : 7;
    const label = parseLocalDate(item.date).toLocaleDateString(undefined, { day: "numeric", month: "short" });
    return `
      <div class="history-bar-wrap" title="${label}: ${item.count}">
        <div class="history-bar-count">${item.count || ""}</div>
        <div class="history-bar ${item.count ? "" : "empty"}" style="height:${height}px;"></div>
        <div class="history-bar-label">${label}</div>
      </div>`;
  }).join("");

  const todayCount = history[history.length - 1]?.count || 0;
  const weekStart = parseLocalDate(getTodayString());
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weekKey = getDateString(weekStart);
  const weekTotal = history.filter(i => i.date >= weekKey).reduce((s, i) => s + i.count, 0);
  const best = history.reduce((top, i) => i.count >= top.count ? i : top, history[0]);

  $("#progressTodayStat").textContent = todayCount;
  $("#progressWeekStat").textContent = weekTotal;
  $("#progressBestStat").textContent = best?.count || 0;
  $("#progressBestLabel").textContent = best?.count
    ? `best day · ${formatDate(best.date, false)}`
    : "best day in 14 days";
}

function updateProgress() {
  const total = data.todos.length;
  const completed = data.todos.filter(t => t.done).length;
  const pct = total ? Math.round((completed / total) * 100) : 0;
  $("#progressFill").style.width = `${pct}%`;
  $("#progressLabel").textContent = `${pct}% of tasks completed`;
}

function renderCompactStatus() {
  const active = document.querySelector(".view.active");
  if (!active || active.id === "today" || active.id === "focus") {
    $("#compactStatus").classList.remove("visible");
    $("#mainTopbar").style.display = "";
    return;
  }
  $("#compactStatus").classList.add("visible");
  $("#mainTopbar").style.display = "none";
  const titles = {
    calendar: "Calendar", todos: "Tasks",
    progress: "Progress", notes: "Notes", settings: "Settings"
  };
  $("#compactPageTitle").textContent = titles[active.id] || "noto.";
  const open = data.todos.filter(t => !t.done).length;
  $("#compactTasks").textContent = open;
  const total = data.todos.length;
  const done = data.todos.filter(t => t.done).length;
  $("#compactProgress").textContent = `${total ? Math.round((done / total) * 100) : 0}%`;
  const next = getClosestEvent();
  $("#compactNextEvent").textContent = next
    ? `Next: ${next.title}${next.time ? ` · ${next.time}` : ""}`
    : "No upcoming event";
}

function getClosestEvent() {
  const now = new Date();
  const upcoming = data.events
    .map(e => {
      const [y, m, d] = e.date.split("-").map(Number);
      let dt;
      if (e.time) {
        const [h, min] = e.time.split(":").map(Number);
        dt = new Date(y, m - 1, d, h, min);
      } else {
        dt = new Date(y, m - 1, d, 23, 59);
      }
      return { ...e, dateObject: dt };
    })
    .filter(e => e.dateObject >= now)
    .sort((a, b) => a.dateObject - b.dateObject);
  return upcoming[0] || null;
}

// ========== MINI NOTO (PiP) ==========
function getThemeVars() {
  const t = data.theme || "classic";
  const themes = {
    classic: {
      bg: "#faf7f0", ink: "#1c1e1b", muted: "#6a6d66", line: "#ddd8ce",
      accent: "#2a5f48", accentLight: "#d4e8dc", orange: "#c56a38",
      yellow: "#e0b53a", panel: "#ffffff", tag: "#2a5f48", tagBg: "#d4e8dc",
      soft: "rgba(42,95,72,0.08)"
    },
    ember: {
      bg: "#f7f0e6", ink: "#2a1f14", muted: "#7a6550", line: "#e0d2c0",
      accent: "#c45c26", accentLight: "#f5e4d4", orange: "#d4782e",
      yellow: "#e8a838", panel: "#fffbf5", tag: "#c45c26", tagBg: "#f5e4d4",
      soft: "rgba(196,92,38,0.1)"
    },
    white: {
      bg: "#f4f4f4", ink: "#111111", muted: "#5c5c5c", line: "#cfcfcf",
      accent: "#1a1a1a", accentLight: "#e8e8e8", orange: "#4a4a4a",
      yellow: "#3d3d3d", panel: "#ffffff", tag: "#1a1a1a", tagBg: "#e8e8e8",
      soft: "rgba(0,0,0,0.05)"
    },
    rose: {
      bg: "#faf3f0", ink: "#2c1e22", muted: "#7a5e64", line: "#e0cdc8",
      accent: "#a65d6a", accentLight: "#f0dde0", orange: "#8f4a52",
      yellow: "#c48a90", panel: "#fff9f7", tag: "#a65d6a", tagBg: "#f0dde0",
      soft: "rgba(166,93,106,0.1)"
    },
    cobalt: {
      bg: "#eef1f6", ink: "#0e1218", muted: "#5a6578", line: "#c5cdd9",
      accent: "#1e4d8c", accentLight: "#d6e4f5", orange: "#3a6ea5",
      yellow: "#2f6bb5", panel: "#f7f9fc", tag: "#1e4d8c", tagBg: "#d6e4f5",
      soft: "rgba(30,77,140,0.1)"
    },
    midnight: {
      bg: "#121826", ink: "#d8dee8", muted: "#7e8a9c", line: "#2a3448",
      accent: "#6a9ec0", accentLight: "#1a2c40", orange: "#8a9ab0",
      yellow: "#7eb0c8", panel: "#1a2232", tag: "#6a9ec0", tagBg: "#1a2c40",
      soft: "rgba(106,158,192,0.1)"
    },
    forest: {
      bg: "#121c14", ink: "#d0dcc8", muted: "#6e8470", line: "#283a2c",
      accent: "#6ab878", accentLight: "#1a3020", orange: "#a89058",
      yellow: "#88b060", panel: "#1a281c", tag: "#6ab878", tagBg: "#1a3020",
      soft: "rgba(106,184,120,0.1)"
    },
    black: {
      bg: "#0a0a0a", ink: "#f5f5f5", muted: "#9a9a9a", line: "#333333",
      accent: "#f0f0f0", accentLight: "#2a2a2a", orange: "#b0b0b0",
      yellow: "#d0d0d0", panel: "#1c1c1c", tag: "#e8e8e8", tagBg: "#2a2a2a",
      soft: "rgba(255,255,255,0.06)"
    },
    vermilion: {
      bg: "#120e0c", ink: "#f2eae4", muted: "#9a8a80", line: "#3a302a",
      accent: "#c44a32", accentLight: "#2c1814", orange: "#d46848",
      yellow: "#d47850", panel: "#241e1a", tag: "#c44a32", tagBg: "#2c1814",
      soft: "rgba(196,74,50,0.12)"
    }
  };
  return themes[t] || themes.classic;
}

function getMiniStyles() {
  const v = getThemeVars();
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      margin: 0;
      height: 100%;
      font-family: Georgia, "Times New Roman", serif;
      background: ${v.bg};
      color: ${v.ink};
      -webkit-font-smoothing: antialiased;
    }
    .mini-root {
      padding: 14px 14px 12px;
      min-height: 100%;
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    .mini-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 10px;
    }
    .mini-label {
      font-family: var(--font-sans);
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1.1px;
      text-transform: uppercase;
      color: ${v.orange};
    }
    .mini-mode-badge {
      padding: 3px 8px;
      border-radius: 999px;
      background: ${v.accentLight};
      color: ${v.accent};
      font-family: var(--font-sans);
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.3px;
      white-space: nowrap;
    }
    .mini-clock {
      margin-bottom: 12px;
    }
    .mini-time {
      font-family: var(--font-sans);
      font-size: clamp(26px, 8vw, 32px);
      font-weight: 800;
      letter-spacing: -1.4px;
      line-height: 1;
      color: ${v.ink};
    }
    .mini-date {
      font-family: var(--font-sans);
      font-size: 11px;
      color: ${v.muted};
      margin-top: 4px;
    }
    .mini-stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 12px;
    }
    .mini-stat {
      padding: 10px 10px 9px;
      border-radius: var(--radius-sm);
      background: ${v.panel};
      border: 1px solid ${v.line};
    }
    .mini-stat strong {
      display: block;
      font-family: var(--font-sans);
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.6px;
      line-height: 1;
      color: ${v.ink};
    }
    .mini-stat span {
      display: block;
      margin-top: 4px;
      font-family: var(--font-sans);
      font-size: 10px;
      color: ${v.muted};
    }
    .mini-section {
      margin-bottom: 12px;
    }
    .mini-section-title {
      font-family: var(--font-sans);
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      color: ${v.muted};
      margin-bottom: 6px;
    }
    .mini-item {
      padding: 8px 0;
      border-bottom: 1px solid ${v.line};
    }
    .mini-item:last-child { border-bottom: 0; }
    .mini-item strong {
      display: block;
      font-size: 13px;
      color: ${v.ink};
      line-height: 1.3;
      margin-bottom: 2px;
    }
    .mini-item span {
      color: ${v.muted};
      font-family: var(--font-sans);
      font-size: 11px;
    }
    .mini-empty {
      color: ${v.muted};
      font-family: var(--font-sans);
      font-size: 12px;
      padding: 6px 0;
    }
    .mini-timer-block {
      margin-bottom: 12px;
      padding: 14px 12px 12px;
      border-radius: var(--radius-md);
      background: ${v.accent};
      color: #fff;
      text-align: center;
    }
    .mini-timer-block.is-break { background: ${v.orange}; }
    .mini-timer-label {
      font-family: var(--font-sans);
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      opacity: 0.9;
      margin-bottom: 4px;
    }
    .mini-timer-value {
      font-family: var(--font-sans);
      font-size: clamp(34px, 10vw, 40px);
      font-weight: 800;
      letter-spacing: -1.6px;
      line-height: 1;
    }
    .mini-timer-status {
      font-family: var(--font-sans);
      font-size: 11px;
      opacity: 0.88;
      margin-top: 5px;
    }
    .mini-btn-row {
      display: flex;
      gap: 6px;
      margin-top: 10px;
    }
    .mini-btn {
      flex: 1;
      padding: 9px 10px;
      border: 0;
      border-radius: var(--radius-sm);
      background: ${v.yellow};
      color: ${v.ink};
      font-family: var(--font-sans);
      font-size: 12px;
      font-weight: 800;
      cursor: pointer;
      text-align: center;
    }
    .mini-btn:hover { filter: brightness(1.06); }
    .mini-btn:active { transform: scale(0.97); }
    .mini-btn.ghost {
      background: rgba(255,255,255,0.18);
      color: #fff;
      border: 1px solid rgba(255,255,255,0.28);
    }
    .mini-btn.solid {
      background: ${v.yellow};
      color: ${v.ink};
    }
    .mini-start-wrap {
      margin-bottom: 12px;
    }
    .mini-start-wrap .mini-btn {
      width: 100%;
      padding: 11px;
      border-radius: var(--radius-sm);
    }
    .mini-music {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 11px 12px;
      border-radius: var(--radius-md);
      background: ${v.panel};
      border: 1px solid ${v.line};
    }
    .mini-music-top {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .mini-music-icon {
      width: 38px;
      height: 38px;
      border-radius: var(--radius-sm);
      background: linear-gradient(135deg, ${v.accent}, ${v.orange});
      color: #fff;
      display: grid;
      place-items: center;
      font-size: 16px;
      flex-shrink: 0;
      box-shadow: 0 4px 12px color-mix(in srgb, ${v.accent} 30%, transparent);
    }
    .mini-music-info { min-width: 0; flex: 1; }
    .mini-music-info strong {
      display: block;
      font-size: 12px;
      color: ${v.ink};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .mini-music-info span {
      font-family: var(--font-sans);
      font-size: 10px;
      color: ${v.muted};
    }
    .mini-music-controls {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 5px;
    }
    .mini-music-controls .mini-btn {
      padding: 7px 4px;
      font-size: 11px;
      border-radius: 8px;
      background: ${v.accentLight};
      color: ${v.accent};
    }
    .mini-progress-bar {
      height: 6px;
      border-radius: 99px;
      background: ${v.line};
      overflow: hidden;
      margin-top: 6px;
    }
    .mini-progress-fill {
      height: 100%;
      border-radius: inherit;
      background: ${v.accent};
      transition: width 0.4s ease;
    }
    .mini-streak {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 9px 11px;
      border-radius: var(--radius-sm);
      background: ${v.soft};
      border: 1px solid ${v.line};
      margin-bottom: 12px;
    }
    .mini-streak-flame { font-size: 18px; }
    .mini-streak strong {
      font-family: var(--font-sans);
      font-size: 15px;
      font-weight: 800;
      color: ${v.ink};
    }
    .mini-streak span {
      font-family: var(--font-sans);
      font-size: 10px;
      color: ${v.muted};
    }
    .mini-footer {
      margin-top: auto;
      padding-top: 10px;
      border-top: 1px solid ${v.line};
      font-family: var(--font-sans);
      font-size: 10px;
      color: ${v.muted};
      text-align: center;
    }
    @media (max-width: 320px) {
      .mini-root { padding: 12px; }
      .mini-stats { grid-template-columns: 1fr; }
      .mini-timer-value { font-size: 32px; }
    }
  `;
}

function getMiniContent() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString(undefined, {
    weekday: "short", day: "numeric", month: "short"
  });
  const isStudy = data.mode === "study";
  const modeLabel = isStudy ? "Study" : "Planner";

  if (isStudy) {
    const today = getTodayString();
    const studyTasks = data.todos
      .filter(t => !t.done && (t.category === "School" || t.generatedHomework || t.date === today))
      .sort((a, b) => `${a.date || "9999"}${a.time || ""}`.localeCompare(`${b.date || "9999"}${b.time || ""}`))
      .slice(0, 4);

    const hwHtml = studyTasks.length
      ? studyTasks.map(t => `
          <div class="mini-item">
            <strong>${escapeHtml(t.text)}</strong>
            <span>${t.date ? formatDate(t.date, false) : "No date"}${t.time ? " · " + t.time : ""}${t.generatedHomework ? " · HW" : ""}</span>
          </div>`).join("")
      : `<div class="mini-empty">No open study tasks</div>`;

    const running = Boolean(timerInterval);
    const m = Math.floor(Math.max(0, timerSeconds) / 60).toString().padStart(2, "0");
    const s = (Math.max(0, timerSeconds) % 60).toString().padStart(2, "0");
    const timerVal = `${m}:${s}`;
    const isBreak = pomodoroMode !== "focus";
    const timerLabel = isBreak
      ? (pomodoroMode === "short" ? "Short break" : "Long break")
      : "Focus session";
    const timerStatus = running ? "● Running" : "○ Ready";
    const showTimer = running || timerSeconds !== getModeSeconds(pomodoroMode);

    let timerBlock;
    if (showTimer) {
      timerBlock = `
        <div class="mini-timer-block ${isBreak ? "is-break" : ""}">
          <div class="mini-timer-label">${timerLabel}</div>
          <div class="mini-timer-value">${timerVal}</div>
          <div class="mini-timer-status">${timerStatus}</div>
          <div class="mini-btn-row">
            <button type="button" class="mini-btn ghost" data-mini-action="${running ? "pause" : "resume"}">
              ${running ? "Pause" : "Resume"}
            </button>
            <button type="button" class="mini-btn ghost" data-mini-action="skip">Skip</button>
          </div>
        </div>`;
    } else {
      timerBlock = `
        <div class="mini-clock">
          <div class="mini-time">${timeStr}</div>
          <div class="mini-date">${dateStr}</div>
        </div>
        <div class="mini-start-wrap">
          <button type="button" class="mini-btn solid" data-mini-action="start">▶ Start pomodoro</button>
        </div>`;
    }

    const preset = (typeof SPOTIFY_PRESETS !== "undefined")
      ? SPOTIFY_PRESETS.find(p => p.id === data.spotifyPreset)
      : null;
    const playlistName = preset
      ? preset.name
      : (data.spotifyPreset === "custom" ? "Custom playlist" : "Focus playlist");
    const playlistSub = preset ? "Preset" : (data.spotifyPreset === "custom" ? "Your link" : "Spotify");

    return `
      <div class="mini-root">
        <div class="mini-header">
          <div class="mini-label">Mini noto.</div>
          <span class="mini-mode-badge">${modeLabel}</span>
        </div>
        ${timerBlock}
        <div class="mini-section">
          <div class="mini-section-title">Homework</div>
          ${hwHtml}
        </div>
        <div class="mini-section">
          <div class="mini-section-title">Music</div>
          <div class="mini-music">
            <div class="mini-music-top">
              <div class="mini-music-icon">♪</div>
              <div class="mini-music-info">
                <strong>${escapeHtml(playlistName)}</strong>
                <span>Spotify · ${escapeHtml(playlistSub)}</span>
              </div>
            </div>
            <div class="mini-music-controls">
              <button type="button" class="mini-btn" data-mini-action="spotify-prev" title="Previous playlist">⏮</button>
              <button type="button" class="mini-btn" data-mini-action="spotify-cycle" title="Next playlist">⏭</button>
              <button type="button" class="mini-btn" data-mini-action="spotify-open" title="Open in Spotify">↗</button>
            </div>
          </div>
        </div>
        <div class="mini-footer">Playlist controls · timer updates live</div>
      </div>`;
  }

  // —— Planner mode ——
  const openTasks = data.todos.filter(t => !t.done);
  const doneToday = getTasksCompletedOn(getTodayString()).length;
  const total = data.todos.length;
  const done = data.todos.filter(t => t.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const streak = getStreak();
  const daily = getDailyProgress();

  const nextEvents = [...data.events]
    .filter(e => e.date >= getTodayString())
    .sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")))
    .slice(0, 3);

  const topTasks = openTasks
    .slice()
    .sort((a, b) => `${a.date || "9999"}${a.time || ""}`.localeCompare(`${b.date || "9999"}${b.time || ""}`))
    .slice(0, 3);

  const eventsHtml = nextEvents.length
    ? nextEvents.map(e => `
        <div class="mini-item">
          <strong>${escapeHtml(e.title)}</strong>
          <span>${formatDate(e.date, false)}${e.time ? " · " + e.time : ""} · ${escapeHtml(e.type || "")}</span>
        </div>`).join("")
    : `<div class="mini-empty">No upcoming events</div>`;

  const tasksHtml = topTasks.length
    ? topTasks.map(t => `
        <div class="mini-item">
          <strong>${escapeHtml(t.text)}</strong>
          <span>${t.date ? "Due " + formatDate(t.date, false) : "No date"}${t.time ? " · " + t.time : ""} · ${escapeHtml(t.category || "")}</span>
        </div>`).join("")
    : `<div class="mini-empty">No open tasks</div>`;

  return `
    <div class="mini-root">
      <div class="mini-header">
        <div class="mini-label">Mini noto.</div>
        <span class="mini-mode-badge">${modeLabel}</span>
      </div>
      <div class="mini-clock">
        <div class="mini-time">${timeStr}</div>
        <div class="mini-date">${dateStr}</div>
      </div>
      <div class="mini-stats">
        <div class="mini-stat">
          <strong>${openTasks.length}</strong>
          <span>open tasks</span>
        </div>
        <div class="mini-stat">
          <strong>${doneToday}</strong>
          <span>done today</span>
        </div>
      </div>
      <div class="mini-streak">
        <span class="mini-streak-flame">🔥</span>
        <div>
          <strong>${streak} day streak</strong>
          <span>${daily.total ? daily.percentage + "% of today’s tasks" : "No dated tasks today"}</span>
        </div>
      </div>
      <div class="mini-section">
        <div class="mini-section-title">Next up</div>
        ${tasksHtml}
      </div>
      <div class="mini-section">
        <div class="mini-section-title">Events</div>
        ${eventsHtml}
      </div>
      <div class="mini-section">
        <div class="mini-section-title">Overall · ${pct}%</div>
        <div class="mini-progress-bar"><div class="mini-progress-fill" style="width:${pct}%"></div></div>
      </div>
      <div class="mini-footer">Auto-updates every second</div>
    </div>`;
}

function applyMiniStyles(doc) {
  let styleEl = doc.getElementById("mini-noto-styles");
  if (!styleEl) {
    styleEl = doc.createElement("style");
    styleEl.id = "mini-noto-styles";
    doc.head.appendChild(styleEl);
  }
  styleEl.textContent = getMiniStyles();
}

function cycleSpotifyPreset(dir) {
  const ids = SPOTIFY_PRESETS.map(p => p.id);
  let idx = ids.indexOf(data.spotifyPreset);
  if (idx < 0) idx = 0;
  idx = (idx + dir + ids.length) % ids.length;
  const p = SPOTIFY_PRESETS[idx];
  data.spotifyPreset = p.id;
  data.spotifyEmbed = p.embed;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  if (typeof renderSpotify === "function") renderSpotify();
  showToast(p.name);
}

function handleMiniAction(action) {
  if (action === "start") {
    if (data.mode !== "study") {
      data.mode = "study";
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      applyMode();
      switchView("focus");
    }
    setPomodoroMode("focus", true);
    if (!timerInterval) startTimer();
    showToast("Pomodoro started");
  } else if (action === "pause") {
    if (timerInterval) pauseTimer();
    showToast("Paused");
  } else if (action === "resume") {
    if (!timerInterval) startTimer();
    showToast("Resumed");
  } else if (action === "skip") {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; } completePomodoroSession(true);
  } else if (action === "spotify-prev") {
    cycleSpotifyPreset(-1);
  } else if (action === "spotify-cycle") {
    cycleSpotifyPreset(1);
  } else if (action === "spotify-open") {
    const embed = data.spotifyEmbed || "";
    const openUrl = embed.replace("/embed/", "/").replace(/\?.*$/, "");
    if (openUrl) window.open(openUrl, "_blank", "noopener");
    showToast("Opening Spotify…");
  }
  updatePipWindow();
}

// Always attach from main-page context so handlers can call main functions
// (works for both fallback panel and Document PiP elements)
function wireMiniActions(root) {
  root.querySelectorAll("[data-mini-action]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleMiniAction(btn.getAttribute("data-mini-action"));
    });
  });
}

async function openMiniNoto() {
  if (pipWindow && !pipWindow.closed) {
    pipWindow.close();
    pipWindow = null;
    showToast("Mini noto closed");
    return;
  }

  const fallback = document.getElementById("miniFallback");
  if (fallback) {
    if (fallback._cleanup) fallback._cleanup();
    fallback.remove();
    showToast("Mini noto closed");
    return;
  }

  if ("documentPictureInPicture" in window) {
    try {
      pipWindow = await documentPictureInPicture.requestWindow({
        width: 300,
        height: 480
      });
      applyMiniStyles(pipWindow.document);
      pipWindow.document.body.innerHTML = getMiniContent();
      // Wire buttons inside PiP (they postMessage back)
      wireMiniActions(pipWindow.document.body);
      // Also inject a tiny script so clicks work after refresh
      pipWindow.addEventListener("pagehide", () => { pipWindow = null; });
      showToast("Mini noto opened");
      return;
    } catch (e) {}
  }

  // Fallback floating panel
  const panel = document.createElement("div");
  panel.id = "miniFallback";
  const v = getThemeVars();
  panel.style.cssText = `
    position:fixed;bottom:20px;right:20px;z-index:200;
    width:min(300px, calc(100vw - 24px));
    max-height:min(520px, calc(100vh - 40px));
    border-radius:18px;
    box-shadow:0 24px 60px rgba(0,0,0,0.22);
    border:1px solid ${v.line};
    overflow:auto;cursor:move;
    background:${v.bg};
  `;
  const style = document.createElement("style");
  style.id = "mini-noto-fallback-styles";
  style.textContent = getMiniStyles();
  panel.appendChild(style);
  const contentWrap = document.createElement("div");
  contentWrap.innerHTML = getMiniContent();
  panel.appendChild(contentWrap);
  document.body.appendChild(panel);
  wireMiniActions(panel);

  let dragging = false, ox = 0, oy = 0;
  panel.addEventListener("mousedown", e => {
    if (e.target.closest("button")) return;
    dragging = true;
    const rect = panel.getBoundingClientRect();
    ox = e.clientX - rect.left;
    oy = e.clientY - rect.top;
  });
  const onMove = e => {
    if (!dragging) return;
    panel.style.left = Math.max(0, e.clientX - ox) + "px";
    panel.style.top = Math.max(0, e.clientY - oy) + "px";
    panel.style.right = "auto";
    panel.style.bottom = "auto";
  };
  const onUp = () => { dragging = false; };
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
  panel._cleanup = () => {
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
  };
  showToast("Mini noto opened (drag me)");
}

let _miniSig = "";
function updatePipWindow() {
  if (pipWindow && !pipWindow.closed) {
    const html = getMiniContent();
    const sig = data.theme + html;
    if (sig !== _miniSig) {
      _miniSig = sig;
      applyMiniStyles(pipWindow.document);
      pipWindow.document.body.innerHTML = html;
      wireMiniActions(pipWindow.document.body);
    }
  }
  const panel = document.getElementById("miniFallback");
  if (panel) {
    const v = getThemeVars();
    panel.style.borderColor = v.line;
    panel.style.background = v.bg;
    let styleEl = panel.querySelector("#mini-noto-fallback-styles");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "mini-noto-fallback-styles";
      panel.insertBefore(styleEl, panel.firstChild);
    }
    styleEl.textContent = getMiniStyles();
    const oldContent = [...panel.children].filter(c => c.tagName !== "STYLE");
    oldContent.forEach(c => c.remove());
    const contentWrap = document.createElement("div");
    contentWrap.innerHTML = getMiniContent();
    panel.appendChild(contentWrap);
    wireMiniActions(panel);
  }
}

// ========== VIEW SWITCH ==========
function switchView(name) {
  document.querySelectorAll(".view").forEach(v => {
    v.classList.toggle("active", v.id === name);
  });
  document.querySelectorAll(".nav button").forEach(b => {
    b.classList.toggle("active", b.dataset.view === name);
  });
  document.querySelectorAll(".mobile-nav-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.view === name);
  });
  const mobileTitles = {
    today: "Today",
    focus: "Focus",
    calendar: "Calendar",
    todos: "Tasks",
    progress: "Progress",
    notes: "Notes",
    settings: "Settings"
  };
  const mpt = document.getElementById("mobilePageTitle");
  if (mpt) {
    mpt.textContent = mobileTitles[name] || "noto.";
    // Today already has hub greeting; Focus has timer title
    mpt.hidden = (name === "today" || name === "focus");
  }

  const titles = {
    today: "Your day.",
    focus: "Focus time.",
    calendar: "Your calendar.",
    todos: "Things to get done.",
    progress: "Your progress.",
    notes: "Your thinking space.",
    settings: "Customize noto."
  };
  $("#pageTitle").textContent = titles[name] || "noto.";

  if (name === "calendar") {
    switchCalTab(data.calTab || "month");
  }
  if (name === "progress") {
    renderHabits();
    renderMoodPanel();
    renderProgressHistory();
    renderStreak();
  }
  if (name === "focus") renderStudyFocus();
  if (name === "notes") renderNotes();
  if (name === "today") renderToday();
  if (name === "todos") renderTodos();
  renderCompactStatus();
}

// ========== EVENT LISTENERS ==========
function setAppMode(mode) {
  if (data.mode === mode) return;
  data.mode = mode;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  applyMode();
  switchView(mode === "study" ? "focus" : "today");
  renderAll();
  showToast(mode === "study" ? "Study mode — distractions off" : "Planner mode");
}
$("#modePlanner").addEventListener("click", () => setAppMode("planner"));
$("#modeStudy").addEventListener("click", () => setAppMode("study"));
$("#mobileModePlanner")?.addEventListener("click", () => setAppMode("planner"));
$("#mobileModeStudy")?.addEventListener("click", () => setAppMode("study"));

$("#pomoSettingsBtn").addEventListener("click", (e) => {
  e.stopPropagation();
  $("#pomoSettingsPanel").classList.toggle("open");
});
document.addEventListener("click", (e) => {
  const panel = $("#pomoSettingsPanel");
  if (panel && panel.classList.contains("open") &&
      !panel.contains(e.target) && e.target.id !== "pomoSettingsBtn") {
    panel.classList.remove("open");
  }
});

document.querySelectorAll(".study-timer-modes button").forEach(btn => {
  btn.addEventListener("click", () => {
    if (timerInterval) pauseTimer();
    setPomodoroMode(btn.dataset.mode);
  });
});

function persistPomo() {
  data.pomodoro.workMinutes = Math.max(1, Number($("#pomoWork").value) || 25);
  data.pomodoro.shortBreakMinutes = Math.max(1, Number($("#pomoShort").value) || 5);
  data.pomodoro.longBreakMinutes = Math.max(1, Number($("#pomoLong").value) || 15);
  data.pomodoro.sessionsUntilLong = Math.max(1, Number($("#pomoUntilLong").value) || 4);
  data.pomodoro.autoStart = $("#pomoAuto").checked;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  if (!timerInterval) {
    timerSeconds = getModeSeconds(pomodoroMode);
    updateTimerDisplay();
    renderSessionDots();
  }
}
["pomoWork","pomoShort","pomoLong","pomoUntilLong","pomoAuto"].forEach(id => {
  $("#" + id).addEventListener("change", persistPomo);
});

$("#studyTimerButton").addEventListener("click", () => {
  if (timerInterval) pauseTimer();
  else startTimer();
});
$("#studySkipTimer").addEventListener("click", () => {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; } completePomodoroSession(true);
});
$("#studyResetTimer").addEventListener("click", () => {
  clearInterval(timerInterval);
  timerInterval = null;
  if (pomodoroMode === "focus") data.pomodoro.completedFocusSessions = 0;
  timerSeconds = getModeSeconds(pomodoroMode);
  updateTimerDisplay();
  $("#studyTimerButton").textContent = pomodoroMode === "focus" ? "Start focus" : "Start break";
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  renderSessionDots();
});

document.querySelectorAll(".nav button").forEach(btn => {
  btn.addEventListener("click", () => switchView(btn.dataset.view));
});
document.querySelectorAll(".mobile-nav-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    if (btn.dataset.view) switchView(btn.dataset.view);
  });
});
$("#mobileSearchBtn")?.addEventListener("click", () => openCmdPalette());

document.querySelectorAll(".theme-swatch, .theme-button").forEach(btn => {
  btn.addEventListener("click", () => {
    data.theme = btn.dataset.theme;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    applyTheme();
    updateThemeBg();
    startParticles();
    showToast(`${btn.title || data.theme}`);
  });
});

$("#settingSpace")?.addEventListener("change", () => {
  data.spaceBackground = $("#settingSpace").checked;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  applyVisualSettings();
  updateAtmosphere();
  showToast(data.spaceBackground ? "Space background on" : "Space background off");
});
$("#settingParticles").addEventListener("change", () => {
  data.particles = $("#settingParticles").checked;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  applyVisualSettings();
  showToast(data.particles ? "Particles on" : "Particles off");
});
$("#settingCursor")?.addEventListener("change", () => {
  data.customCursor = $("#settingCursor").checked;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  applyVisualSettings();
  showToast(data.customCursor ? "Custom cursor on" : "Custom cursor off");
});
$("#settingMotion")?.addEventListener("change", () => {
  data.motionEffects = $("#settingMotion").checked;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  applyVisualSettings();
  showToast(data.motionEffects ? "Motion effects on" : "Motion effects off");
});

document.querySelectorAll(".particle-type-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    data.particleType = btn.dataset.ptype;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    applyVisualSettings();
    showToast(btn.dataset.ptype === "rain" ? "Gentle rain" :
              btn.dataset.ptype === "snow" ? "Soft snow" : "Soft dots");
  });
});

// Forms
$("#lessonForm").addEventListener("submit", e => {
  e.preventDefault();
  const start = $("#lessonStart").value;
  const end = $("#lessonEnd").value;
  const check = isValidLessonTime(start, end);
  if (!check.ok) {
    showToast(check.msg);
    return;
  }
  const lesson = {
    id: makeId(),
    day: $("#lessonDay").value,
    subject: $("#lessonSubject").value.trim(),
    start,
    end,
    time: start,
    homework: $("#lessonHomework").value.trim()
  };
  data.lessons.push(lesson);
  createOrUpdateHomeworkTodo(lesson);
  e.target.reset();
  saveData();
  showToast("Lesson added");
});

$("#todoForm").addEventListener("submit", e => {
  e.preventDefault();
  data.todos.push({
    id: makeId(),
    text: $("#todoText").value.trim(),
    date: $("#todoDate").value,
    time: $("#todoTime").value,
    category: $("#todoCategory").value,
    done: false
  });
  e.target.reset();
  saveData();
  showToast("Task added");
});

$("#habitForm").addEventListener("submit", e => {
  e.preventDefault();
  data.habits.push({
    id: makeId(),
    name: $("#habitName").value.trim(),
    checks: {}
  });
  e.target.reset();
  saveData();
  showToast("Habit added");
});

// Notes
document.querySelectorAll("[data-note-cmd]").forEach(btn => {
  btn.addEventListener("click", () => {
    const cmd = btn.dataset.noteCmd;
    $("#noteEditor").focus();
    if (cmd === "h3") document.execCommand("formatBlock", false, "h3");
    else if (cmd === "ul") document.execCommand("insertUnorderedList");
    else if (cmd === "ol") document.execCommand("insertOrderedList");
    else if (cmd === "hr") document.execCommand("insertHorizontalRule");
    else if (cmd === "check") {
      document.execCommand("insertHTML", false, '<div class="note-check"><input type="checkbox" /><span>Checklist item</span></div><div><br></div>');
    } else document.execCommand(cmd);
  });
});

$("#newNoteBtn").addEventListener("click", () => {
  if (noteSaveTimer) { clearTimeout(noteSaveTimer); noteSaveTimer = null; saveCurrentNote({ silent: true, refreshList: false }); } const note = { id: makeId(), title: "Untitled", body: "" };
  data.notes.unshift(note);
  data.activeNoteId = note.id;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  renderNotes();
  openNote(note.id);
  $("#noteTitle").focus();
  showToast("New note");
});

$("#saveNoteBtn").addEventListener("click", saveCurrentNote);

$("#deleteNoteBtn").addEventListener("click", () => {
  if (!data.activeNoteId) return;
  const removed = data.notes.find(n => n.id === data.activeNoteId);
  const prevId = data.activeNoteId;
  data.notes = data.notes.filter(n => n.id !== data.activeNoteId);
  data.activeNoteId = null;
  if (removed) pushUndo("delete note", () => { data.notes.unshift(removed); data.activeNoteId = prevId; });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  renderNotes();
  showToast("Note deleted");
});

let noteSaveTimer = null;
$("#noteEditor").addEventListener("input", () => {
  clearTimeout(noteSaveTimer);
  $("#noteSaveStatus").textContent = "Editing…";
  noteSaveTimer = setTimeout(() => saveCurrentNote({ silent: true, refreshList: true }), 1200);
});
$("#noteTitle").addEventListener("input", () => {
  clearTimeout(noteSaveTimer);
  $("#noteSaveStatus").textContent = "Editing…";
  noteSaveTimer = setTimeout(() => saveCurrentNote({ silent: true, refreshList: true }), 1200);
});

$("#noteSearch").addEventListener("input", renderNotes);
$("#noteEditor").addEventListener("change", e => {
  if (e.target.type !== "checkbox") return;
  e.target.toggleAttribute("checked", e.target.checked);
  $("#noteEditor").dispatchEvent(new Event("input"));
});
$("#noteEditor").addEventListener("paste", e => {
  e.preventDefault();
  document.execCommand("insertText", false, (e.clipboardData || window.clipboardData).getData("text/plain"));
});
$("#noteEditor").addEventListener("keydown", e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); saveCurrentNote(); }
});

$("#eventForm").addEventListener("submit", e => {
  e.preventDefault();
  data.events.push({
    id: makeId(),
    title: $("#eventTitle").value.trim(),
    date: $("#eventDate").value,
    time: $("#eventTime").value,
    type: $("#eventType").value
  });
  e.target.reset();
  saveData();
  showToast("Event added");
});

$("#clearCompleted").addEventListener("click", () => {
  data.todos = data.todos.filter(t => !t.done);
  saveData();
  showToast("Completed tasks cleared");
});

function doStreakCheckin() {
  const today = getTodayString();
  if (hasStreakCheckin(today)) return;
  data.streakCheckins[today] = true;
  saveData();
  const flame = $("#studyFlame");
  if (flame) {
    flame.classList.remove("pop");
    void flame.offsetWidth;
    flame.classList.add("pop");
  }
  showToast("Streak saved 🔥");
}

$("#streakCheckinButton")?.addEventListener("click", doStreakCheckin);
$("#studyStreakBtn").addEventListener("click", doStreakCheckin);

$("#previousMonth").addEventListener("click", () => {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
  selectedCalendarDate = getDateString(currentMonth);
  selectedMoodDate = selectedCalendarDate;
  renderCalendar();
  renderMoodPanel();
});
$("#nextMonth").addEventListener("click", () => {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
  selectedCalendarDate = getDateString(currentMonth);
  selectedMoodDate = selectedCalendarDate;
  renderCalendar();
  renderMoodPanel();
});
$("#calendarToday").addEventListener("click", () => {
  selectedCalendarDate = getTodayString();
  selectedMoodDate = getTodayString();
  currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  renderCalendar();
  renderMoodPanel();
});
$("#addSelectedDayEvent").addEventListener("click", () => {
  switchView("calendar");
  switchCalTab("events");
  if ($("#eventDate")) $("#eventDate").value = selectedCalendarDate;
  setTimeout(() => $("#eventTitle")?.focus(), 50);
});

$("#quickAddButton").addEventListener("click", () => {
  if (data.mode === "planner") {
    switchView("today");
    setTimeout(() => $("#qaTask")?.focus(), 50);
  } else {
    switchView("todos");
    if ($("#todoDate")) $("#todoDate").value = getTodayString();
    $("#todoText")?.focus();
  }
});
$("#compactQuickAdd").addEventListener("click", () => {
  switchView("todos");
  if ($("#todoDate")) $("#todoDate").value = getTodayString();
  $("#todoText")?.focus();
});


$("#spotifyApplyBtn")?.addEventListener("click", () => {
  const raw = ($("#spotifyUrlInput").value || "").trim();
  if (!raw) { showToast("Paste a Spotify link first"); return; }
  const embed = parseSpotifyEmbed(raw);
  if (!embed) { showToast("Couldn’t parse that Spotify link"); return; }
  data.spotifyEmbed = embed;
  data.spotifyPreset = "custom";
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  $("#spotifyUrlInput").value = "";
  renderSpotify();
  showToast("Playlist loaded");
});


$("#miniNotoBtn").addEventListener("click", () => {
  if (window.matchMedia("(max-width: 768px)").matches) return;
  openMiniNoto();
});
$("#headerSearchBtn")?.addEventListener("click", () => openCmdPalette());

// Calendar internal tabs
function switchCalTab(tab) {
  document.querySelectorAll(".cal-tab").forEach(b => b.classList.toggle("active", b.dataset.calTab === tab));
  const map = { month: "calPanelMonth", timetable: "calPanelTimetable", events: "calPanelEvents" };
  Object.entries(map).forEach(([k, id]) => {
    const el = document.getElementById(id);
    if (el) el.style.display = k === tab ? "" : "none";
  });
  if (tab === "month") renderCalendar();
  if (tab === "timetable") renderLessons();
  if (tab === "events") renderEvents();
  if (data.calTab !== tab) {
    data.calTab = tab;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
  }
}
document.querySelectorAll(".cal-tab").forEach(btn => {
  btn.addEventListener("click", () => switchCalTab(btn.dataset.calTab));
});

// Quick add from Today
function goQuick(view, focusId, prefill) {
  switchView(view);
  if (view === "calendar") {
    if (prefill === "event") switchCalTab("events");
    else if (prefill === "lesson") switchCalTab("timetable");
    else switchCalTab("month");
  }
  if (view === "progress" && prefill === "habit") {
    /* stay on progress */
  }
  setTimeout(() => {
    const el = focusId ? document.getElementById(focusId) : null;
    if (el) {
      el.focus();
      if (prefill === "task" && $("#todoDate")) $("#todoDate").value = getTodayString();
      if (prefill === "event" && $("#eventDate")) $("#eventDate").value = getTodayString();
    }
  }, 50);
}
$("#qaTask")?.addEventListener("click", () => goQuick("todos", "todoText", "task"));
$("#qaEvent")?.addEventListener("click", () => goQuick("calendar", "eventTitle", "event"));
$("#qaNote")?.addEventListener("click", () => {
  switchView("notes");
  $("#newNoteBtn")?.click();
});
$("#qaHabit")?.addEventListener("click", () => goQuick("progress", "habitName", "habit"));
$("#qaLesson")?.addEventListener("click", () => goQuick("calendar", "lessonSubject", "lesson"));

$("#todayGoTasks")?.addEventListener("click", () => switchView("todos"));

// Living map node expand
document.querySelectorAll("[data-expand]").forEach(btn => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleMapNode(btn.dataset.expand);
  });
});
$("#mapGoStudy")?.addEventListener("click", () => {
  data.mode = "study";
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  applyMode();
  switchView("focus");
  renderAll();
});
$("#mapGoNotes")?.addEventListener("click", () => switchView("notes"));
$("#mapGoHabits")?.addEventListener("click", () => switchView("progress"));
$("#mapGoProgress")?.addEventListener("click", () => switchView("progress"));

// Capture bar aliases
$("#qaTaskBar")?.addEventListener("click", () => goQuick("todos", "todoText", "task"));
$("#qaEventBar")?.addEventListener("click", () => goQuick("calendar", "eventTitle", "event"));
$("#qaNoteBar")?.addEventListener("click", () => { switchView("notes"); $("#newNoteBtn")?.click(); });
$("#qaHabitBar")?.addEventListener("click", () => goQuick("progress", "habitName", "habit"));
$("#qaLessonBar")?.addEventListener("click", () => goQuick("calendar", "lessonSubject", "lesson"));

// map resize handled by ensureMapObserver / visualViewport

$("#progressStreakBtn")?.addEventListener("click", doStreakCheckin);


$("#closeHomeworkModal").addEventListener("click", closeHomework);
$("#homeworkModal").addEventListener("click", e => {
  if (e.target.id === "homeworkModal") closeHomework();
});
$("#closeLessonEditModal").addEventListener("click", closeLessonEdit);
$("#lessonEditModal").addEventListener("click", e => {
  if (e.target.id === "lessonEditModal") closeLessonEdit();
});
document.addEventListener("keydown", e => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    if ($("#cmdPalette")?.classList.contains("open")) closeCmdPalette();
    else openCmdPalette();
    return;
  }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
    const tag = (e.target && e.target.tagName) || "";
    if (/INPUT|TEXTAREA|SELECT/.test(tag) || e.target?.isContentEditable) return;
    e.preventDefault();
    performUndo();
    return;
  }
  if (e.key === "Escape") {
    closeHomework();
    closeLessonEdit();
    closeCmdPalette();
    $("#pomoSettingsPanel")?.classList.remove("open");
    if (expandedMapNode) toggleMapNode(expandedMapNode);
    return;
  }
  // Living map shortcuts (ignore when typing)
  const tag = (e.target && e.target.tagName) || "";
  if (/INPUT|TEXTAREA|SELECT/.test(tag) || e.target?.isContentEditable) return;
  if (data.mode !== "planner") return;
  const todayView = document.getElementById("today");
  if (!todayView || !todayView.classList.contains("active")) return;
  const mapKeys = { "1": "tasks", "2": "schedule", "3": "study", "4": "notes", "5": "habits", "6": "progress" };
  if (mapKeys[e.key]) {
    e.preventDefault();
    toggleMapNode(mapKeys[e.key]);
  }
  if (e.key === "t" || e.key === "T") {
    e.preventDefault();
    goQuick("todos", "todoText", "task");
  }
  if (e.key === "n" || e.key === "N") {
    e.preventDefault();
    switchView("notes");
    $("#newNoteBtn")?.click();
  }
});


// ========== COMMAND PALETTE ==========
let cmdIndex = 0;
let cmdItems = [];

function getCmdCommands(query) {
  const q = (query || "").trim().toLowerCase();
  const cmds = [
    { kind: "Go", label: "Today (mindmap)", run: () => { if (data.mode !== "planner") { data.mode = "planner"; applyMode(); } switchView("today"); }, keys: "1" },
    { kind: "Go", label: "Focus / Study", run: () => { data.mode = "study"; localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); applyMode(); switchView("focus"); renderAll(); } },
    { kind: "Go", label: "Calendar", run: () => switchView("calendar") },
    { kind: "Go", label: "Tasks", run: () => switchView("todos") },
    { kind: "Go", label: "Progress", run: () => switchView("progress") },
    { kind: "Go", label: "Notes", run: () => switchView("notes") },
    { kind: "Go", label: "Settings", run: () => switchView("settings") },
    { kind: "New", label: "New task", run: () => { switchView("todos"); setTimeout(() => $("#todoText")?.focus(), 40); } },
    { kind: "New", label: "New event", run: () => { switchView("calendar"); switchCalTab("events"); setTimeout(() => $("#eventTitle")?.focus(), 40); } },
    { kind: "New", label: "New note", run: () => { switchView("notes"); $("#newNoteBtn")?.click(); } },
    { kind: "New", label: "New habit", run: () => { switchView("progress"); setTimeout(() => $("#habitName")?.focus(), 40); } },
    { kind: "New", label: "New lesson", run: () => { switchView("calendar"); switchCalTab("timetable"); setTimeout(() => $("#lessonSubject")?.focus(), 40); } },
    { kind: "Action", label: "Undo last action", run: () => performUndo(), keys: "⌘Z" },
    { kind: "Action", label: "Mini noto", run: () => openMiniNoto() },
    { kind: "Action", label: "Check in streak", run: () => doStreakCheckin() },
  ];
  // Themes
  VALID_THEMES.forEach(t => {
    const titleMap = { classic: "Noto", ember: "Ember", cobalt: "Cobalt", vermilion: "Vermilion" };
    const title = titleMap[t] || (t.charAt(0).toUpperCase() + t.slice(1));
    cmds.push({
      kind: "Theme",
      label: `Theme: ${title}`,
      run: () => {
        data.theme = t;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        applyTheme(); updateThemeBg(); startParticles();
        showToast(title);
      }
    });
  });
  });
  // Search data
  data.todos.forEach(t => {
    cmds.push({
      kind: "Task",
      label: (t.done ? "✓ " : "") + t.text,
      run: () => { switchView("todos"); }
    });
  });
  data.notes.forEach(n => {
    cmds.push({
      kind: "Note",
      label: n.title || "Untitled",
      run: () => {
        switchView("notes");
        data.activeNoteId = n.id;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        openNote(n.id, true);
        renderNotesListOnly();
      }
    });
  });
  data.events.forEach(e => {
    cmds.push({
      kind: "Event",
      label: e.title + (e.date ? " · " + e.date : ""),
      run: () => { switchView("calendar"); switchCalTab("events"); }
    });
  });
  data.lessons.forEach(l => {
    cmds.push({
      kind: "Lesson",
      label: l.subject + " · " + l.day,
      run: () => { switchView("calendar"); switchCalTab("timetable"); }
    });
  });

  if (!q) return cmds.slice(0, 12);
  return cmds.filter(c =>
    c.label.toLowerCase().includes(q) || c.kind.toLowerCase().includes(q)
  ).slice(0, 40);
}

function renderCmdList() {
  const q = $("#cmdInput")?.value || "";
  cmdItems = getCmdCommands(q);
  cmdIndex = Math.min(cmdIndex, Math.max(0, cmdItems.length - 1));
  const list = $("#cmdList");
  if (!list) return;
  if (!cmdItems.length) {
    list.innerHTML = `<div class="cmd-empty">No matches</div>`;
    return;
  }
  list.innerHTML = cmdItems.map((c, i) => `
    <button type="button" class="cmd-item ${i === cmdIndex ? "active" : ""}" data-cmd-i="${i}">
      <span class="cmd-kind">${c.kind}</span>
      <span>${escapeHtml(c.label)}</span>
      ${c.keys ? `<kbd>${c.keys}</kbd>` : ""}
    </button>`).join("");
  list.querySelectorAll(".cmd-item").forEach(btn => {
    btn.addEventListener("click", () => runCmd(Number(btn.dataset.cmdI)));
  });
  const active = list.querySelector(".cmd-item.active");
  if (active) active.scrollIntoView({ block: "nearest" });
}

function openCmdPalette() {
  const el = $("#cmdPalette");
  if (!el) return;
  el.classList.add("open");
  cmdIndex = 0;
  if ($("#cmdInput")) { $("#cmdInput").value = ""; $("#cmdInput").focus(); }
  renderCmdList();
}
function closeCmdPalette() {
  $("#cmdPalette")?.classList.remove("open");
}
function runCmd(i) {
  const c = cmdItems[i];
  if (!c) return;
  closeCmdPalette();
  c.run();
}

$("#cmdInput")?.addEventListener("input", () => { cmdIndex = 0; renderCmdList(); });
$("#cmdInput")?.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown") { e.preventDefault(); cmdIndex = Math.min(cmdIndex + 1, cmdItems.length - 1); renderCmdList(); }
  else if (e.key === "ArrowUp") { e.preventDefault(); cmdIndex = Math.max(cmdIndex - 1, 0); renderCmdList(); }
  else if (e.key === "Enter") { e.preventDefault(); runCmd(cmdIndex); }
  else if (e.key === "Escape") { e.preventDefault(); closeCmdPalette(); }
});
$("#cmdPalette")?.addEventListener("click", (e) => {
  if (e.target.id === "cmdPalette") closeCmdPalette();
});



// ========== DEEP SPACE (dark themes) ==========
let spaceAnimId = null;
let spaceStars = null;
let spacePointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
let spaceReduced = false;

function spaceThemeTint(theme) {
  const tints = {
    midnight:  { r: 18, g: 28, b: 48, neb: [36, 64, 110], star: [210, 220, 240], mono: false },
    forest:    { r: 12, g: 28, b: 18, neb: [28, 68, 42], star: [210, 230, 215], mono: false },
    black:     { r: 8,  g: 8,  b: 8,  neb: [40, 40, 40], star: [220, 220, 220], mono: true },
    vermilion: { r: 28, g: 12, b: 10, neb: [90, 32, 24], star: [245, 210, 195], mono: false }
  };
  return tints[theme] || tints.black;
}

function spaceThemes() {
  return ["midnight", "forest", "black", "vermilion"];
}

function initSpaceStars(w, h, dpr) {
  const countFar = Math.floor((w * h) / 9000);
  const countMid = Math.floor((w * h) / 28000);
  const countNear = Math.max(4, Math.floor((w * h) / 90000));
  const stars = { far: [], mid: [], near: [] };
  let rng = 42;
  const rand = () => { rng = (rng * 16807) % 2147483647; return (rng - 1) / 2147483646; };
  for (let i = 0; i < countFar; i++) {
    stars.far.push({
      x: rand(), y: rand(),
      r: (0.3 + rand() * 0.7) * dpr,
      a: 0.12 + rand() * 0.28,
      drift: 0.00002 + rand() * 0.00004
    });
  }
  for (let i = 0; i < countMid; i++) {
    stars.mid.push({
      x: rand(), y: rand(),
      r: (0.6 + rand() * 1.1) * dpr,
      a: 0.22 + rand() * 0.35,
      drift: 0.00005 + rand() * 0.00008
    });
  }
  for (let i = 0; i < countNear; i++) {
    stars.near.push({
      x: rand(), y: rand(),
      r: (1.0 + rand() * 1.6) * dpr,
      a: 0.35 + rand() * 0.4,
      pulse: rand() * Math.PI * 2,
      pulseSpeed: 0.4 + rand() * 0.8
    });
  }
  return stars;
}

function drawSpace(ts) {
  const canvas = document.getElementById("spaceCanvas");
  if (!canvas) return;
  const theme = data.theme || "classic";
  const isDark = spaceThemes().includes(theme) && data.spaceBackground !== false;
  if (!isDark) {
    spaceAnimId = null;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width || 0, canvas.height || 0);
    return;
  }
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  const cw = Math.max(1, Math.floor(w * dpr));
  const ch = Math.max(1, Math.floor(h * dpr));
  if (canvas.width !== cw || canvas.height !== ch || !spaceStars) {
    canvas.width = cw;
    canvas.height = ch;
    spaceStars = initSpaceStars(w, h, dpr);
  }
  const ctx = canvas.getContext("2d");
  const tint = spaceThemeTint(theme);
  const t = (ts || 0) * 0.001;

  ctx.fillStyle = `rgb(${Math.max(0, tint.r - 20)},${Math.max(0, tint.g - 20)},${Math.max(0, tint.b - 20)})`;
  ctx.fillRect(0, 0, cw, ch);

  if (!spaceReduced) {
    const nx = 0.5 + Math.sin(t * 0.015) * 0.08 + (spacePointer.x - 0.5) * 0.03;
    const ny = 0.35 + Math.cos(t * 0.012) * 0.06 + (spacePointer.y - 0.5) * 0.02;
    const g1 = ctx.createRadialGradient(cw * nx, ch * ny, 0, cw * nx, ch * ny, cw * 0.55);
    g1.addColorStop(0, `rgba(${tint.neb[0]},${tint.neb[1]},${tint.neb[2]},0.22)`);
    g1.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, cw, ch);

    const nx2 = 0.25 + Math.cos(t * 0.01) * 0.05;
    const ny2 = 0.7 + Math.sin(t * 0.013) * 0.05;
    const g2 = ctx.createRadialGradient(cw * nx2, ch * ny2, 0, cw * nx2, ch * ny2, cw * 0.4);
    g2.addColorStop(0, `rgba(${tint.neb[0]},${tint.neb[1]},${tint.neb[2]},0.12)`);
    g2.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, cw, ch);
  } else {
    const g1 = ctx.createRadialGradient(cw * 0.7, ch * 0.25, 0, cw * 0.7, ch * 0.25, cw * 0.5);
    g1.addColorStop(0, `rgba(${tint.neb[0]},${tint.neb[1]},${tint.neb[2]},0.14)`);
    g1.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, cw, ch);
  }

  spacePointer.x += (spacePointer.tx - spacePointer.x) * 0.04;
  spacePointer.y += (spacePointer.ty - spacePointer.y) * 0.04;
  const px = (spacePointer.x - 0.5) * 12 * dpr;
  const py = (spacePointer.y - 0.5) * 10 * dpr;

  for (const s of spaceStars.far) {
    if (!spaceReduced) {
      s.x += s.drift * 0.3;
      if (s.x > 1) s.x -= 1;
    }
    const x = s.x * cw + px * 0.15;
    const y = s.y * ch + py * 0.15;
    ctx.beginPath();
    ctx.fillStyle = `rgba(${tint.star[0]},${tint.star[1]},${tint.star[2]},${s.a})`;
    ctx.arc(x, y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const s of spaceStars.mid) {
    if (!spaceReduced) {
      s.x += s.drift;
      if (s.x > 1) s.x -= 1;
    }
    const x = s.x * cw + px * 0.45;
    const y = s.y * ch + py * 0.4;
    ctx.beginPath();
    ctx.fillStyle = `rgba(${tint.star[0]},${tint.star[1]},${tint.star[2]},${Math.min(1, s.a + 0.05)})`;
    ctx.arc(x, y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const s of spaceStars.near) {
    let a = s.a;
    if (!spaceReduced) {
      a = s.a * (0.65 + 0.35 * Math.sin(t * s.pulseSpeed + s.pulse));
    }
    const x = s.x * cw + px * 0.85;
    const y = s.y * ch + py * 0.8;
    ctx.beginPath();
    ctx.fillStyle = `rgba(${tint.star[0]},${tint.star[1]},${tint.star[2]},${a})`;
    ctx.arc(x, y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = `rgba(${tint.star[0]},${tint.star[1]},${tint.star[2]},${a * 0.2})`;
    ctx.arc(x, y, s.r * 2.4, 0, Math.PI * 2);
    ctx.fill();
  }

  spaceAnimId = requestAnimationFrame(drawSpace);
}

function startSpaceBackground() {
  if (spaceAnimId) {
    cancelAnimationFrame(spaceAnimId);
    spaceAnimId = null;
  }
  spaceStars = null;
  spaceReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canvas = document.getElementById("spaceCanvas");
  const theme = data.theme || "classic";
  const isSpace = spaceThemes().includes(theme) && data.spaceBackground !== false;
  if (!isSpace) {
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width || 0, canvas.height || 0);
    }
    return;
  }
  spaceAnimId = requestAnimationFrame(drawSpace);
}

function updateAtmosphere() {
  startSpaceBackground();
}

window.addEventListener("pointermove", (e) => {
  spacePointer.tx = e.clientX / Math.max(1, window.innerWidth);
  spacePointer.ty = e.clientY / Math.max(1, window.innerHeight);
}, { passive: true });

let _spaceResize;
window.addEventListener("resize", () => {
  clearTimeout(_spaceResize);
  _spaceResize = setTimeout(() => {
    spaceStars = null;
    updateAtmosphere();
  }, 180);
});

// Init
document.querySelectorAll(".float-img, .moon-img").forEach(i => {
  if (i.complete && !i.naturalWidth) i.remove();
  else i.addEventListener("error", () => i.remove());
});
renderAll();
updateAtmosphere();
setInterval(() => {
  renderLiveClock();
  renderCompactStatus();
  updatePipWindow();
  // Keep the lessons "now" line in sync
  const lessonsView = document.getElementById("lessons");
  if (lessonsView && lessonsView.classList.contains("active")) {
    renderLessons();
  }
}, 30000);
setInterval(() => {
  renderLiveClock();
  renderCompactStatus();
  // Only refresh mini window if it is open
  if ((pipWindow && !pipWindow.closed) || document.getElementById("miniFallback")) {
    updatePipWindow();
  }
}, 1000);
