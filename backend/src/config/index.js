const dotenv = require("dotenv");
dotenv.config();

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  jwtSecret: process.env.JWT_SECRET || "default-dev-secret-change-in-prod",
  nodeEnv: process.env.NODE_ENV || "development",
  bcryptRounds: 10,
  tokenExpiry: "24h",

  db: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || "sudoku",
    user: process.env.DB_USER || "sudoku",
    password: process.env.DB_PASSWORD || "sudoku",
  },
};

module.exports = config;
