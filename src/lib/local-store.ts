import type { Workout } from "./workout";

const PROFILES_KEY = "lanes:offline-profiles";
const LEGACY_USERS_KEY = "lanes:offline-users";
const SESSION_KEY = "lanes:offline-session";
const WORKOUTS_KEY = "lanes:offline-workouts";
export const LOCAL_STORE_EVENT = "lanes:offline-change";

export type LocalProfile = {
  id: string;
  display_name: string;
  created_at: string;
  updated_at: string;
};

export type PublicLocalProfile = LocalProfile;

type LocalSession = {
  profileId?: string;
  userId?: string;
  created_at: string;
};

type LegacyLocalUser = {
  id: string;
  email: string;
  display_name: string;
  password_salt: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
};

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function now() {
  return new Date().toISOString();
}

function randomId() {
  return crypto.randomUUID();
}

function emitChange() {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event(LOCAL_STORE_EVENT));
}

function readJson<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (!isBrowser()) return;
  localStorage.setItem(key, JSON.stringify(value));
  emitChange();
}

function readLegacyUsers(): LegacyLocalUser[] {
  return readJson<LegacyLocalUser[]>(LEGACY_USERS_KEY, []);
}

function mapLegacyUserToProfile(user: LegacyLocalUser): LocalProfile {
  return {
    id: user.id,
    display_name: user.display_name,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

function readProfiles(): LocalProfile[] {
  const profiles = readJson<LocalProfile[]>(PROFILES_KEY, []);
  if (profiles.length > 0) return profiles;

  const legacyProfiles = readLegacyUsers().map(mapLegacyUserToProfile);
  if (legacyProfiles.length > 0 && isBrowser()) {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(legacyProfiles));
  }
  return legacyProfiles;
}

function writeProfiles(profiles: LocalProfile[]) {
  writeJson(PROFILES_KEY, profiles);
}

function readSession(): LocalSession | null {
  return readJson<LocalSession | null>(SESSION_KEY, null);
}

function writeSession(session: LocalSession | null) {
  if (!isBrowser()) return;
  if (session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
  emitChange();
}

function readWorkouts() {
  return readJson<Workout[]>(WORKOUTS_KEY, []);
}

function writeWorkouts(workouts: Workout[]) {
  writeJson(WORKOUTS_KEY, workouts);
}

function normalizeDisplayName(displayName: string) {
  return displayName.trim().replace(/\s+/g, " ");
}

function sessionProfileId(session: LocalSession | null) {
  return session?.profileId ?? session?.userId ?? null;
}

function toPublicProfile(profile: LocalProfile): PublicLocalProfile {
  return profile;
}

export function listProfiles(): PublicLocalProfile[] {
  return readProfiles()
    .slice()
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map(toPublicProfile);
}

export function getProfileById(profileId: string): PublicLocalProfile | null {
  const profile = readProfiles().find((p) => p.id === profileId);
  return profile ? toPublicProfile(profile) : null;
}

export function getCurrentProfile(): PublicLocalProfile | null {
  if (!isBrowser()) return null;
  const session = readSession();
  const profileId = sessionProfileId(session);
  if (!profileId) return null;
  const profile = readProfiles().find((p) => p.id === profileId);
  if (!profile) {
    writeSession(null);
    return null;
  }

  if (!session?.profileId) {
    writeSession({ profileId: profile.id, created_at: session?.created_at ?? now() });
  }

  return toPublicProfile(profile);
}

export const getCurrentUser = getCurrentProfile;

export function setCurrentProfile(profileId: string) {
  if (!isBrowser()) return;
  const profile = getProfileById(profileId);
  if (!profile) {
    throw new Error("Profile not found.");
  }
  writeSession({ profileId: profile.id, created_at: now() });
}

export function clearCurrentProfile() {
  if (!isBrowser()) return;
  writeSession(null);
}

export function createProfile(displayName: string) {
  if (!isBrowser()) {
    throw new Error("Profiles are only available in the browser.");
  }

  const normalized = normalizeDisplayName(displayName);
  if (!normalized) {
    throw new Error("Please enter a profile name.");
  }

  const profiles = readProfiles();
  if (profiles.some((profile) => profile.display_name.toLowerCase() === normalized.toLowerCase())) {
    throw new Error("A profile with that name already exists.");
  }

  const profile: LocalProfile = {
    id: randomId(),
    display_name: normalized,
    created_at: now(),
    updated_at: now(),
  };

  writeProfiles([...profiles, profile]);
  writeSession({ profileId: profile.id, created_at: now() });
  return toPublicProfile(profile);
}

export function renameProfile(profileId: string, displayName: string) {
  if (!isBrowser()) {
    throw new Error("Profiles are only available in the browser.");
  }

  const normalized = normalizeDisplayName(displayName);
  if (!normalized) {
    throw new Error("Please enter a profile name.");
  }

  const profiles = readProfiles();
  const current = profiles.find((profile) => profile.id === profileId);
  if (!current) {
    throw new Error("Profile not found.");
  }

  if (
    profiles.some(
      (profile) =>
        profile.id !== profileId && profile.display_name.toLowerCase() === normalized.toLowerCase(),
    )
  ) {
    throw new Error("A profile with that name already exists.");
  }

  const updated: LocalProfile = { ...current, display_name: normalized, updated_at: now() };
  writeProfiles(profiles.map((profile) => (profile.id === profileId ? updated : profile)));
  return toPublicProfile(updated);
}

export function deleteProfile(profileId: string) {
  if (!isBrowser()) return;
  const profiles = readProfiles();
  const nextProfiles = profiles.filter((profile) => profile.id !== profileId);
  if (nextProfiles.length === profiles.length) return;
  writeProfiles(nextProfiles);

  const nextWorkouts = readWorkouts().filter((workout) => workout.user_id !== profileId);
  writeWorkouts(nextWorkouts);

  const activeProfileId = sessionProfileId(readSession());
  if (activeProfileId === profileId) {
    clearCurrentProfile();
  }
}

export function signOutLocal() {
  clearCurrentProfile();
}

export function getLocalWorkouts(profileId: string) {
  return readWorkouts()
    .filter((workout) => workout.user_id === profileId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function getLocalWorkout(profileId: string, id: string) {
  return readWorkouts().find((workout) => workout.id === id && workout.user_id === profileId) ?? null;
}

export function createLocalWorkout(profileId: string) {
  const createdAt = now();
  const workout: Workout = {
    id: randomId(),
    user_id: profileId,
    title: "Untitled practice",
    focus: "Aerobic",
    level: "intermediate",
    pool_length: 25,
    pool_unit: "scy",
    notes: null,
    sets: [],
    total_distance: 0,
    total_seconds: 0,
    scheduled_for: null,
    created_at: createdAt,
    updated_at: createdAt,
  };

  writeWorkouts([...readWorkouts(), workout]);
  return workout;
}

export function updateLocalWorkout(
  profileId: string,
  id: string,
  patch: Partial<Omit<Workout, "id" | "user_id" | "created_at" | "updated_at">>,
) {
  const workouts = readWorkouts();
  const idx = workouts.findIndex((workout) => workout.id === id && workout.user_id === profileId);
  if (idx < 0) {
    throw new Error("Workout not found.");
  }

  const updated: Workout = {
    ...workouts[idx],
    ...patch,
    updated_at: now(),
  };

  workouts[idx] = updated;
  writeWorkouts(workouts);
  return updated;
}

export function deleteLocalWorkout(profileId: string, id: string) {
  const next = readWorkouts().filter((workout) => !(workout.id === id && workout.user_id === profileId));
  writeWorkouts(next);
}
