/* Storage, data, undo, particles, custom cursor */
    const STORAGE_KEY = "orbit-study-planner-v11";
    const THEME_CLASSES = ["theme-paper","theme-white","theme-rose","theme-cobalt","theme-midnight","theme-forest","theme-black","theme-vermilion"];
    const VALID_THEMES = ["classic","paper","white","rose","cobalt","midnight","forest","black","vermilion"];
    const UI_STYLE_CLASSES = ["ui-noto","ui-studio","ui-terminal"];
    const VALID_UI_STYLES = ["noto","studio","terminal"];

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
      uiStyle: "noto",
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
            return VALID_THEMES.includes(t) ? t : "classic";
          })(),
          uiStyle: VALID_UI_STYLES.includes(saved?.uiStyle) ? saved.uiStyle : "noto",
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

      const HOVER_SEL = "button, a, [role='button'], .map-node, .map-node-head, .habit-check, .habit-day-dot, .lesson-block, .theme-swatch, .theme-button, .mood-button, label.switch, .note-list-item, .spotify-preset-btn, .calendar-day, .ui-style-btn, .particle-type-btn, .cmd-item, .header-search-btn, .nav button, .mode-switch button, .primary-button, .secondary-button, .danger-button, .ghost-button, .icon-button, .tag, input[type='checkbox'], input[type='radio'], select, .lesson-day-header, .habit-rename-btn";
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
      applyUiStyle();
      updateAtmosphere();
    }
    function applyUiStyle() {
      const style = VALID_UI_STYLES.includes(data.uiStyle) ? data.uiStyle : "noto";
      data.uiStyle = style;
      document.body.classList.remove(...UI_STYLE_CLASSES);
      document.body.classList.add(`ui-${style}`);
      document.querySelectorAll(".ui-style-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.uistyle === style);
      });
    }


