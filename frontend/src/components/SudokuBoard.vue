<script setup lang="ts">
import { computed } from "vue";
import { useGameStore } from "@/stores/game";
import SudokuCell from "./SudokuCell.vue";

const game = useGameStore();

const rows = computed(() => {
    return Array.from({ length: 9 }, (_, i) => i);
});

function handleKeyDown(e: KeyboardEvent) {
    if (!game.isPlaying || !game.selectedCell) return;

    const { row, col } = game.selectedCell;

    // Number keys 1-9
    if (e.key >= "1" && e.key <= "9") {
        const value = parseInt(e.key, 10);
        if (!game.locked[row]?.[col]) {
            game.makeMove(row, col, value);
        }
        return;
    }

    // Delete / Backspace to erase
    if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
        if (!game.locked[row]?.[col]) {
            game.makeMove(row, col, 0);
        }
        return;
    }

    // Arrow key navigation
    const arrowMap: Record<string, [number, number]> = {
        ArrowUp: [-1, 0],
        ArrowDown: [1, 0],
        ArrowLeft: [0, -1],
        ArrowRight: [0, 1],
    };

    const delta = arrowMap[e.key];
    if (delta) {
        e.preventDefault();
        const [dr, dc] = delta;
        const newRow = Math.max(0, Math.min(8, row + dr));
        const newCol = Math.max(0, Math.min(8, col + dc));
        game.selectCell(newRow, newCol);
    }
}
</script>

<template>
    <div class="board" tabindex="0" @keydown="handleKeyDown">
        <div v-for="row in rows" :key="row" class="board-row">
            <SudokuCell v-for="col in 9" :key="col" :row="row" :col="col - 1" />
        </div>
    </div>
</template>

<style scoped>
.board {
    display: inline-flex;
    flex-direction: column;
    border: 2px solid var(--text-muted);
    border-radius: var(--radius-sm);
    outline: none;
    overflow: hidden;
    user-select: none;
}

.board:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent-glow);
}

.board-row {
    display: flex;
}

/* Thick borders for 3x3 boxes */
.board-row:nth-child(3),
.board-row:nth-child(6) {
    border-bottom: 2px solid var(--text-muted);
}
</style>
