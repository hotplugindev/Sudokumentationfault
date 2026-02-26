import { defineStore } from "pinia";
import { ref, reactive, computed } from "vue";
import api from "@/api";

type Difficulty = "easy" | "medium" | "hard" | "expert";
type GameStatus = "idle" | "in_progress" | "completed" | "abandoned";

/** Create a fresh 9×9 grid of empty note sets. */
function createEmptyNotes(): Set<number>[][] {
  return Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => new Set<number>()),
  );
}

export const useGameStore = defineStore("game", () => {
  /* ── State ─────────────────────────────────────────────────────────── */

  const gameId = ref<string | null>(null);
  const difficulty = ref<Difficulty>("medium");
  const puzzle = ref<number[][]>([]);
  const current = ref<number[][]>([]);
  const locked = ref<boolean[][]>([]);
  const status = ref<GameStatus>("idle");
  const elapsed = ref(0);
  const selectedCell = ref<{ row: number; col: number } | null>(null);
  const completedAt = ref<number | null>(null);

  /* Pencil / notes — purely client-side */
  const pencilMode = ref(false);
  const notes = reactive<Set<number>[][]>(createEmptyNotes());

  /* ── Timer ─────────────────────────────────────────────────────────── */

  let timerInterval: ReturnType<typeof setInterval> | null = null;

  function startTimer() {
    stopTimer();
    timerInterval = setInterval(() => {
      if (status.value === "in_progress") {
        elapsed.value++;
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  /* ── Getters ───────────────────────────────────────────────────────── */

  const formattedTime = computed(() => {
    const mins = Math.floor(elapsed.value / 60);
    const secs = elapsed.value % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  });

  const isPlaying = computed(() => status.value === "in_progress");
  const isFinished = computed(
    () => status.value === "completed" || status.value === "abandoned",
  );

  /* ── Completed rows/cols/boxes ─────────────────────────────────────── */

  function isRowComplete(row: number): boolean {
    const seen = new Set<number>();
    for (let col = 0; col < 9; col++) {
      const val = current.value[row]?.[col];
      if (!val || val === 0) return false;
      if (seen.has(val)) return false;
      seen.add(val);
    }
    return seen.size === 9;
  }

  function isColComplete(col: number): boolean {
    const seen = new Set<number>();
    for (let row = 0; row < 9; row++) {
      const val = current.value[row]?.[col];
      if (!val || val === 0) return false;
      if (seen.has(val)) return false;
      seen.add(val);
    }
    return seen.size === 9;
  }

  function isBoxComplete(boxRow: number, boxCol: number): boolean {
    const seen = new Set<number>();
    const startRow = boxRow * 3;
    const startCol = boxCol * 3;
    for (let r = startRow; r < startRow + 3; r++) {
      for (let c = startCol; c < startCol + 3; c++) {
        const val = current.value[r]?.[c];
        if (!val || val === 0) return false;
        if (seen.has(val)) return false;
        seen.add(val);
      }
    }
    return seen.size === 9;
  }

  function isCellInCompletedRegion(row: number, col: number): boolean {
    if (isRowComplete(row)) return true;
    if (isColComplete(col)) return true;
    const boxRow = Math.floor(row / 3);
    const boxCol = Math.floor(col / 3);
    if (isBoxComplete(boxRow, boxCol)) return true;
    return false;
  }

  /* ── Notes helpers ─────────────────────────────────────────────────── */

  function toggleNote(row: number, col: number, num: number) {
    if (!isPlaying.value) return;
    if (locked.value[row]?.[col]) return;
    if (current.value[row]?.[col] !== 0) return; // has a placed number

    const cellNotes = notes[row]?.[col];
    if (!cellNotes) return;
    if (cellNotes.has(num)) {
      cellNotes.delete(num);
    } else {
      cellNotes.add(num);
    }
  }

  function clearNotes(row: number, col: number) {
    notes[row]?.[col]?.clear();
  }

  function clearAllNotes() {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        notes[r]?.[c]?.clear();
      }
    }
  }

  function getNotes(row: number, col: number): Set<number> {
    return notes[row]?.[col] ?? new Set();
  }

  function togglePencilMode() {
    pencilMode.value = !pencilMode.value;
  }

  /* ── Actions ───────────────────────────────────────────────────────── */

  async function newGame(diff: Difficulty) {
    stopTimer();
    const { data } = await api.post("/game/new", { difficulty: diff });

    gameId.value = data.id;
    difficulty.value = diff;
    puzzle.value = data.puzzle;
    current.value = data.current;
    locked.value = data.locked;
    status.value = "in_progress";
    elapsed.value = 0;
    selectedCell.value = null;
    completedAt.value = null;
    pencilMode.value = false;
    clearAllNotes();

    startTimer();
    return data;
  }

  async function makeMove(row: number, col: number, value: number) {
    if (!gameId.value || status.value !== "in_progress") return null;

    // Placing a real number clears any notes on that cell
    if (value !== 0) {
      clearNotes(row, col);
    }

    const { data } = await api.post(`/game/${gameId.value}/move`, {
      row,
      col,
      value,
      elapsed: elapsed.value,
    });

    current.value = data.current;

    if (data.status === "completed") {
      status.value = "completed";
      completedAt.value = data.completedAt;
      stopTimer();
    }

    return data;
  }

  async function abandonGame() {
    if (!gameId.value || status.value !== "in_progress") return;

    const { data } = await api.post(`/game/${gameId.value}/abandon`);
    status.value = "abandoned";
    stopTimer();

    if (data.solution) {
      current.value = data.solution;
    }
  }

  function selectCell(row: number, col: number) {
    selectedCell.value = { row, col };
  }

  function reset() {
    stopTimer();
    gameId.value = null;
    puzzle.value = [];
    current.value = [];
    locked.value = [];
    status.value = "idle";
    elapsed.value = 0;
    selectedCell.value = null;
    completedAt.value = null;
    pencilMode.value = false;
    clearAllNotes();
  }

  return {
    gameId,
    difficulty,
    puzzle,
    current,
    locked,
    status,
    elapsed,
    selectedCell,
    completedAt,
    pencilMode,
    notes,
    formattedTime,
    isPlaying,
    isFinished,
    newGame,
    makeMove,
    abandonGame,
    selectCell,
    reset,
    toggleNote,
    clearNotes,
    getNotes,
    togglePencilMode,
    isCellInCompletedRegion,
  };
});
