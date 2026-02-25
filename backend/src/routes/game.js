const express = require("express");
const { v4: uuidv4 } = require("uuid");
const authenticate = require("../middleware/auth");
const store = require("../store");
const sudoku = require("../services/sudoku");

const router = express.Router();

/* All game routes require authentication */
router.use(authenticate);

/* ------------------------------------------------------------------ */
/*  POST /api/game/new  — start a new game                             */
/* ------------------------------------------------------------------ */

router.post("/new", async (req, res) => {
  try {
    const { difficulty = "medium" } = req.body;

    const { puzzle, solution } = sudoku.generatePuzzle(difficulty);
    const locked = sudoku.getLockedCells(puzzle);

    const game = {
      id: uuidv4(),
      userId: req.user.id,
      difficulty,
      puzzle: sudoku.cloneGrid(puzzle),
      solution,
      current: sudoku.cloneGrid(puzzle),
      locked,
      status: "in_progress",
      startedAt: Date.now(),
      completedAt: null,
      elapsed: 0,
      mistakes: 0,
    };

    await store.addGame(game);

    return res.status(201).json({
      id: game.id,
      difficulty: game.difficulty,
      puzzle: game.puzzle,
      locked: game.locked,
      current: game.current,
      status: game.status,
      startedAt: game.startedAt,
      elapsed: game.elapsed,
      mistakes: game.mistakes,
    });
  } catch (err) {
    console.error("New game error:", err);
    return res.status(400).json({ error: err.message });
  }
});

/* ------------------------------------------------------------------ */
/*  POST /api/game/:id/move  — place a number                         */
/* ------------------------------------------------------------------ */

router.post("/:id/move", async (req, res) => {
  try {
    const game = await store.getGameById(req.params.id);

    if (!game || game.userId !== req.user.id) {
      return res.status(404).json({ error: "Game not found" });
    }

    if (game.status !== "in_progress") {
      return res.status(400).json({ error: "Game is already finished" });
    }

    const { row, col, value, elapsed } = req.body;

    if (row == null || col == null || value == null) {
      return res
        .status(400)
        .json({ error: "row, col, and value are required" });
    }

    // Update elapsed time from the client (server trusts this loosely)
    if (typeof elapsed === "number" && elapsed >= 0) {
      game.elapsed = elapsed;
    }

    // Cannot modify pre-filled cells
    if (game.locked[row][col]) {
      return res
        .status(400)
        .json({ error: "Cannot modify a pre-filled cell" });
    }

    // Value of 0 means erase
    if (value === 0) {
      game.current[row][col] = 0;
      await store.updateGame(game.id, {
        current: game.current,
        elapsed: game.elapsed,
      });
      return res.status(200).json({
        correct: null,
        current: game.current,
        status: game.status,
        mistakes: game.mistakes,
      });
    }

    const { valid, correct } = sudoku.validateMove(
      game.solution,
      row,
      col,
      value,
    );

    if (!valid) {
      return res.status(400).json({ error: "Invalid move parameters" });
    }

    if (correct) {
      game.current[row][col] = value;
    } else {
      game.mistakes++;
    }

    // Check if the board is now complete
    if (correct && sudoku.isBoardComplete(game.current, game.solution)) {
      game.status = "completed";
      game.completedAt = Date.now();

      await store.updateGame(game.id, {
        current: game.current,
        status: game.status,
        completedAt: game.completedAt,
        elapsed: game.elapsed,
        mistakes: game.mistakes,
      });

      await store.addLeaderboardEntry({
        gameId: game.id,
        userId: game.userId,
        username: req.user.username,
        difficulty: game.difficulty,
        time: game.elapsed,
        mistakes: game.mistakes,
        completedAt: new Date(game.completedAt).toISOString(),
      });
    } else {
      await store.updateGame(game.id, {
        current: game.current,
        elapsed: game.elapsed,
        mistakes: game.mistakes,
      });
    }

    return res.status(200).json({
      correct,
      current: game.current,
      status: game.status,
      mistakes: game.mistakes,
      completedAt: game.completedAt,
    });
  } catch (err) {
    console.error("Move error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ------------------------------------------------------------------ */
/*  GET /api/game/:id  — get current game state                        */
/* ------------------------------------------------------------------ */

router.get("/:id", async (req, res) => {
  try {
    const game = await store.getGameById(req.params.id);

    if (!game || game.userId !== req.user.id) {
      return res.status(404).json({ error: "Game not found" });
    }

    const response = {
      id: game.id,
      difficulty: game.difficulty,
      puzzle: game.puzzle,
      locked: game.locked,
      current: game.current,
      status: game.status,
      startedAt: game.startedAt,
      elapsed: game.elapsed,
      mistakes: game.mistakes,
      completedAt: game.completedAt,
    };

    // Only reveal solution if game is completed
    if (game.status === "completed") {
      response.solution = game.solution;
    }

    return res.status(200).json(response);
  } catch (err) {
    console.error("Get game error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ------------------------------------------------------------------ */
/*  POST /api/game/:id/abandon  — give up on a game                    */
/* ------------------------------------------------------------------ */

router.post("/:id/abandon", async (req, res) => {
  try {
    const game = await store.getGameById(req.params.id);

    if (!game || game.userId !== req.user.id) {
      return res.status(404).json({ error: "Game not found" });
    }

    if (game.status !== "in_progress") {
      return res.status(400).json({ error: "Game is already finished" });
    }

    const completedAt = Date.now();
    await store.updateGame(game.id, {
      status: "abandoned",
      completedAt,
    });

    return res.status(200).json({
      status: "abandoned",
      solution: game.solution,
    });
  } catch (err) {
    console.error("Abandon error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
