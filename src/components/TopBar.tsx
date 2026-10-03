import React from "react";
import { Grid3X3 } from "lucide-react";

interface TopBarProps {
  currentPath: string;
  navigate: (to: string) => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export function TopBar({ currentPath, navigate, isDark, onToggleTheme }: TopBarProps) {
  return (
    <header className="topbar">
      <a
        href="/"
        onClick={(e) => {
          e.preventDefault();
          navigate("/");
        }}
        className="brand"
        data-testid="link-home"
      >
        <span className="brand-mark">
          <Grid3X3 size={18} />
        </span>
        <span>
          Sudoku <span style={{ color: "#d87550" }}>Arena</span>
        </span>
      </a>

      <nav className="topnav">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            navigate("/");
          }}
          className={currentPath === "/" ? "active" : ""}
          data-testid="link-lobby"
        >
          Lobby
        </a>
        <a
          href="/solver"
          onClick={(e) => {
            e.preventDefault();
            navigate("/solver");
          }}
          className={currentPath === "/solver" ? "active" : ""}
          data-testid="link-solver"
        >
          Solver lab
        </a>
        <button onClick={onToggleTheme} data-testid="button-theme">
          {isDark ? "Daylight" : "Night mode"}
        </button>
      </nav>
    </header>
  );
}
