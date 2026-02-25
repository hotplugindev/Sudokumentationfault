const db = require("../db");

/* ------------------------------------------------------------------ */
/*  User helpers                                                       */
/* ------------------------------------------------------------------ */

async function addUser(user) {
  const { rows } = await db.query(
    `INSERT INTO users (id, username, password_hash, created_at)
     VALUES ($1, $2, $3, $4)
     RETURNING id, username, created_at`,
    [user.id, user.username, user.passwordHash, user.createdAt],
  );
  return rows[0];
}

async function getUserById(id) {
  const { rows } = await db.query(
    `SELECT id, username, password_hash AS "passwordHash", created_at AS "createdAt"
     FROM users WHERE id = $1`,
    [id],
  );
  return rows[0] || null;
}

async function getUserByUsername(username) {
  const { rows } = await db.query(
    `SELECT id, username, password_hash AS "passwordHash", created_at AS "createdAt"
     FROM users WHERE LOWER(username) = LOWER($1)`,
    [username],
  );
  return rows[0] || null;
}

async function usernameExists(username) {
  const { rows } = await db.query(
    `SELECT 1 FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1`,
    [username],
  );
  return rows.length > 0;
}

/* ------------------------------------------------------------------ */
/*  Game helpers                                                       */
/* ------------------------------------------------------------------ */

async function addGame(game) {
  const { rows } = await db.query(
    `INSERT INTO games
       (id, user_id, difficulty, puzzle, solution, current, locked,
        status, started_at, completed_at, elapsed, mistakes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING id`,
    [
      game.id,
      game.userId,
      game.difficulty,
      JSON.stringify(game.puzzle),
      JSON.stringify(game.solution),
      JSON.stringify(game.current),
      JSON.stringify(game.locked),
      game.status,
      game.startedAt,
      game.completedAt,
      game.elapsed,
      game.mistakes,
    ],
  );
  return rows[0];
}

/**
 * Map a raw database row into the shape the rest of the app expects.
 */
function rowToGame(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    difficulty: row.difficulty,
    puzzle: row.puzzle,
    solution: row.solution,
    current: row.current,
    locked: row.locked,
    status: row.status,
    startedAt: Number(row.started_at),
    completedAt: row.completed_at != null ? Number(row.completed_at) : null,
    elapsed: row.elapsed,
    mistakes: row.mistakes,
  };
}

async function getGameById(id) {
  const { rows } = await db.query(`SELECT * FROM games WHERE id = $1`, [id]);
  return rowToGame(rows[0]);
}

async function getGamesByUserId(userId) {
  const { rows } = await db.query(
    `SELECT * FROM games WHERE user_id = $1 ORDER BY started_at DESC`,
    [userId],
  );
  return rows.map(rowToGame);
}

async function updateGame(id, updates) {
  const fields = [];
  const values = [];
  let idx = 1;

  const columnMap = {
    current: "current",
    status: "status",
    completedAt: "completed_at",
    elapsed: "elapsed",
    mistakes: "mistakes",
  };

  for (const [key, column] of Object.entries(columnMap)) {
    if (updates[key] !== undefined) {
      const val =
        key === "current" ? JSON.stringify(updates[key]) : updates[key];
      fields.push(`${column} = $${idx}`);
      values.push(val);
      idx++;
    }
  }

  if (fields.length === 0) return null;

  values.push(id);
  const { rows } = await db.query(
    `UPDATE games SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
    values,
  );
  return rowToGame(rows[0]);
}

/* ------------------------------------------------------------------ */
/*  Leaderboard helpers                                                */
/* ------------------------------------------------------------------ */

async function addLeaderboardEntry(entry) {
  await db.query(
    `INSERT INTO leaderboard (game_id, user_id, username, difficulty, time, mistakes, completed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      entry.gameId,
      entry.userId,
      entry.username,
      entry.difficulty,
      entry.time,
      entry.mistakes,
      entry.completedAt,
    ],
  );
}

async function getLeaderboard(difficulty = null, limit = 50) {
  let text;
  let params;

  if (difficulty) {
    text = `SELECT game_id   AS "gameId",
                   user_id   AS "userId",
                   username,
                   difficulty,
                   time,
                   mistakes,
                   completed_at AS "completedAt"
            FROM leaderboard
            WHERE difficulty = $1
            ORDER BY time ASC
            LIMIT $2`;
    params = [difficulty, limit];
  } else {
    text = `SELECT game_id   AS "gameId",
                   user_id   AS "userId",
                   username,
                   difficulty,
                   time,
                   mistakes,
                   completed_at AS "completedAt"
            FROM leaderboard
            ORDER BY time ASC
            LIMIT $1`;
    params = [limit];
  }

  const { rows } = await db.query(text, params);
  return rows;
}

async function getUserStats(userId) {
  /* Total played / completed / mistakes from the games table */
  const summaryResult = await db.query(
    `SELECT
       COUNT(*)::int                                           AS "totalPlayed",
       COUNT(*) FILTER (WHERE status = 'completed')::int      AS "totalCompleted",
       COALESCE(SUM(mistakes) FILTER (WHERE status = 'completed'), 0)::int AS "totalMistakes"
     FROM games
     WHERE user_id = $1`,
    [userId],
  );

  const summary = summaryResult.rows[0] || {
    totalPlayed: 0,
    totalCompleted: 0,
    totalMistakes: 0,
  };

  /* Per-difficulty breakdown */
  const diffResult = await db.query(
    `SELECT
       difficulty,
       COUNT(*)::int                          AS played,
       MIN(elapsed)                           AS "bestTime",
       ROUND(AVG(elapsed))::int               AS "avgTime"
     FROM games
     WHERE user_id = $1 AND status = 'completed'
     GROUP BY difficulty`,
    [userId],
  );

  const byDifficulty = {};
  for (const diff of ["easy", "medium", "hard", "expert"]) {
    const row = diffResult.rows.find((r) => r.difficulty === diff);
    byDifficulty[diff] = {
      played: row ? row.played : 0,
      bestTime: row ? row.bestTime : null,
      avgTime: row ? row.avgTime : null,
    };
  }

  return {
    totalPlayed: summary.totalPlayed,
    totalCompleted: summary.totalCompleted,
    totalMistakes: summary.totalMistakes,
    byDifficulty,
  };
}

module.exports = {
  addUser,
  getUserById,
  getUserByUsername,
  usernameExists,
  addGame,
  getGameById,
  getGamesByUserId,
  updateGame,
  addLeaderboardEntry,
  getLeaderboard,
  getUserStats,
};
