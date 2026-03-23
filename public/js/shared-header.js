// public/js/shared-header.js
(async function () {
  const path = window.location.pathname.split("/").pop() || "home.html";

  async function getAuth() {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) throw new Error("auth check failed");
      return await res.json();
    } catch (err) {
      console.error("shared header auth error:", err);
      return { loggedIn: false, user: null };
    }
  }

  function navLink(href, label, currentPath) {
    const active = currentPath === href;
    return `
      <a href="${href}"
         class="relative px-3 py-2 rounded-lg text-sm font-medium transition
                ${
                  active
                    ? "bg-amber-300 text-slate-900 shadow-md"
                    : "text-white/90 hover:bg-white/10 hover:text-amber-200"
                }">
        ${label}
      </a>
    `;
  }

  function mobileNavLink(href, label, currentPath) {
    const active = currentPath === href;
    return `
      <a href="${href}"
         class="rounded-lg px-3 py-2 text-sm font-medium transition
                ${
                  active
                    ? "bg-amber-300/20 text-amber-200 ring-1 ring-amber-300/30"
                    : "text-white/90 hover:bg-white/10 hover:text-amber-200"
                }">
        ${label}
      </a>
    `;
  }

  function profileButton(id) {
    return `
      <button
        id="${id}"
        type="button"
        class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-amber-300/25 bg-white/5 text-amber-200 transition hover:bg-amber-300/10 hover:border-amber-300/40"
        aria-label="Open profile"
        title="Profile"
      >
        <svg xmlns="http://www.w3.org/2000/svg"
             class="h-5 w-5"
             fill="none"
             viewBox="0 0 24 24"
             stroke="currentColor"
             stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round"
                d="M15.75 6.75a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75a17.933 17.933 0 01-7.499-1.632z" />
        </svg>
      </button>
    `;
  }

  function logoutButton(id, mobile = false) {
    if (mobile) {
      return `
        <button
          id="${id}"
          type="button"
          class="mt-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-white/90 transition hover:bg-white/10 hover:text-amber-200"
        >
          Log Out
        </button>
      `;
    }

    return `
      <button
        id="${id}"
        type="button"
        class="inline-flex items-center justify-center rounded-xl bg-slate-800 px-4 py-2 text-white text-sm font-semibold shadow-lg transition hover:bg-slate-950"
      >
        Log Out
      </button>
    `;
  }

  function buildProfileModal() {
    return `
      <div id="profileModal" class="hidden fixed inset-0 z-[110]">
        <div id="profileModalBackdrop" class="absolute inset-0 bg-slate-950/60"></div>

        <div class="relative z-[111] min-h-screen flex items-center justify-center p-4">
          <div class="w-full max-w-lg rounded-2xl bg-white border border-gold-200 shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div class="flex items-start justify-between gap-4">
              <div>
                <h2 class="text-2xl font-bold text-brand-900">My Profile</h2>
                <div class="mt-2 h-1 w-20 rounded-full bg-gradient-to-r from-accent-500 to-gold-400"></div>
                <p class="mt-2 text-sm text-slate-600">
                  Update your personal information and password.
                </p>
              </div>

              <button
                id="closeProfileModalBtn"
                type="button"
                class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close profile modal"
              >
                ✕
              </button>
            </div>

            <div id="profileMessage" class="hidden mt-5 rounded-xl border px-3 py-2 text-sm"></div>
            <div id="passwordMessage" class="hidden mt-3 rounded-xl border px-3 py-2 text-sm"></div>

            <form id="profileForm" class="mt-6 space-y-4">
              <div>
                <label for="profileFirstName" class="block text-sm font-medium text-brand-900">First Name</label>
                <input
                  id="profileFirstName"
                  name="firstName"
                  type="text"
                  maxlength="50"
                  class="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-brand-900 outline-none transition focus:border-accent-500 focus:ring-2 focus:ring-orange-200"
                />
              </div>

              <div>
                <label for="profileLastName" class="block text-sm font-medium text-brand-900">Last Name</label>
                <input
                  id="profileLastName"
                  name="lastName"
                  type="text"
                  maxlength="50"
                  class="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-brand-900 outline-none transition focus:border-accent-500 focus:ring-2 focus:ring-orange-200"
                />
              </div>

              <div>
                <label for="profileEmail" class="block text-sm font-medium text-brand-900">Email</label>
                <input
                  id="profileEmail"
                  name="email"
                  type="email"
                  maxlength="120"
                  class="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-brand-900 outline-none transition focus:border-accent-500 focus:ring-2 focus:ring-orange-200"
                />
              </div>

              <div class="flex items-center justify-end gap-3 pt-2">
                <button
                  id="saveProfileBtn"
                  type="submit"
                  class="inline-flex items-center justify-center rounded-xl bg-accent-500 px-5 py-2.5 text-white font-semibold shadow-lg transition hover:bg-accent-600"
                >
                  Save Profile
                </button>
              </div>
            </form>

            <div class="my-6 h-px bg-slate-200"></div>

            <div>
              <h3 class="text-lg font-bold text-brand-900">Change Password</h3>
              <p class="mt-1 text-sm text-slate-600">
                Use your current password, then enter a new one.
              </p>

              <form id="passwordForm" class="mt-4 space-y-4">
                <div>
                  <label for="currentPassword" class="block text-sm font-medium text-brand-900">Current Password</label>
                  <input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    autocomplete="current-password"
                    class="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-brand-900 outline-none transition focus:border-accent-500 focus:ring-2 focus:ring-orange-200"
                  />
                </div>

                <div>
                  <label for="newPassword" class="block text-sm font-medium text-brand-900">New Password</label>
                  <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    autocomplete="new-password"
                    class="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-brand-900 outline-none transition focus:border-accent-500 focus:ring-2 focus:ring-orange-200"
                  />
                </div>

                <div>
                  <label for="confirmNewPassword" class="block text-sm font-medium text-brand-900">Confirm New Password</label>
                  <input
                    id="confirmNewPassword"
                    name="confirmNewPassword"
                    type="password"
                    autocomplete="new-password"
                    class="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-brand-900 outline-none transition focus:border-accent-500 focus:ring-2 focus:ring-orange-200"
                  />
                </div>

                <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <p class="text-xs text-slate-500">New password must be at least 6 characters.</p>

                  <button
                    id="savePasswordBtn"
                    type="submit"
                    class="inline-flex items-center justify-center rounded-xl bg-slate-800 px-5 py-2.5 text-white font-semibold shadow-lg transition hover:bg-slate-950"
                  >
                    Change Password
                  </button>
                </div>
              </form>
            </div>

            <div class="mt-6 flex items-center justify-end">
              <button
                id="cancelProfileModalBtn"
                type="button"
                class="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-slate-700 font-semibold transition hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function buildHeader({ currentPath, isAdmin, loggedIn, username }) {
    return `
      <header class="sticky top-0 z-50 border-b border-amber-300/10 shadow-lg bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 text-white">
        <div class="max-w-7xl mx-auto px-4">
          <div class="h-14 flex items-center justify-between gap-3">
            <a href="home.html" class="flex items-center shrink-0 min-w-0">
              <span class="text-lg md:text-xl font-bold tracking-tight truncate">
                Brothers <span class="text-amber-300">NBA</span>
              </span>
            </a>

            <nav class="hidden md:flex items-center gap-2">
              ${navLink("home.html", "Home", currentPath)}
              ${navLink("mypicks.html", "My Picks", currentPath)}
              ${navLink("results.html", "Results", currentPath)}
              ${navLink("leaderboards.html", "Leaderboards", currentPath)}
              ${isAdmin ? navLink("admin.html", "Admin", currentPath) : ""}
            </nav>

            <div class="hidden md:flex items-center gap-3 shrink-0" id="headerAuthSlot">
              ${
                loggedIn
                  ? `
                    <span class="text-sm text-white/75 whitespace-nowrap">
                      Hi, <span class="text-amber-200 font-medium">${username || "User"}</span>
                    </span>
                    ${profileButton("openProfileModalBtn")}
                    ${logoutButton("headerLogoutBtn")}
                  `
                  : `
                    <button
                      id="openSignInModalBtn"
                      type="button"
                      class="text-sm font-semibold uppercase tracking-wide text-white/90 transition hover:text-amber-200"
                    >
                      Sign In
                    </button>
                  `
              }
            </div>

            <button id="mobileMenuBtn"
                    type="button"
                    class="md:hidden shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-amber-300/25 bg-white/5 text-amber-200 hover:bg-amber-300/10 hover:border-amber-300/40 transition"
                    aria-label="Open menu"
                    aria-expanded="false">
              <svg xmlns="http://www.w3.org/2000/svg"
                   class="h-5 w-5"
                   fill="none"
                   viewBox="0 0 24 24"
                   stroke="currentColor"
                   stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                      d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          <div id="mobileMenu" class="md:hidden hidden pb-3">
            <nav class="flex flex-col gap-1 pt-3 border-t border-amber-300/10">
              ${mobileNavLink("home.html", "Home", currentPath)}
              ${mobileNavLink("mypicks.html", "My Picks", currentPath)}
              ${mobileNavLink("results.html", "Results", currentPath)}
              ${mobileNavLink("leaderboards.html", "Leaderboards", currentPath)}
              ${isAdmin ? mobileNavLink("admin.html", "Admin", currentPath) : ""}
              ${
                loggedIn
                  ? `
                    <div class="px-3 pt-2 text-xs text-white/70">
                      Signed in as <span class="text-amber-200 font-medium">${username || "User"}</span>
                    </div>
                    <button
                      id="openProfileModalBtnMobile"
                      type="button"
                      class="mt-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-white/90 transition hover:bg-white/10 hover:text-amber-200"
                    >
                      Profile
                    </button>
                    ${logoutButton("headerLogoutBtnMobile", true)}
                  `
                  : `
                    <button
                      id="openSignInModalBtnMobile"
                      type="button"
                      class="mt-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-white/90 transition hover:bg-white/10 hover:text-amber-200"
                    >
                      Sign In
                    </button>
                  `
              }
            </nav>
          </div>
        </div>
      </header>

      ${loggedIn ? buildProfileModal() : ""}
    `;
  }

  function showMessage(elId, text, type = "success") {
    const el = document.getElementById(elId);
    if (!el) return;

    el.textContent = text;
    el.classList.remove(
      "hidden",
      "border-red-200",
      "bg-red-50",
      "text-red-700",
      "border-green-200",
      "bg-green-50",
      "text-green-700"
    );

    if (type === "error") {
      el.classList.add("border-red-200", "bg-red-50", "text-red-700");
    } else {
      el.classList.add("border-green-200", "bg-green-50", "text-green-700");
    }
  }

  function clearMessage(elId) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.classList.add("hidden");
    el.textContent = "";
  }

  function clearAllMessages() {
    clearMessage("profileMessage");
    clearMessage("passwordMessage");
  }

  function openProfileModal() {
    const profileModal = document.getElementById("profileModal");
    if (!profileModal) return;
    profileModal.classList.remove("hidden");
    clearAllMessages();
  }

  function closeProfileModal() {
    const profileModal = document.getElementById("profileModal");
    if (!profileModal) return;
    profileModal.classList.add("hidden");
    clearAllMessages();

    document.getElementById("passwordForm")?.reset();
  }

  async function populateProfileForm() {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      const data = await res.json();

      if (!data.loggedIn || !data.user) return;

      const profileFirstName = document.getElementById("profileFirstName");
      const profileLastName = document.getElementById("profileLastName");
      const profileEmail = document.getElementById("profileEmail");

      if (profileFirstName) profileFirstName.value = data.user.firstName || "";
      if (profileLastName) profileLastName.value = data.user.lastName || "";
      if (profileEmail) profileEmail.value = data.user.email || "";
    } catch (err) {
      console.error("populateProfileForm error:", err);
      showMessage("profileMessage", "Unable to load profile.", "error");
    }
  }

  async function handleProfileSubmit(e) {
    e.preventDefault();
    clearMessage("profileMessage");

    const payload = {
      firstName: document.getElementById("profileFirstName")?.value.trim() || "",
      lastName: document.getElementById("profileLastName")?.value.trim() || "",
      email: document.getElementById("profileEmail")?.value.trim() || ""
    };

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        showMessage("profileMessage", data.error || "Unable to update profile.", "error");
        return;
      }

      showMessage("profileMessage", "Profile updated successfully.");
      await renderHeader();

      window.dispatchEvent(
        new CustomEvent("profile-updated", {
          detail: { user: data.user }
        })
      );
    } catch (err) {
      console.error("profile update error:", err);
      showMessage("profileMessage", "Server error", "error");
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    clearMessage("passwordMessage");

    const currentPassword = document.getElementById("currentPassword")?.value || "";
    const newPassword = document.getElementById("newPassword")?.value || "";
    const confirmNewPassword = document.getElementById("confirmNewPassword")?.value || "";

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      showMessage("passwordMessage", "Please fill out all password fields.", "error");
      return;
    }

    if (newPassword.length < 6) {
      showMessage("passwordMessage", "New password must be at least 6 characters.", "error");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      showMessage("passwordMessage", "New password and confirm password do not match.", "error");
      return;
    }

    if (currentPassword === newPassword) {
      showMessage("passwordMessage", "New password must be different from current password.", "error");
      return;
    }

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json();

      if (!res.ok) {
        showMessage("passwordMessage", data.error || "Unable to change password.", "error");
        return;
      }

      document.getElementById("passwordForm")?.reset();
      showMessage("passwordMessage", "Password updated successfully.");

      window.dispatchEvent(new Event("password-changed"));
    } catch (err) {
      console.error("password change error:", err);
      showMessage("passwordMessage", "Server error", "error");
    }
  }

  async function handleHeaderLogout() {
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include"
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Logout failed");
        return;
      }

      closeProfileModal?.();
      window.location.href = "/home.html";
    } catch (err) {
      console.error("header logout error:", err);
      alert("Server error");
    }
  }

  function bindHeaderEvents() {
    const mobileMenuBtn = document.getElementById("mobileMenuBtn");
    const mobileMenu = document.getElementById("mobileMenu");

    if (mobileMenuBtn && mobileMenu) {
      mobileMenuBtn.addEventListener("click", () => {
        const isHidden = mobileMenu.classList.contains("hidden");
        mobileMenu.classList.toggle("hidden");
        mobileMenuBtn.setAttribute("aria-expanded", String(isHidden));
      });
    }

    document.getElementById("openProfileModalBtn")?.addEventListener("click", async () => {
      await populateProfileForm();
      openProfileModal();
    });

    document.getElementById("openProfileModalBtnMobile")?.addEventListener("click", async () => {
      await populateProfileForm();
      openProfileModal();
    });

    document.getElementById("closeProfileModalBtn")?.addEventListener("click", closeProfileModal);
    document.getElementById("cancelProfileModalBtn")?.addEventListener("click", closeProfileModal);
    document.getElementById("profileModalBackdrop")?.addEventListener("click", closeProfileModal);
    document.getElementById("profileForm")?.addEventListener("submit", handleProfileSubmit);
    document.getElementById("passwordForm")?.addEventListener("submit", handlePasswordSubmit);
    document.getElementById("headerLogoutBtn")?.addEventListener("click", handleHeaderLogout);
    document.getElementById("headerLogoutBtnMobile")?.addEventListener("click", handleHeaderLogout);

    window.dispatchEvent(new Event("shared-header-ready"));
  }

  async function renderHeader() {
    const auth = await getAuth();
    const isAdmin = !!auth?.loggedIn && !!auth?.user?.isAdmin;
    const loggedIn = !!auth?.loggedIn;
    const username = auth?.user?.firstName || auth?.user?.username || "";

    if (path === "admin.html" && !isAdmin) {
      window.location.href = "home.html";
      return;
    }

    const mount = document.getElementById("sharedHeader");
    if (!mount) return;

    mount.innerHTML = buildHeader({
      currentPath: path,
      isAdmin,
      loggedIn,
      username
    });

    bindHeaderEvents();
  }

  document.addEventListener("keydown", (e) => {
    const profileModal = document.getElementById("profileModal");
    if (e.key === "Escape" && profileModal && !profileModal.classList.contains("hidden")) {
      closeProfileModal();
    }
  });

  await renderHeader();
})();