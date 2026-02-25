<script setup lang="ts">
import { computed } from "vue";
import { useGameStore } from "@/stores/game";

const props = defineProps<{
  row: number;
  col: number;
}>();

const game = useGameStore();

const value = computed(() => game.current[props.row]?.[props.col] || 0);
const isLocked = computed(() => game.locked[props.row]?.[props.col] ?? false);

const isSelected = computed(
  () =>
    game.selectedCell?.row === props.row &&
    game.selectedCell?.col === props.col,
);

const isHighlighted = computed(() => {
  if (!game.selectedCell) return false;
  const { row, col } = game.selectedCell;
  return (
    row === props.row ||
    col === props.col ||
    (Math.floor(row / 3) === Math.floor(props.row / 3) &&
      Math.floor(col / 3) === Math.floor(props.col / 3))
  );
});

const isSameValue = computed(() => {
  if (!game.selectedCell || value.value === 0) return false;
  const selVal = game.current[game.selectedCell.row]?.[game.selectedCell.col];
  return selVal !== 0 && selVal === value.value;
});

/* Right & bottom thick borders for 3x3 box separation */
const thickRight = computed(() => props.col === 2 || props.col === 5);
const thickBottom = computed(() => props.row === 2 || props.row === 5);

function onClick() {
  game.selectCell(props.row, props.col);
}
</script>

<template>
  <div
    class="cell"
    :class="{
      'cell--locked': isLocked,
      'cell--selected': isSelected,
      'cell--highlighted': isHighlighted && !isSelected,
      'cell--same-value': isSameValue && !isSelected,
      'cell--thick-right': thickRight,
      'cell--thick-bottom': thickBottom,
    }"
    @click="onClick"
  >
    <span v-if="value !== 0" class="cell-value">{{ value }}</span>
  </div>
</template>

<style scoped>
.cell {
  width: 46px;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  background: var(--bg-primary);
  cursor: pointer;
  transition: background var(--transition);
  position: relative;
}

.cell:hover {
  background: var(--bg-hover);
}

.cell--locked {
  background: var(--bg-secondary);
}

.cell--locked .cell-value {
  color: var(--text-primary);
  font-weight: 600;
}

.cell--highlighted {
  background: var(--bg-tertiary);
}

.cell--same-value {
  background: rgba(108, 99, 255, 0.08);
}

.cell--selected {
  background: rgba(108, 99, 255, 0.2);
  box-shadow: inset 0 0 0 2px var(--accent);
}

.cell--thick-right {
  border-right: 2px solid var(--text-muted);
}

.cell--thick-bottom {
  border-bottom: 2px solid var(--text-muted);
}

.cell-value {
  font-size: 1.15rem;
  font-family: var(--font-mono);
  color: var(--accent);
  font-weight: 500;
  line-height: 1;
}

.cell--locked .cell-value {
  color: var(--text-primary);
}

@media (max-width: 500px) {
  .cell {
    width: 36px;
    height: 36px;
  }

  .cell-value {
    font-size: 0.95rem;
  }
}
</style>
