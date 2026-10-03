/* Todos, notes, events, progress */
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
        openNote(data.activeNoteId);
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
