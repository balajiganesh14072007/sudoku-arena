// Sudoku generation, validation, and step-by-step backtracking solvers

export interface TraceStep {
  board: number[];
  kind: "place" | "backtrack";
  cell: number;
  value: number;
  message: string;
  decisions: number;
  backtracks: number;
}

export function createEmptyBoard(): number[] {
  return Array(81).fill(0);
}

export function isValidPlacement(board: number[], index: number, value: number): boolean {
  if (!value) return true;
  const row = Math.floor(index / 9);
  const col = index % 9;

  for (let i = 0; i < 9; i++) {
    if (board[row * 9 + i] === value && row * 9 + i !== index) return false;
    if (board[i * 9 + col] === value && i * 9 + col !== index) return false;
  }

  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      const pos = r * 9 + c;
      if (pos !== index && board[pos] === value) return false;
    }
  }

  return true;
}

export function isBoardValid(board: number[]): boolean {
  return board.length === 81 && board.every((val, idx) => !val || isValidPlacement(board, idx, val));
}

export function getLegalCandidates(board: number[], index: number): number[] {
  return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(v => isValidPlacement(board, index, v));
}

export function createPrng(seed: number) {
  let i = seed >>> 0;
  return () => {
    i = (i + 1831565813) >>> 0;
    let s = i;
    s = Math.imul(s ^ (s >>> 15), s | 1);
    s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
    return ((s ^ (s >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleArray<T>(arr: T[], rand: () => number = Math.random): void {
  for (let s = arr.length - 1; s > 0; s--) {
    const o = Math.floor(rand() * (s + 1));
    [arr[s], arr[o]] = [arr[o], arr[s]];
  }
}

export function fillBoard(board: number[], shuffle = false, rand: () => number = Math.random): boolean {
  let bestIdx = -1;
  let bestCandidates: number[] | null = null;

  for (let f = 0; f < 81; f++) {
    if (!board[f]) {
      const cand = getLegalCandidates(board, f);
      if (!cand.length) return false;
      if (!bestCandidates || cand.length < bestCandidates.length) {
        bestIdx = f;
        bestCandidates = cand;
        if (cand.length === 1) break;
      }
    }
  }

  if (bestIdx < 0) return true;

  if (shuffle && bestCandidates) {
    shuffleArray(bestCandidates, rand);
  }

  for (const val of bestCandidates || []) {
    board[bestIdx] = val;
    if (fillBoard(board, shuffle, rand)) return true;
    board[bestIdx] = 0;
  }

  return false;
}

export function countSolutions(board: number[], maxSolutions = 2): number {
  const s = [...board];

  function solve(): number {
    let bestIdx = -1;
    let bestCandidates: number[] | null = null;

    for (let p = 0; p < 81; p++) {
      if (!s[p]) {
        const cand = getLegalCandidates(s, p);
        if (!cand.length) return 0;
        if (!bestCandidates || cand.length < bestCandidates.length) {
          bestIdx = p;
          bestCandidates = cand;
          if (cand.length === 1) break;
        }
      }
    }

    if (bestIdx < 0) return 1;

    let count = 0;
    for (const val of bestCandidates || []) {
      s[bestIdx] = val;
      count += solve();
      s[bestIdx] = 0;
      if (count >= maxSolutions) return count;
    }
    return count;
  }

  return solve();
}

export type DifficultyLevel = "easy" | "medium" | "hard";

export const DIFFICULTY_CONFIG: Record<DifficultyLevel, { name: string; sub: string; cluesToRemove: number }> = {
  easy: { name: "Easy", sub: "A warm-up", cluesToRemove: 39 },
  medium: { name: "Medium", sub: "Find your flow", cluesToRemove: 48 },
  hard: { name: "Hard", sub: "Bring focus", cluesToRemove: 55 },
};

export function generateSudoku(difficulty: DifficultyLevel, seed?: number): { puzzle: number[]; solution: number[] } {
  const rand = seed === undefined ? Math.random : createPrng(seed);
  const solution = createEmptyBoard();
  fillBoard(solution, true, rand);

  const puzzle = [...solution];
  const targetRemovals = DIFFICULTY_CONFIG[difficulty]?.cluesToRemove ?? 45;
  const indices = Array.from({ length: 81 }, (_, i) => i);
  shuffleArray(indices, rand);

  let removedCount = 0;
  for (const idx of indices) {
    if (removedCount >= targetRemovals) break;
    const orig = puzzle[idx];
    puzzle[idx] = 0;
    if (countSolutions(puzzle) === 1) {
      removedCount++;
    } else {
      puzzle[idx] = orig;
    }
  }

  return { puzzle, solution };
}

export function solveWithTrace(
  initial: number[],
  useMrv = true
): { steps: TraceStep[]; solved: boolean } {
  const s = [...initial];
  const steps: TraceStep[] = [];
  let decisions = 0;
  let backtracks = 0;
  const maxSteps = 1500;

  function backtrack(): boolean {
    if (steps.length > maxSteps) return false;
    let chosenIdx = -1;
    let candidates: number[] | null = null;

    if (useMrv) {
      for (let b = 0; b < 81; b++) {
        if (!s[b]) {
          const cands = getLegalCandidates(s, b);
          if (!cands.length) return false;
          if (!candidates || cands.length < candidates.length) {
            chosenIdx = b;
            candidates = cands;
            if (cands.length === 1) break;
          }
        }
      }
    } else {
      chosenIdx = s.indexOf(0);
      if (chosenIdx >= 0) {
        candidates = getLegalCandidates(s, chosenIdx);
        if (!candidates.length) return false;
      }
    }

    if (chosenIdx < 0) return true;

    for (const val of candidates || []) {
      decisions++;
      s[chosenIdx] = val;
      steps.push({
        board: [...s],
        kind: "place",
        cell: chosenIdx,
        value: val,
        message: `Place ${val} in row ${Math.floor(chosenIdx / 9) + 1}, column ${(chosenIdx % 9) + 1}.`,
        decisions,
        backtracks,
      });

      if (backtrack()) return true;

      s[chosenIdx] = 0;
      backtracks++;
      steps.push({
        board: [...s],
        kind: "backtrack",
        cell: chosenIdx,
        value: val,
        message: `Backtrack from ${val} at row ${Math.floor(chosenIdx / 9) + 1}, column ${(chosenIdx % 9) + 1}.`,
        decisions,
        backtracks,
      });
    }

    return false;
  }

  const solved = backtrack();
  return { steps, solved };
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
