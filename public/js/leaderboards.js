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
    console.error("leaderboards auth check error:", err);
    window.location.href = "/home.html";
    return;
  }

  const message = document.getElementById("message");
  const tableBody = document.getElementById("leaderboardTableBody");
  const seasonInput = document.getElementById("season");

  function setMessage(text, type = "") {
    message.textContent = text || "";

    const base = "message mt-5 rounded-xl px-4 py-3 font-semibold";
    const tone =
      type === "error"
        ? "bg-red-50 border border-red-200 text-red-700"
        : type === "success"
        ? "bg-green-50 border border-green-200 text-green-700"
        : type === "info"
        ? "bg-blue-50 border border-blue-200 text-blue-700"
        : "";

    message.className = text ? `${base} ${tone}` : "message mt-5";
  }

  function renderEmptyRow(text) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="px-4 py-6 text-center text-slate-500 bg-white">
          ${text}
        </td>
      </tr>
    `;
  }

  function rankBadge(rank) {
    const n = Number(rank);

    if (n === 1) {
      return `<span class="inline-flex items-center rounded-full bg-amber-300 text-slate-900 px-3 py-1 text-xs font-bold shadow-sm">#1</span>`;
    }
    if (n === 2) {
      return `<span class="inline-flex items-center rounded-full bg-slate-300 text-slate-900 px-3 py-1 text-xs font-bold shadow-sm">#2</span>`;
    }
    if (n === 3) {
      return `<span class="inline-flex items-center rounded-full bg-orange-300 text-slate-900 px-3 py-1 text-xs font-bold shadow-sm">#3</span>`;
    }

    return `<span class="font-semibold text-slate-700">${rank}</span>`;
  }

  function rowTone(rank) {
    const n = Number(rank);

    if (n === 1) return "bg-amber-50";
    if (n === 2) return "bg-slate-50";
    if (n === 3) return "bg-orange-50";
    return "bg-white";
  }

  function formatPoints(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return value ?? "-";
    return `<span class="font-bold text-slate-900">${num}</span>`;
  }

  function formatBonus(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return `<span class="text-slate-500">${value ?? "-"}</span>`;
    if (num > 0) {
      return `<span class="font-semibold text-amber-700">+${num}</span>`;
    }
    return `<span class="text-slate-700">${num}</span>`;
  }

  async function fetchSeasonLeaderboard(season) {
    const res = await fetch(
      `/api/public/leaderboard/season?season=${encodeURIComponent(season)}`
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to load season leaderboard");
    }

    return Array.isArray(data.leaderboard) ? data.leaderboard : [];
  }

  async function loadLeaderboard() {
    setMessage("");

    const season = seasonInput.value;

    if (!season) {
      setMessage("Please enter a season.", "error");
      renderEmptyRow("Please enter a season.");
      return;
    }

    renderEmptyRow("Loading leaderboard...");

    try {
      const rows = await fetchSeasonLeaderboard(season);

      if (!rows.length) {
        renderEmptyRow("No leaderboard entries found.");
        setMessage("No leaderboard entries found for this season.", "info");
        return;
      }

      tableBody.innerHTML = rows.map((row) => `
        <tr class="${rowTone(row.rank)} hover:bg-amber-50/50 transition">
          <td class="px-4 py-3">${rankBadge(row.rank)}</td>
          <td class="px-4 py-3 font-semibold text-slate-900">${row.username || "-"}</td>
          <td class="px-4 py-3">${formatPoints(row.totalPoints)}</td>
          <td class="px-4 py-3 text-slate-700">${row.roundsPlayed ?? "-"}</td>
          <td class="px-4 py-3">${formatBonus(row.bonusPoints)}</td>
        </tr>
      `).join("");

      setMessage("");
    } catch (err) {
      console.error("loadLeaderboard error:", err);
      setMessage(err.message || "Server error loading leaderboard", "error");
      renderEmptyRow("Server error loading leaderboard.");
    }
  }

  seasonInput.addEventListener("change", loadLeaderboard);
  seasonInput.addEventListener("keyup", (e) => {
    if (e.key === "Enter") loadLeaderboard();
  });

  await loadLeaderboard();
})();