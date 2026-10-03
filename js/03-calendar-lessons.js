/* Spotify, study focus, calendar, lessons */
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
