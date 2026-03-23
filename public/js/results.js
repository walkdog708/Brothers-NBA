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

  let currentView = "my";
  let currentRoundLocked = false;
  let currentMyResultsData = null;
  let currentAllResultsData = null;

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

  function pickBadgeClass(isPicked, isWinner, winnerExists) {
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

    const higherPicked = picked && picked === higher;
    const lowerPicked = picked && picked === lower;

    const higherWon = winnerExists && higher === winner;
    const lowerWon = winnerExists && lower === winner;

    return `
      <div class="min-w-[220px] lg:min-w-[260px]">
        <div class="flex items-center gap-2 lg:gap-3">
          <div class="flex items-center gap-2 rounded-xl px-2.5 lg:px-3 py-2 ${pickBadgeClass(higherPicked, higherWon, winnerExists)}">
            ${teamLogoHTML(higher, "w-7 h-7 lg:w-8 lg:h-8")}
            <span class="font-bold text-xs lg:text-sm">${higher || "-"}</span>
          </div>

          <span class="text-slate-400 font-semibold text-[10px] lg:text-xs shrink-0">vs</span>

          <div class="flex items-center gap-2 rounded-xl px-2.5 lg:px-3 py-2 ${pickBadgeClass(lowerPicked, lowerWon, winnerExists)}">
            ${teamLogoHTML(lower, "w-7 h-7 lg:w-8 lg:h-8")}
            <span class="font-bold text-xs lg:text-sm">${lower || "-"}</span>
          </div>
        </div>

        <div class="mt-1.5 text-[11px] lg:text-xs text-slate-500">
          Pick:
          <span class="font-bold text-slate-700">${picked || "-"}</span>
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

  function renderAllResults(entries, seriesList) {
    if (!Array.isArray(entries) || !entries.length) {
      renderAllResultsPlaceholder("No results available for this round.");
      return;
    }

    const sortedEntries = [...entries].sort((a, b) => {
      const aPts = Number(a?.totalPoints) || 0;
      const bPts = Number(b?.totalPoints) || 0;
      return bPts - aPts || String(a?.username || "").localeCompare(String(b?.username || ""));
    });

    allResultsContainer.innerHTML = sortedEntries
      .map((entry, idx) => {
        const picksMap = new Map(
          (Array.isArray(entry.picks) ? entry.picks : []).map((pick) => [pick.seriesId, pick])
        );

        const sortedSeriesList = sortSeriesByConfidence(seriesList, picksMap);

        return `
          <section class="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div class="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
              <div class="flex items-center gap-3 min-w-0">
                <span class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white text-sm font-bold">
                  ${idx + 1}
                </span>
                <span class="text-base font-bold text-slate-900 truncate">${entry.username || "-"}</span>
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

    try {
      const res = await fetch(
        `/api/public/all-results?season=${encodeURIComponent(season)}&round=${encodeURIComponent(round)}`
      );
      const data = await res.json();

      if (!res.ok) {
        renderAllResultsPlaceholder(data.error || "Unable to load all results.");
        return;
      }

      currentAllResultsData = data;
      renderAllResults(
        Array.isArray(data.entries) ? data.entries : [],
        Array.isArray(data.series) ? data.series : []
      );
    } catch (err) {
      console.error("loadAllResults error:", err);
      renderAllResultsPlaceholder("Server error loading all results.");
    }
  }

  async function loadResults() {
    setSummary("");
    currentAllResultsData = null;

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
        return;
      }

      const seriesList = Array.isArray(data.series) ? data.series : [];
      const picksDoc = data.picks;

      currentRoundLocked = !!(data.roundLocked ?? data.locked ?? false);
      currentMyResultsData = { seriesList, picksDoc };

      setAllResultsAvailability(currentRoundLocked);

      if (!seriesList.length) {
        renderEmptyState("No series found for this round.");
        setSummary("", "");
        setActiveTab("my");
        return;
      }

      renderMyResults(seriesList, picksDoc);

      if (!picksDoc) {
        setSummary("You have not submitted picks for this round.", "error");
      } else {
        setSummary(`Total Points: ${picksDoc.totalPoints || 0}`, "success");
      }

      if (currentRoundLocked) {
        await loadAllResults();
        setActiveTab("all");
      } else {
        setActiveTab("my");
      }
    } catch (err) {
      console.error("loadResults error:", err);
      setSummary("Server error loading results", "error");
      renderEmptyState("Server error loading results.");
      setAllResultsAvailability(false);
      setActiveTab("my");
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

  roundSelect.addEventListener("change", handleRoundChange);
  seasonSelect.addEventListener("change", handleSeasonChange);

  const detectedRound = await detectDefaultRound();
  roundSelect.value = detectedRound;

  await loadResults();
})();