import type { UserProfile, MatchMembership, DifficultyLevel } from "./types";

export const PROFILE_STORAGE_KEY = "sudoku-arena-profile-v1";
export const MEMBERSHIP_STORAGE_KEY = "sudoku-arena-membership";

export const DEFAULT_PROFILE: UserProfile = {
  name: "Gridfox",
  unlocks: {
    easy: 1,
    medium: 1,
    hard: 1,
  },
  wins: 0,
  bests: {},
  lastTimes: {},
};

export function getStoredProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      unlocks: { ...DEFAULT_PROFILE.unlocks, ...parsed.unlocks },
      bests: { ...DEFAULT_PROFILE.bests, ...parsed.bests },
      lastTimes: { ...DEFAULT_PROFILE.lastTimes, ...parsed.lastTimes },
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch (err) {
    console.error("Failed to save profile to localStorage", err);
  }
}

export function getStoredMembership(code?: string): MatchMembership | null {
  try {
    const raw = localStorage.getItem(MEMBERSHIP_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MatchMembership;
    if (code && parsed.code.toLowerCase() !== code.toLowerCase()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveMembership(membership: MatchMembership): void {
  try {
    localStorage.setItem(MEMBERSHIP_STORAGE_KEY, JSON.stringify(membership));
  } catch (err) {
    console.error("Failed to save membership", err);
  }
}
