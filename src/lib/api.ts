import type { DifficultyLevel } from "./sudoku";
import type { RoomState, MatchMembership, QueueResponse } from "./types";

export async function createArenaRoom(name: string, difficulty: DifficultyLevel): Promise<MatchMembership> {
  const res = await fetch("/api/arena/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, difficulty }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Room creation failed. Please try again.");
  }
  return res.json();
}

export async function joinArenaRoom(code: string, name: string): Promise<MatchMembership> {
  const res = await fetch("/api/arena/rooms/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "We could not find that room. Check the code and try again.");
  }
  return res.json();
}

export async function readArenaRoomState(code: string, playerId: string): Promise<RoomState> {
  const res = await fetch("/api/arena/rooms/state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, playerId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to fetch room state.");
  }
  return res.json();
}

export async function submitArenaMove(code: string, playerId: string, cell: number, value: number): Promise<RoomState> {
  const res = await fetch("/api/arena/rooms/moves", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, playerId, cell, value }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Move was not accepted. The live board will resync shortly.");
  }
  return res.json();
}

export async function joinArenaQueue(name: string, difficulty: DifficultyLevel): Promise<QueueResponse> {
  const res = await fetch("/api/arena/queue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, difficulty }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Could not reach the arena. Check your connection and try again.");
  }
  return res.json();
}

export async function readArenaQueueStatus(ticketId: string): Promise<QueueResponse> {
  const res = await fetch("/api/arena/queue/status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticketId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to check queue status.");
  }
  return res.json();
}

export async function cancelArenaQueue(ticketId: string): Promise<{ cancelled: boolean }> {
  const res = await fetch("/api/arena/queue/cancel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticketId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to cancel queue ticket.");
  }
  return res.json();
}
