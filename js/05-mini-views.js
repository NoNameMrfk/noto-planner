/* Mini noto PiP, view switching */
    function getThemeVars() {
      const t = data.theme || "classic";
      const themes = {
        classic: {
          bg: "#faf7f0", ink: "#1c1e1b", muted: "#6a6d66", line: "#ddd8ce",
          accent: "#2a5f48", accentLight: "#d4e8dc", orange: "#c56a38",
          yellow: "#e0b53a", panel: "#ffffff", tag: "#2a5f48", tagBg: "#d4e8dc",
          soft: "rgba(42,95,72,0.08)"
        },
        paper: {
          bg: "#f0e6d0", ink: "#2a2216", muted: "#6b604c", line: "#c9ba9c",
          accent: "#4a5534", accentLight: "#dde2cc", orange: "#8f6b45",
          yellow: "#a88b2e", panel: "#faf3e4", tag: "#4a5534", tagBg: "#dde2cc",
          soft: "rgba(74,85,52,0.1)"
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
