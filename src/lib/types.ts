import type { DifficultyLevel, TraceStep } from "./sudoku";
export type { DifficultyLevel, TraceStep };

export interface UserProfile {
  name: string;
  unlocks: Record<DifficultyLevel, number>;
  wins: number;
  bests: Record<string, string>;
  lastTimes: Record<string, number>;
}

export interface RoomPlayer {
  id: string;
  name: string;
  filled: number;
  moves: number;
  board?: number[];
  initialFilled?: number;
}

export interface RoomState {
  code: string;
  difficulty: DifficultyLevel;
  status: "waiting" | "active" | "completed";
  winnerId: string | null;
  initialGrid: number[];
  board: number[];
  players: RoomPlayer[];
  opponent: RoomPlayer | null;
}

export interface MatchMembership {
  code: string;
  playerId: string;
  difficulty: DifficultyLevel;
}

export interface QueueResponse {
  status: "waiting" | "matched";
  ticketId?: string;
  code?: string;
  playerId?: string;
  difficulty?: DifficultyLevel;
}
