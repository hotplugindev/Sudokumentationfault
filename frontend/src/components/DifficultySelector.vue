<script setup lang="ts">
defineProps<{
  loading?: boolean;
}>();

const emit = defineEmits<{
  select: [difficulty: string];
}>();

const difficulties = [
  { value: "easy", label: "Easy", desc: "Perfect for beginners", color: "#4caf50" },
  { value: "medium", label: "Medium", desc: "A fair challenge", color: "#ffa726" },
  { value: "hard", label: "Hard", desc: "For experienced players", color: "#ef5350" },
  { value: "expert", label: "Expert", desc: "Ultimate brain teaser", color: "#ab47bc" },
];
</script>

<template>
  <div class="difficulty-grid">
    <button
      v-for="diff in difficulties"
      :key="diff.value"
      class="diff-card"
      :disabled="loading"
      @click="emit('select', diff.value)"
    >
      <div class="diff-indicator" :style="{ background: diff.color }"></div>
      <div class="diff-info">
        <span class="diff-label">{{ diff.label }}</span>
        <span class="diff-desc">{{ diff.desc }}</span>
      </div>
    </button>
  </div>
</template>

<style scoped>
.difficulty-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  width: 100%;
  max-width: 440px;
}

.diff-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition);
  text-align: left;
}

.diff-card:hover:not(:disabled) {
  border-color: var(--border-light);
  background: var(--bg-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow);
}

.diff-card:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.diff-indicator {
  width: 8px;
  height: 36px;
  border-radius: 4px;
  flex-shrink: 0;
}

.diff-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.diff-label {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
}

.diff-desc {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

@media (max-width: 500px) {
  .difficulty-grid {
    grid-template-columns: 1fr;
  }
}
</style>
