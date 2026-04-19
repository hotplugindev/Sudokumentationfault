<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useGameStore } from "@/stores/game";
import type { Difficulty } from "@/lib/sudoku";
import {
  getGameHistory,
  getInProgressSavedGames,
  getUserStats,
  queryLeaderboard,
  type GameHistoryEntry,
  type LeaderboardMode,
  type LocalLeaderboardEntry,
  type SavedGameState,
  type UserStats,
} from "@/lib/localDb";

const router = useRouter();
const game = useGameStore();

const activeTab = ref<string>("all");
const leaderboardMode = ref<LeaderboardMode>("global");
const leaderboard = ref<LocalLeaderboardEntry[]>([]);
const history = ref<GameHistoryEntry[]>([]);
const myStats = ref<UserStats | null>(null);
const loadingBoard = ref(false);
const inProgressGames = ref<SavedGameState[]>([]);

const difficulties = ["all", "easy", "medium", "hard", "expert"];
const statDifficulties: Difficulty[] = ["easy", "medium", "hard", "expert"];

const difficultyColors: Record<string, string> = {
  easy: "#34d399",
  medium: "#f59e0b",
  hard: "#f87171",
  expert: "#c084fc",
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(status: GameHistoryEntry["status"]): string {
  if (status === "completed") return "Completed";
  if (status === "abandoned") return "Abandoned";
  return "In Progress";
}

function fetchLeaderboard(difficulty?: string) {
  loadingBoard.value = true;
  leaderboard.value = queryLeaderboard({
    mode: leaderboardMode.value,
    difficulty,
    limit: 50,
  });
  loadingBoard.value = false;
}

function fetchDashboardData() {
  myStats.value = getUserStats();
  history.value = getGameHistory(60);
  inProgressGames.value = getInProgressSavedGames();
}

async function continueGame(id: string) {
  await game.resumeSavedGame(id);
  router.push("/");
}

function switchTab(tab: string) {
  activeTab.value = tab;
  fetchLeaderboard(tab);
}

function switchMode(mode: LeaderboardMode) {
  leaderboardMode.value = mode;
  fetchLeaderboard(activeTab.value);
}

onMounted(() => {
  fetchLeaderboard();
  fetchDashboardData();
});
</script>

<template>
  <div class="dashboard container">
    <header class="hero card">
      <div>
        <h2 class="page-title">Your Dashboard</h2>
        <p class="hero-sub">
          Track your local progress, recent sessions, and best times.
        </p>
      </div>
      <RouterLink class="btn btn-primary" to="/">Start New Puzzle</RouterLink>
    </header>

    <section v-if="inProgressGames.length > 0" class="in-progress-section card">
      <h3 class="section-title section-title--compact">Continue Playing</h3>
      <ul class="in-progress-list">
        <li v-for="sg in inProgressGames" :key="sg.id" class="in-progress-item">
          <div class="in-progress-info">
            <span
              class="difficulty-pill"
              :style="{ color: difficultyColors[sg.difficulty], borderColor: difficultyColors[sg.difficulty] }"
            >
              {{ sg.difficulty }}
            </span>
            <span class="history-time mono">{{ formatTime(sg.elapsed) }}</span>
            <span class="history-date">{{ formatDate(sg.startedAt) }}</span>
          </div>
          <button class="btn btn-primary btn-sm" @click="continueGame(sg.id)">
            Continue Playing
          </button>
        </li>
      </ul>
    </section>

    <section class="stats-section" v-if="myStats">
      <h3 class="section-title">Overview</h3>
      <div class="stats-grid">
        <article class="stat-card card">
          <span class="stat-number">{{ myStats.totalCompleted }}</span>
          <span class="stat-label">Completed Games</span>
        </article>
        <article class="stat-card card">
          <span class="stat-number">{{ myStats.totalPlayed }}</span>
          <span class="stat-label">Games Played</span>
        </article>
      </div>

      <div class="difficulty-stats">
        <article
          v-for="diff in statDifficulties"
          :key="diff"
          class="diff-stat card"
        >
          <div class="diff-stat-header">
            <span
              class="diff-stat-dot"
              :style="{ background: difficultyColors[diff] }"
            ></span>
            <span class="diff-stat-name">{{ diff }}</span>
          </div>
          <div class="diff-stat-body">
            <div class="diff-stat-item">
              <span class="diff-stat-label">Played</span>
              <span class="diff-stat-value">
                {{ myStats.byDifficulty[diff]?.played ?? 0 }}
              </span>
            </div>
            <div class="diff-stat-item">
              <span class="diff-stat-label">Best</span>
              <span class="diff-stat-value mono">
                {{
                  myStats.byDifficulty[diff]?.bestTime != null
                    ? formatTime(myStats.byDifficulty[diff].bestTime!)
                    : "--:--"
                }}
              </span>
            </div>
            <div class="diff-stat-item">
              <span class="diff-stat-label">Average</span>
              <span class="diff-stat-value mono">
                {{
                  myStats.byDifficulty[diff]?.avgTime != null
                    ? formatTime(myStats.byDifficulty[diff].avgTime!)
                    : "--:--"
                }}
              </span>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section class="history-section card">
      <div class="history-header">
        <h3 class="section-title section-title--compact">Past Games</h3>
        <span class="history-count">{{ history.length }} saved</span>
      </div>

      <div v-if="history.length > 0" class="history-list">
        <article v-for="entry in history" :key="entry.id" class="history-item">
          <div class="history-main">
            <span
              class="difficulty-pill"
              :style="{
                color: difficultyColors[entry.difficulty],
                borderColor: difficultyColors[entry.difficulty],
              }"
            >
              {{ entry.difficulty }}
            </span>
            <span class="history-time mono">{{ formatTime(entry.elapsed) }}</span>
          </div>
          <div class="history-meta">
            <span
              class="status-pill"
              :class="{
                'status-pill--completed': entry.status === 'completed',
                'status-pill--abandoned': entry.status === 'abandoned',
                'status-pill--in-progress': entry.status === 'in_progress',
              }"
            >
              {{ statusLabel(entry.status) }}
            </span>
            <span class="history-date">{{ formatDate(entry.startedAt) }}</span>
          </div>
        </article>
      </div>
      <p v-else class="empty-state">
        No local games yet. Start a puzzle to build your history.
      </p>
    </section>

    <section class="leaderboard-section card">
      <div class="leaderboard-header">
        <h3 class="section-title section-title--compact">Best Times</h3>
        <div class="mode-toggle">
          <button
            class="mode-btn"
            :class="{ 'mode-btn--active': leaderboardMode === 'global' }"
            @click="switchMode('global')"
          >
            Global
          </button>
          <button
            class="mode-btn"
            :class="{ 'mode-btn--active': leaderboardMode === 'daily' }"
            @click="switchMode('daily')"
          >
            Daily
          </button>
        </div>
      </div>

      <div class="tabs">
        <button
          v-for="tab in difficulties"
          :key="tab"
          class="tab"
          :class="{ 'tab--active': activeTab === tab }"
          @click="switchTab(tab)"
        >
          {{ tab === "all" ? "All" : tab }}
        </button>
      </div>

      <div class="leaderboard-table-wrap">
        <table class="leaderboard-table" v-if="leaderboard.length > 0">
          <thead>
            <tr>
              <th>#</th>
              <th>Difficulty</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(entry, i) in leaderboard" :key="entry.gameId">
              <td class="rank">{{ i + 1 }}</td>
              <td>
                <span
                  class="difficulty-pill"
                  :style="{
                    color: difficultyColors[entry.difficulty],
                    borderColor: difficultyColors[entry.difficulty],
                  }"
                >
                  {{ entry.difficulty }}
                </span>
              </td>
              <td class="mono">{{ formatTime(entry.time) }}</td>
            </tr>
          </tbody>
        </table>

        <p v-else class="empty-state">
          {{
            loadingBoard
              ? "Loading..."
              : "No entries yet. Complete a puzzle to populate this board."
          }}
        </p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.dashboard {
  padding-top: 10px;
  padding-bottom: 26px;
  display: grid;
  gap: 14px;
}

.hero {
  padding: 18px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.page-title {
  font-size: clamp(1.3rem, 3vw, 1.75rem);
  line-height: 1.1;
  margin-bottom: 4px;
}

.hero-sub {
  color: var(--md-sys-color-on-surface-variant);
  font-size: 0.92rem;
}

.section-title {
  font-size: 1.02rem;
  margin-bottom: 10px;
}

.section-title--compact {
  margin-bottom: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 10px;
}

.stat-card {
  text-align: center;
  padding: 20px 14px;
}

.stat-number {
  display: block;
  font-size: 1.9rem;
  line-height: 1;
  font-weight: 700;
  color: var(--md-sys-color-primary);
}

.stat-label {
  display: block;
  margin-top: 6px;
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--md-sys-color-on-surface-variant);
}

.difficulty-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.diff-stat {
  padding: 12px;
}

.diff-stat-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.diff-stat-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.diff-stat-name {
  text-transform: capitalize;
  font-weight: 600;
}

.diff-stat-body {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.diff-stat-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
}

.diff-stat-label {
  color: var(--md-sys-color-on-surface-variant);
}

.diff-stat-value {
  font-weight: 700;
}

.history-section {
  padding: 14px;
}

.in-progress-section {
  padding: 14px;
}

.in-progress-list {
  list-style: none;
  padding: 0;
  margin: 10px 0 0;
  display: grid;
  gap: 8px;
}

.in-progress-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--radius-sm);
  background: var(--md-sys-color-surface-container-low);
}

.in-progress-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.history-count {
  font-size: 0.8rem;
  color: var(--md-sys-color-on-surface-variant);
}

.history-list {
  display: grid;
  gap: 8px;
  max-height: 360px;
  overflow: auto;
  padding-right: 2px;
}

.history-item {
  border: 1px solid var(--md-sys-color-outline-variant);
  background: var(--md-sys-color-surface-container-low);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.history-main,
.history-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.history-time {
  font-size: 0.86rem;
  font-weight: 600;
}

.history-date {
  color: var(--md-sys-color-on-surface-variant);
  font-size: 0.78rem;
}

.status-pill {
  font-size: 0.7rem;
  padding: 3px 8px;
  border-radius: var(--radius-pill);
  font-weight: 600;
}

.status-pill--completed {
  background: color-mix(in srgb, #34d399 20%, transparent);
  color: #34d399;
}

.status-pill--abandoned {
  background: color-mix(in srgb, #f87171 20%, transparent);
  color: #f87171;
}

.status-pill--in-progress {
  background: color-mix(in srgb, var(--md-sys-color-primary) 18%, transparent);
  color: var(--md-sys-color-primary);
}

.leaderboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  gap: 8px;
}

.mode-toggle {
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--md-sys-color-outline-variant);
  background: var(--md-sys-color-surface-container-high);
}

.mode-btn {
  min-height: 32px;
  border: none;
  border-radius: var(--radius-pill);
  padding: 0 14px;
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.mode-btn--active {
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.tab {
  min-height: 32px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--md-sys-color-outline);
  padding: 0 12px;
  background: var(--md-sys-color-surface-container-lowest);
  color: var(--md-sys-color-on-surface-variant);
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: capitalize;
  cursor: pointer;
}

.tab--active {
  border-color: var(--md-sys-color-secondary-container);
  background: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.leaderboard-table-wrap {
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.leaderboard-table {
  width: 100%;
  border-collapse: collapse;
}

.leaderboard-table th {
  text-align: left;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--md-sys-color-on-surface-variant);
  padding: 10px 12px;
  background: var(--md-sys-color-surface-container-high);
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
}

.leaderboard-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  font-size: 0.86rem;
}

.leaderboard-table tr:last-child td {
  border-bottom: none;
}

.rank {
  width: 44px;
  color: var(--md-sys-color-on-surface-variant);
  font-weight: 700;
}

.difficulty-pill {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  border-radius: var(--radius-pill);
  border: 1px solid;
  padding: 0 9px;
  font-size: 0.74rem;
  font-weight: 600;
  text-transform: capitalize;
}

.empty-state {
  padding: 24px 12px;
  text-align: center;
  color: var(--md-sys-color-on-surface-variant);
  font-size: 0.88rem;
}

@media (max-width: 980px) {
  .difficulty-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .hero {
    padding: 14px;
    flex-direction: column;
    align-items: flex-start;
  }

  .hero .btn {
    width: 100%;
  }

  .stats-grid,
  .difficulty-stats {
    grid-template-columns: 1fr;
  }

  .history-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .in-progress-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .in-progress-item .btn {
    width: 100%;
  }

  .history-main,
  .history-meta {
    width: 100%;
    justify-content: space-between;
  }

  .leaderboard-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
