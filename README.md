# Sudokumentationfault

A sleek, dark-themed Sudoku web application with user authentication and a global leaderboard.

## Features

- **Four difficulty levels** — Easy, Medium, Hard, Expert
- **Server-side puzzle generation** — all game logic runs on the backend so players cannot cheat
- **Unique solutions** — every generated puzzle is guaranteed to have exactly one valid solution
- **User authentication** — register and log in with JWT-based sessions
- **Global leaderboard** — compare completion times and mistakes across all players
- **Personal stats** — track your best times and averages per difficulty
- **Keyboard support** — navigate with arrow keys and type numbers directly
- **Responsive design** — works on desktop and mobile
- **Dark theme** — easy on the eyes
- **PostgreSQL persistence** — all data survives restarts

## Tech Stack

| Layer    | Technology                           |
| -------- | ------------------------------------ |
| Frontend | Vue 3, TypeScript, Pinia, Vue Router |
| Backend  | Node.js, Express                     |
| Database | PostgreSQL 16                        |
| Auth     | JWT, bcryptjs                        |
| Hosting  | Docker, Docker Compose, nginx        |

## Project Structure

```
Sudokumentationfault/
├── backend/
│   ├── src/
│   │   ├── config/            # Environment configuration
│   │   ├── db/                # PostgreSQL pool, schema init & retry logic
│   │   ├── middleware/        # JWT authentication middleware
│   │   ├── routes/            # API route handlers
│   │   │   ├── auth.js        # Register, login, token validation
│   │   │   ├── game.js        # New game, moves, abandon
│   │   │   └── leaderboard.js # Global & per-user rankings
│   │   ├── services/          # Sudoku generation & validation
│   │   ├── store/             # Async data-access layer (PostgreSQL queries)
│   │   └── server.js          # Express entry point with graceful shutdown
│   ├── .env                   # Local dev environment variables
│   ├── Dockerfile             # Production image
│   └── Dockerfile.dev         # Development image (with nodemon)
├── frontend/
│   ├── src/
│   │   ├── api/               # Axios client with auth interceptor
│   │   ├── assets/            # Global CSS (dark theme variables)
│   │   ├── components/        # NavBar, SudokuBoard, SudokuCell, NumberPad, DifficultySelector
│   │   ├── router/            # Vue Router with auth guards
│   │   ├── stores/            # Pinia stores (auth, game)
│   │   └── views/             # Login, Register, Game, Dashboard
│   ├── nginx.conf             # Production nginx config
│   ├── Dockerfile             # Production multi-stage build
│   └── Dockerfile.dev         # Development image (with Vite HMR)
├── docker-compose.dev.yml     # Development compose (hot reload + Postgres)
├── docker-compose.prod.yml    # Production compose (nginx + Node + Postgres)
└── README.md
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20+ (for local development without Docker)
- [PostgreSQL](https://www.postgresql.org/) 14+ (for local development without Docker)
- [Docker](https://www.docker.com/) and Docker Compose (for containerized setup)

---

### Local Development (without Docker)

**1. Start PostgreSQL:**

Make sure a PostgreSQL instance is running and create the database:

```sh
psql -U postgres -c "CREATE USER sudoku WITH PASSWORD 'sudoku';"
psql -U postgres -c "CREATE DATABASE sudoku OWNER sudoku;"
```

**2. Start the backend:**

```sh
cd backend
npm install
npm run dev
```

The API server starts on `http://localhost:3000`. On first run it automatically
creates all required tables (`users`, `games`, `leaderboard`).

**3. Start the frontend:**

```sh
cd frontend
npm install
npm run dev
```

The Vite dev server starts on `http://localhost:5173` and proxies `/api`
requests to the backend.

---

### Docker — Development

Runs all three services (Postgres, backend, frontend) with hot reload via
volume mounts:

```sh
docker compose -f docker-compose.dev.yml up --build
```

- Frontend: `http://localhost:5173`
- Backend:  `http://localhost:3000`
- Postgres: `localhost:5432` (exposed for local tooling)

Source code changes in `backend/src/` and `frontend/src/` are picked up
automatically — no rebuild needed.

---

### Docker — Production

Builds optimised images and serves the frontend through nginx:

```sh
# Set secrets for production
export JWT_SECRET=$(openssl rand -base64 48)
export DB_PASSWORD=$(openssl rand -base64 24)

docker compose -f docker-compose.prod.yml up --build -d
```

The application is available at `http://localhost` (port 80).

nginx serves the static frontend and reverse-proxies `/api/*` to the backend
container. Postgres data is persisted in a named Docker volume (`pgdata_prod`).

---

## Database

The backend uses PostgreSQL for all persistence. The schema is created
automatically on startup via `src/db/index.js`. Three tables are used:

| Table         | Purpose                                    |
| ------------- | ------------------------------------------ |
| `users`       | Accounts (id, username, password hash)     |
| `games`       | Game state (puzzle, solution, current, etc)|
| `leaderboard` | Completed game entries for global rankings |

Grids (puzzle, solution, current, locked) are stored as `JSONB` columns.

---

## API Endpoints

### Auth

| Method | Endpoint             | Description          |
| ------ | -------------------- | -------------------- |
| POST   | `/api/auth/register` | Create a new account |
| POST   | `/api/auth/login`    | Sign in              |
| GET    | `/api/auth/me`       | Validate token       |

### Game

| Method | Endpoint                | Description                  |
| ------ | ----------------------- | ---------------------------- |
| POST   | `/api/game/new`         | Start a new puzzle           |
| GET    | `/api/game/:id`         | Get current game state       |
| POST   | `/api/game/:id/move`    | Place or erase a number      |
| POST   | `/api/game/:id/abandon` | Give up and reveal solution  |

### Leaderboard

| Method | Endpoint                          | Description               |
| ------ | --------------------------------- | ------------------------- |
| GET    | `/api/leaderboard`                | Global rankings           |
| GET    | `/api/leaderboard/me`             | Your personal stats       |
| GET    | `/api/leaderboard/user/:username` | Stats for a specific user |

## Environment Variables

### Backend

| Variable      | Default                            | Description                       |
| ------------- | ---------------------------------- | --------------------------------- |
| `PORT`        | `3000`                             | Backend listen port               |
| `JWT_SECRET`  | `default-dev-secret-change-in-prod`| Secret key for signing JWTs       |
| `NODE_ENV`    | `development`                      | `development` or `production`     |
| `CORS_ORIGIN` | `*`                                | Allowed CORS origin(s)            |
| `DB_HOST`     | `localhost`                        | PostgreSQL host                   |
| `DB_PORT`     | `5432`                             | PostgreSQL port                   |
| `DB_NAME`     | `sudoku`                           | PostgreSQL database name          |
| `DB_USER`     | `sudoku`                           | PostgreSQL user                   |
| `DB_PASSWORD` | `sudoku`                           | PostgreSQL password               |

### Frontend

| Variable       | Default | Description           |
| -------------- | ------- | --------------------- |
| `VITE_API_URL` | `/api`  | Frontend API base URL |

> **Important:** Always set a strong, random `JWT_SECRET` and `DB_PASSWORD` in production.

## License

ISC