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
    console.error("results auth check error:", err);
    window.location.href = "/home.html";
    return;
  }

  const summary = document.getElementById("summary");
  const tableBody = document.getElementById("resultsTableBody");
  const mobileCards = document.getElementById("resultsCardsMobile");
  const seasonSelect = document.getElementById("season");
  const roundSelect = document.getElementById("round");

  const tabMyResults = document.getElementById("tabMyResults");
  const tabAllResults = document.getElementById("tabAllResults");
  const myResultsView = document.getElementById("myResultsView");
  const allResultsView = document.getElementById("allResultsView");
  const allResultsContainer = document.getElementById("allResultsContainer");
  const tiebreakerSummaryContainer = document.getElementById("tiebreakerSummaryContainer");

  const allResultsModeBar = document.getElementById("allResultsModeBar");
  const allResultsModeMatchup = document.getElementById("allResultsModeMatchup");
  const allResultsModePlayer = document.getElementById("allResultsModePlayer");

  const USER_COLOR_THEMES = [
    {
      card: "border-l-4 border-l-sky-500 bg-sky-50/50",
      header: "bg-sky-50 border-sky-200",
      chip: "bg-sky-100 text-sky-800 border border-sky-200"
    },
    {
      card: "border-l-4 border-l-orange-500 bg-orange-50/50",
      header: "bg-orange-50 border-orange-200",
      chip: "bg-orange-100 text-orange-800 border border-orange-200"
    },
    {
      card: "border-l-4 border-l-indigo-500 bg-indigo-50/50",
      header: "bg-indigo-50 border-indigo-200",
      chip: "bg-indigo-100 text-indigo-800 border border-indigo-200"
    },
    {
      card: "border-l-4 border-l-lime-500 bg-lime-50/50",
      header: "bg-lime-50 border-lime-200",
      chip: "bg-lime-100 text-lime-800 border border-lime-200"
    },
    {
      card: "border-l-4 border-l-rose-500 bg-rose-50/50",
      header: "bg-rose-50 border-rose-200",
      chip: "bg-rose-100 text-rose-800 border border-rose-200"
    },
    {
      card: "border-l-4 border-l-teal-500 bg-teal-50/50",
      header: "bg-teal-50 border-teal-200",
      chip: "bg-teal-100 text-teal-800 border border-teal-200"
    },
    {
      card: "border-l-4 border-l-violet-500 bg-violet-50/50",
      header: "bg-violet-50 border-violet-200",
      chip: "bg-violet-100 text-violet-800 border border-violet-200"
    },
    {
      card: "border-l-4 border-l-amber-500 bg-amber-50/50",
      header: "bg-amber-50 border-amber-200",
      chip: "bg-amber-100 text-amber-800 border border-amber-200"
    },
    {
      card: "border-l-4 border-l-cyan-500 bg-cyan-50/50",
      header: "bg-cyan-50 border-cyan-200",
      chip: "bg-cyan-100 text-cyan-800 border border-cyan-200"
    },
    {
      card: "border-l-4 border-l-red-500 bg-red-50/50",
      header: "bg-red-50 border-red-200",
      chip: "bg-red-100 text-red-800 border border-red-200"
    },
    {
      card: "border-l-4 border-l-emerald-500 bg-emerald-50/50",
      header: "bg-emerald-50 border-emerald-200",
      chip: "bg-emerald-100 text-emerald-800 border border-emerald-200"
    },
    {
      card: "border-l-4 border-l-fuchsia-500 bg-fuchsia-50/50",
      header: "bg-fuchsia-50 border-fuchsia-200",
      chip: "bg-fuchsia-100 text-fuchsia-800 border border-fuchsia-200"
    },
    {
      card: "border-l-4 border-l-blue-500 bg-blue-50/50",
      header: "bg-blue-50 border-blue-200",
      chip: "bg-blue-100 text-blue-800 border border-blue-200"
    },
    {
      card: "border-l-4 border-l-green-500 bg-green-50/50",
      header: "bg-green-50 border-green-200",
      chip: "bg-green-100 text-green-800 border border-green-200"
    },
    {
      card: "border-l-4 border-l-purple-500 bg-purple-50/50",
      header: "bg-purple-50 border-purple-200",
      chip: "bg-purple-100 text-purple-800 border border-purple-200"
    },
    {
      card: "border-l-4 border-l-red-600 bg-red-50/40",
      header: "bg-red-50 border-red-200",
      chip: "bg-red-100 text-red-900 border border-red-200"
    },
    {
      card: "border-l-4 border-l-sky-700 bg-sky-50/40",
      header: "bg-sky-50 border-sky-200",
      chip: "bg-sky-100 text-sky-900 border border-sky-200"
    },
    {
      card: "border-l-4 border-l-pink-500 bg-pink-50/50",
      header: "bg-pink-50 border-pink-200",
      chip: "bg-pink-100 text-pink-800 border border-pink-200"
    },
    {
      card: "border-l-4 border-l-indigo-700 bg-indigo-50/40",
      header: "bg-indigo-50 border-indigo-200",
      chip: "bg-indigo-100 text-indigo-900 border border-indigo-200"
    },
    {
      card: "border-l-4 border-l-slate-500 bg-slate-50/50",
      header: "bg-slate-50 border-slate-200",
      chip: "bg-slate-100 text-slate-800 border border-slate-200"
    }
  ];

  let currentView = "my";
  let currentRoundLocked = false;
  let currentAllResultsData = null;
  let currentAllResultsMode = "matchup";
  let currentUserThemeMap = new Map();

  function setSummary(text, type = "") {
    summary.textContent = text || "";

    const base = "message mt-5 rounded-xl px-4 py-3 font-semibold";
    const tone =
      type === "error"
        ? "bg-red-50 border border-red-200 text-red-700"
        : type === "success"
          ? "bg-green-50 border border-green-200 text-green-700"
          : type === "info"
            ? "bg-blue-50 border border-blue-200 text-blue-700"
            : "";

    summary.className = text ? `${base} ${tone}` : "message mt-5";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function buildUserThemeMap(entries) {
    const usernames = [...new Set(
      (Array.isArray(entries) ? entries : [])
        .map((entry) => String(entry?.username || "").trim())
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));

    currentUserThemeMap = new Map();

    usernames.forEach((username, index) => {
      currentUserThemeMap.set(
        username.toLowerCase(),
        USER_COLOR_THEMES[index % USER_COLOR_THEMES.length]
      );
    });
  }

  function getUserColorTheme(username) {
    const key = String(username || "").trim().toLowerCase();
    return currentUserThemeMap.get(key) || USER_COLOR_THEMES[0];
  }

  function clearTiebreakerSummary() {
    if (!tiebreakerSummaryContainer) return;
    tiebreakerSummaryContainer.classList.add("hidden");
    tiebreakerSummaryContainer.innerHTML = "";
  }

  function renderTiebreakerSummary(tiebreakerSummary, round, roundLocked) {
    if (!tiebreakerSummaryContainer) return;

    const isFinalRound = Number(round) === 4;

    if (!isFinalRound || !roundLocked || !tiebreakerSummary) {
      clearTiebreakerSummary();
      return;
    }

    const actual = Number.isFinite(Number(tiebreakerSummary.actualTiebreakerPoints))
      ? Number(tiebreakerSummary.actualTiebreakerPoints)
      : null;

    tiebreakerSummaryContainer.classList.remove("hidden");
    tiebreakerSummaryContainer.innerHTML = `
      <section class="rounded-2xl border border-amber-200 bg-white shadow-sm overflow-hidden">
        <div class="px-4 sm:px-6 py-4 bg-gradient-to-r from-slate-900 to-amber-500 text-white">
          <h3 class="text-xl sm:text-2xl font-bold">NBA Finals Tiebreaker</h3>
          <p class="mt-1 text-sm text-white/90">
            If players are tied in total points, the Finals tiebreaker is used next to rank the leaderboard.
          </p>
        </div>

        <div class="p-4 sm:p-6">
          <div class="inline-flex items-center rounded-full bg-amber-100 text-amber-900 px-4 py-2 text-sm font-semibold">
            Actual clinching game total points:
            <span class="ml-2 text-base font-extrabold">${actual ?? "Not set yet"}</span>
          </div>
        </div>
      </section>
    `;
  }

  function renderEmptyState(text) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="px-4 py-6 text-center text-slate-500 bg-white">
          ${text}
        </td>
      </tr>
    `;

    mobileCards.innerHTML = `
      <div class="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-slate-500">
        ${text}
      </div>
    `;
  }

  function renderAllResultsPlaceholder(text) {
    allResultsContainer.innerHTML = `
      <div class="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-slate-500">
        ${text}
      </div>
    `;
  }

  function bonusCell(value) {
    if (value === null || value === undefined || value === "") {
      return `<span class="text-slate-400">-</span>`;
    }

    const num = Number(value);
    if (!Number.isFinite(num)) return value;

    if (num > 0) {
      return `<span class="inline-flex min-w-[2.25rem] items-center justify-center rounded-full bg-amber-100 px-2 py-1 font-bold text-amber-800">+${num}</span>`;
    }

    return `<span class="inline-flex min-w-[2.25rem] items-center justify-center rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">${num}</span>`;
  }

  function pointsCell(value) {
    if (value === null || value === undefined || value === "") {
      return `<span class="text-slate-400">-</span>`;
    }

    const num = Number(value);
    if (!Number.isFinite(num)) return value;

    return `<span class="inline-flex min-w-[2.5rem] items-center justify-center rounded-full bg-slate-900 px-2 py-1 font-bold text-white">${num}</span>`;
  }

  function statValueCell(value) {
    if (value === null || value === undefined || value === "") {
      return `<span class="text-slate-400">-</span>`;
    }

    return `<span class="font-semibold text-slate-900">${value}</span>`;
  }

  function findTeam(abbr) {
    const teams = Array.isArray(window.NBA_TEAMS) ? window.NBA_TEAMS : [];
    const key = String(abbr || "").trim().toUpperCase();
    return teams.find((t) => String(t.abbr || "").trim().toUpperCase() === key) || null;
  }

  function teamLogoHTML(abbr, size = "w-8 h-8") {
    const team = findTeam(abbr);

    if (!team?.logo) {
      return `
        <div class="${size} rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
          ${abbr || "-"}
        </div>
      `;
    }

    return `<img src="${team.logo}" alt="${abbr}" class="${size} object-contain shrink-0">`;
  }

  function pickBadgeClass(isPicked, isWinner, winnerExists, showActualResult = false) {
    if (showActualResult && winnerExists) {
      if (isWinner) {
        return "border-2 border-green-700 bg-green-300 text-green-950 font-extrabold shadow";
      }

      return "border-2 border-red-700 bg-red-300 text-red-950 font-extrabold shadow";
    }

    if (!isPicked) {
      return "border border-slate-300 bg-slate-50 text-slate-800";
    }

    if (!winnerExists) {
      return "border-2 border-amber-400 bg-amber-100 text-amber-900 font-bold shadow-sm";
    }

    if (isWinner) {
      return "border-2 border-green-700 bg-green-300 text-green-950 font-extrabold shadow";
    }

    return "border-2 border-red-700 bg-red-300 text-red-950 font-extrabold shadow";
  }

  function matchupCell(series, pick) {
    const higher = String(series.higherSeedTeam || "").trim().toUpperCase();
    const lower = String(series.lowerSeedTeam || "").trim().toUpperCase();
    const winner = String(series.winnerTeam || "").trim().toUpperCase();
    const picked = String(pick?.pickTeam || "").trim().toUpperCase();
    const winnerExists = !!winner;
    const showActualResult = !pick && winnerExists;

    const higherPicked = picked && picked === higher;
    const lowerPicked = picked && picked === lower;

    const higherWon = winnerExists && higher === winner;
    const lowerWon = winnerExists && lower === winner;

    return `
      <div class="min-w-[220px] lg:min-w-[260px]">
        <div class="flex items-center gap-2 lg:gap-3">
          <div class="flex items-center gap-2 rounded-xl px-2.5 lg:px-3 py-2 ${pickBadgeClass(higherPicked, higherWon, winnerExists, showActualResult)}">
            ${teamLogoHTML(higher, "w-7 h-7 lg:w-8 lg:h-8")}
            <span class="font-bold text-xs lg:text-sm">${higher || "-"}</span>
          </div>

          <span class="text-slate-400 font-semibold text-[10px] lg:text-xs shrink-0">vs</span>

          <div class="flex items-center gap-2 rounded-xl px-2.5 lg:px-3 py-2 ${pickBadgeClass(lowerPicked, lowerWon, winnerExists, showActualResult)}">
            ${teamLogoHTML(lower, "w-7 h-7 lg:w-8 lg:h-8")}
            <span class="font-bold text-xs lg:text-sm">${lower || "-"}</span>
          </div>
        </div>

      </div>
    `;
  }

  function mobileCardHTML(series, pick) {
    return `
      <div class="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
        <div class="text-slate-900">
          ${matchupCell(series, pick)}
        </div>

        <div class="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div class="rounded-xl bg-slate-50 px-3 py-2 border border-slate-200">
            <div class="text-slate-500 font-semibold uppercase tracking-wide">Pred</div>
            <div class="mt-1 text-sm font-bold text-slate-900">${pick?.predictedGames ?? "-"}</div>
          </div>

          <div class="rounded-xl bg-slate-50 px-3 py-2 border border-slate-200">
            <div class="text-slate-500 font-semibold uppercase tracking-wide">Act</div>
            <div class="mt-1 text-sm font-bold text-slate-900">${series.gamesPlayed ?? "-"}</div>
          </div>

          <div class="rounded-xl bg-slate-50 px-3 py-2 border border-slate-200">
            <div class="text-slate-500 font-semibold uppercase tracking-wide">Conf</div>
            <div class="mt-1 text-sm font-bold text-slate-900">${pick?.confidence ?? "-"}</div>
          </div>

          <div class="rounded-xl bg-slate-50 px-3 py-2 border border-slate-200">
            <div class="text-slate-500 font-semibold uppercase tracking-wide">Bonus</div>
            <div class="mt-1 text-sm">${bonusCell(pick?.bonusPoints)}</div>
          </div>
        </div>

        <div class="mt-3 flex items-center justify-between rounded-xl bg-slate-900 px-3 py-2 text-white">
          <span class="text-xs font-semibold uppercase tracking-wide text-slate-300">Points</span>
          <span class="text-base font-black">${pick?.pointsEarned ?? "-"}</span>
        </div>
      </div>
    `;
  }

  function sortSeriesByConfidence(seriesList, picksMap) {
    return [...seriesList].sort((a, b) => {
      const aPick = picksMap.get(a.seriesId);
      const bPick = picksMap.get(b.seriesId);

      const aConf = Number(aPick?.confidence);
      const bConf = Number(bPick?.confidence);

      const aVal = Number.isFinite(aConf) ? aConf : -1;
      const bVal = Number.isFinite(bConf) ? bConf : -1;

      return bVal - aVal;
    });
  }

  function setAllResultsAvailability(roundLocked) {
    if (roundLocked) {
      tabAllResults.disabled = false;
      tabAllResults.classList.remove("text-slate-400", "cursor-not-allowed");
      tabAllResults.classList.add("text-slate-600");
    } else {
      tabAllResults.disabled = true;
      tabAllResults.className =
        "rounded-t-xl px-4 py-2 text-sm font-semibold border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed";
    }
  }

  function setActiveTab(view) {
    currentView = view;

    const activeClass =
      "rounded-t-xl px-4 py-2 text-sm font-semibold border border-slate-200 border-b-white bg-white text-slate-900 shadow-sm";
    const inactiveClass =
      "rounded-t-xl px-4 py-2 text-sm font-semibold border border-slate-200 bg-slate-100 text-slate-600";

    tabMyResults.className = view === "my" ? activeClass : inactiveClass;

    if (tabAllResults.disabled) {
      tabAllResults.className =
        "rounded-t-xl px-4 py-2 text-sm font-semibold border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed";
    } else {
      tabAllResults.className = view === "all" ? activeClass : inactiveClass;
    }

    myResultsView.classList.toggle("hidden", view !== "my");
    allResultsView.classList.toggle("hidden", view !== "all");
  }

  function setAllResultsMode(mode) {
    currentAllResultsMode = mode;

    if (!allResultsModeBar || !allResultsModeMatchup || !allResultsModePlayer) return;

    allResultsModeMatchup.className =
      mode === "matchup"
        ? "rounded-xl px-4 py-2 text-sm font-semibold bg-slate-900 text-white shadow-sm"
        : "rounded-xl px-4 py-2 text-sm font-semibold bg-white text-slate-700 border border-slate-200";

    allResultsModePlayer.className =
      mode === "player"
        ? "rounded-xl px-4 py-2 text-sm font-semibold bg-slate-900 text-white shadow-sm"
        : "rounded-xl px-4 py-2 text-sm font-semibold bg-white text-slate-700 border border-slate-200";
  }

  function renderMyResults(seriesList, picksDoc) {
    const picksMap = new Map();

    if (picksDoc && Array.isArray(picksDoc.picks)) {
      for (const pick of picksDoc.picks) {
        picksMap.set(pick.seriesId, pick);
      }
    }

    const sortedSeriesList = sortSeriesByConfidence(seriesList, picksMap);

    tableBody.innerHTML = sortedSeriesList
      .map((series) => {
        const pick = picksMap.get(series.seriesId);

        return `
          <tr class="bg-white hover:bg-amber-50/40 transition">
            <td class="px-3 lg:px-4 py-2.5 lg:py-3 text-slate-900">
              ${matchupCell(series, pick)}
            </td>
            <td class="px-3 py-2.5 lg:py-3 text-center">${statValueCell(pick?.predictedGames ?? "-")}</td>
            <td class="px-3 py-2.5 lg:py-3 text-center">${statValueCell(series.gamesPlayed ?? "-")}</td>
            <td class="px-3 py-2.5 lg:py-3 text-center">${statValueCell(pick?.confidence ?? "-")}</td>
            <td class="px-3 py-2.5 lg:py-3 text-center">${bonusCell(pick?.bonusPoints)}</td>
            <td class="px-3 py-2.5 lg:py-3 text-center">${pointsCell(pick?.pointsEarned)}</td>
          </tr>
        `;
      })
      .join("");

    mobileCards.innerHTML = sortedSeriesList
      .map((series) => {
        const pick = picksMap.get(series.seriesId);
        return mobileCardHTML(series, pick);
      })
      .join("");
  }

  function getEntryTiebreakerMeta(entry, currentRound, currentAllResults) {
    const isFinalRound = Number(currentRound) === 4;
    if (!isFinalRound) {
      return {
        show: false,
        prediction: null,
        diff: null
      };
    }

    const prediction = Number.isFinite(Number(entry?.tiebreakerPrediction))
      ? Number(entry.tiebreakerPrediction)
      : null;

    const actual = Number.isFinite(Number(currentAllResults?.tiebreakerSummary?.actualTiebreakerPoints))
      ? Number(currentAllResults.tiebreakerSummary.actualTiebreakerPoints)
      : null;

    const diff =
      Number.isFinite(prediction) && Number.isFinite(actual)
        ? Math.abs(prediction - actual)
        : null;

    return {
      show: true,
      prediction,
      diff
    };
  }

  function getSortedEntries(entries) {
    return [...entries].sort((a, b) => {
      const aPts = Number(a?.totalPoints) || 0;
      const bPts = Number(b?.totalPoints) || 0;
      return bPts - aPts || String(a?.username || "").localeCompare(String(b?.username || ""));
    });
  }

  function renderAllResultsByPlayer(entries, seriesList) {
    const currentRound = roundSelect.value;
    const sortedEntries = getSortedEntries(entries);

    return sortedEntries
      .map((entry, idx) => {
        const picksMap = new Map(
          (Array.isArray(entry.picks) ? entry.picks : []).map((pick) => [pick.seriesId, pick])
        );

        const sortedSeriesList = sortSeriesByConfidence(seriesList, picksMap);
        const tiebreakerMeta = getEntryTiebreakerMeta(entry, currentRound, currentAllResultsData);
        const userTheme = getUserColorTheme(entry.username);

        const tiebreakerHeaderLine = tiebreakerMeta.show
          ? `
            <div class="mt-1 text-xs sm:text-sm text-slate-600">
              <span class="font-semibold text-slate-700">Tiebreaker:</span>
              ${Number.isFinite(tiebreakerMeta.prediction) ? tiebreakerMeta.prediction : "—"}
              ${
                Number.isFinite(tiebreakerMeta.diff)
                  ? `<span class="ml-2 text-slate-500">(Diff: ${tiebreakerMeta.diff})</span>`
                  : ""
              }
            </div>
          `
          : "";

        return `
          <section class="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden ${userTheme.card}">
            <div class="flex items-start justify-between px-4 py-3 border-b gap-3 ${userTheme.header}">
              <div class="flex items-start gap-3 min-w-0">
                <div class="flex flex-col items-center gap-2 shrink-0">
                  <span class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white text-sm font-bold">
                    ${idx + 1}
                  </span>
                </div>

                <div class="min-w-0">
                  <div class="inline-flex items-center rounded-full px-3 py-1 text-sm font-bold ${userTheme.chip}">
                    ${escapeHtml(entry.username || "-")}
                  </div>
                  ${tiebreakerHeaderLine}
                </div>
              </div>

              <span class="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-sm font-bold text-white shrink-0">
                ${Number(entry.totalPoints) || 0} pts
              </span>
            </div>

            <div class="p-4 space-y-3 md:hidden">
              ${sortedSeriesList
                .map((series) => {
                  const pick = picksMap.get(series.seriesId);
                  return mobileCardHTML(series, pick);
                })
                .join("")}
            </div>

            <div class="hidden md:block overflow-x-auto">
              <table class="min-w-full text-xs lg:text-sm">
                <thead class="bg-slate-100 text-slate-700">
                  <tr>
                    <th class="px-3 lg:px-4 py-3 text-left font-semibold border-b border-slate-200">Matchup</th>
                    <th class="px-3 py-3 text-center font-semibold border-b border-slate-200 whitespace-nowrap">Pred</th>
                    <th class="px-3 py-3 text-center font-semibold border-b border-slate-200 whitespace-nowrap">Act</th>
                    <th class="px-3 py-3 text-center font-semibold border-b border-slate-200 whitespace-nowrap">Conf</th>
                    <th class="px-3 py-3 text-center font-semibold border-b border-slate-200 whitespace-nowrap">Bonus</th>
                    <th class="px-3 py-3 text-center font-semibold border-b border-slate-200 whitespace-nowrap">Pts</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-200 bg-white">
                  ${sortedSeriesList
                    .map((series) => {
                      const pick = picksMap.get(series.seriesId);

                      return `
                        <tr class="bg-white hover:bg-amber-50/40 transition">
                          <td class="px-3 lg:px-4 py-2.5 lg:py-3 text-slate-900">
                            ${matchupCell(series, pick)}
                          </td>
                          <td class="px-3 py-2.5 lg:py-3 text-center">${statValueCell(pick?.predictedGames ?? "-")}</td>
                          <td class="px-3 py-2.5 lg:py-3 text-center">${statValueCell(series.gamesPlayed ?? "-")}</td>
                          <td class="px-3 py-2.5 lg:py-3 text-center">${statValueCell(pick?.confidence ?? "-")}</td>
                          <td class="px-3 py-2.5 lg:py-3 text-center">${bonusCell(pick?.bonusPoints)}</td>
                          <td class="px-3 py-2.5 lg:py-3 text-center">${pointsCell(pick?.pointsEarned)}</td>
                        </tr>
                      `;
                    })
                    .join("")}
                </tbody>
              </table>
            </div>
          </section>
        `;
      })
      .join("");
  }

  function renderMatchupPlayerRow(entry, pick, series) {
    const username = escapeHtml(entry?.username || "-");
    const predictedGames = pick?.predictedGames ?? "-";
    const confidence = pick?.confidence ?? "-";
    const points = Number.isFinite(Number(pick?.pointsEarned)) ? Number(pick.pointsEarned) : "-";
    const bonus = pick?.bonusPoints ?? "-";
    const pickTeam = String(pick?.pickTeam || "").trim().toUpperCase();
    const winner = String(series?.winnerTeam || "").trim().toUpperCase();
    const winnerExists = !!winner;
    const isCorrect = winnerExists && pickTeam && pickTeam === winner;
    const userTheme = getUserColorTheme(entry?.username);

    const resultTone = !winnerExists
      ? "bg-amber-50 text-amber-800 border border-amber-200"
      : isCorrect
        ? "bg-green-50 text-green-800 border border-green-200"
        : "bg-red-50 text-red-800 border border-red-200";

    const resultLabel = !winnerExists ? "Pending" : isCorrect ? "Correct" : "Wrong";

    return `
      <div class="rounded-2xl border border-slate-200 p-4 shadow-sm ${userTheme.card}">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2 min-w-0">
              <div class="inline-flex max-w-full items-center rounded-full px-3 py-1 text-sm font-bold truncate ${userTheme.chip}">
                ${username}
              </div>
            </div>

            <div class="mt-2 flex flex-wrap items-center gap-2">
              <span class="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-sm font-bold text-white">
                ${teamLogoHTML(pickTeam, "w-5 h-5")}
                ${pickTeam || "-"}
              </span>
              <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${resultTone}">
                ${resultLabel}
              </span>
            </div>
          </div>

          <span class="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-800 shrink-0">
            ${Number(entry?.totalPoints) || 0} pts
          </span>
        </div>

        <div class="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div class="rounded-xl bg-slate-50 px-3 py-2 border border-slate-200">
            <div class="text-slate-500 font-semibold uppercase tracking-wide">Pred</div>
            <div class="mt-1 text-sm font-bold text-slate-900">${predictedGames}</div>
          </div>

          <div class="rounded-xl bg-slate-50 px-3 py-2 border border-slate-200">
            <div class="text-slate-500 font-semibold uppercase tracking-wide">Conf</div>
            <div class="mt-1 text-sm font-bold text-slate-900">${confidence}</div>
          </div>

          <div class="rounded-xl bg-slate-50 px-3 py-2 border border-slate-200">
            <div class="text-slate-500 font-semibold uppercase tracking-wide">Bonus</div>
            <div class="mt-1 text-sm">${bonusCell(bonus)}</div>
          </div>

          <div class="rounded-xl bg-slate-50 px-3 py-2 border border-slate-200">
            <div class="text-slate-500 font-semibold uppercase tracking-wide">Pts</div>
            <div class="mt-1 text-sm">${pointsCell(points)}</div>
          </div>
        </div>
      </div>
    `;
  }

  function renderAllResultsByMatchup(entries, seriesList) {
    const sortedEntries = getSortedEntries(entries);

    const helperText = `
      <div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
        Tap a matchup below to expand and view everyone’s picks.
      </div>
    `;

    return helperText + seriesList
      .map((series, idx) => {
        const higher = String(series.higherSeedTeam || "").trim().toUpperCase();
        const lower = String(series.lowerSeedTeam || "").trim().toUpperCase();

        const playerRows = sortedEntries.map((entry) => {
          const picksMap = new Map(
            (Array.isArray(entry.picks) ? entry.picks : []).map((pick) => [pick.seriesId, pick])
          );
          const pick = picksMap.get(series.seriesId) || null;
          return { entry, pick };
        });

        const higherCount = playerRows.filter((row) => String(row.pick?.pickTeam || "").trim().toUpperCase() === higher).length;
        const lowerCount = playerRows.filter((row) => String(row.pick?.pickTeam || "").trim().toUpperCase() === lower).length;

        const sortedPlayerRows = [...playerRows].sort((a, b) => {
          const aConf = Number(a.pick?.confidence);
          const bConf = Number(b.pick?.confidence);
          const aVal = Number.isFinite(aConf) ? aConf : -1;
          const bVal = Number.isFinite(bConf) ? bConf : -1;

          return bVal - aVal || String(a.entry?.username || "").localeCompare(String(b.entry?.username || ""));
        });

        return `
          <details class="group rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <summary class="list-none cursor-pointer px-4 sm:px-6 py-4 bg-slate-50 border-b border-slate-200">
              <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div class="min-w-0">
                  <div class="text-slate-900">
                    ${matchupCell(series, null)}
                  </div>
                  <div class="mt-2 text-xs sm:text-sm text-slate-500">
                    Actual games:
                    <span class="font-bold text-slate-700">${series.gamesPlayed ?? "-"}</span>
                  </div>
                </div>

                <div class="flex flex-wrap gap-2 shrink-0">
                  <span class="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-sm font-bold text-white">
                    ${teamLogoHTML(higher, "w-5 h-5")}
                    ${higher}: ${higherCount}
                  </span>
                  <span class="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-bold text-slate-800 border border-slate-300">
                    ${teamLogoHTML(lower, "w-5 h-5")}
                    ${lower}: ${lowerCount}
                  </span>
                </div>
              </div>
            </summary>

            <div class="p-4 sm:p-6 space-y-3">
              ${sortedPlayerRows
                .map(({ entry, pick }) => renderMatchupPlayerRow(entry, pick, series))
                .join("")}
            </div>
          </details>
        `;
      })
      .join("");
  }

  function renderAllResults(entries, seriesList) {
    if (!Array.isArray(entries) || !entries.length) {
      renderAllResultsPlaceholder("No results available for this round.");
      return;
    }

    if (currentAllResultsMode === "player") {
      allResultsContainer.innerHTML = renderAllResultsByPlayer(entries, seriesList);
      return;
    }

    allResultsContainer.innerHTML = renderAllResultsByMatchup(entries, seriesList);
  }

  async function detectDefaultRound() {
    const rounds = [1, 2, 3, 4];
    let latestRoundWithSeries = null;
    let latestLockedRoundWithSeries = null;

    for (const round of rounds) {
      try {
        const res = await fetch(
          `/api/public/results?season=${encodeURIComponent(seasonSelect.value)}&round=${encodeURIComponent(round)}`
        );

        if (!res.ok) continue;

        const data = await res.json();
        const seriesList = Array.isArray(data.series) ? data.series : [];
        const roundLocked = !!(data.roundLocked ?? data.locked ?? false);

        if (seriesList.length > 0) {
          latestRoundWithSeries = String(round);
        }

        if (seriesList.length > 0 && roundLocked) {
          latestLockedRoundWithSeries = String(round);
        }

        if (seriesList.length > 0 && !roundLocked) {
          return String(round);
        }
      } catch (err) {
        console.error(`detectDefaultRound error for round ${round}:`, err);
      }
    }

    return latestLockedRoundWithSeries || latestRoundWithSeries || roundSelect.value || "1";
  }

  async function loadAllResults() {
    const season = seasonSelect.value;
    const round = roundSelect.value;

    renderAllResultsPlaceholder("Loading all results...");
    clearTiebreakerSummary();

    try {
      const res = await fetch(
        `/api/public/all-results?season=${encodeURIComponent(season)}&round=${encodeURIComponent(round)}`
      );
      const data = await res.json();

      if (!res.ok) {
        renderAllResultsPlaceholder(data.error || "Unable to load all results.");
        clearTiebreakerSummary();
        return;
      }

      currentAllResultsData = data;
      buildUserThemeMap(Array.isArray(data.entries) ? data.entries : []);

      renderTiebreakerSummary(data.tiebreakerSummary, round, data.roundLocked);
      renderAllResults(
        Array.isArray(data.entries) ? data.entries : [],
        Array.isArray(data.series) ? data.series : []
      );
    } catch (err) {
      console.error("loadAllResults error:", err);
      renderAllResultsPlaceholder("Server error loading all results.");
      clearTiebreakerSummary();
    }
  }

  async function loadResults() {
    setSummary("");
    currentAllResultsData = null;
    clearTiebreakerSummary();

    const season = seasonSelect.value;
    const round = roundSelect.value;

    renderEmptyState("Loading results...");
    renderAllResultsPlaceholder("All Results will appear once this round locks.");

    try {
      const res = await fetch(
        `/api/public/results?season=${encodeURIComponent(season)}&round=${encodeURIComponent(round)}`
      );
      const data = await res.json();

      if (!res.ok) {
        setSummary(data.error || "Failed to load results", "error");
        renderEmptyState("Unable to load results.");
        setAllResultsAvailability(false);
        setActiveTab("my");
        if (allResultsModeBar) allResultsModeBar.classList.add("hidden");
        clearTiebreakerSummary();
        return;
      }

      const seriesList = Array.isArray(data.series) ? data.series : [];
      const picksDoc = data.picks;

      currentRoundLocked = !!(data.roundLocked ?? data.locked ?? false);

      setAllResultsAvailability(currentRoundLocked);

      if (!seriesList.length) {
        renderEmptyState("No series found for this round.");
        setSummary("", "");
        setActiveTab("my");
        if (allResultsModeBar) allResultsModeBar.classList.add("hidden");
        clearTiebreakerSummary();
        return;
      }

      renderMyResults(seriesList, picksDoc);

      if (!picksDoc) {
        setSummary("You have not submitted picks for this round.", "error");
      } else {
        setSummary(`Total Points: ${picksDoc.totalPoints || 0}`, "success");
      }

      if (currentRoundLocked) {
        if (allResultsModeBar) allResultsModeBar.classList.remove("hidden");
        setAllResultsMode("matchup");
        await loadAllResults();
        setActiveTab("all");
      } else {
        if (allResultsModeBar) allResultsModeBar.classList.add("hidden");
        setActiveTab("my");
        clearTiebreakerSummary();
      }
    } catch (err) {
      console.error("loadResults error:", err);
      setSummary("Server error loading results", "error");
      renderEmptyState("Server error loading results.");
      setAllResultsAvailability(false);
      setActiveTab("my");
      if (allResultsModeBar) allResultsModeBar.classList.add("hidden");
      clearTiebreakerSummary();
    }
  }

  let resultsLoadToken = 0;

  async function handleRoundChange() {
    resultsLoadToken += 1;
    const token = resultsLoadToken;

    await loadResults();

    if (token !== resultsLoadToken) return;
  }

  async function handleSeasonChange() {
    resultsLoadToken += 1;
    const token = resultsLoadToken;

    const detectedRound = await detectDefaultRound();
    roundSelect.value = detectedRound;

    await loadResults();

    if (token !== resultsLoadToken) return;
  }

  tabMyResults.addEventListener("click", () => {
    setActiveTab("my");
  });

  tabAllResults.addEventListener("click", async () => {
    if (tabAllResults.disabled) return;

    if (!currentAllResultsData && currentRoundLocked) {
      await loadAllResults();
    }

    setActiveTab("all");
  });

  if (allResultsModeMatchup) {
    allResultsModeMatchup.addEventListener("click", () => {
      setAllResultsMode("matchup");

      if (currentAllResultsData) {
        renderAllResults(
          Array.isArray(currentAllResultsData.entries) ? currentAllResultsData.entries : [],
          Array.isArray(currentAllResultsData.series) ? currentAllResultsData.series : []
        );
      }
    });
  }

  if (allResultsModePlayer) {
    allResultsModePlayer.addEventListener("click", () => {
      setAllResultsMode("player");

      if (currentAllResultsData) {
        renderAllResults(
          Array.isArray(currentAllResultsData.entries) ? currentAllResultsData.entries : [],
          Array.isArray(currentAllResultsData.series) ? currentAllResultsData.series : []
        );
      }
    });
  }

  roundSelect.addEventListener("change", handleRoundChange);
  seasonSelect.addEventListener("change", handleSeasonChange);

  const detectedRound = await detectDefaultRound();
  roundSelect.value = detectedRound;

  await loadResults();
})();