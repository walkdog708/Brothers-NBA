const loggedOutCard = document.getElementById("loggedOutCard");
const loggedInCard = document.getElementById("loggedInCard");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");

const signInModal = document.getElementById("signInModal");
const signInModalBackdrop = document.getElementById("signInModalBackdrop");
const closeSignInModalBtn = document.getElementById("closeSignInModalBtn");

const welcomeUsername = document.getElementById("welcomeUsername");
const userRank = document.getElementById("userRank");
const userPointsText = document.getElementById("userPointsText");
const pointsBehindFirst = document.getElementById("pointsBehindFirst");
const leaderText = document.getElementById("leaderText");

const openPickStatusCard = document.getElementById("openPickStatusCard");
const openPickStatusTitle = document.getElementById("openPickStatusTitle");
const openPickStatusBody = document.getElementById("openPickStatusBody");
const openPickStatusMeta = document.getElementById("openPickStatusMeta");

function showLoggedOut() {
  loggedOutCard.classList.remove("hidden");
  loggedInCard.classList.add("hidden");

  if (loginError) {
    loginError.classList.add("hidden");
    loginError.textContent = "";
  }


  if (welcomeUsername) welcomeUsername.textContent = "";
  if (userRank) userRank.textContent = "—";
  if (userPointsText) userPointsText.textContent = "";
  if (pointsBehindFirst) pointsBehindFirst.textContent = "—";
  if (leaderText) leaderText.textContent = "";
  if (openPickStatusCard) openPickStatusCard.classList.add("hidden");
  if (openPickStatusTitle) openPickStatusTitle.textContent = "";
  if (openPickStatusBody) openPickStatusBody.textContent = "";
  if (openPickStatusMeta) openPickStatusMeta.textContent = "";
}

function showLoggedIn(user) {
  loggedOutCard.classList.add("hidden");
  loggedInCard.classList.remove("hidden");

  if (welcomeUsername) {
    welcomeUsername.textContent = user.firstName || user.username || "User";
  }
}

function openSignInModal() {
  if (!signInModal) return;

  signInModal.classList.remove("hidden");

  if (loginError) {
    loginError.classList.add("hidden");
    loginError.textContent = "";
  }

  setTimeout(() => {
    document.getElementById("username")?.focus();
  }, 0);
}

function closeSignInModal() {
  if (!signInModal) return;

  signInModal.classList.add("hidden");

  if (loginError) {
    loginError.classList.add("hidden");
    loginError.textContent = "";
  }
}

function attachSignInTriggers() {
  document.getElementById("openSignInModalBtn")?.addEventListener("click", openSignInModal);
  document.getElementById("openSignInModalBtnMobile")?.addEventListener("click", openSignInModal);
}

function getCurrentSeason() {
  return 2026;
}

function formatRoundSummaryText(rounds) {
  if (!Array.isArray(rounds) || !rounds.length) return "";

  return rounds
    .map((r) => `Round ${r.round}: ${r.missingOpenSeriesCount} missing`)
    .join(" • ");
}

async function loadPersonalSnapshot(user) {
  if (!user?.username) {
    userRank.textContent = "—";
    pointsBehindFirst.textContent = "—";
    userPointsText.textContent = "";
    leaderText.textContent = "";
    return;
  }

  const season = getCurrentSeason();

  try {
    const res = await fetch(
      `/api/public/leaderboard/season?season=${encodeURIComponent(season)}`
    );
    const data = await res.json();

    if (!res.ok || !Array.isArray(data.leaderboard)) {
      userRank.textContent = "—";
      pointsBehindFirst.textContent = "—";
      userPointsText.textContent = "";
      leaderText.textContent = "";
      return;
    }

    const me = data.leaderboard.find(
      (entry) =>
        String(entry.username || "").toLowerCase() ===
        String(user.username || "").toLowerCase()
    );

    const first = data.leaderboard.find((entry) => Number(entry.rank) === 1);

    if (!me) {
      userRank.textContent = "—";
      pointsBehindFirst.textContent = "—";
      userPointsText.textContent = "No leaderboard entry yet.";
      leaderText.textContent = "";
      return;
    }

    userRank.textContent = `#${me.rank}`;
    userPointsText.textContent = `${Number(me.totalPoints || 0)} total points`;

    if (first) {
      const diff = Math.max(0, Number(first.totalPoints || 0) - Number(me.totalPoints || 0));
      pointsBehindFirst.textContent = String(diff);

      if (Number(me.rank) === 1) {
        leaderText.textContent = "You are currently in 1st place.";
      } else {
        leaderText.textContent = `Leader: ${first.username} (${Number(first.totalPoints || 0)} pts)`;
      }
    } else {
      pointsBehindFirst.textContent = "—";
      leaderText.textContent = "";
    }
  } catch (err) {
    console.error("loadPersonalSnapshot error:", err);
    userRank.textContent = "—";
    pointsBehindFirst.textContent = "—";
    userPointsText.textContent = "";
    leaderText.textContent = "";
  }
}

async function loadOpenPickStatus(user) {
  if (!user?.username) {
    if (openPickStatusCard) openPickStatusCard.classList.add("hidden");
    return;
  }

  const season = getCurrentSeason();

  try {
    const res = await fetch(
      `/api/playoff/home-summary?season=${encodeURIComponent(season)}`
    );
    const data = await res.json();

    if (!res.ok || !data?.summary) {
      if (openPickStatusCard) openPickStatusCard.classList.add("hidden");
      return;
    }

    const summary = data.summary || {};
    const rounds = Array.isArray(data.rounds) ? data.rounds : [];

    if (!openPickStatusCard || !openPickStatusTitle || !openPickStatusBody || !openPickStatusMeta) {
      return;
    }

    openPickStatusCard.classList.remove("hidden");

    if (summary.totalMissingOpenPicks > 0) {
      openPickStatusCard.className =
        "mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4";

      openPickStatusTitle.textContent =
        `You have ${summary.totalMissingOpenPicks} open pick${summary.totalMissingOpenPicks === 1 ? "" : "s"} remaining.`;

      openPickStatusBody.textContent = formatRoundSummaryText(rounds);

      if (summary.nextLockAt) {
        openPickStatusMeta.textContent =
          `Next lock: ${new Date(summary.nextLockAt).toLocaleString()}`;
      } else {
        openPickStatusMeta.textContent = "";
      }
    } else {
      openPickStatusCard.className =
        "mt-4 rounded-2xl border border-green-200 bg-green-50 p-4";

      openPickStatusTitle.textContent = "You’re caught up on all currently open series.";
      openPickStatusBody.textContent =
        rounds.length ? `Open rounds: ${rounds.map((r) => r.round).join(", ")}` : "";
      openPickStatusMeta.textContent = "";
    }
  } catch (err) {
    console.error("loadOpenPickStatus error:", err);
    if (openPickStatusCard) openPickStatusCard.classList.add("hidden");
  }
}

async function loadMe() {
  try {
    const res = await fetch("/api/auth/me");
    const data = await res.json();

    if (data.loggedIn && data.user) {
      if (data.user.mustChangePassword) {
        window.location.href = "/change-password.html";
        return;
      }

      showLoggedIn(data.user);
      await Promise.all([
        loadPersonalSnapshot(data.user),
        loadOpenPickStatus(data.user)
      ]);
    } else {
      showLoggedOut();
    }
  } catch (err) {
    console.error("loadMe error:", err);
    showLoggedOut();
  }
}

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (loginError) {
      loginError.classList.add("hidden");
      loginError.textContent = "";
    }

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok) {
        loginError.textContent = data.error || "Login failed";
        loginError.classList.remove("hidden");
        return;
      }

      loginForm.reset();
      closeSignInModal();

      if (data.user?.mustChangePassword) {
        window.location.href = "/change-password.html";
        return;
      }

      showLoggedIn(data.user);
      await Promise.all([
        loadPersonalSnapshot(data.user),
        loadOpenPickStatus(data.user)
      ]);
    } catch (err) {
      console.error("login error:", err);
      loginError.textContent = "Server error";
      loginError.classList.remove("hidden");
    }
  });
}


closeSignInModalBtn?.addEventListener("click", closeSignInModal);
signInModalBackdrop?.addEventListener("click", closeSignInModal);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && signInModal && !signInModal.classList.contains("hidden")) {
    closeSignInModal();
  }
});

window.addEventListener("shared-header-ready", () => {
  attachSignInTriggers();
});

window.addEventListener("profile-updated", (e) => {
  const user = e.detail?.user;
  if (!user) return;

  if (welcomeUsername) {
    welcomeUsername.textContent = user.firstName || user.username || "User";
  }
});

loadMe();