<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useGameStore } from "@/stores/game";
import SudokuBoard from "@/components/SudokuBoard.vue";
import NumberPad from "@/components/NumberPad.vue";
import DifficultySelector from "@/components/DifficultySelector.vue";
import { getInProgressSavedGames, type SavedGameState } from "@/lib/localDb";
import { formatDate, formatTime } from "@/lib/utils";

const game = useGameStore();
const router = useRouter();
const loading = ref(false);
const savedGames = ref<SavedGameState[]>([]);

const isPlayingView = computed(() => game.status !== "idle");

function loadSavedGames() {
  savedGames.value = getInProgressSavedGames();
}

async function startGame(difficulty: string) {
  loading.value = true;
  try {
    await game.newGame(difficulty as "easy" | "medium" | "hard" | "expert");
  } catch (err) {
    console.error("Failed to start game:", err);
  } finally {
    loading.value = false;
  }
}

async function continueGame(id: string) {
  await game.resumeSavedGame(id);
}

async function abandon() {
  if (!confirm("Are you sure you want to give up?")) return;
  await game.abandonGame();
}

function newGameFromFinish() {
  game.reset();
  loadSavedGames();
}

function goToDashboard() {
  router.push("/dashboard");
}

const difficultyColors: Record<string, string> = {
  easy: "#34d399",
  medium: "#f59e0b",
  hard: "#f87171",
  expert: "#c084fc",
};

onMounted(() => {
  loadSavedGames();
});
</script>

<template>
  <div class="game-page container" :class="{ 'game-page--playing': isPlayingView }">
    <section v-if="game.status === 'idle'" class="new-game card">
      <h2 class="page-title">New Game</h2>
      <p class="page-subtitle">Choose your challenge and begin.</p>
      <DifficultySelector :loading="loading" @select="startGame" />
    </section>

    <section v-if="game.status === 'idle' && savedGames.length > 0" class="saved-games card">
      <h3 class="saved-games-title">Continue a Game</h3>
      <ul class="saved-games-list">
        <li v-for="sg in savedGames" :key="sg.id" class="saved-game-item">
          <div class="saved-game-info">
            <span
              class="difficulty-pill"
              :style="{ color: difficultyColors[sg.difficulty], borderColor: difficultyColors[sg.difficulty] }"
            >
              {{ sg.difficulty }}
            </span>
            <span class="saved-game-time mono">{{ formatTime(sg.elapsed) }}</span>
            <span class="saved-game-date">{{ formatDate(sg.startedAt) }}</span>
          </div>
          <button class="btn btn-primary btn-sm" @click="continueGame(sg.id)">
            Continue
          </button>
        </li>
      </ul>
    </section>

    <section v-else class="play-shell">
      <header class="play-hud card">
        <div class="hud-chip">
          <span class="hud-chip__label">Difficulty</span>
          <span
            class="hud-chip__value"
            :style="{ color: difficultyColors[game.difficulty] }"
          >
            {{ game.difficulty }}
          </span>
        </div>
        <div class="hud-chip">
          <span class="hud-chip__label">Mode</span>
          <span class="hud-chip__value">
            {{ game.pencilMode ? "Notes" : "Normal" }}
          </span>
        </div>
        <div class="hud-chip">
          <span class="hud-chip__label">Time</span>
          <span class="hud-chip__value mono">{{ game.formattedTime }}</span>
        </div>
      </header>

      <div class="play-layout">
        <section class="board-stage card">
          <SudokuBoard />
          <Transition name="fade">
            <div v-if="game.isPaused" class="pause-overlay" @click="game.resumeGame()">
              <div class="pause-content">
                <div class="pause-icon">⏸</div>
                <h3>Paused</h3>
                <p>Tap to continue</p>
              </div>
            </div>
          </Transition>
        </section>

        <aside class="controls-stage card">
          <div class="desktop-controls">
            <NumberPad />
          </div>
          <div class="game-actions" v-if="game.isPlaying">
            <button class="btn btn-secondary btn-sm" @click="game.togglePause()">
              {{ game.isPaused ? "Resume" : "Pause" }}
            </button>
            <button class="btn btn-danger btn-sm" @click="abandon">Give Up</button>
          </div>
        </aside>
      </div>

      <div v-if="game.isPlaying" class="mobile-toolbar">
        <button
          class="mobile-toolbar__btn"
          :class="{ 'mobile-toolbar__btn--active': game.pencilMode }"
          @click="game.togglePencilMode()"
        >
          Notes
        </button>
        <button
          class="mobile-toolbar__btn"
          :class="{ 'mobile-toolbar__btn--active': game.greyOutCompleted }"
          @click="game.toggleGreyOutCompleted()"
        >
          Grey
        </button>
        <button class="mobile-toolbar__btn" @click="game.togglePause()">
          {{ game.isPaused ? "Resume" : "Pause" }}
        </button>
        <button class="mobile-toolbar__btn mobile-toolbar__btn--danger" @click="abandon">
          Give Up
        </button>
      </div>
    </section>

    <Transition name="fade">
      <div v-if="game.isFinished" class="completion-overlay">
        <div class="completion-modal card">
          <template v-if="game.status === 'completed'">
            <div class="result-icon result-win">&#10003;</div>
            <h2>Puzzle Solved</h2>
            <p class="result-sub">
              Great run in <span class="mono">{{ game.formattedTime }}</span> on
              <span class="difficulty-inline" :style="{ color: difficultyColors[game.difficulty] }">
                {{ game.difficulty }}
              </span>.
            </p>
          </template>
          <template v-else>
            <div class="result-icon result-lose">&#10007;</div>
            <h2>Game Abandoned</h2>
            <p class="result-sub">The complete solution is visible on the board.</p>
          </template>

          <div class="completion-actions">
            <button class="btn btn-secondary" @click="newGameFromFinish">
              New Puzzle
            </button>
            <button class="btn btn-primary" @click="goToDashboard">
              Open Dashboard
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.game-page {
  padding-top: 8px;
  padding-bottom: 20px;
}

.game-page--playing {
  padding-bottom: 30px;
}

.new-game {
  width: min(100%, 760px);
  margin: 14px auto 0;
  text-align: center;
  display: grid;
  gap: 10px;
  padding: 24px;
}

.saved-games {
  width: min(100%, 760px);
  margin: 0 auto;
  padding: 18px 20px;
}

.saved-games-title {
  font-size: 1rem;
  margin-bottom: 12px;
}

.saved-games-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 8px;
}

.saved-game-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--radius-sm);
  background: var(--md-sys-color-surface-container-low);
}

.saved-game-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.saved-game-time {
  font-size: 0.86rem;
  font-weight: 600;
}

.saved-game-date {
  font-size: 0.78rem;
  color: var(--md-sys-color-on-surface-variant);
}

@media (max-width: 480px) {
  .saved-game-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .saved-game-item .btn {
    width: 100%;
  }
}

.page-title {
  font-size: clamp(1.4rem, 2.6vw, 2rem);
  line-height: 1.1;
}

.page-subtitle {
  color: var(--md-sys-color-on-surface-variant);
}

.play-shell {
  display: grid;
  gap: 12px;
}

.play-hud {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  padding: 12px;
  min-width: 0;
}

.hud-chip {
  border: 1px solid var(--md-sys-color-outline-variant);
  background: var(--md-sys-color-surface-container-high);
  border-radius: 12px;
  padding: 10px 12px;
}

.hud-chip__label {
  display: block;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--md-sys-color-on-surface-variant);
  margin-bottom: 2px;
  font-weight: 600;
}

.hud-chip__value {
  font-size: 1rem;
  font-weight: 700;
  text-transform: capitalize;
}

.play-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 336px;
  gap: 12px;
  align-items: start;
}

.board-stage {
  position: relative;
  display: grid;
  place-items: center;
  padding: 10px;
  min-width: 0;
}

.controls-stage {
  display: grid;
  gap: 12px;
  position: sticky;
  top: 84px;
}

.game-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.pause-overlay {
  position: absolute;
  inset: 10px;
  border-radius: 16px;
  background: color-mix(in srgb, var(--md-sys-color-inverse-surface) 78%, transparent);
  backdrop-filter: blur(5px);
  z-index: 12;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.pause-content {
  text-align: center;
  color: var(--md-sys-color-inverse-on-surface);
}

.pause-icon {
  font-size: 2.4rem;
  margin-bottom: 4px;
}

.pause-content h3 {
  font-size: 1.2rem;
}

.pause-content p {
  font-size: 0.86rem;
  opacity: 0.82;
}

.completion-overlay {
  position: fixed;
  inset: 0;
  z-index: 120;
  padding: 18px;
  background: color-mix(in srgb, var(--md-sys-color-inverse-surface) 62%, transparent);
  display: grid;
  place-items: center;
  backdrop-filter: blur(6px);
}

.completion-modal {
  width: min(100%, 460px);
  text-align: center;
  display: grid;
  gap: 14px;
  padding: 24px;
}

.result-icon {
  width: 72px;
  height: 72px;
  margin: 0 auto;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 700;
}

.result-win {
  color: var(--md-sys-color-on-tertiary-container);
  background: var(--md-sys-color-tertiary-container);
}

.result-lose {
  color: var(--md-sys-color-on-error-container);
  background: var(--md-sys-color-error-container);
}

.result-sub {
  color: var(--md-sys-color-on-surface-variant);
  font-size: 0.9rem;
}

.difficulty-inline {
  text-transform: capitalize;
  font-weight: 600;
}

.completion-actions {
  display: grid;
  gap: 8px;
  grid-template-columns: 1fr 1fr;
}

@media (max-width: 1080px) {
  .play-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .controls-stage {
    position: static;
  }
}

@media (max-width: 760px) {
  .game-page--playing {
    padding-bottom: calc(174px + env(safe-area-inset-bottom));
  }

  .play-hud {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 7px;
    padding: 8px;
  }

  .hud-chip {
    border-radius: 10px;
    padding: 8px 9px;
  }

  .hud-chip__label {
    font-size: 0.62rem;
    margin-bottom: 1px;
  }

  .hud-chip__value {
    font-size: 0.84rem;
    line-height: 1.25;
  }

  .play-layout {
    gap: 10px;
  }

  .board-stage {
    padding: 8px;
  }

  .controls-stage {
    display: none;
  }

  .completion-actions,
  .game-actions {
    grid-template-columns: 1fr;
  }

  .mobile-toolbar {
    position: fixed;
    left: 10px;
    right: 10px;
    bottom: calc(84px + env(safe-area-inset-bottom));
    z-index: 106;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
    padding: 8px;
    border-radius: 16px;
    border: 1px solid var(--md-sys-color-outline-variant);
    background: color-mix(
      in srgb,
      var(--md-sys-color-surface-container-high) 94%,
      transparent
    );
    backdrop-filter: blur(12px);
    box-shadow: var(--elev-3);
  }

  .mobile-toolbar__btn {
    min-height: 38px;
    border: 1px solid var(--md-sys-color-outline-variant);
    border-radius: 10px;
    background: var(--md-sys-color-surface-container-highest);
    color: var(--md-sys-color-on-surface-variant);
    font-size: 0.74rem;
    font-weight: 700;
    letter-spacing: 0.03em;
    cursor: pointer;
  }

  .mobile-toolbar__btn--active {
    border-color: var(--md-sys-color-primary);
    background: var(--md-sys-color-primary-container);
    color: var(--md-sys-color-on-primary-container);
  }

  .mobile-toolbar__btn--danger {
    border-color: color-mix(in srgb, var(--md-sys-color-error) 35%, var(--md-sys-color-outline-variant));
    color: var(--md-sys-color-error);
  }
}

@media (min-width: 761px) {
  .mobile-toolbar {
    display: none;
  }
}
</style>
