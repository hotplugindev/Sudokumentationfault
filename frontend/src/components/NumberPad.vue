<script setup lang="ts">
import { computed } from "vue";
import { useGameStore } from "@/stores/game";

const game = useGameStore();

function placeNumber(num: number) {
    if (!game.selectedCell || !game.isPlaying) return;
    const { row, col } = game.selectedCell;
    if (game.locked[row]?.[col]) return;
    game.makeMove(row, col, num);
}

function erase() {
    if (!game.selectedCell || !game.isPlaying) return;
    const { row, col } = game.selectedCell;
    if (game.locked[row]?.[col]) return;
    game.makeMove(row, col, 0);
}

function placeNote(num: number) {
    if (!game.selectedCell || !game.isPlaying) return;
    const { row, col } = game.selectedCell;
    if (game.locked[row]?.[col]) return;
    game.toggleNote(row, col, num);
}

function eraseNotes() {
    if (!game.selectedCell || !game.isPlaying) return;
    const { row, col } = game.selectedCell;
    if (game.locked[row]?.[col]) return;
    game.clearNotes(row, col);
}

// Count how many of each number are missing from the board
function getMissingCount(num: number): number {
    let count = 0;
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (game.current[row]?.[col] === num) {
                count++;
            }
        }
    }
    return 9 - count;
}

const missingCounts = computed(() => {
    const counts: Record<number, number> = {};
    for (let n = 1; n <= 9; n++) {
        counts[n] = getMissingCount(n);
    }
    return counts;
});
</script>

<template>
    <div class="pad-container">
        <!-- Pencil mode toggle -->
        <button
            class="pencil-toggle"
            :class="{ 'pencil-toggle--active': game.pencilMode }"
            :disabled="!game.isPlaying"
            @click="game.togglePencilMode()"
        >
            <svg
                class="pencil-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
            </svg>
            <span class="pencil-label">{{
                game.pencilMode ? "Notes ON" : "Notes OFF"
            }}</span>
            <span class="pencil-hint">N</span>
        </button>

        <!-- Grey-out completed toggle -->
        <button
            class="pencil-toggle"
            :class="{ 'pencil-toggle--active': game.greyOutCompleted }"
            :disabled="!game.isPlaying"
            @click="game.toggleGreyOutCompleted()"
        >
            <svg
                class="pencil-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <circle cx="12" cy="12" r="10" />
                <path d="M9 9h6v6H9z" />
            </svg>
            <span class="pencil-label">{{
                game.greyOutCompleted ? "Grey-out ON" : "Grey-out OFF"
            }}</span>
            <span class="pencil-hint">G</span>
        </button>

        <!-- Number pad -->
        <div class="numpad-section">
            <span class="section-label">Numbers</span>
            <div class="numpad">
                <button
                    v-for="n in 9"
                    :key="'num-' + n"
                    class="numpad-btn"
                    :class="{ 'numpad-btn--pencil': game.pencilMode }"
                    :disabled="!game.isPlaying"
                    @click="game.pencilMode ? placeNote(n) : placeNumber(n)"
                >
                    <span class="numpad-value">{{ n }}</span>
                    <span v-if="missingCounts[n] > 0" class="numpad-counter">{{ missingCounts[n] }}</span>
                </button>
                <button
                    class="numpad-btn numpad-erase"
                    :disabled="!game.isPlaying"
                    @click="game.pencilMode ? eraseNotes() : erase()"
                >
                    ✕
                </button>
            </div>
        </div>

        <!-- Notes quick pad -->
        <div class="numpad-section notes-section">
            <span class="section-label">Quick Notes</span>
            <div class="numpad numpad--notes">
                <button
                    v-for="n in 9"
                    :key="'note-' + n"
                    class="numpad-btn numpad-btn--note"
                    :disabled="!game.isPlaying"
                    @click="placeNote(n)"
                >
                    {{ n }}
                </button>
                <button
                    class="numpad-btn numpad-btn--note numpad-erase--note"
                    :disabled="!game.isPlaying"
                    @click="eraseNotes()"
                >
                    ✕
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.pad-container {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

/* ── Pencil toggle ───────────────────────────────────────────────────── */

.pencil-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    font-size: 0.85rem;
    font-family: var(--font-sans);
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition);
    user-select: none;
}

.pencil-toggle:hover:not(:disabled) {
    background: var(--bg-hover);
    border-color: var(--border-light);
}

.pencil-toggle--active {
    background: rgba(108, 99, 255, 0.12);
    border-color: var(--accent);
    color: var(--accent);
}

.pencil-toggle--active:hover:not(:disabled) {
    background: rgba(108, 99, 255, 0.18);
}

.pencil-toggle:disabled {
    opacity: 0.3;
    cursor: not-allowed;
}

.pencil-icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
}

.pencil-label {
    flex: 1;
    text-align: left;
}

.pencil-hint {
    font-size: 0.65rem;
    font-family: var(--font-mono);
    padding: 1px 6px;
    border-radius: 3px;
    background: var(--bg-primary);
    border: 1px solid var(--border);
    color: var(--text-muted);
    letter-spacing: 0.02em;
}

/* ── Section labels ──────────────────────────────────────────────────── */

.numpad-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.section-label {
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
}

/* ── Number pad (shared) ─────────────────────────────────────────────── */

.numpad {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 5px;
    max-width: 260px;
}

.numpad-btn {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: 1.1rem;
    font-family: var(--font-mono);
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition);
}

.numpad-value {
    display: block;
}

.numpad-counter {
    position: absolute;
    top: 2px;
    right: 2px;
    width: 14px;
    height: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--accent);
    color: #fff;
    font-size: 0.6rem;
    font-weight: 600;
    border-radius: 3px;
    line-height: 1;
}

.numpad-btn:hover:not(:disabled) {
    background: var(--accent);
    color: #fff;
    border-color: var(--accent);
}

.numpad-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
}

/* When pencil mode is active, tint the main buttons */
.numpad-btn--pencil {
    border-color: rgba(108, 99, 255, 0.25);
}

.numpad-btn--pencil:hover:not(:disabled) {
    background: rgba(108, 99, 255, 0.7);
}

.numpad-erase {
    color: var(--error);
    font-size: 1rem;
}

.numpad-erase:hover:not(:disabled) {
    background: var(--error);
    color: #fff;
    border-color: var(--error);
}

/* ── Notes quick pad (smaller, dimmer) ───────────────────────────────── */

.notes-section {
    opacity: 0.85;
}

.numpad--notes {
    gap: 4px;
}

.numpad-btn--note {
    width: 48px;
    height: 34px;
    font-size: 0.8rem;
    font-weight: 500;
    background: var(--bg-secondary);
    border: 1px dashed var(--border);
    color: var(--text-secondary);
}

.numpad-btn--note:hover:not(:disabled) {
    background: rgba(108, 99, 255, 0.5);
    color: #fff;
    border-style: solid;
    border-color: var(--accent);
}

.numpad-erase--note {
    color: var(--error);
    font-size: 0.85rem;
}

.numpad-erase--note:hover:not(:disabled) {
    background: rgba(239, 83, 80, 0.6);
    color: #fff;
    border-color: var(--error);
    border-style: solid;
}

/* ── Responsive ──────────────────────────────────────────────────────── */

@media (max-width: 500px) {
    .numpad {
        max-width: 100%;
    }

    .numpad-btn {
        width: 40px;
        height: 40px;
        font-size: 0.95rem;
    }

    .numpad-btn--note {
        width: 40px;
        height: 30px;
        font-size: 0.75rem;
    }
}
</style>
