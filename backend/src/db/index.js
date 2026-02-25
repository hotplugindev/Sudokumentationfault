const { Pool } = require("pg");
const config = require("../config");

/* ── Connection pool ──────────────────────────────────────────────────── */

const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  user: config.db.user,
  password: config.db.password,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  console.error("[db] Unexpected pool error:", err.message);
});

/* ── Schema setup ─────────────────────────────────────────────────────── */

const SCHEMA_SQL = `
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";

  CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username      VARCHAR(20)  NOT NULL UNIQUE,
    password_hash TEXT         NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS games (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    difficulty    VARCHAR(10)  NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
    puzzle        JSONB        NOT NULL,
    solution      JSONB        NOT NULL,
    current       JSONB        NOT NULL,
    locked        JSONB        NOT NULL,
    status        VARCHAR(20)  NOT NULL DEFAULT 'in_progress'
                               CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    started_at    BIGINT       NOT NULL,
    completed_at  BIGINT,
    elapsed       INTEGER      NOT NULL DEFAULT 0,
    mistakes      INTEGER      NOT NULL DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_games_user_id  ON games(user_id);
  CREATE INDEX IF NOT EXISTS idx_games_status   ON games(status);

  CREATE TABLE IF NOT EXISTS leaderboard (
    id            SERIAL       PRIMARY KEY,
    game_id       UUID         NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    user_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    username      VARCHAR(20)  NOT NULL,
    difficulty    VARCHAR(10)  NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
    time          INTEGER      NOT NULL,
    mistakes      INTEGER      NOT NULL DEFAULT 0,
    completed_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS idx_leaderboard_difficulty ON leaderboard(difficulty);
  CREATE INDEX IF NOT EXISTS idx_leaderboard_time       ON leaderboard(time ASC);
  CREATE INDEX IF NOT EXISTS idx_leaderboard_user_id    ON leaderboard(user_id);
`;

/**
 * Create all required tables if they don't already exist.
 * Call this once during server startup before accepting requests.
 */
async function initialize() {
  const client = await pool.connect();
  try {
    await client.query(SCHEMA_SQL);
    console.log("[db] Schema initialized successfully");
  } finally {
    client.release();
  }
}

/**
 * Wait for Postgres to become reachable, retrying with back-off.
 * Useful inside Docker where the backend may start before the DB is ready.
 *
 * @param {number} retries    Maximum number of connection attempts
 * @param {number} delayMs    Initial delay between retries (doubles each attempt)
 */
async function waitForConnection(retries = 10, delayMs = 1000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const client = await pool.connect();
      client.release();
      console.log("[db] Connected to PostgreSQL");
      return;
    } catch (err) {
      console.warn(
        `[db] Connection attempt ${attempt}/${retries} failed: ${err.message}`,
      );
      if (attempt === retries) {
        throw new Error("[db] Could not connect to PostgreSQL after all retries");
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs = Math.min(delayMs * 2, 10000);
    }
  }
}

/**
 * Convenience wrapper around pool.query().
 *
 * @param {string} text       SQL query string
 * @param {any[]}  [params]   Parameterized values
 * @returns {Promise<import('pg').QueryResult>}
 */
function query(text, params) {
  return pool.query(text, params);
}

/**
 * Gracefully shut down the pool (e.g. on SIGTERM).
 */
async function close() {
  await pool.end();
  console.log("[db] Pool closed");
}

module.exports = {
  pool,
  query,
  initialize,
  waitForConnection,
  close,
};
