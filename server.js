require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const path = require("path");
const cors = require("cors");

require("./models/User");
require("./models/PlayoffSeries");
require("./models/RoundPicks");
require("./models/HomepageContent");
require("./models/NotificationReminderLog");

const authRoutes = require("./routes/auth");
const protectedRoutes = require("./routes/protected");
const playoffAdminRoutes = require("./routes/playoff.admin");
const playoffUserRoutes = require("./routes/playoff.user");
const playoffPublicRoutes = require("./routes/playoff.public");
const adminUsersRoutes = require("./routes/admin.users");

const notificationsRoutes = require("./routes/notifications");
const { startPushReminderJob } = require("./utils/push-reminders");


const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("Missing MONGO_URI in .env");
  process.exit(1);
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev_secret_change_me",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: MONGO_URI
    }),
    cookie: {
      httpOnly: true,
      secure: false,
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  })
);

// API routes
app.use("/api/auth", authRoutes);
app.use("/api", protectedRoutes);
app.use("/api/admin", playoffAdminRoutes);
app.use("/api/playoff", playoffUserRoutes);
app.use("/api/public", playoffPublicRoutes);
app.use("/api/admin", adminUsersRoutes);
app.use("/api", require("./routes/homepage"));
app.use("/api/notifications", notificationsRoutes);

// Page guards
function requireLoginPage(req, res, next) {
  if (req.session?.user) return next();
  return res.redirect("/home.html");
}

function requireAdminPage(req, res, next) {
  if (req.session?.user?.isAdmin) return next();
  return res.redirect("/home.html");
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "Brosero NBA server is running" });
});

// Page routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "home.html"));
});

app.get("/home.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "home.html"));
});

app.get("/mypicks.html", requireLoginPage, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "mypicks.html"));
});

app.get("/admin.html", requireAdminPage, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.get("/results.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "results.html"));
});

app.get("/leaderboards.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "leaderboards.html"));
});

// Static files
// Keep this AFTER the explicit page routes so admin.html and mypicks.html
// do not bypass your guards through direct static serving.
app.use(express.static(path.join(__dirname, "public")));

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");

    startPushReminderJob();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });