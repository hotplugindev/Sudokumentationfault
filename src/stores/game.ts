import { defineStore } from "pinia";
import { computed, reactive, ref } from "vue";
import {
  addGameRecord,
  addLeaderboardEntry,
  deleteSavedGame,
  loadGameState,
  saveGameState,
  updateGameRecord,
} from "@/lib/localDb";
import {
  cloneGrid,
  generatePuzzle,
  isBoardComplete,
  type Difficulty,
} from "@/lib/sudoku";

type GameStatus = "idle" | "in_progress" | "completed" | "abandoned";

function createEmptyNotes(): Set<number>[][] {
  return Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => new Set<number>()),
  );
}

export const useGameStore = defineStore("game", () => {
  const gameId = ref<string | null>(null);
  const difficulty = ref<Difficulty>("medium");
  const puzzle = ref<number[][]>([]);
  const solution = ref<number[][]>([]);
  const current = ref<number[][]>([]);
  const locked = ref<boolean[][]>([]);
  const status = ref<GameStatus>("idle");
  const elapsed = ref(0);
  const startedAt = ref(0);
  const selectedCell = ref<{ row: number; col: number } | null>(null);
  const completedAt = ref<number | null>(null);
  const isPaused = ref(false);

  const pencilMode = ref(false);
  const greyOutCompleted = ref(false);
  const notes = reactive<Set<number>[][]>(createEmptyNotes());

  let timerInterval: ReturnType<typeof setInterval> | null = null;
  let saveTickCount = 0;

  function persistState() {
    if (!gameId.value || status.value !== "in_progress") return;
    saveGameState({
      id: gameId.value,
      difficulty: difficulty.value,
      puzzle: cloneGrid(puzzle.value),
      solution: cloneGrid(solution.value),
      current: cloneGrid(current.value),
      locked: locked.value.map((row) => [...row]),
      elapsed: elapsed.value,
      startedAt: startedAt.value,
      notes: notes.map((row) => row.map((cell) => [...cell])),
    });
  }

  function startTimer() {
    stopTimer();
    saveTickCount = 0;
    timerInterval = setInterval(() => {
      if (status.value === "in_progress" && !isPaused.value) {
        elapsed.value++;
        saveTickCount++;
        if (saveTickCount >= 30) {
          persistState();
          saveTickCount = 0;
        }
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  const formattedTime = computed(() => {
    const mins = Math.floor(elapsed.value / 60);
    const secs = elapsed.value % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  });

  const isPlaying = computed(() => status.value === "in_progress");
  const isFinished = computed(
    () => status.value === "completed" || status.value === "abandoned",
  );

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

  function toggleNote(row: number, col: number, num: number) {
    if (!isPlaying.value) return;
    if (locked.value[row]?.[col]) return;
    if (current.value[row]?.[col] !== 0) return;

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

  function toggleGreyOutCompleted() {
    greyOutCompleted.value = !greyOutCompleted.value;
  }

  async function newGame(diff: Difficulty) {
    stopTimer();

    const game = generatePuzzle(diff);
    const id = crypto.randomUUID();
    const now = Date.now();

    gameId.value = id;
    difficulty.value = diff;
    puzzle.value = cloneGrid(game.puzzle);
    solution.value = cloneGrid(game.solution);
    current.value = cloneGrid(game.puzzle);
    locked.value = game.locked;
    status.value = "in_progress";
    elapsed.value = 0;
    startedAt.value = now;
    selectedCell.value = null;
    completedAt.value = null;
    pencilMode.value = false;
    isPaused.value = false;
    clearAllNotes();

    addGameRecord({
      id,
      difficulty: diff,
      status: "in_progress",
      startedAt: now,
      elapsed: 0,
      completedAt: null,
    });

    startTimer();
    persistState();

    return {
      id,
      difficulty: diff,
      puzzle: cloneGrid(game.puzzle),
      current: cloneGrid(game.puzzle),
      locked: game.locked,
      status: "in_progress" as const,
      startedAt: now,
      elapsed: 0,
    };
  }

  async function makeMove(row: number, col: number, value: number) {
    if (!gameId.value || status.value !== "in_progress") return null;
    if (row < 0 || row > 8 || col < 0 || col > 8) return null;
    if (value < 0 || value > 9) return null;
    if (locked.value[row]?.[col]) return null;

    if (value !== 0) {
      clearNotes(row, col);
    }

    current.value[row]![col] = value;

    if (value !== 0 && isBoardComplete(current.value, solution.value)) {
      const doneAt = Date.now();

      status.value = "completed";
      completedAt.value = doneAt;
      stopTimer();

      updateGameRecord(gameId.value, {
        status: "completed",
        elapsed: elapsed.value,
        completedAt: doneAt,
      });

      deleteSavedGame(gameId.value);

      addLeaderboardEntry({
        gameId: gameId.value,
        difficulty: difficulty.value,
        time: elapsed.value,
        completedAt: new Date(doneAt).toISOString(),
      });

      return {
        current: cloneGrid(current.value),
        status: status.value,
        completedAt: doneAt,
      };
    }

    updateGameRecord(gameId.value, {
      elapsed: elapsed.value,
    });

    persistState();

    return {
      current: cloneGrid(current.value),
      status: status.value,
      completedAt: completedAt.value,
    };
  }

  async function abandonGame() {
    if (!gameId.value || status.value !== "in_progress") return;

    status.value = "abandoned";
    completedAt.value = Date.now();
    stopTimer();

    current.value = cloneGrid(solution.value);

    updateGameRecord(gameId.value, {
      status: "abandoned",
      elapsed: elapsed.value,
      completedAt: completedAt.value,
    });

    deleteSavedGame(gameId.value);

    return {
      status: "abandoned" as const,
      solution: cloneGrid(solution.value),
    };
  }

  function selectCell(row: number, col: number) {
    selectedCell.value = { row, col };
  }

  function pauseGame() {
    if (status.value === "in_progress" && !isPaused.value) {
      isPaused.value = true;
    }
  }

  function resumeGame() {
    if (status.value === "in_progress" && isPaused.value) {
      isPaused.value = false;
    }
  }

  function togglePause() {
    if (status.value === "in_progress") {
      isPaused.value = !isPaused.value;
    }
  }

  function reset() {
    stopTimer();
    if (gameId.value && status.value === "in_progress") {
      deleteSavedGame(gameId.value);
    }
    gameId.value = null;
    puzzle.value = [];
    solution.value = [];
    current.value = [];
    locked.value = [];
    status.value = "idle";
    elapsed.value = 0;
    startedAt.value = 0;
    selectedCell.value = null;
    completedAt.value = null;
    pencilMode.value = false;
    isPaused.value = false;
    clearAllNotes();
  }

  async function resumeSavedGame(id: string) {
    const state = loadGameState(id);
    if (!state) return;

    stopTimer();

    gameId.value = state.id;
    difficulty.value = state.difficulty;
    puzzle.value = cloneGrid(state.puzzle);
    solution.value = cloneGrid(state.solution);
    current.value = cloneGrid(state.current);
    locked.value = state.locked.map((row) => [...row]);
    status.value = "in_progress";
    elapsed.value = state.elapsed;
    startedAt.value = state.startedAt;
    selectedCell.value = null;
    completedAt.value = null;
    pencilMode.value = false;
    isPaused.value = false;

    clearAllNotes();
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const savedNotes = state.notes[r]?.[c] ?? [];
        savedNotes.forEach((n) => notes[r]![c]!.add(n));
      }
    }

    startTimer();
  }

  return {
    gameId,
    difficulty,
    puzzle,
    current,
    locked,
    status,
    elapsed,
    startedAt,
    selectedCell,
    completedAt,
    pencilMode,
    greyOutCompleted,
    notes,
    formattedTime,
    isPlaying,
    isFinished,
    newGame,
    makeMove,
    abandonGame,
    selectCell,
    reset,
    resumeSavedGame,
    toggleNote,
    clearNotes,
    getNotes,
    togglePencilMode,
    toggleGreyOutCompleted,
    isCellInCompletedRegion,
    isPaused,
    pauseGame,
    resumeGame,
    togglePause,
  };
});
