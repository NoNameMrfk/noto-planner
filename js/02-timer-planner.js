/* Pomodoro, planner/today map, habits */
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
