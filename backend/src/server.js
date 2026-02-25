const express = require("express");
const cors = require("cors");
const config = require("./config");
const db = require("./db");

/* ── Route modules ────────────────────────────────────────────────────── */
const authRoutes = require("./routes/auth");
const gameRoutes = require("./routes/game");
const leaderboardRoutes = require("./routes/leaderboard");

/* ── App setup ────────────────────────────────────────────────────────── */
const app = express();

/* ── Middleware ────────────────────────────────────────────────────────── */
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.use(express.json());

/* ── Health check ─────────────────────────────────────────────────────── */
app.get("/api/health", async (_req, res) => {
  try {
    await db.query("SELECT 1");
    res.status(200).json({ status: "ok", uptime: process.uptime() });
  } catch (err) {
    res.status(503).json({ status: "degraded", error: "database unreachable" });
  }
});

/* ── API routes ───────────────────────────────────────────────────────── */
app.use("/api/auth", authRoutes);
app.use("/api/game", gameRoutes);
app.use("/api/leaderboard", leaderboardRoutes);

/* ── 404 fallback ─────────────────────────────────────────────────────── */
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

/* ── Global error handler ─────────────────────────────────────────────── */
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

/* ── Start server ─────────────────────────────────────────────────────── */
async function start() {
  try {
    await db.waitForConnection();
    await db.initialize();

    app.listen(config.port, "0.0.0.0", () => {
      console.log(
        `[server] Sudoku API running on http://0.0.0.0:${config.port}`,
      );
      console.log(`[server] Environment: ${config.nodeEnv}`);
    });
  } catch (err) {
    console.error("[server] Failed to start:", err);
    process.exit(1);
  }
}

/* ── Graceful shutdown ────────────────────────────────────────────────── */
async function shutdown(signal) {
  console.log(`[server] Received ${signal}, shutting down gracefully...`);
  await db.close();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

start();

module.exports = app;
