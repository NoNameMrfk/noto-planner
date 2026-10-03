/* Data safety layer — export / import / safer persist */
(function () {
  if (typeof STORAGE_KEY === "undefined") return;

  window.persistData = function persistData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      if (typeof showToast === "function") showToast("Could not save (storage full or blocked)");
      return false;
    }
  };

  window.saveData = function saveData() {
    if (typeof persistData === "function") persistData();
    else try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
    if (typeof renderAll === "function") renderAll();
    if (typeof updatePipWindow === "function") {
      clearTimeout(window._pipUpdateTimer);
      window._pipUpdateTimer = setTimeout(updatePipWindow, 120);
    }
  };

  window.exportUserData = function exportUserData() {
    try {
      var payload = {
        app: "noto-planner",
        version: 1,
        exportedAt: new Date().toISOString(),
        storageKey: STORAGE_KEY,
        data: JSON.parse(JSON.stringify(data))
      };
      var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "noto-backup-" + (typeof getTodayString === "function" ? getTodayString() : "data") + ".json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      if (typeof showToast === "function") showToast("Backup downloaded");
    } catch (e) {
      if (typeof showToast === "function") showToast("Could not export data");
    }
  };

  window.importUserData = function importUserData(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var parsed = JSON.parse(String(reader.result || ""));
        var incoming = parsed && typeof parsed === "object"
          ? (parsed.data && typeof parsed.data === "object" ? parsed.data : parsed)
          : null;
        if (!incoming || typeof incoming !== "object") {
          if (typeof showToast === "function") showToast("Invalid backup file");
          return;
        }
        if (!confirm("Replace your current noto. data with this backup? This cannot be undone.")) return;
        data = Object.assign({}, defaultData, incoming, {
          lessons: Array.isArray(incoming.lessons) ? incoming.lessons : data.lessons,
          todos: Array.isArray(incoming.todos) ? incoming.todos : data.todos,
          notes: Array.isArray(incoming.notes) ? incoming.notes : data.notes,
          events: Array.isArray(incoming.events) ? incoming.events : data.events,
          habits: Array.isArray(incoming.habits) ? incoming.habits : data.habits,
          moods: incoming.moods && typeof incoming.moods === "object" ? incoming.moods : data.moods,
          streakCheckins: incoming.streakCheckins && typeof incoming.streakCheckins === "object" ? incoming.streakCheckins : data.streakCheckins,
          dailyCompletions: incoming.dailyCompletions && typeof incoming.dailyCompletions === "object" ? incoming.dailyCompletions : data.dailyCompletions,
          pomodoro: Object.assign({}, defaultData.pomodoro, incoming.pomodoro || data.pomodoro || {}),
          theme: (VALID_THEMES || []).indexOf(incoming.theme) >= 0 ? incoming.theme : data.theme,
          uiStyle: (VALID_UI_STYLES || []).indexOf(incoming.uiStyle) >= 0 ? incoming.uiStyle : data.uiStyle,
          mode: incoming.mode === "study" ? "study" : "planner"
        });
        if (typeof persistData === "function") persistData();
        else try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
        if (typeof renderAll === "function") renderAll();
        if (typeof applyMode === "function") applyMode();
        if (typeof updateAtmosphere === "function") updateAtmosphere();
        if (typeof showToast === "function") showToast("Backup restored");
      } catch (e) {
        if (typeof showToast === "function") showToast("Could not read that file");
      }
    };
    reader.onerror = function () {
      if (typeof showToast === "function") showToast("Could not read that file");
    };
    reader.readAsText(file);
  };
})();
