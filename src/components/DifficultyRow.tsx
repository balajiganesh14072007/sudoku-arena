import React from "react";
import { DIFFICULTY_CONFIG, type DifficultyLevel } from "../lib/sudoku";

interface DifficultyRowProps {
  value: DifficultyLevel;
  onChange: (val: DifficultyLevel) => void;
}

const DIFFICULTIES: DifficultyLevel[] = ["easy", "medium", "hard"];

export function DifficultyRow({ value, onChange }: DifficultyRowProps) {
  return (
    <div className="difficulty-row">
      {DIFFICULTIES.map((d) => (
        <button
          key={d}
          type="button"
          className={`difficulty ${value === d ? "active" : ""}`}
          onClick={() => onChange(d)}
          data-testid={`button-difficulty-${d}`}
        >
          <strong>{DIFFICULTY_CONFIG[d].name}</strong>
          <span>{DIFFICULTY_CONFIG[d].sub}</span>
        </button>
      ))}
    </div>
  );
}
