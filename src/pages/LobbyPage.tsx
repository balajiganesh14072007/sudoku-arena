import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Play,
  ArrowRight,
  Flame,
  Sparkles,
  Lock,
  Swords,
  Users,
  Search,
  Loader2,
  X,
  Code2,
} from "lucide-react";
import { DifficultyRow } from "../components/DifficultyRow";
import { Modal } from "../components/Modal";
import { DIFFICULTY_CONFIG, formatTime, type DifficultyLevel } from "../lib/sudoku";
import { getStoredProfile, saveProfile, saveMembership } from "../lib/storage";
import {
  createArenaRoom,
  joinArenaRoom,
  joinArenaQueue,
  readArenaQueueStatus,
  cancelArenaQueue,
} from "../lib/api";
import type { QueueResponse } from "../lib/types";

interface LobbyPageProps {
  navigate: (to: string) => void;
}

const SAMPLE_HERO_GRID = [
  1, 0, 7, 0, 5, 0, 4, 0, 9,
  0, 8, 0, 0, 1, 3, 0, 2, 0,
  0, 3, 0, 9, 0, 4, 0, 7, 0,
  0, 6, 4, 0, 0, 8, 2, 0, 0,
  7, 0, 0, 3, 1, 0, 0, 9, 0,
  0, 1, 9, 0, 0, 0, 7, 5, 0,
  0, 4, 0, 5, 0, 3, 0, 1, 0,
  0, 0, 3, 0, 2, 0, 6, 8, 0,
  3, 0, 8, 0, 6, 0, 1, 0, 2,
];

export function LobbyPage({ navigate }: LobbyPageProps) {
  const [profile, setProfile] = useState(getStoredProfile);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("easy");
  const [level, setLevel] = useState<number>(1);
  const [roomModal, setRoomModal] = useState<"create" | "join" | null>(null);
  const [joinCode, setJoinCode] = useState<string>("");
  const [errorStatus, setErrorStatus] = useState<string>("");
  const [isSearchingQueue, setIsSearchingQueue] = useState<boolean>(false);
  const [queueTicketId, setQueueTicketId] = useState<string>("");
  const [isCreatingRoom, setIsCreatingRoom] = useState<boolean>(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState<boolean>(false);

  // Update nickname
  const handleNicknameChange = (val: string) => {
    const updated = {
      ...profile,
      name: val.trim().slice(0, 24) || "Gridfox",
    };
    setProfile(updated);
    saveProfile(updated);
  };

  // Matchmaking match check handler
  const handleMatchFound = useCallback(
    (res: QueueResponse) => {
      if (res.status === "matched" && res.code && res.playerId) {
        saveMembership({
          code: res.code,
          playerId: res.playerId,
          difficulty: res.difficulty || difficulty,
        });
        setIsSearchingQueue(false);
        setQueueTicketId("");
        navigate(`/match/${res.code}`);
        return true;
      }
      return false;
    },
    [difficulty, navigate]
  );

  // Poll matchmaking ticket
  useEffect(() => {
    if (!queueTicketId) return;
    let active = true;

    const poll = async () => {
      try {
        const res = await readArenaQueueStatus(queueTicketId);
        if (active) {
          handleMatchFound(res);
        }
      } catch {
        if (active) {
          setErrorStatus("Still trying to reconnect to matchmaking…");
        }
      }
    };

    const interval = window.setInterval(poll, 1600);
    poll();

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [queueTicketId, handleMatchFound]);

  // Quick match start
  const handleQuickMatch = async () => {
    setErrorStatus("");
    setIsSearchingQueue(true);
    try {
      const res = await joinArenaQueue(profile.name, difficulty);
      if (!handleMatchFound(res)) {
        if (res.ticketId) {
          setQueueTicketId(res.ticketId);
        }
      }
    } catch {
      setIsSearchingQueue(false);
      setErrorStatus("Could not reach the arena. Check your connection and try again.");
    }
  };

  // Cancel quick match
  const handleCancelQuickMatch = async () => {
    const ticket = queueTicketId;
    setIsSearchingQueue(false);
    setQueueTicketId("");
    if (ticket) {
      try {
        await cancelArenaQueue(ticket);
      } catch {
        // ignore
      }
    }
  };

  // Create friend room
  const handleCreateFriendRoom = async () => {
    setErrorStatus("");
    setIsCreatingRoom(true);
    try {
      const res = await createArenaRoom(profile.name, difficulty);
      saveMembership(res);
      setRoomModal(null);
      setIsCreatingRoom(false);
      navigate(`/match/${res.code}`);
    } catch (err: any) {
      setIsCreatingRoom(false);
      setErrorStatus(err.message || "Room creation failed. Please try again.");
    }
  };

  // Join friend room
  const handleJoinFriendRoom = async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) {
      setErrorStatus("Enter a room code with at least four characters.");
      return;
    }
    setIsJoiningRoom(true);
    try {
      const res = await joinArenaRoom(code, profile.name);
      saveMembership(res);
      setRoomModal(null);
      setErrorStatus("");
      setIsJoiningRoom(false);
      navigate(`/match/${res.code}`);
    } catch (err: any) {
      setIsJoiningRoom(false);
      setErrorStatus(err.message || "We could not find that room. Check the code and try again.");
    }
  };

  const handleStartSolo = () => {
    navigate(`/play/${difficulty}/${level}`);
  };

  const currentLevelKey = `${difficulty}-${level}`;
  const lastTime = profile.lastTimes[currentLevelKey];
  const bestTime = profile.bests[currentLevelKey];

  return (
    <main className="wrap">
      {/* Hero section */}
      <section className="lobby-hero">
        <div className="hero-copy">
          <div className="eyebrow">Every puzzle has a next move</div>
          <h1 className="display">
            Make your
            <br />
            <span style={{ color: "#23705c" }}>next move.</span>
          </h1>
          <p>
            A little daily brainwork, a lot of satisfying progress. Take on a
            fresh grid, learn the logic, or race someone who loves the
            nine-by-nine as much as you do.
          </p>

          <button
            type="button"
            className="btn"
            onClick={handleStartSolo}
            data-testid="button-play-selected"
          >
            <Play size={15} fill="currentColor" />
            Play level {level}
            <ArrowRight size={16} />
          </button>

          <div className="profile-row">
            <span className="avatar">
              {profile.name.slice(0, 1).toUpperCase()}
            </span>
            <label style={{ flex: 1 }}>
              <span
                className="small muted"
                style={{ display: "block", marginBottom: 5 }}
              >
                Playing as
              </span>
              <input
                className="input"
                value={profile.name}
                maxLength={24}
                onChange={(e) => handleNicknameChange(e.target.value)}
                aria-label="Player nickname"
                data-testid="input-nickname"
              />
            </label>
            <div style={{ textAlign: "right", paddingLeft: 8 }}>
              <span className="small muted">Arena wins</span>
              <strong
                style={{ display: "block", fontFamily: "DM Mono" }}
                data-testid="text-wins"
              >
                {profile.wins}
              </strong>
            </div>
          </div>
        </div>

        <div className="hero-art">
          <div className="hero-grid">
            {SAMPLE_HERO_GRID.map((val, idx) => (
              <div key={idx} className="hero-cell">
                {val || ""}
              </div>
            ))}
          </div>
          <div className="hero-chip top">
            <Flame
              size={13}
              style={{ verticalAlign: "middle", marginRight: 5, color: "#df7953" }}
            />
            Daily rhythm
          </div>
          <div className="hero-chip bottom">
            <Sparkles
              size={14}
              style={{ verticalAlign: "middle", marginRight: 5 }}
            />
            One clean solve at a time
          </div>
        </div>
      </section>

      {/* Main Grid */}
      <section className="lobby-grid">
        {/* Solo Puzzle Path */}
        <div className="panel pad">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 10,
            }}
          >
            <span className="section-label">Your puzzle path</span>
            <span className="small muted">10 levels each</span>
          </div>

          <DifficultyRow
            value={difficulty}
            onChange={(d) => {
              setDifficulty(d);
              setLevel(1);
            }}
          />

          <div className="level-grid">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((lvl) => {
              const isLocked = lvl > (profile.unlocks[difficulty] || 1);
              return (
                <button
                  key={lvl}
                  type="button"
                  className={`level-btn ${level === lvl ? "selected" : ""}`}
                  onClick={() => setLevel(lvl)}
                  disabled={isLocked}
                  aria-label={isLocked ? `Level ${lvl} locked` : `Select level ${lvl}`}
                  data-testid={`button-level-${lvl}`}
                >
                  {isLocked ? <Lock size={15} /> : lvl}
                  {lvl === 1 && !isLocked && <small>START</small>}
                </button>
              );
            })}
          </div>

          <div className="play-options">
            <div className="mini-stat">
              <span>Selected challenge</span>
              <strong>
                {DIFFICULTY_CONFIG[difficulty].name} · {String(level).padStart(2, "0")}
              </strong>
            </div>
            <div className="mini-stat">
              <span>Last completion</span>
              <strong data-testid="text-last-completion">
                {lastTime !== undefined ? formatTime(lastTime) : "—"}
              </strong>
            </div>
            <div className="mini-stat">
              <span>Personal best</span>
              <strong>{bestTime || "—"}</strong>
            </div>
            <button
              type="button"
              className="btn"
              style={{ width: "100%", marginTop: 8 }}
              onClick={handleStartSolo}
              data-testid="button-start-solo"
            >
              Start this puzzle <ArrowRight size={15} />
            </button>
          </div>
        </div>

        {/* Versus and Solver column */}
        <div>
          <div className="versus-card">
            <div className="eyebrow" style={{ color: "#8db5a6" }}>
              Friendly competition
            </div>
            <h3>
              Same grid.
              <br />
              Different pace.
            </h3>
            <p>
              Find a rival for a quick race, or invite a friend into a private
              room. Every move is yours; the board keeps score.
            </p>

            <div className="versus-actions">
              <button
                type="button"
                className="btn coral"
                onClick={handleQuickMatch}
                disabled={isSearchingQueue}
                data-testid="button-quick-match"
              >
                {isSearchingQueue ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Searching
                  </>
                ) : (
                  <>
                    <Swords size={15} />
                    Quick match
                  </>
                )}
              </button>

              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setErrorStatus("");
                  setRoomModal("create");
                }}
                data-testid="button-create-room"
              >
                <Users size={15} />
                Friend room
              </button>
            </div>
          </div>

          <div className="panel pad" style={{ marginTop: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                className="brand-mark"
                style={{
                  background: "#e6eee6",
                  color: "#236f5c",
                  boxShadow: "none",
                }}
              >
                <Code2 size={17} />
              </div>
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: 13 }}>
                  Curious how the solver thinks?
                </strong>
                <div className="small muted" style={{ marginTop: 3 }}>
                  Watch backtracking in real time.
                </div>
              </div>
              <a
                href="/solver"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/solver");
                }}
                className="btn ghost"
                style={{ padding: "9px 11px" }}
                data-testid="link-open-solver"
              >
                <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {errorStatus && (
        <div className="status-note error" data-testid="status-lobby">
          {errorStatus}
        </div>
      )}

      {/* Matchmaking waiting modal */}
      {isSearchingQueue && (
        <Modal onClose={handleCancelQuickMatch} label="Matchmaking queue">
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div className="eyebrow">Matchmaking</div>
            <button
              type="button"
              className="topnav"
              onClick={handleCancelQuickMatch}
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>
          </div>
          <h2>Finding an opponent…</h2>
          <p>
            Looking for a match in <strong>{DIFFICULTY_CONFIG[difficulty].name}</strong> queue.
            Keep this window open while the arena looks for a match.
          </p>
          <div className="loading-pulse" style={{ width: "100%", margin: "16px 0" }} />
          <button
            type="button"
            className="btn ghost"
            style={{ width: "100%" }}
            onClick={handleCancelQuickMatch}
          >
            Cancel matchmaking
          </button>
        </Modal>
      )}

      {/* Room dialog */}
      {roomModal && (
        <Modal
          onClose={() => setRoomModal(null)}
          label={roomModal === "create" ? "Create a friend room" : "Join a friend room"}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div className="eyebrow">
              {roomModal === "create" ? "Private match" : "Room invite"}
            </div>
            <button
              type="button"
              className="topnav"
              onClick={() => setRoomModal(null)}
              aria-label="Close dialog"
              data-testid="button-close-room"
            >
              <X size={18} />
            </button>
          </div>

          <h2>{roomModal === "create" ? "Bring someone in." : "Got a room code?"}</h2>
          <p>
            {roomModal === "create"
              ? "Create a room and share its short code with a friend."
              : "Enter the code your friend shared to join their match."}
          </p>

          {roomModal === "create" ? (
            <>
              <label className="small muted">Puzzle difficulty</label>
              <DifficultyRow value={difficulty} onChange={setDifficulty} />
              <button
                type="button"
                className="btn"
                style={{ width: "100%" }}
                onClick={handleCreateFriendRoom}
                disabled={isCreatingRoom}
                data-testid="button-confirm-create"
              >
                {isCreatingRoom ? "Creating room…" : "Create invite room"}{" "}
                <ArrowRight size={15} />
              </button>
              <button
                type="button"
                className="btn ghost"
                style={{ width: "100%", marginTop: 8 }}
                onClick={() => {
                  setErrorStatus("");
                  setRoomModal("join");
                }}
                data-testid="button-switch-join"
              >
                Already have a room code? Join instead
              </button>
            </>
          ) : (
            <>
              <label className="small muted">
                Room code
                <input
                  className="input"
                  style={{ textTransform: "uppercase", letterSpacing: 2, marginTop: 4 }}
                  maxLength={8}
                  placeholder="e.g. 7X9K"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  data-testid="input-join-code"
                />
              </label>
              <button
                type="button"
                className="btn"
                style={{ width: "100%", marginTop: 12 }}
                onClick={handleJoinFriendRoom}
                disabled={isJoiningRoom}
                data-testid="button-confirm-join"
              >
                {isJoiningRoom ? "Joining…" : "Enter match"} <ArrowRight size={15} />
              </button>
              <button
                type="button"
                className="btn ghost"
                style={{ width: "100%", marginTop: 8 }}
                onClick={() => {
                  setErrorStatus("");
                  setRoomModal("create");
                }}
                data-testid="button-switch-create"
              >
                Need a new room? Create one instead
              </button>
            </>
          )}
        </Modal>
      )}
    </main>
  );
}
