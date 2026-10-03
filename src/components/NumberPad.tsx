import React from "react";

interface NumberPadProps {
  onValue: (val: number) => void;
  disabled?: boolean;
}

export function NumberPad({ onValue, disabled = false }: NumberPadProps) {
  return (
    <div className="number-pad">
      {Array.from({ length: 9 }, (_, i) => (
        <button
          key={i}
          type="button"
          disabled={disabled}
          onClick={() => onValue(i + 1)}
          data-testid={`button-number-${i + 1}`}
        >
          {i + 1}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onValue(0)}
        disabled={disabled}
        data-testid="button-erase"
      >
        Erase
      </button>
    </div>
  );
}
