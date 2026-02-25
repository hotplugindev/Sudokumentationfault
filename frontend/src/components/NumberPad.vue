<script setup lang="ts">
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
</script>

<template>
  <div class="numpad">
    <button
      v-for="n in 9"
      :key="n"
      class="numpad-btn"
      :disabled="!game.isPlaying"
      @click="placeNumber(n)"
    >
      {{ n }}
    </button>
    <button
      class="numpad-btn numpad-erase"
      :disabled="!game.isPlaying"
      @click="erase"
    >
      ✕
    </button>
  </div>
</template>

<style scoped>
.numpad {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
  max-width: 280px;
}

.numpad-btn {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
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

.numpad-btn:hover:not(:disabled) {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

.numpad-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
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

@media (max-width: 500px) {
  .numpad {
    max-width: 100%;
  }

  .numpad-btn {
    width: 42px;
    height: 42px;
    font-size: 0.95rem;
  }
}
</style>
