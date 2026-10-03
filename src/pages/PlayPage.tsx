import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ArrowLeft, RotateCcw, Lightbulb, CheckCircle2, ArrowRight, Compass } from "lucide-react";
import { SudokuBoard } from "../components/SudokuBoard";
import { NumberPad } from "../components/NumberPad";
import {
  generateSudoku,
  isValidPlacement,
  formatTime,
  DIFFICULTY_CONFIG,
  type DifficultyLevel,
} from "../lib/sudoku";
import { getStoredProfile, saveProfile } from "../lib/storage";

interface PlayPageProps {
  difficulty: DifficultyLevel;
  level: number;
  navigate: (to: string) => void;
}

export function PlayPage({ difficulty, level, navigate }: PlayPageProps) {
  const seed = useMemo(() => {
    const baseSeeds = { easy: 58449, medium: 52945, hard: 42192 };
    return (baseSeeds[difficulty] + level) >>> 0;
  }, [difficulty, level]);

  const puzzleData = useMemo(() => generateSudoku(difficulty, seed), [difficulty, seed]);
  const initialPuzzle = puzzleData.puzzle;
  const solution = puzzleData.solution;

  const [board, setBoard] = useState<number[]>(() => [...initialPuzzle]);
  const [selected, setSelected] = useState<number | null>(null);
  const [seconds, setSeconds] = useState<number>(0);
  const [mistakes, setMistakes] = useState<number>(0);
  const [hasWon, setHasWon] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [profile, setProfile] = useState(getStoredProfile);

  const levelKey = `${difficulty}-${level}`;
  const winLogged = useRef(false);

  // Reset board on difficulty or level change
  useEffect(() => {
    setBoard([...initialPuzzle]);
    setSelected(null);
    setSeconds(0);
    setMistakes(0);
    setHasWon(false);
    setStatusMessage("");
    winLogged.current = false;
  }, [initialPuzzle]);

  // Timer
  useEffect(() => {
    if (hasWon) return;
    const interval = window.setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [hasWon]);

  // Win condition handler
  useEffect(() => {
    if (!hasWon) {
      winLogged.current = false;
      return;
    }
    if (winLogged.current) return;
    winLogged.current = true;

    const currentProfile = getStoredProfile();
    const formatted = formatTime(seconds);
    const existingBest = currentProfile.bests[levelKey];

    currentProfile.lastTimes[levelKey] = seconds;
    if (!existingBest || formatted < existingBest) {
      currentProfile.bests[levelKey] = formatted;
    }
    currentProfile.unlocks[difficulty] = Math.max(
      currentProfile.unlocks[difficulty] || 1,
      Math.min(10, level + 1)
    );

    saveProfile(currentProfile);
    setProfile(currentProfile);
  }, [hasWon, seconds, levelKey, difficulty, level]);

  // Compute conflicts
  const conflicts = useMemo(() => {
    const list: number[] = [];
    board.forEach((val, idx) => {
      if (val && !isValidPlacement(board, idx, val)) {
        list.push(idx);
      }
    });
    return list;
  }, [board]);

  // Handle number input
  const handleEnterValue = useCallback(
    (val: number) => {
      if (selected === null || initialPuzzle[selected] !== 0 || hasWon) return;

      if (val && !isValidPlacement(board, selected, val)) {
        setStatusMessage(`${val} conflicts with a number in this row, column, or box.`);
      } else {
        setStatusMessage("");
      }

      if (val && solution[selected] !== val) {
        setMistakes((m) => m + 1);
      }

      const nextBoard = [...board];
      nextBoard[selected] = val;
      setBoard(nextBoard);

      if (val && nextBoard.every((cell, i) => cell === solution[i])) {
        setHasWon(true);
      }
    },
    [selected, initialPuzzle, hasWon, board, solution]
  );

  // Handle reset
  const handleReset = () => {
    setBoard([...initialPuzzle]);
    setSelected(null);
    setSeconds(0);
    setMistakes(0);
    setHasWon(false);
    setStatusMessage("");
  };

  // Handle hint
  const handleHint = () => {
    const emptyIndex = board.findIndex((cell, idx) => cell === 0 && solution[idx] !== 0);
    if (emptyIndex >= 0) {
      setSelected(emptyIndex);
      const row = Math.floor(emptyIndex / 9) + 1;
      const col = (emptyIndex % 9) + 1;
      setStatusMessage(`A useful place to focus: row ${row}, column ${col}.`);
    }
  };

  const filledCount = board.filter(Boolean).length;
  const bestRecord = profile.bests[levelKey];

  return (
    <main className="wrap">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            {DIFFICULTY_CONFIG[difficulty]?.name || difficulty} puzzle · level {String(level).padStart(2, "0")}
          </div>
          <h1>Stay in the flow.</h1>
          <div className="small muted">
            Fill every square without repeating a number in any row, column, or box.
          </div>
        </div>
        <button
          type="button"
          className="btn ghost"
          onClick={() => navigate("/")}
          data-testid="button-back-lobby"
        >
          <ArrowLeft size={15} /> Back to lobby
        </button>
      </div>

      <div className="game-layout">
        <section>
          <div className="board-wrap">
            <SudokuBoard
              board={board}
              initial={initialPuzzle}
              selected={selected}
              onSelect={setSelected}
              conflicts={conflicts}
              disabled={hasWon}
            />
          </div>
          <NumberPad onValue={handleEnterValue} disabled={hasWon} />
        </section>

        <aside className="panel side-panel">
          <div className="tool-head">
            <span className="mode-pill">
              <Compass size={13} style={{ verticalAlign: "middle", marginRight: 5 }} />
              Solo practice
            </span>
            <span className="mode-pill">{DIFFICULTY_CONFIG[difficulty]?.name || difficulty}</span>
          </div>

          <h3 style={{ marginTop: 18 }}>Your run</h3>

          <div className="game-kpis">
            <div className="kpi">
              <span>Time</span>
              <strong data-testid="text-game-time">{formatTime(seconds)}</strong>
            </div>
            <div className="kpi">
              <span>Filled</span>
              <strong data-testid="text-filled">
                {filledCount}
                <small style={{ fontSize: 11, color: "#888" }}> / 81</small>
              </strong>
            </div>
            <div className="kpi">
              <span>Mistakes</span>
              <strong data-testid="text-mistakes">{mistakes}</strong>
            </div>
            <div className="kpi">
              <span>Best</span>
              <strong style={{ fontSize: 15 }}>{bestRecord || "—"}</strong>
            </div>
          </div>

          <div className="control-row">
            <button
              type="button"
              className="btn ghost"
              onClick={handleReset}
              data-testid="button-reset-game"
            >
              <RotateCcw size={15} /> Restart
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={handleHint}
              data-testid="button-hint"
            >
              <Lightbulb size={15} /> Hint
            </button>
          </div>

          <div className="status-note" data-testid="status-game">
            {hasWon ? (
              <>
                <CheckCircle2
                  size={14}
                  style={{ verticalAlign: "middle", marginRight: 5, color: "#23705c" }}
                />
                Puzzle complete in {formatTime(seconds)}. Time saved for this level; the next level is unlocked.
              </>
            ) : (
              statusMessage ||
              "Pick an empty square, then choose a number. Arrow keys move between cells."
            )}
          </div>

          <div className="mini-stat" style={{ marginTop: 13 }}>
            <span>Level unlock</span>
            <strong>{level} / 10</strong>
          </div>

          {hasWon && (
            <button
              type="button"
              className="btn"
              style={{ width: "100%", marginTop: 12 }}
              onClick={() => navigate(`/play/${difficulty}/${Math.min(10, level + 1)}`)}
              data-testid="button-next-level"
            >
              Next level <ArrowRight size={15} />
            </button>
          )}
        </aside>
      </div>
    </main>
  );
}
