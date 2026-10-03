import React, { useState, useEffect, useCallback } from "react";
import { TopBar } from "./components/TopBar";
import { LobbyPage } from "./pages/LobbyPage";
import { PlayPage } from "./pages/PlayPage";
import { SolverPage } from "./pages/SolverPage";
import { MatchPage } from "./pages/MatchPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import type { DifficultyLevel } from "./lib/sudoku";

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname || "/");
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem("sudoku-theme") === "dark";
    } catch {
      return false;
    }
  });

  // Apply dark mode class to html document
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    try {
      localStorage.setItem("sudoku-theme", isDark ? "dark" : "light");
    } catch {
      // ignore
    }
  }, [isDark]);

  // Sync with browser history back/forward
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || "/");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = useCallback((to: string) => {
    window.history.pushState(null, "", to);
    setCurrentPath(to);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Parse current route
  const renderRoute = () => {
    if (currentPath === "/" || currentPath === "") {
      return <LobbyPage navigate={navigate} />;
    }

    if (currentPath === "/solver") {
      return <SolverPage navigate={navigate} />;
    }

    const playMatch = currentPath.match(/^\/play\/(easy|medium|hard)\/(\d+)$/);
    if (playMatch) {
      const difficulty = playMatch[1] as DifficultyLevel;
      const level = Math.max(1, Math.min(10, parseInt(playMatch[2], 10) || 1));
      return <PlayPage difficulty={difficulty} level={level} navigate={navigate} />;
    }

    const matchMatch = currentPath.match(/^\/match\/([a-zA-Z0-9_-]+)$/);
    if (matchMatch) {
      const code = matchMatch[1];
      return <MatchPage code={code} navigate={navigate} />;
    }

    return <NotFoundPage navigate={navigate} />;
  };

  return (
    <div className="app-shell">
      <TopBar
        currentPath={currentPath}
        navigate={navigate}
        isDark={isDark}
        onToggleTheme={() => setIsDark((d) => !d)}
      />
      {renderRoute()}
    </div>
  );
}
