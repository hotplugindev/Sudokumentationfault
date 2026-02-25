const jwt = require("jsonwebtoken");
const config = require("../config");
const store = require("../store");

/**
 * Express middleware that verifies a JWT from the Authorization header.
 *
 * Expects: `Authorization: Bearer <token>`
 *
 * On success, attaches `req.user` with `{ id, username }` and calls next().
 * On failure, responds with 401.
 */
async function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Missing or malformed authorization header" });
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, config.jwtSecret);

    const user = await store.getUserById(payload.id);
    if (!user) {
      return res.status(401).json({ error: "User no longer exists" });
    }

    req.user = { id: user.id, username: user.username };
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token has expired" });
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" });
    }
    next(err);
  }
}

module.exports = authenticate;
