import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Ruler, Timer, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDuration, type Workout } from "@/lib/workout";

export const Route = createFileRoute("/_authenticated/summary")({
  head: () => ({ meta: [{ title: "Summary — Lanes" }] }),
  component: SummaryPage,
});

type Mode = "week" | "year" | "date" | "season";

function workoutDate(w: Workout): Date {
  return new Date(w.scheduled_for ?? w.created_at);
}

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0=Sun
  x.setDate(x.getDate() - day);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function seasonRange(course: "scy" | "lcm", year: number): [Date, Date] {
  // SCY: Aug (year) - Mar (year+1). LCM: Apr (year) - Jul (year)
  if (course === "scy") {
    return [new Date(year, 7, 1), new Date(year + 1, 2, 31, 23, 59, 59)];
  }
  return [new Date(year, 3, 1), new Date(year, 6, 31, 23, 59, 59)];
}

function SummaryPage() {
  const [mode, setMode] = useState<Mode>("week");

  const { data, isLoading } = useQuery({
    queryKey: ["workouts", "summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workouts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Workout[];
    },
  });

  const workouts = data ?? [];

  // Week mode
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  // Year mode
  const thisYear = new Date().getFullYear();
  const [yearStart, setYearStart] = useState(thisYear);
  const [yearEnd, setYearEnd] = useState(thisYear);
  // Date mode
  const [dateStart, setDateStart] = useState(ymd(addDays(new Date(), -30)));
  const [dateEnd, setDateEnd] = useState(ymd(new Date()));
  // Season
  const [seasonCourse, setSeasonCourse] = useState<"scy" | "lcm">("scy");
  const [seasonYear, setSeasonYear] = useState(thisYear);

  const range = useMemo<[Date, Date]>(() => {
    if (mode === "week") return [weekStart, addDays(weekStart, 7)];
    if (mode === "year") return [new Date(yearStart, 0, 1), new Date(yearEnd, 11, 31, 23, 59, 59)];
    if (mode === "date") return [new Date(dateStart), new Date(dateEnd + "T23:59:59")];
    return seasonRange(seasonCourse, seasonYear);
  }, [mode, weekStart, yearStart, yearEnd, dateStart, dateEnd, seasonCourse, seasonYear]);

  const filtered = useMemo(() => {
    const [s, e] = range;
    return workouts.filter((w) => {
      const d = workoutDate(w);
      return d >= s && d <= e;
    });
  }, [workouts, range]);

  const totals = useMemo(() => {
    const byUnit: Record<string, number> = {};
    let seconds = 0;
    for (const w of filtered) {
      const unit = w.pool_unit === "scy" ? "yd" : w.pool_unit === "lcm" || w.pool_unit === "scm" ? "m" : w.pool_unit;
      byUnit[unit] = (byUnit[unit] ?? 0) + (w.total_distance ?? 0);
      seconds += w.total_seconds ?? 0;
    }
    return { byUnit, seconds, count: filtered.length };
  }, [filtered]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div>
        <h1 className="font-display text-3xl font-semibold text-deep">Training summary</h1>
        <p className="mt-1 text-sm text-muted-foreground">Total distance and time across any window.</p>
      </div>

      <div className="mt-6 flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1 w-fit">
        {(["week", "year", "date", "season"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-md px-3 py-1.5 text-sm capitalize transition ${
              mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-5">
        {mode === "week" && (
          <div className="flex items-center justify-between gap-4">
            <Button variant="ghost" size="icon" onClick={() => setWeekStart(addDays(weekStart, -7))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Week of</div>
              <div className="font-display text-lg font-semibold text-deep">
                {weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                {" – "}
                {addDays(weekStart, 6).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setWeekStart(addDays(weekStart, 7))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
        {mode === "year" && (
          <div className="grid grid-cols-2 gap-4 sm:max-w-md">
            <div>
              <Label>Start year</Label>
              <Input type="number" value={yearStart} onChange={(e) => setYearStart(parseInt(e.target.value) || thisYear)} />
            </div>
            <div>
              <Label>End year</Label>
              <Input type="number" value={yearEnd} onChange={(e) => setYearEnd(parseInt(e.target.value) || thisYear)} />
            </div>
          </div>
        )}
        {mode === "date" && (
          <div className="grid grid-cols-2 gap-4 sm:max-w-md">
            <div>
              <Label>Start date</Label>
              <Input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} />
            </div>
            <div>
              <Label>End date</Label>
              <Input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
            </div>
          </div>
        )}
        {mode === "season" && (
          <div className="grid gap-4 sm:max-w-md sm:grid-cols-2">
            <div>
              <Label>Course</Label>
              <div className="mt-1 flex gap-1 rounded-md border border-border p-1">
                {(["scy", "lcm"] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setSeasonCourse(c)}
                    className={`flex-1 rounded px-3 py-1 text-sm uppercase ${
                      seasonCourse === c ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Season start year</Label>
              <Input type="number" value={seasonYear} onChange={(e) => setSeasonYear(parseInt(e.target.value) || thisYear)} />
            </div>
            <div className="sm:col-span-2 text-xs text-muted-foreground">
              {seasonCourse === "scy" ? "SCY season: Aug " + seasonYear + " – Mar " + (seasonYear + 1) : "LCM season: Apr – Jul " + seasonYear}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Ruler}
          label="Total distance"
          value={
            Object.keys(totals.byUnit).length === 0
              ? "0"
              : Object.entries(totals.byUnit)
                  .map(([u, v]) => `${v.toLocaleString()} ${u}`)
                  .join(" · ")
          }
        />
        <StatCard icon={Timer} label="Total time" value={formatDuration(totals.seconds)} />
        <StatCard icon={CalendarDays} label="Workouts" value={totals.count.toString()} />
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-3 font-display text-sm font-semibold text-deep">
          Workouts in range
        </div>
        {isLoading ? (
          <div className="p-5 text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-5 text-sm text-muted-foreground">No workouts in this window.</div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <div className="truncate font-medium text-deep">{w.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {workoutDate(w).toLocaleDateString()} · {w.pool_unit.toUpperCase()}
                  </div>
                </div>
                <div className="flex shrink-0 gap-4 text-sm text-muted-foreground">
                  <span>{(w.total_distance ?? 0).toLocaleString()} {w.pool_unit === "scy" ? "yd" : "m"}</span>
                  <span>{formatDuration(w.total_seconds ?? 0)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Ruler; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <Icon className="h-4 w-4 text-primary" />
      <div className="mt-2 font-display text-2xl font-semibold text-deep">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
