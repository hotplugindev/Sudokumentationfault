const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const config = require("../config");
const store = require("../store");

const router = express.Router();

/* ------------------------------------------------------------------ */
/*  Helper: create a signed JWT for a user                             */
/* ------------------------------------------------------------------ */

function signToken(user) {
  return jwt.sign({ id: user.id, username: user.username }, config.jwtSecret, {
    expiresIn: config.tokenExpiry,
  });
}

/* ------------------------------------------------------------------ */
/*  POST /api/auth/register                                            */
/* ------------------------------------------------------------------ */

router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    // --- Validation ---------------------------------------------------
    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required" });
    }

    const trimmedUsername = username.trim();

    if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
      return res
        .status(400)
        .json({ error: "Username must be between 3 and 20 characters" });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      return res
        .status(400)
        .json({
          error: "Username may only contain letters, numbers, and underscores",
        });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    }

    // --- Uniqueness check ---------------------------------------------
    if (await store.usernameExists(trimmedUsername)) {
      return res.status(409).json({ error: "Username is already taken" });
    }

    // --- Create user --------------------------------------------------
    const passwordHash = await bcrypt.hash(password, config.bcryptRounds);

    const user = {
      id: uuidv4(),
      username: trimmedUsername,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    await store.addUser(user);

    const token = signToken(user);

    return res.status(201).json({
      token,
      user: { id: user.id, username: user.username },
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ------------------------------------------------------------------ */
/*  POST /api/auth/login                                               */
/* ------------------------------------------------------------------ */

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required" });
    }

    const user = await store.getUserByUsername(username.trim());

    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const token = signToken(user);

    return res.status(200).json({
      token,
      user: { id: user.id, username: user.username },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ------------------------------------------------------------------ */
/*  GET /api/auth/me   — validate token & return current user          */
/* ------------------------------------------------------------------ */

router.get("/me", require("../middleware/auth"), (req, res) => {
  return res.status(200).json({ user: req.user });
});

module.exports = router;
