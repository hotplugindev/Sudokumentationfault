/**
 * Sudoku puzzle generation and validation service.
 *
 * Generates fully solved boards, then removes cells based on difficulty
 * to create puzzles. All game logic lives here so the frontend never
 * sees the solution until the game is finished.
 */

const GRID_SIZE = 9;
const BOX_SIZE = 3;

/* ------------------------------------------------------------------ */
/*  Board helpers                                                      */
/* ------------------------------------------------------------------ */

/** Create an empty 9×9 grid filled with zeros. */
function createEmptyGrid() {
  return Array.from({ length: GRID_SIZE }, () => new Array(GRID_SIZE).fill(0));
}

/** Deep-clone a 9×9 grid. */
function cloneGrid(grid) {
  return grid.map((row) => [...row]);
}

/** Check whether placing `num` at (row, col) is valid. */
function isValid(grid, row, col, num) {
  // Check row
  for (let c = 0; c < GRID_SIZE; c++) {
    if (grid[row][c] === num) return false;
  }

  // Check column
  for (let r = 0; r < GRID_SIZE; r++) {
    if (grid[r][col] === num) return false;
  }

  // Check 3×3 box
  const boxRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
  const boxCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;
  for (let r = boxRow; r < boxRow + BOX_SIZE; r++) {
    for (let c = boxCol; c < boxCol + BOX_SIZE; c++) {
      if (grid[r][c] === num) return false;
    }
  }

  return true;
}

/* ------------------------------------------------------------------ */
/*  Fisher-Yates shuffle                                               */
/* ------------------------------------------------------------------ */

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ------------------------------------------------------------------ */
/*  Board generation (backtracking with randomization)                 */
/* ------------------------------------------------------------------ */

/**
 * Fill the grid completely using randomized backtracking.
 * Modifies `grid` in place and returns `true` on success.
 */
function fillGrid(grid) {
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (grid[row][col] !== 0) continue;

      const numbers = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);

      for (const num of numbers) {
        if (isValid(grid, row, col, num)) {
          grid[row][col] = num;
          if (fillGrid(grid)) return true;
          grid[row][col] = 0;
        }
      }

      return false; // trigger backtrack
    }
  }

  return true; // board is full
}

/** Generate a fully solved 9×9 Sudoku board. */
function generateSolution() {
  const grid = createEmptyGrid();
  fillGrid(grid);
  return grid;
}

/* ------------------------------------------------------------------ */
/*  Unique-solution checker (used when removing cells)                 */
/* ------------------------------------------------------------------ */

/**
 * Count the number of valid solutions for `grid` (stops at 2).
 * This lets us verify that a puzzle has exactly one solution.
 */
function countSolutions(grid, limit = 2) {
  let count = 0;

  function solve() {
    if (count >= limit) return;

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (grid[row][col] !== 0) continue;

        for (let num = 1; num <= 9; num++) {
          if (isValid(grid, row, col, num)) {
            grid[row][col] = num;
            solve();
            grid[row][col] = 0;

            if (count >= limit) return;
          }
        }

        return; // no valid number → backtrack
      }
    }

    // No empty cell found → valid complete board
    count++;
  }

  solve();
  return count;
}

/* ------------------------------------------------------------------ */
/*  Puzzle creation (remove cells from a solved board)                 */
/* ------------------------------------------------------------------ */

/**
 * Number of cells to remove per difficulty.
 * More removed = harder puzzle.
 */
const DIFFICULTY_REMOVALS = {
  easy: 36,
  medium: 45,
  hard: 52,
  expert: 58,
};

const VALID_DIFFICULTIES = Object.keys(DIFFICULTY_REMOVALS);

/**
 * Create a puzzle by removing cells from a solved board while
 * ensuring the puzzle still has a unique solution.
 *
 * @param {string} difficulty - "easy" | "medium" | "hard" | "expert"
 * @returns {{ puzzle: number[][], solution: number[][] }}
 */
function generatePuzzle(difficulty = "medium") {
  if (!VALID_DIFFICULTIES.includes(difficulty)) {
    throw new Error(`Invalid difficulty "${difficulty}". Use one of: ${VALID_DIFFICULTIES.join(", ")}`);
  }

  const solution = generateSolution();
  const puzzle = cloneGrid(solution);
  const removals = DIFFICULTY_REMOVALS[difficulty];

  // Build a shuffled list of all 81 cell positions
  const positions = shuffle(
    Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9]),
  );

  let removed = 0;

  for (const [row, col] of positions) {
    if (removed >= removals) break;

    const backup = puzzle[row][col];
    puzzle[row][col] = 0;

    // Verify uniqueness
    const testGrid = cloneGrid(puzzle);
    if (countSolutions(testGrid) !== 1) {
      // Removing this cell creates ambiguity → put it back
      puzzle[row][col] = backup;
    } else {
      removed++;
    }
  }

  return { puzzle, solution };
}

/* ------------------------------------------------------------------ */
/*  Move validation                                                    */
/* ------------------------------------------------------------------ */

/**
 * Validate a player's number placement against the solution.
 *
 * @param {number[][]} solution - The solved board
 * @param {number}     row
 * @param {number}     col
 * @param {number}     value   - The number the player entered (1-9)
 * @returns {{ valid: boolean, correct: boolean }}
 *   - valid:   the input is within bounds
 *   - correct: the number matches the solution
 */
function validateMove(solution, row, col, value) {
  if (
    row < 0 || row >= GRID_SIZE ||
    col < 0 || col >= GRID_SIZE ||
    value < 1 || value > 9
  ) {
    return { valid: false, correct: false };
  }

  return {
    valid: true,
    correct: solution[row][col] === value,
  };
}

/**
 * Check whether the current board state matches the solution entirely.
 *
 * @param {number[][]} current  - The player's current board
 * @param {number[][]} solution - The solved board
 * @returns {boolean}
 */
function isBoardComplete(current, solution) {
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (current[row][col] !== solution[row][col]) return false;
    }
  }
  return true;
}

/**
 * Determine which cells were part of the original puzzle (pre-filled).
 * Returns a 9×9 boolean grid where `true` means the cell is locked.
 *
 * @param {number[][]} puzzle
 * @returns {boolean[][]}
 */
function getLockedCells(puzzle) {
  return puzzle.map((row) => row.map((cell) => cell !== 0));
}

module.exports = {
  generatePuzzle,
  validateMove,
  isBoardComplete,
  getLockedCells,
  cloneGrid,
  VALID_DIFFICULTIES,
};
