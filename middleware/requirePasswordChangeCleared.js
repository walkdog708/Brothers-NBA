function requirePasswordChangeCleared(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({ error: "Not logged in" });
  }

  if (req.session.user.mustChangePassword) {
    return res.status(403).json({
      error: "Password change required",
      code: "PASSWORD_CHANGE_REQUIRED"
    });
  }

  next();
}

module.exports = { requirePasswordChangeCleared };