const express = require("express");
const authenticate = require("../middleware/auth");
const store = require("../store");

const router = express.Router();

/* All leaderboard routes require authentication */
router.use(authenticate);

/* ------------------------------------------------------------------ */
/*  GET /api/leaderboard  — global leaderboard                         */
/*  Query params:                                                      */
/*    ?difficulty=easy|medium|hard|expert  (optional filter)            */
/*    ?limit=50                           (optional, default 50)       */
/* ------------------------------------------------------------------ */

router.get("/", async (req, res) => {
  try {
    const { difficulty, limit } = req.query;
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);

    const entries = await store.getLeaderboard(difficulty || null, parsedLimit);

    return res.status(200).json({ entries });
  } catch (err) {
    console.error("Leaderboard error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ------------------------------------------------------------------ */
/*  GET /api/leaderboard/me  — current user's personal stats           */
/* ------------------------------------------------------------------ */

router.get("/me", async (req, res) => {
  try {
    const stats = await store.getUserStats(req.user.id);

    return res.status(200).json({
      username: req.user.username,
      ...stats,
    });
  } catch (err) {
    console.error("User stats error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ------------------------------------------------------------------ */
/*  GET /api/leaderboard/user/:username  — stats for a specific user   */
/* ------------------------------------------------------------------ */

router.get("/user/:username", async (req, res) => {
  try {
    const user = await store.getUserByUsername(req.params.username);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const stats = await store.getUserStats(user.id);

    return res.status(200).json({
      username: user.username,
      ...stats,
    });
  } catch (err) {
    console.error("User stats error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
