(async function () {
  try {
    const meRes = await fetch("/api/auth/me");
    const meData = await meRes.json();

    if (!meData.loggedIn) {
      window.location.href = "/home.html";
      return;
    }

    if (meData.user?.mustChangePassword) {
      window.location.href = "/change-password.html";
      return;
    }
  } catch (err) {
    console.error("mypicks auth check error:", err);
    window.location.href = "/home.html";
    return;
  }

  const submitBtn = document.getElementById("submitBtn");
  const seriesContainer = document.getElementById("seriesContainer");
  const message = document.getElementById("message");
  const tiebreakerSection = document.getElementById("tiebreakerSection");
  const tiebreakerPredictionInput = document.getElementById("tiebreakerPrediction");
  const tiebreakerSubtext = document.getElementById("tiebreakerSubtext");
  const roundStatusBanner = document.getElementById("roundStatusBanner");
  const roundStatusSubtext = document.getElementById("roundStatusSubtext");
  const roundSelect = document.getElementById("round");

  const enableNotificationsBtn = document.getElementById("enableNotificationsBtn");
  const disableNotificationsBtn = document.getElementById("disableNotificationsBtn");
  const notificationStatus = document.getElementById("notificationStatus");

  let currentSeries = [];
  let currentRoundLocked = false;
  let activeSeason = 2026;

  const THEME = window.NBA_PICKS_THEME || {};

  function cx(...parts) {
    return parts.filter(Boolean).join(" ");
  }

  function getSeriesKey(series) {
    return String(series?.seriesId || series?._id || "").trim();
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }

  function setNotificationUi({ enabled, subscribed, supported, permission }) {
    if (!enableNotificationsBtn || !disableNotificationsBtn || !notificationStatus) return;

    if (!supported) {
      enableNotificationsBtn.classList.add("hidden");
      disableNotificationsBtn.classList.add("hidden");
      notificationStatus.textContent = "Browser notifications are not supported on this device/browser.";
      return;
    }

    if (permission === "denied") {
      enableNotificationsBtn.classList.add("hidden");
      disableNotificationsBtn.classList.add("hidden");
      notificationStatus.textContent = "Notifications are blocked in your browser settings.";
      return;
    }

    if (enabled && subscribed) {
      enableNotificationsBtn.classList.add("hidden");
      disableNotificationsBtn.classList.remove("hidden");
      notificationStatus.textContent = "Deadline reminders are enabled for this browser.";
    } else {
      enableNotificationsBtn.classList.remove("hidden");
      disableNotificationsBtn.classList.add("hidden");
      notificationStatus.textContent = "Enable browser reminders for upcoming pick deadlines.";
    }
  }

  async function loadNotificationStatus() {
    const supported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    const permission = supported ? Notification.permission : "default";

    if (!supported) {
      setNotificationUi({
        enabled: false,
        subscribed: false,
        supported,
        permission
      });
      return;
    }

    try {
      const res = await fetch("/api/notifications/status");
      const data = await res.json();

      setNotificationUi({
        enabled: Boolean(data.enabled),
        subscribed: Boolean(data.subscribed),
        supported,
        permission
      });
    } catch (err) {
      console.error("loadNotificationStatus error:", err);
      setNotificationUi({
        enabled: false,
        subscribed: false,
        supported,
        permission
      });
    }
  }

  async function enableNotifications() {
    try {
      const supported =
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;

      if (!supported) {
        if (notificationStatus) {
          notificationStatus.textContent = "This browser does not support push notifications.";
        }
        return;
      }

      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setNotificationUi({
          enabled: false,
          subscribed: false,
          supported: true,
          permission
        });
        return;
      }

      const keyRes = await fetch("/api/notifications/public-key");
      const keyData = await keyRes.json();

      if (!keyRes.ok || !keyData.publicKey) {
        throw new Error(keyData.error || "Unable to load push notification public key.");
      }

      const registration = await navigator.serviceWorker.register("/sw.js");

      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyData.publicKey)
        });
      }

      const saveRes = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ subscription })
      });

      const saveData = await saveRes.json();

      if (!saveRes.ok) {
        throw new Error(saveData.error || "Failed to save push subscription.");
      }

      await loadNotificationStatus();
    } catch (err) {
      console.error("enableNotifications error:", err);
      if (notificationStatus) {
        notificationStatus.textContent = err.message || "Failed to enable notifications.";
      }
    }
  }

  async function disableNotifications() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
      }

      const res = await fetch("/api/notifications/unsubscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to disable notifications.");
      }

      await loadNotificationStatus();
    } catch (err) {
      console.error("disableNotifications error:", err);
      if (notificationStatus) {
        notificationStatus.textContent = err.message || "Failed to disable notifications.";
      }
    }
  }

  function getAllowedConfidenceValues(round) {
    const r = Number(round);

    if (r === 1) return [1, 2, 3, 4, 5, 6, 7, 8];
    if (r === 2) return [3, 6, 9, 12];
    if (r === 3) return [10, 20];
    if (r === 4) return [20];

    return [];
  }

  function showMessage(text, type) {
    message.textContent = text || "";

    const base = "message";
    const tone =
      type === "error"
        ? "error"
        : type === "success"
        ? "success"
        : type === "info"
        ? "info"
        : "";

    message.className = cx(base, tone);

    if (!text) {
      message.className = "message";
    }
  }

  function setSubmitEnabled(enabled) {
    submitBtn.disabled = !enabled;

    submitBtn.className = cx(
      "mt-6 inline-flex items-center justify-center rounded-xl px-5 py-2.5 font-semibold shadow-lg transition",
      enabled
        ? "bg-orange-500 text-white hover:bg-orange-600"
        : "bg-slate-300 text-slate-500 cursor-not-allowed"
    );
  }

  function getStatusClass(status) {
    if (status === "FINAL") {
      return THEME.statusFinal || "inline-flex items-center rounded-full bg-slate-200 text-slate-700 px-3 py-1 text-xs font-bold";
    }
    if (status === "LOCKED") {
      return THEME.statusLocked || "inline-flex items-center rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-xs font-bold";
    }
    return THEME.statusOpen || "inline-flex items-center rounded-full bg-green-100 text-green-800 px-3 py-1 text-xs font-bold";
  }

  function getCardClass(status) {
    const base = "series-card";
    if (status === "FINAL") {
      return cx(base, THEME.cardFinal || "bg-slate-100 border border-slate-300 rounded-2xl shadow-md p-5");
    }
    if (status === "LOCKED") {
      return cx(base, THEME.cardLocked || "bg-slate-50 border border-amber-300 rounded-2xl shadow-md p-5");
    }
    return cx(base, THEME.card || "bg-white border border-slate-200 rounded-2xl shadow-md p-5");
  }

  function findTeam(abbr) {
    const teams = Array.isArray(window.NBA_TEAMS) ? window.NBA_TEAMS : [];
    const key = String(abbr || "").trim().toUpperCase();
    return teams.find((t) => String(t.abbr || "").trim().toUpperCase() === key) || null;
  }

  function teamButtonHTML({ teamAbbr, selected, disabled }) {
    const team = findTeam(teamAbbr);
    const logoHTML = team?.logo
      ? `<img src="${team.logo}" alt="${teamAbbr}" class="team-btn-logo">`
      : "";

    return `
      <button
        type="button"
        class="${cx(
          THEME.teamBtn || "team-btn inline-flex items-center justify-center gap-3 min-h-[58px] rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 font-semibold transition hover:border-amber-400 hover:bg-amber-50",
          "team-btn",
          selected ? (THEME.teamBtnSelected || "selected border-2 border-slate-900 bg-amber-50 shadow-md -translate-y-[1px]") : "",
          disabled ? (THEME.teamBtnDisabled || "opacity-60 cursor-not-allowed bg-slate-100 hover:bg-slate-100 hover:border-slate-300") : ""
        )}"
        data-team="${teamAbbr}"
        ${disabled ? "disabled" : ""}
      >
        ${logoHTML}
        <span class="team-btn-text">${teamAbbr}</span>
      </button>
    `;
  }

  function setRoundBanner(allSeries, roundLocked, lockReason) {
    const statuses = new Set((allSeries || []).map((s) => s.computedStatus || "OPEN"));

    roundStatusBanner.className = "hidden";
    roundStatusBanner.textContent = "";
    roundStatusSubtext.textContent = "";

    if (!allSeries || allSeries.length === 0) {
      roundStatusBanner.className = "hidden";
      return;
    }

    const base = THEME.bannerBase || "mt-4 rounded-xl px-4 py-3 font-semibold";

    if (roundLocked) {
      if (statuses.size === 1 && statuses.has("FINAL")) {
        roundStatusBanner.className = cx(base, THEME.bannerFinal || "bg-slate-200 text-slate-700");
        roundStatusBanner.textContent = "This round is final.";
      } else {
        roundStatusBanner.className = cx(base, THEME.bannerLocked || "bg-amber-100 text-amber-800");
        roundStatusBanner.textContent = "This round is locked.";
      }

      roundStatusSubtext.textContent =
        lockReason || "Picks can no longer be edited for this round.";
      return;
    }

    roundStatusBanner.className = cx(base, THEME.bannerOpen || "bg-green-100 text-green-800");
    roundStatusBanner.textContent = "This round is open for picks.";
    roundStatusSubtext.textContent = "Choose a winner, predicted games, and a unique confidence value for each available series in this round.";
  }

  function renderSeries(allSeries, existingPicksDoc = null) {
    currentSeries = allSeries;

    if (!allSeries.length) {
      seriesContainer.innerHTML = `<div class="${THEME.emptyState || "rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-slate-600"}">No series found for this round.</div>`;
      return;
    }

    const existingMap = new Map();
    if (existingPicksDoc && Array.isArray(existingPicksDoc.picks)) {
      for (const pick of existingPicksDoc.picks) {
        existingMap.set(String(pick.seriesId || "").trim(), pick);
      }
    }

    const currentRound = Number(roundSelect.value);
    const allowedConfidenceValues = getAllowedConfidenceValues(currentRound);

    seriesContainer.innerHTML = allSeries.map((series) => {
      const seriesKey = getSeriesKey(series);
      const existing = existingMap.get(seriesKey);
      const status = series.computedStatus || "OPEN";
      const isEditable = status === "OPEN";
      const missedLockedPick = !isEditable && !existing;

      return `
        <div class="${getCardClass(status)}" data-series-id="${seriesKey}" data-status="${status}">
          <h3 class="${THEME.title || "text-2xl font-bold text-slate-900 tracking-tight"}">${series.matchupLabel}</h3>

          <div class="${THEME.metaWrap || "flex flex-wrap gap-2 mt-3 mb-4"}">
            <span class="${THEME.metaPill || "inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs sm:text-sm text-slate-700"}"><strong class="mr-1 text-slate-900">Conference:</strong> ${series.conference}</span>
            <span class="${THEME.metaPill || "inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs sm:text-sm text-slate-700"}"><strong class="mr-1 text-slate-900">Slot:</strong> ${series.seriesSlot || "-"}</span>
            <span class="${THEME.metaPill || "inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs sm:text-sm text-slate-700"}"><strong class="mr-1 text-slate-900">Locks:</strong> ${series.lockAt ? new Date(series.lockAt).toLocaleString() : "-"}</span>
            <span class="${getStatusClass(status)}">${status}</span>
          </div>

          ${missedLockedPick ? `
            <div class="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              No pick was submitted before this series locked.
            </div>
          ` : ""}

          <label class="${THEME.label || "block text-sm font-semibold text-slate-900 mb-2"}">Pick Winner</label>
          <div class="${THEME.pickButtons || "pick-buttons grid grid-cols-2 gap-3 mt-4"}">
            ${teamButtonHTML({
              teamAbbr: series.higherSeedTeam,
              selected: String(existing?.pickTeam || "").trim().toUpperCase() === String(series.higherSeedTeam || "").trim().toUpperCase(),
              disabled: !isEditable
            })}
            ${teamButtonHTML({
              teamAbbr: series.lowerSeedTeam,
              selected: String(existing?.pickTeam || "").trim().toUpperCase() === String(series.lowerSeedTeam || "").trim().toUpperCase(),
              disabled: !isEditable
            })}
          </div>

          <input type="hidden" class="pick-team-input" value="${existing?.pickTeam || ""}" />

          <div class="${THEME.formRow || "series-form-row grid grid-cols-2 gap-4 items-end mt-4 pt-4 border-t border-slate-200"}">
            <div>
              <label class="${THEME.label || "block text-sm font-semibold text-slate-900 mb-2"}">Predicted Games</label>
              <select class="predicted-games ${THEME.input || "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"}" ${isEditable ? "" : "disabled"}>
                <option value="">Select</option>
                <option value="4" ${Number(existing?.predictedGames) === 4 ? "selected" : ""}>4</option>
                <option value="5" ${Number(existing?.predictedGames) === 5 ? "selected" : ""}>5</option>
                <option value="6" ${Number(existing?.predictedGames) === 6 ? "selected" : ""}>6</option>
                <option value="7" ${Number(existing?.predictedGames) === 7 ? "selected" : ""}>7</option>
              </select>
            </div>

            <div>
              <label class="${THEME.label || "block text-sm font-semibold text-slate-900 mb-2"}">Confidence</label>
              <select class="confidence ${THEME.input || "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"}" ${isEditable ? "" : "disabled"}>
                <option value="">Select</option>
                ${allowedConfidenceValues.map((num) => `
                  <option value="${num}" ${Number(existing?.confidence) === num ? "selected" : ""}>${num}</option>
                `).join("")}
              </select>
            </div>
          </div>
        </div>
      `;
    }).join("");

    attachTeamButtonHandlers();
    attachConfidenceHandlers();
    refreshConfidenceOptions();
  }

  function attachTeamButtonHandlers() {
    const selectedClasses = (THEME.teamBtnSelected || "selected border-2 border-slate-900 bg-amber-50 shadow-md -translate-y-[1px]")
      .split(/\s+/)
      .filter(Boolean);

    document.querySelectorAll(".series-card").forEach((card) => {
      const status = card.dataset.status || "OPEN";
      if (status !== "OPEN") return;

      const hiddenInput = card.querySelector(".pick-team-input");
      const buttons = card.querySelectorAll(".team-btn");

      buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
          hiddenInput.value = btn.dataset.team;

          buttons.forEach((b) => {
            b.classList.remove(...selectedClasses);
          });

          btn.classList.add(...selectedClasses);
        });
      });
    });
  }

  function getSelectedConfidenceMap() {
    const cards = document.querySelectorAll('.series-card[data-status="OPEN"]');
    const selectedMap = new Map();

    cards.forEach((card) => {
      const seriesId = card.dataset.seriesId;
      const select = card.querySelector(".confidence");
      const value = Number(select?.value);

      if (Number.isFinite(value) && value > 0) {
        selectedMap.set(seriesId, value);
      }
    });

    return selectedMap;
  }

  function refreshConfidenceOptions() {
    const cards = document.querySelectorAll('.series-card[data-status="OPEN"]');
    const selectedMap = getSelectedConfidenceMap();
    const allowedConfidenceValues = getAllowedConfidenceValues(Number(roundSelect.value));

    cards.forEach((card) => {
      const seriesId = card.dataset.seriesId;
      const select = card.querySelector(".confidence");
      if (!select) return;

      const currentValue = Number(select.value);
      const usedByOthers = new Set();

      selectedMap.forEach((val, id) => {
        if (id !== seriesId) usedByOthers.add(val);
      });

      const optionsHTML = [
        `<option value="">Select</option>`,
        ...allowedConfidenceValues
          .filter((num) => !usedByOthers.has(num) || num === currentValue)
          .map((num) => `
            <option value="${num}" ${currentValue === num ? "selected" : ""}>${num}</option>
          `)
      ].join("");

      select.innerHTML = optionsHTML;
    });
  }

  function attachConfidenceHandlers() {
    document.querySelectorAll('.series-card[data-status="OPEN"] .confidence').forEach((select) => {
      select.addEventListener("change", () => {
        refreshConfidenceOptions();
      });
    });
  }

  async function detectCurrentOpenRound() {
    const rounds = [1, 2, 3, 4];
    let latestRoundWithOpenSeries = null;

    for (const round of rounds) {
      try {
        const res = await fetch(
          `/api/playoff/series/open?season=${encodeURIComponent(activeSeason)}&round=${encodeURIComponent(round)}`
        );

        if (!res.ok) continue;

        const data = await res.json();

        const openSeries =
          (Array.isArray(data.series) && data.series) ||
          (Array.isArray(data.allSeries) && data.allSeries) ||
          (Array.isArray(data.data) && data.data) ||
          [];

        if (openSeries.length > 0) {
          latestRoundWithOpenSeries = String(round);
        }

        const roundLocked = !!(data.roundLocked ?? data.locked ?? false);
        const hasOpenSeries = openSeries.some(
          (s) => (s.computedStatus || "OPEN") === "OPEN"
        );

        if (!roundLocked && hasOpenSeries) {
          return String(round);
        }
      } catch (err) {
        console.error(`detectCurrentOpenRound error for round ${round}:`, err);
      }
    }

    return latestRoundWithOpenSeries || roundSelect.value || "1";
  }

  function renderTiebreaker(existingPicksDoc, roundLocked) {
    const currentRound = Number(roundSelect.value);
    const isFinalRound = currentRound === 4;

    if (!tiebreakerSection) return;

    if (!isFinalRound) {
      tiebreakerSection.classList.add("hidden");
      if (tiebreakerPredictionInput) tiebreakerPredictionInput.value = "";
      if (tiebreakerSubtext) tiebreakerSubtext.textContent = "";
      return;
    }

    tiebreakerSection.classList.remove("hidden");

    const savedPrediction = existingPicksDoc?.tiebreakerPrediction;
    const submittedAt = existingPicksDoc?.tiebreakerSubmittedAt;

    if (tiebreakerPredictionInput) {
      const parsedPrediction =
        savedPrediction === null || savedPrediction === undefined
          ? null
          : Number(savedPrediction);

      tiebreakerPredictionInput.value =
        Number.isFinite(parsedPrediction) ? String(parsedPrediction) : "";

      tiebreakerPredictionInput.disabled = !!roundLocked;
    }

    if (tiebreakerSubtext) {
      if (submittedAt) {
        tiebreakerSubtext.textContent =
          `Saved tiebreaker submitted on ${new Date(submittedAt).toLocaleString()}.`;
      } else if (roundLocked) {
        tiebreakerSubtext.textContent =
          "The NBA Finals round is locked, so the tiebreaker can no longer be edited.";
      } else {
        tiebreakerSubtext.textContent =
          "Enter this with your NBA Finals pick.";
      }
    }
  }

  async function loadRound() {
    showMessage("", "");

    const round = roundSelect.value;

    try {
      const [seriesRes, picksRes] = await Promise.all([
        fetch(`/api/playoff/series/open?season=${encodeURIComponent(activeSeason)}&round=${encodeURIComponent(round)}`),
        fetch(`/api/playoff/mypicks?season=${encodeURIComponent(activeSeason)}&round=${encodeURIComponent(round)}`)
      ]);

      const seriesData = await seriesRes.json();
      const picksData = await picksRes.json();

      console.log("seriesData:", seriesData);
      console.log("picksData:", picksData);

      if (!seriesRes.ok) {
        showMessage(seriesData.error || "Failed to load series", "error");
        seriesContainer.innerHTML = `<div class="${THEME.emptyState || "rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-slate-600"}">Unable to load series for this round.</div>`;
        if (tiebreakerSection) tiebreakerSection.classList.add("hidden");
        setSubmitEnabled(false);
        return;
      }

      if (!picksRes.ok) {
        showMessage(picksData.error || "Failed to load your saved picks", "error");
        seriesContainer.innerHTML = `<div class="${THEME.emptyState || "rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-slate-600"}">Unable to load your saved picks.</div>`;
        if (tiebreakerSection) tiebreakerSection.classList.add("hidden");
        setSubmitEnabled(false);
        return;
      }

      const picksDoc =
        picksData.picks ||
        picksData.pickDoc ||
        picksData.savedPicks ||
        null;

      const allSeries =
        (Array.isArray(picksData.series) && picksData.series) ||
        (Array.isArray(seriesData.series) && seriesData.series) ||
        (Array.isArray(seriesData.allSeries) && seriesData.allSeries) ||
        (Array.isArray(seriesData.data) && seriesData.data) ||
        [];

      currentRoundLocked = !!(
        picksData.roundLocked ??
        picksData.locked ??
        seriesData.roundLocked ??
        false
      );

      const lockReason =
        picksData.lockReason ||
        seriesData.lockReason ||
        "";

      setRoundBanner(allSeries, currentRoundLocked, lockReason);
      renderSeries(allSeries, picksDoc);
      renderTiebreaker(picksDoc, currentRoundLocked);

      const openSeriesCount = allSeries.filter((s) => (s.computedStatus || "OPEN") === "OPEN").length;
      setSubmitEnabled(openSeriesCount > 0 && !currentRoundLocked);

      if (picksDoc) {
        if (currentRoundLocked) {
          showMessage(
            lockReason || "This round is locked and can no longer be edited.",
            "info"
          );
        } else {
          showMessage("Your picks have been saved.", "success");
        }
      } else if (currentRoundLocked) {
        showMessage(
          lockReason || "This round is locked and can no longer be edited.",
          "error"
        );
      } else if (!allSeries.length) {
        showMessage("No series found for this round.", "info");
      } else {
        showMessage("", "");
      }
    } catch (err) {
      console.error("loadRound error:", err);
      showMessage("Server error loading round", "error");
      seriesContainer.innerHTML = `<div class="${THEME.emptyState || "rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-slate-600"}">Server error loading round.</div>`;
      if (tiebreakerSection) tiebreakerSection.classList.add("hidden");
      setSubmitEnabled(false);
    }
  }

  function collectPicks() {
    const openCards = document.querySelectorAll('.series-card[data-status="OPEN"]');
    const openPicks = [];
    const allowedConfidenceValues = getAllowedConfidenceValues(Number(roundSelect.value));

    for (const card of openCards) {
      const seriesId = card.dataset.seriesId;
      const pickTeam = card.querySelector(".pick-team-input")?.value || "";
      const predictedGames = Number(card.querySelector(".predicted-games")?.value);
      const confidence = Number(card.querySelector(".confidence")?.value);

      if (!pickTeam) {
        throw new Error(`Please choose a winner for ${seriesId}`);
      }

      if (![4, 5, 6, 7].includes(predictedGames)) {
        throw new Error(`Please choose predicted games for ${seriesId}`);
      }

      if (!Number.isFinite(confidence) || !allowedConfidenceValues.includes(confidence)) {
        throw new Error(`Please choose a valid confidence for ${seriesId}`);
      }

      openPicks.push({
        seriesId,
        pickTeam,
        predictedGames,
        confidence
      });
    }

    const confidenceValues = openPicks.map((p) => p.confidence);

    if (new Set(confidenceValues).size !== confidenceValues.length) {
      throw new Error("Each confidence value must be used only once among open series.");
    }

    return openPicks;
  }

  function collectTiebreakerPrediction() {
    const currentRound = Number(roundSelect.value);

    if (currentRound !== 4) {
      return null;
    }

    const value = Number(tiebreakerPredictionInput?.value);

    if (!Number.isFinite(value)) {
      throw new Error("Please enter your tiebreaker prediction for the NBA Finals.");
    }

    if (value < 50 || value > 400) {
      throw new Error("Tiebreaker prediction must be between 50 and 400.");
    }

    return value;
  }

  async function submitPicks() {
    showMessage("", "");

    if (currentRoundLocked) {
      showMessage("This round is locked and can no longer be edited.", "error");
      return;
    }

    const round = roundSelect.value;

    try {
      const picks = collectPicks();
      const tiebreakerPrediction = collectTiebreakerPrediction();

      const res = await fetch("/api/playoff/mypicks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          season: activeSeason,
          round: Number(round),
          picks,
          tiebreakerPrediction
        })
      });

      const data = await res.json();

      if (!res.ok) {
        showMessage(data.error || "Failed to submit picks", "error");
        return;
      }

      showMessage("Picks submitted successfully.", "success");
      await loadRound();
    } catch (err) {
      console.error("submitPicks error:", err);
      showMessage(err.message || "Server error submitting picks", "error");
    }
  }

  let roundLoadToken = 0;

  async function handleRoundChange() {
    roundLoadToken += 1;
    const token = roundLoadToken;

    await loadRound();

    if (token !== roundLoadToken) return;
  }

  roundSelect.addEventListener("change", handleRoundChange);
  submitBtn.addEventListener("click", submitPicks);

  if (enableNotificationsBtn) {
    enableNotificationsBtn.addEventListener("click", enableNotifications);
  }

  if (disableNotificationsBtn) {
    disableNotificationsBtn.addEventListener("click", disableNotifications);
  }

  await loadNotificationStatus();

  const detectedRound = await detectCurrentOpenRound();
  roundSelect.value = detectedRound;

  await loadRound();
})();