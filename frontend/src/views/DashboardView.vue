<script setup lang="ts">
import { ref, onMounted } from "vue";
import api from "@/api";

interface LeaderboardEntry {
  gameId: string;
  userId: string;
  username: string;
  difficulty: string;
  time: number;
  mistakes: number;
  completedAt: string;
}

interface DifficultyStats {
  played: number;
  bestTime: number | null;
  avgTime: number | null;
}

interface UserStats {
  username: string;
  totalPlayed: number;
  totalCompleted: number;
  totalMistakes: number;
  byDifficulty: Record<string, DifficultyStats>;
}

const activeTab = ref<string>("all");
const leaderboard = ref<LeaderboardEntry[]>([]);
const myStats = ref<UserStats | null>(null);
const loadingBoard = ref(false);
const loadingStats = ref(false);

const difficulties = ["all", "easy", "medium", "hard", "expert"];

const difficultyColors: Record<string, string> = {
  easy: "#4caf50",
  medium: "#ffa726",
  hard: "#ef5350",
  expert: "#ab47bc",
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

async function fetchLeaderboard(difficulty?: string) {
  loadingBoard.value = true;
  try {
    const params = difficulty && difficulty !== "all" ? { difficulty } : {};
    const { data } = await api.get("/leaderboard", { params });
    leaderboard.value = data.entries;
  } catch (err) {
    console.error("Failed to load leaderboard:", err);
  } finally {
    loadingBoard.value = false;
  }
}

async function fetchMyStats() {
  loadingStats.value = true;
  try {
    const { data } = await api.get("/leaderboard/me");
    myStats.value = data;
  } catch (err) {
    console.error("Failed to load stats:", err);
  } finally {
    loadingStats.value = false;
  }
}

function switchTab(tab: string) {
  activeTab.value = tab;
  fetchLeaderboard(tab);
}

onMounted(() => {
  fetchLeaderboard();
  fetchMyStats();
});
</script>

<template>
  <div class="dashboard container">
    <h2 class="page-title">Dashboard</h2>

    <!-- Personal stats -->
    <section class="stats-section" v-if="myStats">
      <h3 class="section-title">Your Stats</h3>
      <div class="stats-grid">
        <div class="stat-card card">
          <span class="stat-number">{{ myStats.totalCompleted }}</span>
          <span class="stat-label">Games Completed</span>
        </div>
        <div class="stat-card card">
          <span class="stat-number">{{ myStats.totalPlayed }}</span>
          <span class="stat-label">Games Played</span>
        </div>
        <div class="stat-card card">
          <span class="stat-number">{{ myStats.totalMistakes }}</span>
          <span class="stat-label">Total Mistakes</span>
        </div>
      </div>

      <div class="difficulty-stats">
        <div
          v-for="diff in ['easy', 'medium', 'hard', 'expert']"
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
              <span class="diff-stat-label">Avg</span>
              <span class="diff-stat-value mono">
                {{
                  myStats.byDifficulty[diff]?.avgTime != null
                    ? formatTime(myStats.byDifficulty[diff].avgTime!)
                    : "--:--"
                }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Leaderboard -->
    <section class="leaderboard-section">
      <h3 class="section-title">Global Leaderboard</h3>

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
              <th>Player</th>
              <th>Difficulty</th>
              <th>Time</th>
              <th>Mistakes</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(entry, i) in leaderboard" :key="entry.gameId">
              <td class="rank">{{ i + 1 }}</td>
              <td class="player">{{ entry.username }}</td>
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
              <td class="mono">{{ entry.mistakes }}</td>
            </tr>
          </tbody>
        </table>

        <p v-else class="empty-state">
          {{ loadingBoard ? "Loading..." : "No entries yet. Be the first!" }}
        </p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.dashboard {
  padding-top: 32px;
  padding-bottom: 48px;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 28px;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 14px;
}

/* ── Stats grid ──────────────────────────────────────────────────────── */

.stats-section {
  margin-bottom: 40px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  text-align: center;
  padding: 20px 16px;
}

.stat-number {
  display: block;
  font-size: 1.8rem;
  font-weight: 700;
  font-family: var(--font-mono);
  color: var(--accent);
}

.stat-label {
  display: block;
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-top: 4px;
}

/* ── Difficulty breakdown ────────────────────────────────────────────── */

.difficulty-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.diff-stat {
  padding: 14px;
}

.diff-stat-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.diff-stat-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.diff-stat-name {
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: capitalize;
}

.diff-stat-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.diff-stat-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
}

.diff-stat-label {
  color: var(--text-muted);
}

.diff-stat-value {
  font-weight: 600;
}

.mono {
  font-family: var(--font-mono);
}

/* ── Tabs ────────────────────────────────────────────────────────────── */

.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
}

.tab {
  padding: 6px 16px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 500;
  text-transform: capitalize;
  cursor: pointer;
  transition: all var(--transition);
  font-family: var(--font-sans);
}

.tab:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.tab--active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

/* ── Leaderboard table ───────────────────────────────────────────────── */

.leaderboard-table-wrap {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.leaderboard-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.leaderboard-table th {
  padding: 10px 14px;
  text-align: left;
  font-size: 0.7rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--border);
  background: var(--bg-secondary);
}

.leaderboard-table td {
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
}

.leaderboard-table tr:last-child td {
  border-bottom: none;
}

.leaderboard-table tr:hover td {
  background: var(--bg-hover);
}

.rank {
  font-weight: 700;
  color: var(--text-muted);
  width: 40px;
}

.player {
  font-weight: 600;
}

.difficulty-pill {
  display: inline-block;
  padding: 2px 10px;
  border: 1px solid;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: capitalize;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.9rem;
}

/* ── Responsive ──────────────────────────────────────────────────────── */

@media (max-width: 700px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .difficulty-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 500px) {
  .difficulty-stats {
    grid-template-columns: 1fr;
  }
}
</style>
