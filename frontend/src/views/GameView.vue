<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useGameStore } from "@/stores/game";
import SudokuBoard from "@/components/SudokuBoard.vue";
import NumberPad from "@/components/NumberPad.vue";
import DifficultySelector from "@/components/DifficultySelector.vue";

const game = useGameStore();
const router = useRouter();
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

function goToDashboard() {
    router.push("/dashboard");
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

        </div>

        <!-- Completion modal overlay -->
        <Transition name="fade">
            <div v-if="game.isFinished" class="completion-overlay">
                <div class="completion-modal card">
                    <template v-if="game.status === 'completed'">
                        <div class="result-icon result-win">&#10003;</div>
                        <h2>Puzzle Solved!</h2>
                        <div class="result-stats">
                            <div class="result-stat">
                                <span class="result-stat-label">Difficulty</span>
                                <span class="result-stat-value difficulty-badge" :style="{ color: difficultyColors[game.difficulty] }">
                                    {{ game.difficulty }}
                                </span>
                            </div>
                            <div class="result-stat">
                                <span class="result-stat-label">Time</span>
                                <span class="result-stat-value mono">{{
                                    game.formattedTime
                                }}</span>
                            </div>
                        </div>
                    </template>

                    <template v-else>
                        <div class="result-icon result-lose">&#10007;</div>
                        <h2>Game Abandoned</h2>
                        <p class="result-sub">
                            The solution has been revealed on the board.
                        </p>
                    </template>

                    <div class="completion-actions">
                        <button class="btn btn-secondary" @click="newGameFromFinish">
                            Return to Game Selection
                        </button>
                        <button class="btn btn-primary" @click="goToDashboard">
                            Go to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        </Transition>
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

/* ── Completion modal overlay ────────────────────────────────────────── */

.completion-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
}

.completion-modal {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    max-width: 480px;
    width: 100%;
    padding: 40px 32px;
    animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.result-icon {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    font-weight: 700;
}

.result-win {
    background: rgba(76, 175, 80, 0.15);
    color: var(--success);
    border: 3px solid var(--success);
}

.result-lose {
    background: rgba(239, 83, 80, 0.15);
    color: var(--error);
    border: 3px solid var(--error);
}

.completion-modal h2 {
    font-size: 1.8rem;
    margin: 0;
}

.result-sub {
    color: var(--text-secondary);
    font-size: 0.95rem;
    margin: -8px 0;
}

.result-stats {
    display: flex;
    gap: 32px;
    justify-content: center;
    padding: 12px 0;
}

.result-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
}

.result-stat-label {
    font-size: 0.75rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.result-stat-value {
    font-size: 1.3rem;
    font-weight: 700;
}

.difficulty-badge {
    text-transform: capitalize;
}

.completion-actions {
    display: flex;
    gap: 12px;
    width: 100%;
    margin-top: 8px;
}

.completion-actions .btn {
    flex: 1;
}

/* ── Transitions ─────────────────────────────────────────────────────── */

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
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
