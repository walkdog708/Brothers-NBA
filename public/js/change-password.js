(async function () {
  const form = document.getElementById("changePasswordForm");
  const message = document.getElementById("message");
  const logoutBtn = document.getElementById("logoutBtn");
  const submitBtn = document.getElementById("submitBtn");

  function showMessage(text, type = "error") {
    message.textContent = text;
    message.classList.remove("hidden", "bg-red-50", "text-red-700", "border", "border-red-200", "bg-green-50", "text-green-700", "border-green-200");

    if (type === "success") {
      message.classList.add("bg-green-50", "text-green-700", "border", "border-green-200");
    } else {
      message.classList.add("bg-red-50", "text-red-700", "border", "border-red-200");
    }
  }

  function setSubmitting(isSubmitting) {
    submitBtn.disabled = isSubmitting;
    submitBtn.textContent = isSubmitting ? "Updating..." : "Update Password";
    submitBtn.classList.toggle("opacity-60", isSubmitting);
    submitBtn.classList.toggle("cursor-not-allowed", isSubmitting);
  }

  try {
    const res = await fetch("/api/auth/me");
    const data = await res.json();

    if (!data.loggedIn) {
      window.location.href = "/home.html";
      return;
    }

    if (!data.user?.mustChangePassword) {
      window.location.href = "/mypicks.html";
      return;
    }
  } catch (err) {
    console.error("change-password auth check error:", err);
    window.location.href = "/home.html";
    return;
  }

  logoutBtn?.addEventListener("click", async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
    } catch (err) {
      console.error("logout error:", err);
    } finally {
      window.location.href = "/home.html";
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const currentPassword = String(document.getElementById("currentPassword").value || "");
    const newPassword = String(document.getElementById("newPassword").value || "");
    const confirmPassword = String(document.getElementById("confirmPassword").value || "");

    message.classList.add("hidden");
    message.textContent = "";

    if (!currentPassword || !newPassword || !confirmPassword) {
      showMessage("All fields are required.");
      return;
    }

    if (newPassword.length < 6) {
      showMessage("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      showMessage("New password and confirmation do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      showMessage("New password must be different from your current password.");
      return;
    }

    try {
      setSubmitting(true);

      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const data = await res.json();

      if (!res.ok) {
        showMessage(data.error || "Failed to change password.");
        return;
      }

      showMessage("Password updated successfully. Redirecting...", "success");

      setTimeout(() => {
        window.location.href = "/mypicks.html";
      }, 800);
    } catch (err) {
      console.error("change password submit error:", err);
      showMessage("Server error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  });
})();