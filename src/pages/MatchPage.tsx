import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft,
  Copy,
  Swords,
  Info,
  ArrowRight,
  Trophy,
} from "lucide-react";
import { SudokuBoard } from "../components/SudokuBoard";
import { NumberPad } from "../components/NumberPad";
import { isValidPlacement } from "../lib/sudoku";
import {
  getStoredProfile,
  saveProfile,
  getStoredMembership,
  saveMembership,
} from "../lib/storage";
import {
  readArenaRoomState,
  submitArenaMove,
  joinArenaRoom,
} from "../lib/api";
import type { RoomState, MatchMembership } from "../lib/types";

interface MatchPageProps {
  code: string;
  navigate: (to: string) => void;
}

export function MatchPage({ code: rawCode, navigate }: MatchPageProps) {
  const code = (rawCode || "").toUpperCase();
  const [membership, setMembership] = useState<MatchMembership | null>(() =>
    getStoredMembership(code)
  );
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [nicknameInput, setNicknameInput] = useState<string>(
    () => getStoredProfile().name
  );
  const [roomCodeInput, setRoomCodeInput] = useState<string>(code);
  const [statusError, setStatusError] = useState<string>("");
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [moveNotice, setMoveNotice] = useState<string>("");
  const [isSubmittingMove, setIsSubmittingMove] = useState<boolean>(false);
  const [isJoining, setIsJoining] = useState<boolean>(false);

  // Sync state if code changes
  useEffect(() => {
    setMembership(getStoredMembership(code));
    setRoomCodeInput(code);
    setRoomState(null);
  }, [code]);

  // Polling room state
  useEffect(() => {
    if (!membership) return;
    let active = true;

    const fetchState = async () => {
      try {
        const state = await readArenaRoomState(membership.code, membership.playerId);
        if (active) {
          setRoomState(state);
          setIsReconnecting(false);
          setStatusError("");
        }
      } catch {
        if (active) {
          setIsReconnecting(true);
          setStatusError("Connection interrupted. Reconnecting to the live room…");
        }
      }
    };

    fetchState();
    const timer = window.setInterval(fetchState, 1600);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [membership]);

  // Win logging
  const loggedWinKey = useRef<string>("");
  useEffect(() => {
    if (!roomState || roomState.status !== "completed" || !roomState.winnerId) return;
    if (roomState.winnerId !== membership?.playerId) return;

    const winKey = `${roomState.code}:${roomState.winnerId}`;
    if (loggedWinKey.current === winKey) return;
    loggedWinKey.current = winKey;

    const currentProfile = getStoredProfile();
    currentProfile.wins += 1;
    saveProfile(currentProfile);
  }, [roomState, membership]);

  // Join room form submission
  const handleJoinDirect = async () => {
    setIsJoining(true);
    setStatusError("");
    try {
      const res = await joinArenaRoom(
        roomCodeInput.trim().toUpperCase(),
        nicknameInput.trim() || "Gridfox"
      );
      saveMembership(res);
      setMembership(res);
      setIsJoining(false);
    } catch (err: any) {
      setIsJoining(false);
      setStatusError(
        err.message || "Could not join this room. Confirm the invite code, then retry."
      );
    }
  };

  // Submit move
  const handleCellMove = useCallback(
    async (val: number) => {
      if (
        selectedCell === null ||
        !membership ||
        !roomState ||
        roomState.status === "completed" ||
        roomState.initialGrid[selectedCell] !== 0
      ) {
        return;
      }

      if (val && !isValidPlacement(roomState.board, selectedCell, val)) {
        setMoveNotice(`${val} conflicts with a number in this row, column, or box.`);
        return;
      }

      setIsSubmittingMove(true);
      try {
        const nextState = await submitArenaMove(
          membership.code,
          membership.playerId,
          selectedCell,
          val
        );
        setRoomState(nextState);
        setMoveNotice("");
      } catch (err: any) {
        setMoveNotice(err.message || "Move was not accepted. The live board will resync shortly.");
      } finally {
        setIsSubmittingMove(false);
      }
    },
    [selectedCell, membership, roomState]
  );

  const copyCodeToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setMoveNotice("Room code copied to clipboard.");
    } catch {
      setMoveNotice(`Room code: ${code}`);
    }
  };

  // If visitor needs to join room first
  if (!membership) {
    return (
      <main className="wrap">
        <div
          className="panel pad"
          style={{ maxWidth: 460, margin: "55px auto" }}
        >
          <div className="eyebrow">Room invitation · {code}</div>
          <h1
            className="page-heading"
            style={{ fontSize: 34, marginBottom: 8, flexDirection: "column", alignItems: "flex-start" }}
          >
            Join the race.
          </h1>
          <p className="small muted">
            Enter your nickname to take your seat in this live Sudoku room.
          </p>

          <label className="small muted" style={{ display: "block", marginTop: 14 }}>
            Nickname
            <input
              className="input"
              value={nicknameInput}
              onChange={(e) => setNicknameInput(e.target.value)}
              data-testid="input-match-name"
            />
          </label>

          <label className="small muted" style={{ display: "block", marginTop: 12 }}>
            Room code
            <input
              className="input"
              style={{ textTransform: "uppercase", letterSpacing: 2 }}
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
              data-testid="input-match-code"
            />
          </label>

          <button
            type="button"
            className="btn"
            style={{ width: "100%", marginTop: 16 }}
            onClick={handleJoinDirect}
            disabled={isJoining}
            data-testid="button-enter-match"
          >
            {isJoining ? "Joining…" : "Join this room"} <ArrowRight size={15} />
          </button>

          {statusError && (
            <div className="status-note error" style={{ marginTop: 12 }}>
              {statusError}
            </div>
          )}
        </div>
      </main>
    );
  }

  const me =
    roomState?.players.find((p) => p.id === membership.playerId) ||
    roomState?.players[0];

  const opponent =
    roomState?.opponent ||
    roomState?.players.find((p) => p.id !== membership.playerId) ||
    null;

  const totalBlanks =
    roomState?.initialGrid.filter((c) => c === 0).length || 81;

  const winnerPlayer = roomState?.players.find((p) => p.id === roomState?.winnerId);
  const isWinnerMe = roomState?.winnerId === membership.playerId;

  return (
    <main className="wrap">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            {roomState?.difficulty || membership.difficulty} head-to-head
          </div>
          <h1>Race the grid.</h1>
        </div>
        <button
          type="button"
          className="btn ghost"
          onClick={() => navigate("/")}
          data-testid="button-match-lobby"
        >
          <ArrowLeft size={15} /> Leave room
        </button>
      </div>

      <div className="match-banner">
        <div>
          <span className="section-label" style={{ color: "#b9cec0" }}>
            Room {code}
          </span>
          <p>
            {roomState?.status === "completed"
              ? `Match complete · winner ${winnerPlayer?.name || "opponent"}`
              : roomState?.status === "waiting"
              ? "Room ready · waiting for another player"
              : "Live race · every move counts"}
            {isReconnecting ? " · reconnecting" : ""}
          </p>
        </div>
        <button
          type="button"
          className="btn ghost"
          onClick={copyCodeToClipboard}
          data-testid="button-copy-code"
        >
          <Copy size={14} /> Copy code
        </button>
      </div>

      {roomState ? (
        <>
          <div className="match-grid">
            {[me, opponent].map((player, idx) => (
              <div
                key={player?.id || idx}
                className="panel match-player"
              >
                <div className="match-player-head">
                  <span>{player?.name || (idx === 0 ? "You" : "Opponent")}</span>
                  <span style={{ fontFamily: "DM Mono", color: "#26745f" }}>
                    {player?.filled || 0}
                    <span className="muted"> / {totalBlanks}</span>
                  </span>
                </div>
                <div className="progress-track">
                  <i
                    style={{
                      width: `${Math.min(
                        100,
                        (((player?.filled || 0) / totalBlanks) * 100) || 0
                      )}%`,
                    }}
                  />
                </div>
                <span className="small muted">
                  {idx === 0 ? "Your board" : "Opponent progress"} ·{" "}
                  {player?.moves || 0} moves
                </span>
              </div>
            ))}
          </div>

          <div className="game-layout" style={{ marginTop: 17 }}>
            <section>
              <div className="board-wrap">
                <SudokuBoard
                  board={roomState.board}
                  initial={roomState.initialGrid}
                  selected={selectedCell}
                  onSelect={setSelectedCell}
                  disabled={roomState.status === "completed"}
                />
              </div>
              <NumberPad
                onValue={handleCellMove}
                disabled={roomState.status === "completed" || isSubmittingMove}
              />
            </section>

            <aside className="panel side-panel">
              <span className="mode-pill">
                <Swords
                  size={13}
                  style={{ verticalAlign: "middle", marginRight: 5 }}
                />
                Live match
              </span>

              <h3 style={{ marginTop: 18 }}>Your race</h3>

              <div className="game-kpis">
                <div className="kpi">
                  <span>Filled</span>
                  <strong data-testid="text-match-filled">
                    {me?.filled || 0}
                    <small style={{ fontSize: 11 }}> / {totalBlanks}</small>
                  </strong>
                </div>
                <div className="kpi">
                  <span>Moves</span>
                  <strong data-testid="text-match-moves">
                    {me?.moves || 0}
                  </strong>
                </div>
              </div>

              <div
                className={
                  statusError || moveNotice ? "status-note error" : "status-note"
                }
                data-testid="status-match"
              >
                {statusError ||
                  moveNotice ||
                  (roomState.status === "waiting"
                    ? "Waiting for your opponent to join. Your board is ready."
                    : roomState.status === "completed"
                    ? isWinnerMe
                      ? "Congratulations! You won the race!"
                      : `Race completed. Winner: ${winnerPlayer?.name || "opponent"}.`
                    : isSubmittingMove
                    ? "Sending move…"
                    : "Live room connected. Make a move on an empty cell.")}
              </div>

              {roomState.status === "completed" && isWinnerMe && (
                <div
                  style={{
                    marginTop: 14,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: "#236f5c",
                    fontWeight: 700,
                  }}
                >
                  <Trophy size={18} color="#d87550" />
                  <span>Victory recorded to your profile!</span>
                </div>
              )}

              <div
                className="small muted"
                style={{ marginTop: 14, lineHeight: 1.6 }}
              >
                <Info
                  size={14}
                  style={{ verticalAlign: "middle", marginRight: 5 }}
                />
                Select an empty cell, then submit a number. Your opponent solves
                on their own board.
              </div>
            </aside>
          </div>
        </>
      ) : (
        <div className="panel pad">
          <div className="loading-pulse" style={{ width: 170 }} />
          <p className="muted small" style={{ marginTop: 8 }}>
            Connecting to the live room…
          </p>
          {(statusError || isReconnecting) && (
            <div className="status-note error" data-testid="status-match-error">
              {statusError}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
