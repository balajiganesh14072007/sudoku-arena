import React from "react";

interface SudokuBoardProps {
  board: number[];
  initial: number[];
  selected: number | null;
  onSelect: (index: number) => void;
  conflicts?: number[];
  traceCell?: number;
  disabled?: boolean;
  editable?: boolean;
}

export function SudokuBoard({
  board,
  initial,
  selected,
  onSelect,
  conflicts = [],
  traceCell = -1,
  disabled = false,
  editable = false,
}: SudokuBoardProps) {
  const selectedValue = selected !== null ? board[selected] : 0;

  return (
    <div className="sudoku-board" role="grid" aria-label="Sudoku board">
      {board.map((val, idx) => {
        const isRelated =
          selected !== null &&
          (Math.floor(idx / 9) === Math.floor(selected / 9) ||
            idx % 9 === selected % 9 ||
            (Math.floor(Math.floor(idx / 9) / 3) === Math.floor(Math.floor(selected / 9) / 3) &&
              Math.floor((idx % 9) / 3) === Math.floor((selected % 9) / 3)));

        let cls = "cell";
        if (initial[idx] && !editable) cls += " given";
        if (isRelated) cls += " related";
        if (selected === idx) cls += " selected";
        if (val && selectedValue === val) cls += " same";
        if (conflicts.includes(idx)) cls += " conflict";
        if (traceCell === idx) cls += " trace";

        const rowNum = Math.floor(idx / 9) + 1;
        const colNum = (idx % 9) + 1;

        return (
          <button
            key={idx}
            type="button"
            role="gridcell"
            aria-label={`Row ${rowNum}, column ${colNum}${val ? `, ${val}` : ", blank"}`}
            className={cls}
            onClick={() => onSelect(idx)}
            onKeyDown={(e) => {
              const navMap: Record<string, number> = {
                ArrowUp: idx - 9,
                ArrowDown: idx + 9,
                ArrowLeft: idx - 1,
                ArrowRight: idx + 1,
              };
              const target = navMap[e.key];
              if (target !== undefined) {
                e.preventDefault();
                onSelect(Math.max(0, Math.min(80, target)));
              }
            }}
            disabled={disabled || (!editable && Boolean(initial[idx]))}
            data-testid={`cell-${idx}`}
          >
            {val || ""}
          </button>
        );
      })}
    </div>
  );
}
