import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, GripVertical, Hourglass, Layers, Plus, Printer, Save, Trash2, Waves } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  STROKES,
  courseLength,
  courseUnit,
  describeSet,
  formatDuration,
  formatInterval,
  isGroup,
  isRest,
  itemDistance,
  itemSeconds,
  newChildSet,
  newGroup,
  newRest,
  newSet,
  parseInterval,
  setDistance,
  setSeconds,
  totals,
  type RestItem,
  type SectionItem,
  type SetGroup,
  type Workout,
  type WorkoutSet,
} from "@/lib/workout";

export const Route = createFileRoute("/_authenticated/workouts/$id")({
  head: () => ({ meta: [{ title: "Edit workout — Lanes" }] }),
  component: WorkoutBuilder,
});

function normalizeItems(raw: unknown): SectionItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((it: any) => {
    if (it && it.type === "group") {
      return {
        ...it,
        children: Array.isArray(it.children) ? it.children : [],
      } as SetGroup;
    }
    return { ...it, type: "set" } as WorkoutSet;
  });
}

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
      setDraft({ ...workout, sets: normalizeItems(workout.sets) });
    }
  }, [workout, draft]);

  const tot = useMemo(() => (draft ? totals(draft.sets) : { distance: 0, seconds: 0 }), [draft]);
  const displayUnit = useMemo(() => (draft ? courseUnit(draft.pool_unit) : "yd"), [draft]);

  function update<K extends keyof Workout>(key: K, value: Workout[K]) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
    setDirty(true);
  }

  function mutateItems(fn: (items: SectionItem[]) => SectionItem[]) {
    setDraft((d) => d && { ...d, sets: fn(d.sets) });
    setDirty(true);
  }

  // Recursive tree helpers — operate on any item by id, at any nesting depth.
  function mapTree(items: SectionItem[], fn: (it: SectionItem) => SectionItem | null): SectionItem[] {
    const out: SectionItem[] = [];
    for (const it of items) {
      const mapped = fn(it);
      if (mapped === null) continue;
      if (isGroup(mapped)) {
        out.push({ ...mapped, children: mapTree(mapped.children, fn) });
      } else {
        out.push(mapped);
      }
    }
    return out;
  }

  function updateItem(itemId: string, patch: Partial<SectionItem>) {
    mutateItems((items) =>
      mapTree(items, (it) => (it.id === itemId ? ({ ...it, ...patch } as SectionItem) : it)),
    );
  }

  function removeItem(itemId: string) {
    mutateItems((items) => mapTree(items, (it) => (it.id === itemId ? null : it)));
  }

  // Move within whatever sibling list contains the item.
  function moveItem(itemId: string, dir: -1 | 1) {
    function walk(items: SectionItem[]): SectionItem[] {
      const idx = items.findIndex((s) => s.id === itemId);
      if (idx >= 0) {
        const target = idx + dir;
        if (target < 0 || target >= items.length) return items;
        const next = [...items];
        [next[idx], next[target]] = [next[target], next[idx]];
        return next;
      }
      return items.map((it) => (isGroup(it) ? { ...it, children: walk(it.children) } : it));
    }
    mutateItems(walk);
  }

  function addSet() {
    mutateItems((items) => [...items, newSet()]);
  }

  function addGroup() {
    mutateItems((items) => [...items, newGroup()]);
  }

  function addRest() {
    mutateItems((items) => [...items, newRest()]);
  }

  function addChildSet(groupId: string) {
    mutateItems((items) =>
      mapTree(items, (it) =>
        it.id === groupId && isGroup(it)
          ? { ...it, children: [...it.children, newChildSet()] }
          : it,
      ),
    );
  }

  function addChildGroup(groupId: string) {
    mutateItems((items) =>
      mapTree(items, (it) =>
        it.id === groupId && isGroup(it)
          ? { ...it, children: [...it.children, newGroup()] }
          : it,
      ),
    );
  }

  function addChildRest(groupId: string) {
    mutateItems((items) =>
      mapTree(items, (it) =>
        it.id === groupId && isGroup(it)
          ? { ...it, children: [...it.children, newRest()] }
          : it,
      ),
    );
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
              <div className="text-[10px] uppercase tracking-widest opacity-70">Total {displayUnit}</div>
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

      {/* Sets */}
      <div className="mt-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-deep">Sets</h2>
          <div className="flex gap-2 print:hidden">
            <Button size="sm" variant="outline" onClick={addSet}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Set
            </Button>
            <Button size="sm" variant="outline" onClick={addGroup}>
              <Layers className="mr-1 h-3.5 w-3.5" /> Group
            </Button>
            <Button size="sm" variant="outline" onClick={addRest}>
              <Hourglass className="mr-1 h-3.5 w-3.5" /> Rest
            </Button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {draft.sets.length === 0 && (
            <div className="rounded-lg border border-dashed border-border/60 bg-card/50 p-6 text-center text-xs text-muted-foreground">
              No sets yet — add a block.
            </div>
          )}
          {draft.sets.map((item) =>
            isGroup(item) ? (
              <GroupRow
                key={item.id}
                group={item}
                unit={draft.pool_unit}
                onChangeGroup={(p) => updateItem(item.id, p)}
                onRemove={() => removeItem(item.id)}
                onMove={(dir) => moveItem(item.id, dir)}
                onUpdateItem={updateItem}
                onRemoveItem={removeItem}
                onMoveItem={moveItem}
                onAddChildSet={addChildSet}
                onAddChildGroup={addChildGroup}
                onAddChildRest={addChildRest}
              />
            ) : isRest(item) ? (
              <RestRow
                key={item.id}
                rest={item}
                onChange={(p) => updateItem(item.id, p)}
                onRemove={() => removeItem(item.id)}
                onMove={(dir) => moveItem(item.id, dir)}
              />
            ) : (
              <SetRow
                key={item.id}
                set={item}
                unit={draft.pool_unit}
                onChange={(p) => updateItem(item.id, p)}
                onRemove={() => removeItem(item.id)}
                onMove={(dir) => moveItem(item.id, dir)}
              />
            ),
          )}
        </div>
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

function GroupRow({
  group,
  unit,
  onChangeGroup,
  onRemove,
  onMove,
  onUpdateItem,
  onRemoveItem,
  onMoveItem,
  onAddChildSet,
  onAddChildGroup,
  onAddChildRest,
}: {
  group: SetGroup;
  unit: string;
  
  onChangeGroup: (p: Partial<SetGroup>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  onUpdateItem: (id: string, p: Partial<SectionItem>) => void;
  onRemoveItem: (id: string) => void;
  onMoveItem: (id: string, dir: -1 | 1) => void;
  onAddChildSet: (groupId: string) => void;
  onAddChildGroup: (groupId: string) => void;
  onAddChildRest: (groupId: string) => void;
}) {
  const dist = itemDistance(group);
  const secs = itemSeconds(group);
  return (
    <div className="rounded-lg border-2 border-primary/30 bg-foam/40 p-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col items-center gap-1 print:hidden">
          <button onClick={() => onMove(-1)} className="text-xs text-muted-foreground hover:text-deep">▲</button>
          <Layers className="h-4 w-4 text-primary/70" />
          <button onClick={() => onMove(1)} className="text-xs text-muted-foreground hover:text-deep">▼</button>
        </div>
        <Field label="Rounds" w="w-20">
          <Input
            type="number"
            min={1}
            value={group.rounds}
            onChange={(e) => onChangeGroup({ rounds: parseInt(e.target.value) || 1 })}
          />
        </Field>
        <span className="pb-2 text-muted-foreground">rounds of</span>
        <Field label="Group label (optional)" w="flex-1 min-w-48">
          <Input
            value={group.label ?? ""}
            onChange={(e) => onChangeGroup({ label: e.target.value })}
            placeholder="e.g. Stroke rotation"
          />
        </Field>
        <div className="ml-auto flex items-center gap-3">
          <div className="text-right">
            <div className="font-display text-base font-semibold tabular-nums text-deep">{dist.toLocaleString()} {unit}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{formatDuration(secs) || "—"}</div>
          </div>
          <Button size="icon" variant="ghost" onClick={onRemove} className="print:hidden">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="mt-3 ml-4 space-y-2 border-l-2 border-primary/30 pl-4">
        {group.children.length === 0 && (
          <div className="rounded border border-dashed border-border/60 p-3 text-center text-xs text-muted-foreground">
            No sub-sets yet.
          </div>
        )}
        {group.children.map((c) =>
          isGroup(c) ? (
            <GroupRow
              key={c.id}
              group={c}
              unit={unit}
              onChangeGroup={(p) => onUpdateItem(c.id, p)}
              onRemove={() => onRemoveItem(c.id)}
              onMove={(dir) => onMoveItem(c.id, dir)}
              onUpdateItem={onUpdateItem}
              onRemoveItem={onRemoveItem}
              onMoveItem={onMoveItem}
              onAddChildSet={onAddChildSet}
              onAddChildGroup={onAddChildGroup}
              onAddChildRest={onAddChildRest}
            />
          ) : isRest(c) ? (
            <RestRow
              key={c.id}
              rest={c}
              onChange={(p) => onUpdateItem(c.id, p)}
              onRemove={() => onRemoveItem(c.id)}
              onMove={(dir) => onMoveItem(c.id, dir)}
            />
          ) : (
            <SetRow
              key={c.id}
              set={c}
              unit={unit}
              onChange={(p) => onUpdateItem(c.id, p)}
              onRemove={() => onRemoveItem(c.id)}
              onMove={(dir) => onMoveItem(c.id, dir)}
            />
          ),
        )}
        <div className="flex gap-2 print:hidden">
          <Button size="sm" variant="ghost" onClick={() => onAddChildSet(group.id)}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Sub-set
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onAddChildGroup(group.id)}>
            <Layers className="mr-1 h-3.5 w-3.5" /> Sub-group
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onAddChildRest(group.id)}>
            <Hourglass className="mr-1 h-3.5 w-3.5" /> Rest
          </Button>
        </div>
      </div>

      <div className="mt-1 hidden text-xs font-medium text-deep print:block">
        {group.rounds} rounds of{group.label ? ` — ${group.label}` : ""}:{" "}
        {group.children
          .map((c) =>
            isGroup(c)
              ? `[${c.rounds}× …]`
              : isRest(c)
                ? `rest ${c.seconds}s`
                : describeSet(c),
          )
          .join("; ")}
      </div>
    </div>
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
        <Field label="Reps" w="w-16">
          <Input type="number" min={1} value={set.reps} onChange={(e) => onChange({ reps: parseInt(e.target.value) || 1 })} />
        </Field>
        <span className="pb-2 text-muted-foreground">×</span>
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
        <div className="ml-auto flex items-center gap-3">
          <div className="text-right">
            <div className="font-display text-base font-semibold tabular-nums text-deep">
              {setDistance(set).toLocaleString()} {unit}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {formatDuration(setSeconds(set)) || "—"}
            </div>
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

function RestRow({
  rest,
  onChange,
  onRemove,
  onMove,
}: {
  rest: RestItem;
  onChange: (p: Partial<RestItem>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  return (
    <div className="rounded-lg border border-dashed border-primary/40 bg-foam/30 p-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col items-center gap-1 print:hidden">
          <button onClick={() => onMove(-1)} className="text-xs text-muted-foreground hover:text-deep">▲</button>
          <Hourglass className="h-4 w-4 text-primary/70" />
          <button onClick={() => onMove(1)} className="text-xs text-muted-foreground hover:text-deep">▼</button>
        </div>
        <Field label="Rest (s)" w="w-24">
          <Input
            type="number"
            min={0}
            value={rest.seconds}
            onChange={(e) => onChange({ seconds: parseInt(e.target.value) || 0 })}
          />
        </Field>
        <Field label="Note (optional)" w="flex-1 min-w-40">
          <Input
            value={rest.label ?? ""}
            onChange={(e) => onChange({ label: e.target.value })}
            placeholder="e.g. extra recovery, get water"
          />
        </Field>
        <div className="ml-auto flex items-center gap-3">
          <div className="text-right">
            <div className="font-display text-base font-semibold tabular-nums text-deep">Rest</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{formatDuration(rest.seconds) || "—"}</div>
          </div>
          <Button size="icon" variant="ghost" onClick={onRemove} className="print:hidden">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="mt-1 hidden text-xs font-medium text-deep print:block">
        Rest {rest.seconds}s{rest.label ? ` — ${rest.label}` : ""}
      </div>
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
