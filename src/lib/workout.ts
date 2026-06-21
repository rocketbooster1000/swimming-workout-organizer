export type Section = "warmup" | "main" | "cooldown";

export type WorkoutSet = {
  id: string;
  type?: "set";
  section: Section;
  rounds: number;
  reps: number;
  distance: number;
  stroke: string;
  interval_seconds?: number | null;
  rest_seconds?: number | null;
  description?: string;
  equipment?: string;
};

export type SetGroup = {
  id: string;
  type: "group";
  section: Section;
  rounds: number;
  label?: string;
  children: SectionItem[];
};

export type SectionItem = WorkoutSet | SetGroup;

export function isGroup(item: SectionItem): item is SetGroup {
  return (item as SetGroup).type === "group";
}

export type Workout = {
  id: string;
  user_id: string;
  title: string;
  focus: string | null;
  level: string;
  pool_length: number;
  pool_unit: string;
  notes: string | null;
  sets: SectionItem[];
  total_distance: number;
  total_seconds: number;
  scheduled_for: string | null;
  created_at: string;
  updated_at: string;
};

export const STROKES = [
  "Freestyle",
  "Backstroke",
  "Breaststroke",
  "Butterfly",
  "IM",
  "Choice",
  "Kick",
  "Drill",
  "Pull",
];

export const SECTIONS: { key: Section; label: string }[] = [
  { key: "warmup", label: "Warm-up" },
  { key: "main", label: "Main Set" },
  { key: "cooldown", label: "Cool-down" },
];

export function setDistance(s: WorkoutSet) {
  return (s.rounds || 1) * (s.reps || 1) * (s.distance || 0);
}

export function setSeconds(s: WorkoutSet) {
  const interval = s.interval_seconds ?? 0;
  const rest = s.rest_seconds ?? 0;
  const reps = (s.rounds || 1) * (s.reps || 1);
  return reps * interval + (s.rounds || 1) * rest;
}

// Distance for a set when contained inside a group (its own rounds are ignored — the group's rounds multiply).
function innerSetDistance(s: WorkoutSet) {
  return (s.reps || 1) * (s.distance || 0);
}
function innerSetSeconds(s: WorkoutSet) {
  return (s.reps || 1) * (s.interval_seconds ?? 0) + (s.rest_seconds ?? 0);
}

export function itemDistance(item: SectionItem): number {
  if (isGroup(item)) {
    const inner = item.children.reduce(
      (a, c) => a + (isGroup(c) ? itemDistance(c) : innerSetDistance(c)),
      0,
    );
    return (item.rounds || 1) * inner;
  }
  return setDistance(item);
}

export function itemSeconds(item: SectionItem): number {
  if (isGroup(item)) {
    const inner = item.children.reduce(
      (a, c) => a + (isGroup(c) ? itemSeconds(c) : innerSetSeconds(c)),
      0,
    );
    return (item.rounds || 1) * inner;
  }
  return setSeconds(item);
}

export function totals(items: SectionItem[]) {
  return items.reduce(
    (acc, s) => {
      acc.distance += itemDistance(s);
      acc.seconds += itemSeconds(s);
      return acc;
    },
    { distance: 0, seconds: 0 },
  );
}

export function formatDuration(seconds: number) {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h) return `${h}h ${m}m`;
  if (m && s) return `${m}:${String(s).padStart(2, "0")}`;
  if (m) return `${m} min`;
  return `${s}s`;
}

export function formatInterval(seconds?: number | null) {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function parseInterval(value: string): number | null {
  if (!value.trim()) return null;
  if (value.includes(":")) {
    const [m, s] = value.split(":").map((v) => parseInt(v, 10) || 0);
    return m * 60 + s;
  }
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

export function describeSet(s: WorkoutSet, opts?: { hideRounds?: boolean }) {
  const rounds = !opts?.hideRounds && s.rounds > 1 ? `${s.rounds} rounds of ` : "";
  const reps = `${s.reps} × ${s.distance}`;
  const stroke = s.stroke ? ` ${s.stroke}` : "";
  const interval = s.interval_seconds ? ` @ ${formatInterval(s.interval_seconds)}` : "";
  return `${rounds}${reps}${stroke}${interval}`.trim();
}

export function newSet(section: Section): WorkoutSet {
  return {
    id: crypto.randomUUID(),
    type: "set",
    section,
    rounds: 1,
    reps: 4,
    distance: 50,
    stroke: "Freestyle",
    interval_seconds: null,
    rest_seconds: null,
    description: "",
    equipment: "",
  };
}

export function newChildSet(section: Section): WorkoutSet {
  return { ...newSet(section), reps: 3, distance: 50 };
}

export function newGroup(section: Section): SetGroup {
  return {
    id: crypto.randomUUID(),
    type: "group",
    section,
    rounds: 2,
    label: "",
    children: [newChildSet(section), newChildSet(section)],
  };
}
