<script setup lang="ts">
import { ref } from "vue";
import { useGameStore } from "@/stores/game";
import SudokuBoard from "@/components/SudokuBoard.vue";
import NumberPad from "@/components/NumberPad.vue";
import DifficultySelector from "@/components/DifficultySelector.vue";

const game = useGameStore();
const loading = ref(false);

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

async function abandon() {
    if (!confirm("Are you sure you want to give up?")) return;
    await game.abandonGame();
}

function newGameFromFinish() {
    game.reset();
}

const difficultyColors: Record<string, string> = {
    easy: "#4caf50",
    medium: "#ffa726",
    hard: "#ef5350",
    expert: "#ab47bc",
};
</script>

<template>
    <div class="game-page container">
        <!-- Difficulty selection screen -->
        <div v-if="game.status === 'idle'" class="game-start">
            <h2 class="page-title">New Game</h2>
            <p class="page-subtitle">Choose your difficulty</p>
            <DifficultySelector :loading="loading" @select="startGame" />
        </div>

        <!-- Active game -->
        <div v-else class="game-active">
            <!-- Game info bar -->
            <div class="game-info">
                <div class="info-item">
                    <span class="info-label">Difficulty</span>
                    <span
                        class="info-value difficulty-badge"
                        :style="{ color: difficultyColors[game.difficulty] }"
                    >
                        {{ game.difficulty }}
                    </span>
                </div>
                <div class="info-item">
                    <span class="info-label">Mode</span>
                    <span
                        class="info-value mode-badge"
                        :class="{ 'mode-badge--pencil': game.pencilMode }"
                    >
                        {{ game.pencilMode ? "Notes" : "Normal" }}
                    </span>
                </div>
                <div class="info-item">
                    <span class="info-label">Time</span>
                    <span class="info-value mono">{{
                        game.formattedTime
                    }}</span>
                </div>
            </div>

            <!-- Board + controls -->
            <div class="game-layout">
                <div class="board-container">
                    <SudokuBoard />
                    
                    <!-- Pause overlay -->
                    <Transition name="fade">
                        <div v-if="game.isPaused" class="pause-overlay" @click="game.resumeGame()">
                            <div class="pause-content">
                                <div class="pause-icon">⏸</div>
                                <h3>Game Paused</h3>
                                <p>Click to resume</p>
                            </div>
                        </div>
                    </Transition>
                </div>

                <div class="game-sidebar">
                    <NumberPad />

                    <div class="game-actions" v-if="game.isPlaying">
                        <button 
                            class="btn btn-secondary btn-sm" 
                            @click="game.togglePause()"
                        >
                            {{ game.isPaused ? "Resume" : "Pause" }}
                        </button>
                        <button class="btn btn-danger btn-sm" @click="abandon">
                            Give Up
                        </button>
                    </div>
                </div>
            </div>

            <!-- Completion overlay -->
            <Transition name="fade">
                <div v-if="game.isFinished" class="game-result card">
                    <template v-if="game.status === 'completed'">
                        <div class="result-icon result-win">&#10003;</div>
                        <h3>Puzzle Solved!</h3>
                        <div class="result-stats">
                            <div class="result-stat">
                                <span class="result-stat-label">Time</span>
                                <span class="result-stat-value">{{
                                    game.formattedTime
                                }}</span>
                            </div>
                        </div>
                    </template>

                    <template v-else>
                        <div class="result-icon result-lose">&#10007;</div>
                        <h3>Game Abandoned</h3>
                        <p class="result-sub">
                            The solution has been revealed above.
                        </p>
                    </template>

                    <button class="btn btn-primary" @click="newGameFromFinish">
                        Play Again
                    </button>
                </div>
            </Transition>
        </div>
    </div>
</template>

<style scoped>
.game-page {
    padding-top: 32px;
    padding-bottom: 48px;
}

.game-start {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding-top: 60px;
}

.page-title {
    font-size: 1.5rem;
    font-weight: 700;
}

.page-subtitle {
    color: var(--text-secondary);
    font-size: 0.9rem;
    margin-bottom: 8px;
}

/* ── Info bar ────────────────────────────────────────────────────────── */

.game-info {
    display: flex;
    gap: 24px;
    margin-bottom: 24px;
    padding: 12px 16px;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
}

.info-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.info-label {
    font-size: 0.7rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.info-value {
    font-size: 0.95rem;
    font-weight: 600;
}

.difficulty-badge {
    text-transform: capitalize;
}

.mono {
    font-family: var(--font-mono);
}

.mode-badge {
    text-transform: capitalize;
    color: var(--text-secondary);
}

.mode-badge--pencil {
    color: var(--accent);
}

/* ── Layout ──────────────────────────────────────────────────────────── */

.game-layout {
    display: flex;
    gap: 32px;
    align-items: flex-start;
}

.board-container {
    position: relative;
}

.pause-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm);
    cursor: pointer;
    z-index: 10;
}

.pause-content {
    text-align: center;
    color: #fff;
}

.pause-icon {
    font-size: 3rem;
    margin-bottom: 12px;
}

.pause-overlay h3 {
    font-size: 1.3rem;
    margin-bottom: 8px;
}

.pause-overlay p {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.7);
}

.game-sidebar {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.game-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

/* ── Result overlay ──────────────────────────────────────────────────── */

.game-result {
    margin-top: 24px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    max-width: 340px;
}

.result-icon {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.6rem;
    font-weight: 700;
}

.result-win {
    background: rgba(76, 175, 80, 0.15);
    color: var(--success);
    border: 2px solid var(--success);
}

.result-lose {
    background: rgba(239, 83, 80, 0.15);
    color: var(--error);
    border: 2px solid var(--error);
}

.game-result h3 {
    font-size: 1.2rem;
}

.result-sub {
    color: var(--text-secondary);
    font-size: 0.85rem;
}

.result-stats {
    display: flex;
    gap: 24px;
}

.result-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
}

.result-stat-label {
    font-size: 0.75rem;
    color: var(--text-muted);
    text-transform: uppercase;
}

.result-stat-value {
    font-size: 1.1rem;
    font-weight: 700;
    font-family: var(--font-mono);
}

/* ── Responsive ──────────────────────────────────────────────────────── */

@media (max-width: 680px) {
    .game-layout {
        flex-direction: column;
        align-items: center;
    }

    .game-sidebar {
        align-items: center;
    }

    .game-info {
        justify-content: center;
    }
}
</style>
