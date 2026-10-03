/* Event listeners, command palette */
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
    document.querySelectorAll(".ui-style-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        data.uiStyle = btn.dataset.uistyle;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        applyUiStyle();
        showToast(`${btn.title || data.uiStyle} style`);
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
        const titleMap = { classic: "Noto", cobalt: "Cobalt", vermilion: "Vermilion" };
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
      VALID_UI_STYLES.forEach(s => {
        cmds.push({
          kind: "Style",
          label: `UI style: ${s.charAt(0).toUpperCase() + s.slice(1)}`,
          run: () => {
            data.uiStyle = s;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            applyUiStyle();
            showToast(s + " style");
          }
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
