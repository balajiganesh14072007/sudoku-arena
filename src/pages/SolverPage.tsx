import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Scale,
  BrainCircuit,
} from "lucide-react";
import { SudokuBoard } from "../components/SudokuBoard";
import { NumberPad } from "../components/NumberPad";
import {
  createEmptyBoard,
  isBoardValid,
  isValidPlacement,
  generateSudoku,
  solveWithTrace,
  type TraceStep,
} from "../lib/sudoku";

interface SolverPageProps {
  navigate: (to: string) => void;
}

interface StrategyComparison {
  plain: TraceStep[];
  mrv: TraceStep[];
}

export function SolverPage({ navigate }: SolverPageProps) {
  const [board, setBoard] = useState<number[]>(createEmptyBoard);
  const [selected, setSelected] = useState<number | null>(null);
  const [steps, setSteps] = useState<TraceStep[]>([]);
  const [stepIndex, setStepIndex] = useState<number>(-1);
  const [useMrv, setUseMrv] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [statusError, setStatusError] = useState<string>("");
  const [pasteText, setPasteText] = useState<string>("");
  const [comparison, setComparison] = useState<StrategyComparison | null>(null);

  const currentDisplayBoard = stepIndex >= 0 && steps[stepIndex] ? steps[stepIndex].board : board;
  const currentStep = stepIndex >= 0 && steps[stepIndex] ? steps[stepIndex] : null;

  // Step playback timer
  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      setStepIndex((idx) => {
        if (idx >= steps.length - 1) {
          setIsPlaying(false);
          return steps.length - 1;
        }
        return idx + 1;
      });
    }, 140);

    return () => clearInterval(timer);
  }, [isPlaying, steps.length]);

  // Keypad cell value change
  const handleCellValue = useCallback(
    (val: number) => {
      if (selected === null) return;
      const nextBoard = [...board];
      nextBoard[selected] = val;
      setBoard(nextBoard);
      setSteps([]);
      setStepIndex(-1);
      setIsPlaying(false);
      setComparison(null);
      setStatusError("");
    },
    [selected, board]
  );

  // Clear grid
  const handleClear = () => {
    setBoard(createEmptyBoard());
    setSelected(null);
    setSteps([]);
    setStepIndex(-1);
    setIsPlaying(false);
    setComparison(null);
    setPasteText("");
    setStatusError("");
  };

  // Load sample puzzle
  const handleLoadSample = () => {
    const sample = generateSudoku("medium").puzzle;
    setBoard(sample);
    setSelected(null);
    setSteps([]);
    setStepIndex(-1);
    setIsPlaying(false);
    setComparison(null);
    setStatusError("");
  };

  // Solve with trace
  const handleSolveWithTrace = () => {
    if (!isBoardValid(board)) {
      setStatusError("This starting grid has a duplicate. Correct the highlighted entries first.");
      return;
    }
    if (!board.some(Boolean)) {
      setStatusError("Enter a few clues before asking the solver to work.");
      return;
    }

    const res = solveWithTrace(board, useMrv);
    if (!res.solved) {
      setStatusError("This puzzle has no solution with the clues entered.");
      return;
    }
    if (!res.steps.length) {
      setStatusError("This grid is already solved.");
      return;
    }

    setSteps(res.steps);
    setStepIndex(-1);
    setIsPlaying(true);
    setComparison(null);
    setStatusError("");
  };

  // Import pasted puzzle
  const handleImportPuzzle = () => {
    const chars = pasteText
      .replace(/\s/g, "")
      .split("")
      .filter((c) => /[0-9.]/.test(c));

    if (chars.length !== 81) {
      setStatusError("Paste exactly 81 cells. Use 0 or a dot for each blank.");
      return;
    }

    const parsed = chars.map((c) => (c === "." ? 0 : Number(c)));
    if (!isBoardValid(parsed)) {
      setBoard(parsed);
      setStatusError("This grid contains a duplicate. Correct the highlighted entries before solving.");
      return;
    }

    setBoard(parsed);
    setSelected(null);
    setSteps([]);
    setStepIndex(-1);
    setIsPlaying(false);
    setComparison(null);
    setStatusError("Puzzle loaded.");
  };

  // Compare Plain vs MRV
  const handleCompare = () => {
    if (!isBoardValid(board)) {
      setStatusError("This starting grid has a duplicate. Correct the highlighted entries first.");
      return;
    }
    if (!board.some(Boolean)) {
      setStatusError("Enter a few clues before comparing the strategies.");
      return;
    }

    const plainRes = solveWithTrace(board, false);
    const mrvRes = solveWithTrace(board, true);

    if (!plainRes.solved || !mrvRes.solved) {
      setStatusError("This puzzle has no solution with the clues entered.");
      return;
    }
    if (!plainRes.steps.length || !mrvRes.steps.length) {
      setStatusError("This grid is already solved. Enter a fresh puzzle to compare strategies.");
      return;
    }

    setComparison({
      plain: plainRes.steps,
      mrv: mrvRes.steps,
    });
    setIsPlaying(false);
    setSteps([]);
    setStepIndex(-1);
    setStatusError("");
  };

  // Find duplicates
  const conflicts = useMemo(() => {
    const list: number[] = [];
    board.forEach((val, idx) => {
      if (val && !isValidPlacement(board, idx, val)) {
        list.push(idx);
      }
    });
    return list;
  }, [board]);

  const plainLastStep = comparison?.plain[comparison.plain.length - 1];
  const mrvLastStep = comparison?.mrv[comparison.mrv.length - 1];

  return (
    <main className="wrap">
      <div className="page-heading">
        <div>
          <div className="eyebrow">Solver lab · custom puzzle</div>
          <h1>See the logic unfold.</h1>
          <div className="small muted">
            Paste a grid or enter clues, then watch backtracking test and unwind choices.
          </div>
        </div>
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            navigate("/");
          }}
          className="btn ghost"
          data-testid="link-solver-back"
        >
          <ArrowLeft size={15} /> Lobby
        </a>
      </div>

      <div className="solver-layout">
        <section>
          <div className="board-wrap">
            <SudokuBoard
              board={currentDisplayBoard}
              initial={board}
              selected={selected}
              onSelect={setSelected}
              conflicts={conflicts}
              traceCell={currentStep?.cell ?? -1}
              editable={true}
            />
          </div>

          <NumberPad onValue={handleCellValue} />

          <div className="solver-input-row">
            <button
              type="button"
              className="btn ghost"
              onClick={handleClear}
              data-testid="button-solver-reset"
            >
              <RotateCcw size={14} /> Clear grid
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={handleLoadSample}
              data-testid="button-solver-sample"
            >
              Load sample puzzle
            </button>
            <button
              type="button"
              className="btn"
              onClick={handleSolveWithTrace}
              data-testid="button-solver-start"
            >
              <BrainCircuit size={15} /> Solve with trace
            </button>
          </div>

          <div className="solver-input-row" style={{ alignItems: "flex-end" }}>
            <label style={{ flex: 1, minWidth: 190, fontSize: 11, color: "#70766e" }}>
              Paste a puzzle (81 cells; use 0 or . for blanks)
              <textarea
                className="input"
                rows={3}
                style={{ marginTop: 6 }}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="530070000600195000098000060..."
                data-testid="input-puzzle-text"
              />
            </label>
            <button
              type="button"
              className="btn ghost"
              onClick={handleImportPuzzle}
              data-testid="button-import-puzzle"
            >
              Load puzzle
            </button>
          </div>
        </section>

        <aside className="panel side-panel">
          <span className="mode-pill">
            <Sliders size={13} style={{ verticalAlign: "middle", marginRight: 5 }} />
            Solver settings
          </span>

          <h3 style={{ marginTop: 18 }}>Choose a strategy</h3>

          <div className="control-row">
            <button
              type="button"
              className={`btn ${useMrv ? "" : "ghost"}`}
              onClick={() => {
                setUseMrv(true);
                setIsPlaying(false);
                setSteps([]);
                setStepIndex(-1);
                setComparison(null);
              }}
              data-testid="button-strategy-mrv"
            >
              MRV heuristic
            </button>
            <button
              type="button"
              className={`btn ${useMrv ? "ghost" : ""}`}
              onClick={() => {
                setUseMrv(false);
                setIsPlaying(false);
                setSteps([]);
                setStepIndex(-1);
                setComparison(null);
              }}
              data-testid="button-strategy-basic"
            >
              Plain scan
            </button>
          </div>

          <p className="small muted" style={{ lineHeight: 1.65 }}>
            {useMrv
              ? "MRV selects the empty square with the fewest legal candidates first. Fewer branches, faster deductions."
              : "Plain backtracking scans left-to-right, trying candidates and unwinding when a choice blocks the solution."}
          </p>

          <button
            type="button"
            className="btn ghost"
            style={{ width: "100%" }}
            onClick={handleCompare}
            data-testid="button-compare-strategies"
          >
            <Scale size={15} /> Compare both strategies
          </button>

          {comparison && (
            <div className="strategy-compare" data-testid="panel-strategy-comparison">
              <div>
                <span>Plain scan</span>
                <strong>{plainLastStep?.decisions || 0} decisions</strong>
                <small>{plainLastStep?.backtracks || 0} backtracks</small>
              </div>
              <div>
                <span>MRV heuristic</span>
                <strong>{mrvLastStep?.decisions || 0} decisions</strong>
                <small>{mrvLastStep?.backtracks || 0} backtracks</small>
              </div>
            </div>
          )}

          <div className="control-row">
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setIsPlaying(false);
                setStepIndex((idx) => Math.max(-1, idx - 1));
              }}
              disabled={!steps.length || stepIndex < 0}
              data-testid="button-step-previous"
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => setIsPlaying((p) => !p)}
              disabled={!steps.length}
              data-testid="button-step-play"
            >
              {isPlaying ? (
                <>
                  <Pause size={15} /> Pause
                </>
              ) : (
                <>
                  <Play size={15} /> Play
                </>
              )}
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setIsPlaying(false);
                setStepIndex((idx) => Math.min(steps.length - 1, idx + 1));
              }}
              disabled={!steps.length || stepIndex >= steps.length - 1}
              data-testid="button-step-next"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>

          <div className="game-kpis">
            <div className="kpi">
              <span>Decisions</span>
              <strong data-testid="text-decisions">{currentStep?.decisions || 0}</strong>
            </div>
            <div className="kpi">
              <span>Backtracks</span>
              <strong data-testid="text-backtracks">{currentStep?.backtracks || 0}</strong>
            </div>
          </div>

          <div
            className={statusError ? "status-note error" : "status-note"}
            data-testid="status-solver"
          >
            {statusError ||
              (steps.length
                ? stepIndex < 0
                  ? "Ready. Step forward to watch the first decision."
                  : currentStep?.message || "Trace complete."
                : "Enter clues with the number pad. Select a square to begin.")}
          </div>

          <div className="trace-feed">
            {steps
              .slice(Math.max(0, stepIndex - 5), stepIndex + 1)
              .reverse()
              .map((step, revIdx) => {
                const stepNum = stepIndex - revIdx;
                return (
                  <div
                    key={`${stepNum}-${step.cell}`}
                    className={`trace-item ${revIdx === 0 ? "active" : ""}`}
                    data-testid={`trace-step-${stepNum}`}
                  >
                    {step.message}
                  </div>
                );
              })}
          </div>
        </aside>
      </div>
    </main>
  );
}
