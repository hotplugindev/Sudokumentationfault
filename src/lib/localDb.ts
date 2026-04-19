import type { Difficulty } from "@/lib/sudoku";

export type GameStatus = "in_progress" | "completed" | "abandoned";
export type LeaderboardMode = "global" | "daily";

export interface LocalGameRecord {
  id: string;
  difficulty: Difficulty;
  status: GameStatus;
  startedAt: number;
  elapsed: number;
  completedAt: number | null;
}

export interface LocalLeaderboardEntry {
  gameId: string;
  difficulty: Difficulty;
  time: number;
  completedAt: string;
}

interface DifficultyStats {
  played: number;
  bestTime: number | null;
  avgTime: number | null;
}

export interface UserStats {
  totalPlayed: number;
  totalCompleted: number;
  byDifficulty: Record<Difficulty, DifficultyStats>;
}

export interface GameHistoryEntry {
  id: string;
  difficulty: Difficulty;
  status: GameStatus;
  elapsed: number;
  startedAt: number;
  completedAt: number | null;
}

export interface SavedGameState {
  id: string;
  difficulty: Difficulty;
  puzzle: number[][];
  solution: number[][];
  current: number[][];
  locked: boolean[][];
  elapsed: number;
  startedAt: number;
  notes: number[][][];
}

const STORAGE_KEYS = {
  gameRecords: "sudoku.gameRecords",
  leaderboard: "sudoku.leaderboard",
  savedStates: "sudoku.savedStates",
} as const;

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard", "expert"];

function readJson<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getGameRecords(): LocalGameRecord[] {
  return readJson<LocalGameRecord[]>(STORAGE_KEYS.gameRecords, []);
}

function saveGameRecords(records: LocalGameRecord[]) {
  writeJson(STORAGE_KEYS.gameRecords, records);
}

export function addGameRecord(record: LocalGameRecord) {
  const records = getGameRecords();
  records.push(record);
  saveGameRecords(records);
}

export function updateGameRecord(gameId: string, updates: Partial<LocalGameRecord>) {
  const records = getGameRecords();
  const idx = records.findIndex((record) => record.id === gameId);
  if (idx === -1) return;

  const current = records[idx];
  if (!current) return;

  records[idx] = {
    id: updates.id ?? current.id,
    difficulty: updates.difficulty ?? current.difficulty,
    status: updates.status ?? current.status,
    startedAt: updates.startedAt ?? current.startedAt,
    elapsed: updates.elapsed ?? current.elapsed,
    completedAt: updates.completedAt ?? current.completedAt,
  };

  saveGameRecords(records);
}

export function getLeaderboardEntries(): LocalLeaderboardEntry[] {
  return readJson<LocalLeaderboardEntry[]>(STORAGE_KEYS.leaderboard, []);
}

function saveLeaderboardEntries(entries: LocalLeaderboardEntry[]) {
  writeJson(STORAGE_KEYS.leaderboard, entries);
}

export function addLeaderboardEntry(entry: LocalLeaderboardEntry) {
  const entries = getLeaderboardEntries();
  entries.push(entry);
  saveLeaderboardEntries(entries);
}

export function queryLeaderboard(options: {
  difficulty?: string;
  mode?: LeaderboardMode;
  limit?: number;
} = {}): LocalLeaderboardEntry[] {
  const { difficulty, mode = "global", limit = 50 } = options;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const filtered = getLeaderboardEntries().filter((entry) => {
    const matchesDifficulty =
      !difficulty || difficulty === "all" || entry.difficulty === difficulty;
    if (!matchesDifficulty) return false;

    if (mode === "daily") {
      return new Date(entry.completedAt).getTime() >= startOfToday.getTime();
    }

    return true;
  });

  return filtered
    .sort((a, b) => {
      if (a.time !== b.time) return a.time - b.time;
      return new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime();
    })
    .slice(0, limit);
}

export function getUserStats(): UserStats {
  const records = getGameRecords();
  const completed = records.filter((record) => record.status === "completed");

  const byDifficulty = DIFFICULTIES.reduce<Record<Difficulty, DifficultyStats>>(
    (acc, difficulty) => {
      const completedForDifficulty = completed.filter(
        (record) => record.difficulty === difficulty,
      );
      const times = completedForDifficulty.map((record) => record.elapsed);
      const total = times.reduce((sum, time) => sum + time, 0);

      acc[difficulty] = {
        played: records.filter((record) => record.difficulty === difficulty).length,
        bestTime: times.length > 0 ? Math.min(...times) : null,
        avgTime: times.length > 0 ? Math.round(total / times.length) : null,
      };

      return acc;
    },
    {
      easy: { played: 0, bestTime: null, avgTime: null },
      medium: { played: 0, bestTime: null, avgTime: null },
      hard: { played: 0, bestTime: null, avgTime: null },
      expert: { played: 0, bestTime: null, avgTime: null },
    },
  );

  return {
    totalPlayed: records.length,
    totalCompleted: completed.length,
    byDifficulty,
  };
}

export function getGameHistory(limit = 40): GameHistoryEntry[] {
  const records = getGameRecords();

  return records
    .slice()
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, limit)
    .map((record) => ({
      id: record.id,
      difficulty: record.difficulty,
      status: record.status,
      elapsed: record.elapsed,
      startedAt: record.startedAt,
      completedAt: record.completedAt,
    }));
}

function getSavedStates(): Record<string, SavedGameState> {
  return readJson<Record<string, SavedGameState>>(STORAGE_KEYS.savedStates, {});
}

function writeSavedStates(states: Record<string, SavedGameState>) {
  writeJson(STORAGE_KEYS.savedStates, states);
}

export function saveGameState(state: SavedGameState) {
  const states = getSavedStates();
  states[state.id] = state;
  writeSavedStates(states);
}

export function loadGameState(id: string): SavedGameState | null {
  return getSavedStates()[id] ?? null;
}

export function getInProgressSavedGames(): SavedGameState[] {
  return Object.values(getSavedStates()).sort((a, b) => b.startedAt - a.startedAt);
}

export function deleteSavedGame(id: string) {
  const states = getSavedStates();
  delete states[id];
  writeSavedStates(states);
}
