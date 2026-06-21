import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, GripVertical, Plus, Printer, Save, Trash2, Waves } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  SECTIONS,
  STROKES,
  describeSet,
  formatDuration,
  formatInterval,
  newSet,
  parseInterval,
  setDistance,
  setSeconds,
  totals,
  type Section,
  type Workout,
  type WorkoutSet,
} from "@/lib/workout";

export const Route = createFileRoute("/_authenticated/workouts/$id")({
  head: () => ({ meta: [{ title: "Edit workout — Lanes" }] }),
  component: WorkoutBuilder,
});

function WorkoutBuilder() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const { data: workout, isLoading } = useQuery({
    queryKey: ["workout", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("workouts").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as unknown as Workout | null;
    },
  });

  const [draft, setDraft] = useState<Workout | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (workout && !draft) {
      setDraft({ ...workout, sets: Array.isArray(workout.sets) ? workout.sets : [] });
    }
  }, [workout, draft]);

  const tot = useMemo(() => (draft ? totals(draft.sets) : { distance: 0, seconds: 0 }), [draft]);

  function update<K extends keyof Workout>(key: K, value: Workout[K]) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
    setDirty(true);
  }

  function updateSet(setId: string, patch: Partial<WorkoutSet>) {
    setDraft((d) => d && { ...d, sets: d.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) });
    setDirty(true);
  }

  function removeSet(setId: string) {
    setDraft((d) => d && { ...d, sets: d.sets.filter((s) => s.id !== setId) });
    setDirty(true);
  }

  function addSet(section: Section) {
    setDraft((d) => d && { ...d, sets: [...d.sets, newSet(section)] });
    setDirty(true);
  }

  function moveSet(setId: string, dir: -1 | 1) {
    setDraft((d) => {
      if (!d) return d;
      const idx = d.sets.findIndex((s) => s.id === setId);
      if (idx < 0) return d;
      const target = idx + dir;
      if (target < 0 || target >= d.sets.length) return d;
      const next = [...d.sets];
      [next[idx], next[target]] = [next[target], next[idx]];
      return { ...d, sets: next };
    });
    setDirty(true);
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    const t = totals(draft.sets);
    const { error } = await supabase
      .from("workouts")
      .update({
        title: draft.title,
        focus: draft.focus,
        level: draft.level,
        pool_length: draft.pool_length,
        pool_unit: draft.pool_unit,
        notes: draft.notes,
        sets: draft.sets as unknown as never,
        total_distance: t.distance,
        total_seconds: t.seconds,
        scheduled_for: draft.scheduled_for,
      })
      .eq("id", draft.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDirty(false);
    toast.success("Saved");
  }

  if (isLoading || !draft) {
    return <div className="mx-auto max-w-5xl px-6 py-10 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-8 print:py-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-deep">
          <ArrowLeft className="h-4 w-4" /> All workouts
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-1 h-4 w-4" /> Print
          </Button>
          <Button onClick={save} disabled={saving || !dirty}>
            <Save className="mr-1 h-4 w-4" /> {saving ? "Saving…" : dirty ? "Save" : "Saved"}
          </Button>
        </div>
      </div>

      {/* Header card */}
      <div className="ripple-card rounded-2xl p-6">
        <div className="flex flex-wrap items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Waves className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-2">
            <Input
              value={draft.title}
              onChange={(e) => update("title", e.target.value)}
              className="h-auto border-0 bg-transparent px-0 font-display text-3xl font-semibold text-deep shadow-none focus-visible:ring-0"
              placeholder="Practice title"
            />
            <div className="flex flex-wrap gap-2">
              <Input
                value={draft.focus ?? ""}
                onChange={(e) => update("focus", e.target.value)}
                placeholder="Focus (e.g. Aerobic, Sprint, Race-pace)"
                className="h-8 w-60 text-xs uppercase tracking-wider"
              />
              <Input
                type="date"
                value={draft.scheduled_for ?? ""}
                onChange={(e) => update("scheduled_for", e.target.value || null)}
                className="h-8 w-40 text-xs"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-right">
            <div className="rounded-lg bg-deep px-4 py-3 text-foam">
              <div className="text-[10px] uppercase tracking-widest opacity-70">Total {draft.pool_unit}</div>
              <div className="font-display text-2xl font-semibold tabular-nums">{tot.distance.toLocaleString()}</div>
            </div>
            <div className="rounded-lg bg-primary px-4 py-3 text-primary-foreground">
              <div className="text-[10px] uppercase tracking-widest opacity-80">Est. time</div>
              <div className="font-display text-2xl font-semibold tabular-nums">{formatDuration(tot.seconds)}</div>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div>
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Pool length</Label>
            <div className="mt-1 flex gap-2">
              <Input type="number" min={10} value={draft.pool_length} onChange={(e) => update("pool_length", parseInt(e.target.value) || 25)} className="w-20" />
              <Select value={draft.pool_unit} onValueChange={(v) => update("pool_unit", v)}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yd">yards</SelectItem>
                  <SelectItem value="m">meters</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Level</Label>
            <Select value={draft.level} onValueChange={(v) => update("level", v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="novice">Novice</SelectItem>
                <SelectItem value="age-group">Age group</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="senior">Senior / High school</SelectItem>
                <SelectItem value="elite">Elite</SelectItem>
                <SelectItem value="masters">Masters</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Coach notes</Label>
            <Input value={draft.notes ?? ""} onChange={(e) => update("notes", e.target.value)} placeholder="One-liner" className="mt-1" />
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="mt-6 space-y-6">
        {SECTIONS.map(({ key, label }) => {
          const sectionSets = draft.sets.filter((s) => s.section === key);
          const sd = sectionSets.reduce((a, s) => a + setDistance(s), 0);
          const ss = sectionSets.reduce((a, s) => a + setSeconds(s), 0);
          return (
            <section key={key} className={`section-${key} rounded-xl p-5`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-xl font-semibold text-deep">{label}</h2>
                  <div className="text-xs text-muted-foreground">
                    {sd.toLocaleString()} {draft.pool_unit} · {formatDuration(ss)}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => addSet(key)} className="print:hidden">
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add set
                </Button>
              </div>

              <div className="mt-4 space-y-3">
                {sectionSets.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border/60 bg-card/50 p-6 text-center text-xs text-muted-foreground">
                    No sets yet — add a {label.toLowerCase()} block.
                  </div>
                )}
                {sectionSets.map((s) => (
                  <SetRow
                    key={s.id}
                    set={s}
                    unit={draft.pool_unit}
                    onChange={(p) => updateSet(s.id, p)}
                    onRemove={() => removeSet(s.id)}
                    onMove={(dir) => moveSet(s.id, dir)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-8 print:hidden">
        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Practice notes</Label>
        <Textarea
          value={draft.notes ?? ""}
          onChange={(e) => update("notes", e.target.value)}
          placeholder="Anything else for the deck — equipment list, target heart-rate, send-offs."
          rows={4}
          className="mt-1"
        />
      </div>
    </main>
  );
}

function SetRow({
  set,
  unit,
  onChange,
  onRemove,
  onMove,
}: {
  set: WorkoutSet;
  unit: string;
  onChange: (p: Partial<WorkoutSet>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const [intervalStr, setIntervalStr] = useState(formatInterval(set.interval_seconds));
  useEffect(() => setIntervalStr(formatInterval(set.interval_seconds)), [set.interval_seconds]);

  return (
    <div className="rounded-lg border border-border/60 bg-card/80 p-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col items-center gap-1 print:hidden">
          <button onClick={() => onMove(-1)} className="text-xs text-muted-foreground hover:text-deep">▲</button>
          <GripVertical className="h-4 w-4 text-muted-foreground/60" />
          <button onClick={() => onMove(1)} className="text-xs text-muted-foreground hover:text-deep">▼</button>
        </div>
        <Field label="Rounds" w="w-16">
          <Input type="number" min={1} value={set.rounds} onChange={(e) => onChange({ rounds: parseInt(e.target.value) || 1 })} />
        </Field>
        <span className="pb-2 text-muted-foreground">×</span>
        <Field label="Reps" w="w-16">
          <Input type="number" min={1} value={set.reps} onChange={(e) => onChange({ reps: parseInt(e.target.value) || 1 })} />
        </Field>
        <Field label={`Dist (${unit})`} w="w-20">
          <Input type="number" min={0} step={25} value={set.distance} onChange={(e) => onChange({ distance: parseInt(e.target.value) || 0 })} />
        </Field>
        <Field label="Stroke" w="w-32">
          <Select value={set.stroke} onValueChange={(v) => onChange({ stroke: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STROKES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Interval" w="w-20">
          <Input
            placeholder="1:30"
            value={intervalStr}
            onChange={(e) => setIntervalStr(e.target.value)}
            onBlur={() => onChange({ interval_seconds: parseInterval(intervalStr) })}
          />
        </Field>
        <Field label="Rest (s)" w="w-20">
          <Input
            type="number"
            min={0}
            value={set.rest_seconds ?? ""}
            onChange={(e) => onChange({ rest_seconds: e.target.value ? parseInt(e.target.value) : null })}
          />
        </Field>
        <div className="ml-auto flex items-center gap-3">
          <div className="text-right">
            <div className="font-display text-base font-semibold tabular-nums text-deep">{setDistance(set).toLocaleString()} {unit}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{formatDuration(setSeconds(set)) || "—"}</div>
          </div>
          <Button size="icon" variant="ghost" onClick={onRemove} className="print:hidden">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        <Input
          value={set.description ?? ""}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Description (e.g. descend 1-4, build, negative split)"
          className="h-8 text-xs"
        />
        <Input
          value={set.equipment ?? ""}
          onChange={(e) => onChange({ equipment: e.target.value })}
          placeholder="Equipment (fins, paddles)"
          className="h-8 w-56 text-xs"
        />
      </div>
      <div className="mt-1 hidden text-xs font-medium text-deep print:block">{describeSet(set)}</div>
    </div>
  );
}

function Field({ label, w, children }: { label: string; w?: string; children: React.ReactNode }) {
  return (
    <div className={w}>
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}
