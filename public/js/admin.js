(async function () {
  try {
    const res = await fetch("/api/auth/me");
    const data = await res.json();

    if (!data.loggedIn || !data.user || !data.user.isAdmin) {
      window.location.href = "/home.html";
      return;
    }
  } catch (err) {
    console.error("admin auth check error:", err);
    window.location.href = "/home.html";
    return;
  }

  const seriesForm = document.getElementById("seriesForm");
  const formMessage = document.getElementById("formMessage");
  const seriesTableBody = document.getElementById("seriesTableBody");

  const roundEl = document.getElementById("round");
  const conferenceEl = document.getElementById("conference");
  const seriesSlotEl = document.getElementById("seriesSlot");
  const matchupLabelEl = document.getElementById("matchupLabel");
  const higherSeedEl = document.getElementById("higherSeed");
  const lowerSeedEl = document.getElementById("lowerSeed");
  const higherSeedTeamEl = document.getElementById("higherSeedTeam");
  const lowerSeedTeamEl = document.getElementById("lowerSeedTeam");

  const seedSeasonEl = document.getElementById("seedSeason");
  const loadSeedsBtn = document.getElementById("loadSeedsBtn");
  const saveSeedsBtn = document.getElementById("saveSeedsBtn");
  const eastSeedList = document.getElementById("eastSeedList");
  const westSeedList = document.getElementById("westSeedList");
  const seedMessage = document.getElementById("seedMessage");

  const tabButtons = document.querySelectorAll(".admin-tab-btn");
  const tabPanels = document.querySelectorAll(".admin-tab-panel");

  const createUserForm = document.getElementById("createUserForm");
  const userFormMessage = document.getElementById("userFormMessage");
  const loadUsersBtn = document.getElementById("loadUsersBtn");
  const usersTableBody = document.getElementById("usersTableBody");
  const usersMessage = document.getElementById("usersMessage");

  const tiebreakerSeasonEl = document.getElementById("tiebreakerSeason");
  const actualTiebreakerPointsEl = document.getElementById("actualTiebreakerPoints");
  const loadTiebreakerBtn = document.getElementById("loadTiebreakerBtn");
  const saveTiebreakerBtn = document.getElementById("saveTiebreakerBtn");
  const tiebreakerMessage = document.getElementById("tiebreakerMessage");

  function cx(...parts) {
    return parts.filter(Boolean).join(" ");
  }

  function showTiebreakerMessage(text, type = "info") {
    if (!tiebreakerMessage) return;

    tiebreakerMessage.textContent = text || "";
    tiebreakerMessage.className = "message";

    if (type === "error") tiebreakerMessage.classList.add("error");
    if (type === "success") tiebreakerMessage.classList.add("success");
    if (type === "info") tiebreakerMessage.classList.add("info");
  }

  async function loadSeasonTiebreaker() {
    showTiebreakerMessage("");

    const season = Number(tiebreakerSeasonEl?.value);

    if (!Number.isFinite(season) || season < 2000) {
      showTiebreakerMessage("Enter a valid season.", "error");
      return;
    }

    try {
      const res = await fetch(`/api/admin/playoff/season-settings?season=${encodeURIComponent(season)}`);
      const data = await res.json();

      if (!res.ok) {
        showTiebreakerMessage(data.error || "Failed to load tiebreaker.", "error");
        return;
      }

      actualTiebreakerPointsEl.value =
        Number.isFinite(Number(data.actualTiebreakerPoints))
          ? String(data.actualTiebreakerPoints)
          : "";

      showTiebreakerMessage("Season tiebreaker loaded.", "success");
    } catch (err) {
      console.error("loadSeasonTiebreaker error:", err);
      showTiebreakerMessage("Server error loading tiebreaker.", "error");
    }
  }

  async function saveSeasonTiebreaker() {
    showTiebreakerMessage("");

    const season = Number(tiebreakerSeasonEl?.value);
    const actualTiebreakerPoints = Number(actualTiebreakerPointsEl?.value);

    if (!Number.isFinite(season) || season < 2000) {
      showTiebreakerMessage("Enter a valid season.", "error");
      return;
    }

    if (!Number.isFinite(actualTiebreakerPoints) || actualTiebreakerPoints < 50 || actualTiebreakerPoints > 400) {
      showTiebreakerMessage("Actual tiebreaker points must be between 50 and 400.", "error");
      return;
    }

    try {
      const res = await fetch("/api/admin/playoff/season-settings/tiebreaker", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          season,
          actualTiebreakerPoints
        })
      });

      const data = await res.json();

      if (!res.ok) {
        showTiebreakerMessage(data.error || "Failed to save tiebreaker.", "error");
        return;
      }

      showTiebreakerMessage("Season tiebreaker saved successfully.", "success");
    } catch (err) {
      console.error("saveSeasonTiebreaker error:", err);
      showTiebreakerMessage("Server error saving tiebreaker.", "error");
    }
  }

  loadTiebreakerBtn?.addEventListener("click", loadSeasonTiebreaker);
  saveTiebreakerBtn?.addEventListener("click", saveSeasonTiebreaker);

  function setMessageBox(el, text, type = "") {
    el.textContent = text || "";

    if (!text) {
      el.className = "message";
      return;
    }

    const base = "message mt-4 rounded-xl px-4 py-3 font-semibold";
    const tone =
      type === "error"
        ? "bg-red-50 border border-red-200 text-red-700"
        : type === "success"
        ? "bg-green-50 border border-green-200 text-green-700"
        : type === "info"
        ? "bg-blue-50 border border-blue-200 text-blue-700"
        : "text-slate-700";

    el.className = `${base} ${tone}`;
  }

  function showMessage(text, type) {
    setMessageBox(formMessage, text, type);
  }

  function showSeedMessage(text, type) {
    setMessageBox(seedMessage, text, type);
  }

    function showUserFormMessage(text, type) {
      setMessageBox(userFormMessage, text, type);
    }

    function showUsersMessage(text, type) {
      setMessageBox(usersMessage, text, type);
    }

    function initAdminTabs() {
      tabButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
          const tabId = btn.dataset.tab;

          tabPanels.forEach((panel) => {
            panel.classList.toggle("hidden", panel.id !== tabId);
          });

          tabButtons.forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
        });
      });
    }

  function normalizeTeamAbbr(value) {
    return String(value || "").trim().toUpperCase();
  }

  function getSeedMapForRound(round) {
    const r = String(round || "").trim();

    if (r === "1") {
      return {
        "1v8": { higher: "1", lower: "8", label: "1 vs 8" },
        "2v7": { higher: "2", lower: "7", label: "2 vs 7" },
        "3v6": { higher: "3", lower: "6", label: "3 vs 6" },
        "4v5": { higher: "4", lower: "5", label: "4 vs 5" }
      };
    }

    if (r === "2") {
      return {
        "s1": { higher: "", lower: "", label: "Semifinal 1" },
        "s2": { higher: "", lower: "", label: "Semifinal 2" }
      };
    }

    if (r === "3") {
      return {
        "conf": { higher: "", lower: "", label: "Conference Finals" }
      };
    }

    if (r === "4") {
      return {
        "finals": { higher: "", lower: "", label: "NBA Finals" }
      };
    }

    return {};
  }

  function refreshSeriesSlotOptions() {
    const seedMap = getSeedMapForRound(roundEl.value);
    const currentValue = seriesSlotEl.value;

    seriesSlotEl.innerHTML =
      `<option value="">Select matchup</option>` +
      Object.entries(seedMap)
        .map(([value, info]) => `<option value="${value}">${info.label}</option>`)
        .join("");

    if (seedMap[currentValue]) {
      seriesSlotEl.value = currentValue;
    } else {
      seriesSlotEl.value = "";
    }

    applySeriesSlot();
  }

  function applySeriesSlot() {
    const seedMap = getSeedMapForRound(roundEl.value);
    const selected = seedMap[String(seriesSlotEl.value || "").trim()];

    if (selected) {
      higherSeedEl.value = selected.higher;
      lowerSeedEl.value = selected.lower;
    } else {
      higherSeedEl.value = "";
      lowerSeedEl.value = "";
    }

    updateMatchupLabel();
    autofillSeriesFromBackend();
  }

  function updateConferenceBehavior() {
    const round = String(roundEl.value || "").trim();

    if (round === "4") {
      conferenceEl.value = "FINALS";
      conferenceEl.disabled = true;
    } else {
      conferenceEl.disabled = false;
      if (conferenceEl.value === "FINALS") {
        conferenceEl.value = "EAST";
      }
    }

    resetTeamPickers();
  }

  function updateMatchupLabel() {
    const higherSeed = String(higherSeedEl.value || "").trim();
    const lowerSeed = String(lowerSeedEl.value || "").trim();
    const higherTeam = normalizeTeamAbbr(higherSeedTeamEl.value);
    const lowerTeam = normalizeTeamAbbr(lowerSeedTeamEl.value);

    if (higherSeed && lowerSeed && higherTeam && lowerTeam) {
      matchupLabelEl.value = `${higherSeed} ${higherTeam} vs ${lowerSeed} ${lowerTeam}`;
    } else {
      matchupLabelEl.value = "";
    }
  }

  function getFilterValues() {
    return {
      season: document.getElementById("filterSeason").value,
      round: document.getElementById("filterRound").value
    };
  }

  function toLocalInputValue(dateLike) {
    if (!dateLike) return "";
    const d = new Date(dateLike);
    if (Number.isNaN(d.getTime())) return "";

    const pad = (n) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());

    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  }

  async function loadSeries() {
    showMessage("", "");
    const { season, round } = getFilterValues();

    try {
      const res = await fetch(
        `/api/admin/series?season=${encodeURIComponent(season)}&round=${encodeURIComponent(round)}`
      );
      const data = await res.json();

      if (!res.ok) {
        showMessage(data.error || "Failed to load series", "error");
        return;
      }

      if (!data.series || data.series.length === 0) {
        seriesTableBody.innerHTML = `
          <tr>
            <td colspan="9" class="px-4 py-6 text-center text-slate-500 bg-white">No series found.</td>
          </tr>
        `;
        return;
      }

      seriesTableBody.innerHTML = data.series.map((series) => {
        const teams = [series.higherSeedTeam, series.lowerSeedTeam];
        const effectiveStatus = series.computedStatus || series.status || "OPEN";
        const isReadOnly = effectiveStatus === "LOCKED" || effectiveStatus === "FINAL";
        const statusTone =
          effectiveStatus === "FINAL"
            ? "bg-slate-100 text-slate-700"
            : effectiveStatus === "LOCKED"
            ? "bg-amber-100 text-amber-800"
            : "bg-green-100 text-green-800";

        return `
          <tr class="bg-white hover:bg-amber-50/40 transition">
            <td class="px-4 py-3 text-slate-700 font-medium">${series.seriesId}</td>
            <td class="px-4 py-3 text-slate-700">${series.seriesSlot || "-"}</td>
            <td class="px-4 py-3">
              <input
                type="text"
                class="edit-matchup-label w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                data-series-id="${series.seriesId}"
                value="${series.matchupLabel || ""}"
                ${isReadOnly ? "disabled" : ""}
              />
            </td>
            <td class="px-4 py-3">
              <span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${statusTone}">
                ${effectiveStatus}
              </span>
            </td>
            <td class="px-4 py-3 text-slate-700">${series.winnerTeam || "-"}</td>
            <td class="px-4 py-3 text-slate-700">${series.gamesPlayed || "-"}</td>
            <td class="px-4 py-3">
              <input
                type="datetime-local"
                class="edit-lock-at w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                data-series-id="${series.seriesId}"
                value="${toLocalInputValue(series.lockAt)}"
                ${isReadOnly ? "disabled" : ""}
              />
            </td>
            <td class="px-4 py-3">
              <div class="grid gap-2 min-w-[220px]">
                <select class="edit-higher-team-select w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200" data-series-id="${series.seriesId}" ${isReadOnly ? "disabled" : ""}>
                  ${teams.map((team) => `
                    <option value="${team}" ${series.higherSeedTeam === team ? "selected" : ""}>
                      Higher: ${team}
                    </option>
                  `).join("")}
                </select>

                <select class="edit-lower-team-select w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200" data-series-id="${series.seriesId}" ${isReadOnly ? "disabled" : ""}>
                  ${teams.map((team) => `
                    <option value="${team}" ${series.lowerSeedTeam === team ? "selected" : ""}>
                      Lower: ${team}
                    </option>
                  `).join("")}
                </select>

                <button type="button" class="update-btn inline-flex items-center justify-center rounded-xl bg-slate-800 px-4 py-2 text-white font-semibold shadow-md transition hover:bg-slate-950 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed" data-series-id="${series.seriesId}" ${isReadOnly ? "disabled" : ""}>
                  Update Series
                </button>
              </div>
            </td>
            <td class="px-4 py-3">
              <div class="grid gap-2 min-w-[200px]">
                <select class="winner-team-select w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200" data-series-id="${series.seriesId}">
                  <option value="">Select winner</option>
                  ${teams.map((team) => `
                    <option value="${team}" ${series.winnerTeam === team ? "selected" : ""}>
                      ${team}
                    </option>
                  `).join("")}
                </select>

                <select class="games-played-select w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200" data-series-id="${series.seriesId}">
                  <option value="">Games</option>
                  ${[4, 5, 6, 7].map((num) => `
                    <option value="${num}" ${series.gamesPlayed === num ? "selected" : ""}>
                      ${num}
                    </option>
                  `).join("")}
                </select>

                <button type="button" class="finalize-btn inline-flex items-center justify-center rounded-xl bg-orange-500 px-4 py-2 text-white font-semibold shadow-md transition hover:bg-orange-600" data-series-id="${series.seriesId}">
                  Finalize Series
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join("");

      attachUpdateHandlers();
      attachFinalizeHandlers();
    } catch (err) {
      console.error("loadSeries error:", err);
      showMessage("Server error loading series", "error");
    }
  }

  function getTeamsForConference(conference) {
    const conf = String(conference || "").toUpperCase();
    if (conf === "FINALS") return window.NBA_TEAMS || [];
    return (window.NBA_TEAMS || []).filter((t) => t.conference === conf);
  }

  function renderTeamPreview(previewEl, team) {
    if (!team) {
      previewEl.innerHTML = "";
      return;
    }

    previewEl.innerHTML = `
      <div class="team-preview inline-flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-slate-900 font-semibold">
        <img src="${team.logo}" alt="${team.abbr}">
        <span>${team.abbr} - ${team.name}</span>
      </div>
    `;
  }

  function setupTeamPicker({ hiddenInputId, buttonId, previewId, optionsId, otherHiddenInputId }) {
    const hiddenInput = document.getElementById(hiddenInputId);
    const otherHiddenInput = document.getElementById(otherHiddenInputId);
    const button = document.getElementById(buttonId);
    const preview = document.getElementById(previewId);
    const options = document.getElementById(optionsId);

    function buildOptions() {
      const teams = getTeamsForConference(conferenceEl.value);
      const otherSelected = String(otherHiddenInput?.value || "").trim().toUpperCase();

      options.innerHTML = teams
        .filter((team) => team.abbr !== otherSelected)
        .map((team) => `
          <div class="team-option flex items-center gap-3 rounded-xl px-3 py-2 text-slate-800 cursor-pointer hover:bg-amber-50 transition" data-abbr="${team.abbr}">
            <img src="${team.logo}" alt="${team.abbr}">
            <span class="font-medium">${team.abbr} - ${team.name}</span>
          </div>
        `)
        .join("");

      options.querySelectorAll(".team-option").forEach((opt) => {
        opt.addEventListener("click", () => {
          const abbr = opt.dataset.abbr;
          const team = teams.find((t) => t.abbr === abbr);

          hiddenInput.value = abbr;
          button.textContent = `${team.abbr} selected`;
          renderTeamPreview(preview, team);
          options.classList.add("hidden");
          updateMatchupLabel();
        });
      });
    }

    button.addEventListener("click", () => {
      buildOptions();
      options.classList.toggle("hidden");
    });
  }

  function clearTeamPicker(hiddenInputId, buttonId, previewId, optionsId) {
    document.getElementById(hiddenInputId).value = "";
    document.getElementById(buttonId).textContent = "Select team";
    document.getElementById(previewId).innerHTML = "";
    document.getElementById(optionsId).classList.add("hidden");
  }

  function resetTeamPickers() {
    clearTeamPicker("higherSeedTeam", "higherSeedTeamBtn", "higherSeedTeamPreview", "higherSeedTeamOptions");
    clearTeamPicker("lowerSeedTeam", "lowerSeedTeamBtn", "lowerSeedTeamPreview", "lowerSeedTeamOptions");
    updateMatchupLabel();
  }

  setupTeamPicker({
    hiddenInputId: "higherSeedTeam",
    otherHiddenInputId: "lowerSeedTeam",
    buttonId: "higherSeedTeamBtn",
    previewId: "higherSeedTeamPreview",
    optionsId: "higherSeedTeamOptions"
  });

  setupTeamPicker({
    hiddenInputId: "lowerSeedTeam",
    otherHiddenInputId: "higherSeedTeam",
    buttonId: "lowerSeedTeamBtn",
    previewId: "lowerSeedTeamPreview",
    optionsId: "lowerSeedTeamOptions"
  });

  function attachUpdateHandlers() {
    document.querySelectorAll(".update-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const seriesId = btn.dataset.seriesId;

        const matchupLabelEl = document.querySelector(
          `.edit-matchup-label[data-series-id="${seriesId}"]`
        );
        const lockAtEl = document.querySelector(
          `.edit-lock-at[data-series-id="${seriesId}"]`
        );
        const higherTeamEl = document.querySelector(
          `.edit-higher-team-select[data-series-id="${seriesId}"]`
        );
        const lowerTeamEl = document.querySelector(
          `.edit-lower-team-select[data-series-id="${seriesId}"]`
        );

        const matchupLabel = String(matchupLabelEl?.value || "").trim();
        const lockAt = String(lockAtEl?.value || "").trim();
        const higherSeedTeam = String(higherTeamEl?.value || "").trim().toUpperCase();
        const lowerSeedTeam = String(lowerTeamEl?.value || "").trim().toUpperCase();

        if (!matchupLabel) {
          alert("Matchup label is required.");
          return;
        }

        if (!lockAt) {
          alert("Lock date/time is required.");
          return;
        }

        if (!higherSeedTeam || !lowerSeedTeam) {
          alert("Both teams are required.");
          return;
        }

        if (higherSeedTeam === lowerSeedTeam) {
          alert("Higher and lower seed teams must be different.");
          return;
        }

        try {
          const res = await fetch("/api/admin/series/update", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              seriesId,
              matchupLabel,
              lockAt,
              higherSeedTeam,
              lowerSeedTeam
            })
          });

          const data = await res.json();

          if (!res.ok) {
            alert(data.error || "Failed to update series");
            return;
          }

          showMessage(data.message || "Series updated.", "success");
          await loadSeries();
        } catch (err) {
          console.error("update series error:", err);
          alert("Server error updating series");
        }
      });
    });
  }

  function getTeamsForSeedConference(conference) {
    return (window.NBA_TEAMS || []).filter(
      (t) => String(t.conference || "").toUpperCase() === String(conference).toUpperCase()
    );
  }

  function seedOptionsHTML(conference, selectedAbbr = "") {
    const teams = getTeamsForSeedConference(conference);
    const selected = String(selectedAbbr || "").trim().toUpperCase();

    return `
      <option value="">Select team</option>
      ${teams.map((team) => `
        <option value="${team.abbr}" ${team.abbr === selected ? "selected" : ""}>
          ${team.abbr} - ${team.name}
        </option>
      `).join("")}
    `;
  }

  function renderSeedBoard(seedRows = []) {
    const seedMap = new Map(
      seedRows.map((row) => [`${row.conference}-${row.seed}`, row.teamAbbr])
    );

    function buildConferenceRows(conference) {
      return Array.from({ length: 8 }, (_, i) => i + 1).map((seed) => {
        const key = `${conference}-${seed}`;
        const selected = seedMap.get(key) || "";

        return `
          <div class="grid grid-cols-[88px_1fr] gap-3 items-center">
            <div class="inline-flex items-center justify-center rounded-full bg-slate-200 px-3 py-2 font-bold text-slate-800">
              Seed ${seed}
            </div>
            <select
              class="seed-team-select w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
              data-conference="${conference}"
              data-seed="${seed}"
            >
              ${seedOptionsHTML(conference, selected)}
            </select>
          </div>
        `;
      }).join("");
    }

    eastSeedList.innerHTML = buildConferenceRows("EAST");
    westSeedList.innerHTML = buildConferenceRows("WEST");
  }

  async function loadSeedBoard() {
    showSeedMessage("", "");
    const season = Number(seedSeasonEl.value);

    if (!Number.isFinite(season)) {
      showSeedMessage("Please enter a valid season.", "error");
      return;
    }

    try {
      const res = await fetch(`/api/admin/playoff-seeds?season=${encodeURIComponent(season)}`);
      const data = await res.json();

      if (!res.ok) {
        showSeedMessage(data.error || "Failed to load playoff seeds.", "error");
        return;
      }

      renderSeedBoard(Array.isArray(data.seeds) ? data.seeds : []);
      showSeedMessage("Playoff seeds loaded.", "success");
    } catch (err) {
      console.error("loadSeedBoard error:", err);
      showSeedMessage("Server error loading playoff seeds.", "error");
    }
  }

  function collectSeedAssignments() {
    const season = Number(seedSeasonEl.value);
    const rows = document.querySelectorAll(".seed-team-select");
    const assignments = [];

    const seenEast = new Set();
    const seenWest = new Set();

    for (const row of rows) {
      const conference = String(row.dataset.conference || "").trim().toUpperCase();
      const seed = Number(row.dataset.seed);
      const teamAbbr = String(row.value || "").trim().toUpperCase();

      if (!teamAbbr) {
        throw new Error(`Please select a team for ${conference} Seed ${seed}.`);
      }

      const seenSet = conference === "EAST" ? seenEast : seenWest;
      if (seenSet.has(teamAbbr)) {
        throw new Error(`Duplicate ${conference} team selected: ${teamAbbr}.`);
      }
      seenSet.add(teamAbbr);

      assignments.push({
        conference,
        seed,
        teamAbbr
      });
    }

    return { season, assignments };
  }

  async function saveSeedBoard() {
    showSeedMessage("", "");

    try {
      const payload = collectSeedAssignments();

      const res = await fetch("/api/admin/playoff-seeds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        showSeedMessage(data.error || "Failed to save playoff seeds.", "error");
        return;
      }

      showSeedMessage(data.message || "Playoff seeds saved successfully.", "success");
      await loadSeedBoard();
    } catch (err) {
      console.error("saveSeedBoard error:", err);
      showSeedMessage(err.message || "Server error saving playoff seeds.", "error");
    }
  }

  async function autofillSeriesFromBackend() {
    const season = Number(document.getElementById("season").value);
    const round = Number(roundEl.value);
    const conference = String(conferenceEl.value || "").trim().toUpperCase();
    const seriesSlot = String(seriesSlotEl.value || "").trim();

    if (!Number.isFinite(season)) return;
    if (![1, 2, 3, 4].includes(round)) return;
    if (!seriesSlot) return;

    try {
      const res = await fetch(
        `/api/admin/series/autofill?season=${encodeURIComponent(season)}&round=${encodeURIComponent(round)}&conference=${encodeURIComponent(conference)}&seriesSlot=${encodeURIComponent(seriesSlot)}`
      );

      const data = await res.json();

      if (!res.ok || !data.matchup) {
        console.warn("autofillSeriesFromBackend skipped:", data.error || "No matchup returned");
        return;
      }

      higherSeedEl.value = data.matchup.higherSeed;
      lowerSeedEl.value = data.matchup.lowerSeed;
      higherSeedTeamEl.value = data.matchup.higherSeedTeam;
      lowerSeedTeamEl.value = data.matchup.lowerSeedTeam;
      matchupLabelEl.value = data.matchup.matchupLabel;

      const higherTeam = (window.NBA_TEAMS || []).find((t) => t.abbr === data.matchup.higherSeedTeam);
      const lowerTeam = (window.NBA_TEAMS || []).find((t) => t.abbr === data.matchup.lowerSeedTeam);

      document.getElementById("higherSeedTeamBtn").textContent =
        data.matchup.higherSeedTeam ? `${data.matchup.higherSeedTeam} selected` : "Select team";

      document.getElementById("lowerSeedTeamBtn").textContent =
        data.matchup.lowerSeedTeam ? `${data.matchup.lowerSeedTeam} selected` : "Select team";

      renderTeamPreview(document.getElementById("higherSeedTeamPreview"), higherTeam);
      renderTeamPreview(document.getElementById("lowerSeedTeamPreview"), lowerTeam);
    } catch (err) {
      console.error("autofillSeriesFromBackend error:", err);
    }
  }

  function attachFinalizeHandlers() {
    document.querySelectorAll(".finalize-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const seriesId = btn.dataset.seriesId;
        const winnerSelect = document.querySelector(`.winner-team-select[data-series-id="${seriesId}"]`);
        const gamesSelect = document.querySelector(`.games-played-select[data-series-id="${seriesId}"]`);

        const winnerTeam = winnerSelect.value;
        const gamesPlayed = gamesSelect.value;

        if (!winnerTeam) {
          alert("Please select a winner.");
          return;
        }

        if (!gamesPlayed) {
          alert("Please select games played.");
          return;
        }

        try {
          const res = await fetch("/api/admin/series/finalize", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              seriesId,
              winnerTeam,
              gamesPlayed
            })
          });

          const data = await res.json();

          if (!res.ok) {
            alert(data.error || "Failed to finalize series");
            return;
          }

          showMessage(data.message || "Series finalized.", "success");
          await loadSeries();
        } catch (err) {
          console.error("finalize series error:", err);
          alert("Server error finalizing series");
        }
      });
    });
  }

    function renderUsers(users = []) {
      if (!Array.isArray(users) || users.length === 0) {
        usersTableBody.innerHTML = `
          <tr>
            <td colspan="7" class="px-4 py-6 text-center text-slate-500 bg-white">
              No users found.
            </td>
          </tr>
        `;
        return;
      }

      usersTableBody.innerHTML = users.map((user) => {
        const fullName = [user.firstName || "", user.lastName || ""].join(" ").trim() || "-";
        const isActive = user.isActive !== false;
        const isAdmin = !!user.isAdmin;
        const mustChangePassword = !!user.mustChangePassword;

        return `
          <tr class="bg-white hover:bg-amber-50/40 transition">
            <td class="px-4 py-3 font-medium text-slate-900">${fullName}</td>
            <td class="px-4 py-3 text-slate-700">${user.username || "-"}</td>
            <td class="px-4 py-3 text-slate-700">${user.email || "-"}</td>
            <td class="px-4 py-3">
              <span class="${cx(
                "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold",
                isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"
              )}">
                ${isActive ? "Active" : "Inactive"}
              </span>
            </td>
            <td class="px-4 py-3">
              <span class="${cx(
                "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold",
                isAdmin ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"
              )}">
                ${isAdmin ? "Admin" : "User"}
              </span>
            </td>
            <td class="px-4 py-3">
              <span class="${cx(
                "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold",
                mustChangePassword ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"
              )}">
                ${mustChangePassword ? "Must Change" : "OK"}
              </span>
            </td>
            <td class="px-4 py-3">
              <div class="flex flex-wrap gap-2 min-w-[280px]">
                <button
                  type="button"
                  class="toggle-active-btn inline-flex items-center justify-center rounded-xl bg-slate-800 px-3 py-2 text-white text-xs font-semibold shadow-sm transition hover:bg-slate-950"
                  data-user-id="${user._id}"
                >
                  ${isActive ? "Deactivate" : "Activate"}
                </button>

                <button
                  type="button"
                  class="toggle-admin-btn inline-flex items-center justify-center rounded-xl bg-orange-500 px-3 py-2 text-white text-xs font-semibold shadow-sm transition hover:bg-orange-600"
                  data-user-id="${user._id}"
                >
                  ${isAdmin ? "Remove Admin" : "Make Admin"}
                </button>

                <button
                  type="button"
                  class="reset-password-btn inline-flex items-center justify-center rounded-xl bg-blue-600 px-3 py-2 text-white text-xs font-semibold shadow-sm transition hover:bg-blue-700"
                  data-user-id="${user._id}"
                >
                  Reset Password
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join("");
    }

    async function loadUsers() {
      showUsersMessage("", "");

      try {
        const res = await fetch("/api/admin/users");
        const data = await res.json();

        if (!res.ok) {
          showUsersMessage(data.error || data.message || "Failed to load users.", "error");
          usersTableBody.innerHTML = `
            <tr>
              <td colspan="7" class="px-4 py-6 text-center text-slate-500 bg-white">
                Failed to load users.
              </td>
            </tr>
          `;
          return;
        }

        renderUsers(Array.isArray(data.users) ? data.users : []);
        showUsersMessage("", "");
      } catch (err) {
        console.error("loadUsers error:", err);
        showUsersMessage("Server error loading users.", "error");
        usersTableBody.innerHTML = `
          <tr>
            <td colspan="7" class="px-4 py-6 text-center text-slate-500 bg-white">
              Server error loading users.
            </td>
          </tr>
        `;
      }
    }

    async function createUser(payload) {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      return res.json().then((data) => ({ ok: res.ok, data }));
    }

    async function toggleUserStatus(userId) {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        }
      });

      return res.json().then((data) => ({ ok: res.ok, data }));
    }

    async function toggleUserAdmin(userId) {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/admin`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        }
      });

      return res.json().then((data) => ({ ok: res.ok, data }));
    }

    async function resetUserPassword(userId, password) {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/reset-password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ password })
      });

      return res.json().then((data) => ({ ok: res.ok, data }));
    }

  seriesForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    showMessage("", "");

    const payload = {
      season: document.getElementById("season").value,
      round: roundEl.value,
      conference: conferenceEl.value,
      seriesSlot: seriesSlotEl.value,
      matchupLabel: matchupLabelEl.value.trim(),
      higherSeed: higherSeedEl.value,
      lowerSeed: lowerSeedEl.value,
      higherSeedTeam: higherSeedTeamEl.value.trim(),
      lowerSeedTeam: lowerSeedTeamEl.value.trim(),
      lockAt: document.getElementById("lockAt").value
    };

    if (!payload.seriesSlot) {
      showMessage("Please select a series matchup.", "error");
      return;
    }

    if (!payload.higherSeed || !payload.lowerSeed) {
      showMessage("Please select a valid series matchup.", "error");
      return;
    }

    if (!payload.higherSeedTeam || !payload.lowerSeedTeam) {
      showMessage("Please select both teams.", "error");
      return;
    }

    try {
      const res = await fetch("/api/admin/series", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        showMessage(data.error || "Failed to create series", "error");
        return;
      }

      showMessage(`Created series: ${data.series.seriesId}`, "success");
      seriesForm.reset();

      document.getElementById("season").value = payload.season;
      roundEl.value = payload.round;

      updateConferenceBehavior();
      refreshSeriesSlotOptions();

      seriesSlotEl.value = "";
      applySeriesSlot();

      clearTeamPicker("higherSeedTeam", "higherSeedTeamBtn", "higherSeedTeamPreview", "higherSeedTeamOptions");
      clearTeamPicker("lowerSeedTeam", "lowerSeedTeamBtn", "lowerSeedTeamPreview", "lowerSeedTeamOptions");

      updateMatchupLabel();
      await loadSeries();
    } catch (err) {
      console.error("create series error:", err);
      showMessage("Server error creating series", "error");
    }
  });

  roundEl.addEventListener("change", async () => {
    updateConferenceBehavior();
    refreshSeriesSlotOptions();
    await autofillSeriesFromBackend();
  });

  conferenceEl.addEventListener("change", async () => {
    resetTeamPickers();
    await autofillSeriesFromBackend();
  });

  seriesSlotEl.addEventListener("change", applySeriesSlot);

  document.getElementById("filterSeason").addEventListener("change", loadSeries);
  document.getElementById("filterRound").addEventListener("change", loadSeries);

  loadSeedsBtn.addEventListener("click", loadSeedBoard);
  saveSeedsBtn.addEventListener("click", saveSeedBoard);

  initAdminTabs();

    if (createUserForm) {
      createUserForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        showUserFormMessage("", "");

        const payload = {
          firstName: document.getElementById("newFirstName").value.trim(),
          lastName: document.getElementById("newLastName").value.trim(),
          username: document.getElementById("newUsername").value.trim(),
          email: document.getElementById("newEmail").value.trim(),
          password: document.getElementById("createUserPassword").value.trim(),
          isAdmin: document.getElementById("newIsAdmin").checked
        };

        if (!payload.username) {
          showUserFormMessage("Username is required.", "error");
          return;
        }

        if (!payload.password) {
          showUserFormMessage("Temporary password is required.", "error");
          return;
        }

        try {
          const result = await createUser(payload);

          if (!result.ok) {
            showUserFormMessage(result.data.error || result.data.message || "Failed to create user.", "error");
            return;
          }

          showUserFormMessage(result.data.message || "User created successfully.", "success");
          createUserForm.reset();
          await loadUsers();
        } catch (err) {
          console.error("create user error:", err);
          showUserFormMessage("Server error creating user.", "error");
        }
      });
    }

    if (loadUsersBtn) {
      loadUsersBtn.addEventListener("click", loadUsers);
    }

    if (usersTableBody) {
      usersTableBody.addEventListener("click", async (e) => {
        const activeBtn = e.target.closest(".toggle-active-btn");
        const adminBtn = e.target.closest(".toggle-admin-btn");
        const resetBtn = e.target.closest(".reset-password-btn");

        try {
          if (activeBtn) {
            const userId = activeBtn.dataset.userId;
            const result = await toggleUserStatus(userId);

            if (!result.ok) {
              alert(result.data.error || result.data.message || "Failed to update user status.");
              return;
            }

            showUsersMessage(result.data.message || "User status updated.", "success");
            await loadUsers();
            return;
          }

          if (adminBtn) {
            const userId = adminBtn.dataset.userId;
            const result = await toggleUserAdmin(userId);

            if (!result.ok) {
              alert(result.data.error || result.data.message || "Failed to update admin role.");
              return;
            }

            showUsersMessage(result.data.message || "User role updated.", "success");
            await loadUsers();
            return;
          }

          if (resetBtn) {
            const userId = resetBtn.dataset.userId;
            const tempPassword = window.prompt("Enter a temporary password for this user:");

            if (!tempPassword) return;

            const result = await resetUserPassword(userId, tempPassword);

            if (!result.ok) {
              alert(result.data.error || result.data.message || "Failed to reset password.");
              return;
            }

            showUsersMessage(result.data.message || "Password reset successfully.", "success");
            await loadUsers();
          }
        } catch (err) {
          console.error("user action error:", err);
          alert("Server error performing user action.");
        }
      });
    }

  updateConferenceBehavior();
  refreshSeriesSlotOptions();

  renderSeedBoard([]);
  await loadSeedBoard();

  updateMatchupLabel();
  await loadSeries();
  await loadUsers();
})();