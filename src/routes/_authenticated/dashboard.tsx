import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, CalendarDays, Ruler, Timer, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { formatDuration, type Workout } from "@/lib/workout";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Workouts — Lanes" }] }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["workouts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workouts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Workout[];
    },
  });

  async function createWorkout() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data, error } = await supabase
      .from("workouts")
      .insert({
        user_id: u.user.id,
        title: "Untitled practice",
        focus: "Aerobic",
        level: "intermediate",
        pool_length: 25,
        pool_unit: "scy",
        sets: [],
      })
      .select()
      .single();
    if (error || !data) {
      toast.error(error?.message ?? "Failed to create");
      return;
    }
    navigate({ to: "/workouts/$id", params: { id: data.id } });
  }

  async function deleteWorkout(id: string) {
    if (!confirm("Delete this workout?")) return;
    const { error } = await supabase.from("workouts").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["workouts"] });
    toast.success("Workout deleted");
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-deep">Your workouts</h1>
          <p className="mt-1 text-sm text-muted-foreground">Saved practices for your squad.</p>
        </div>
        <Button onClick={createWorkout}>
          <Plus className="mr-1 h-4 w-4" /> New workout
        </Button>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && (
          <div className="col-span-full rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        )}
        {!isLoading && (data?.length ?? 0) === 0 && (
          <button
            onClick={createWorkout}
            className="ripple-card col-span-full flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-primary/30 p-12 text-center transition hover:border-primary"
          >
            <span className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary"><Plus className="h-5 w-5" /></span>
            <div className="font-display text-lg font-semibold text-deep">Write your first practice</div>
            <div className="text-sm text-muted-foreground">Warm-up, main set, cool-down — drop it in and we'll do the math.</div>
          </button>
        )}
        {data?.map((w) => (
          <div key={w.id} className="ripple-card group flex flex-col rounded-xl p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link to="/workouts/$id" params={{ id: w.id }}>
                  <h3 className="truncate font-display text-lg font-semibold text-deep hover:text-primary">{w.title}</h3>
                </Link>
                {w.focus && <div className="mt-0.5 text-xs uppercase tracking-wider text-muted-foreground">{w.focus}</div>}
              </div>
              <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                <Link to="/workouts/$id" params={{ id: w.id }}>
                  <Button size="icon" variant="ghost"><Pencil className="h-3.5 w-3.5" /></Button>
                </Link>
                <Button size="icon" variant="ghost" onClick={() => deleteWorkout(w.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
              <Stat icon={Ruler} value={w.total_distance.toLocaleString()} label={w.pool_unit} />
              <Stat icon={Timer} value={formatDuration(w.total_seconds)} label="time" />
              <Stat icon={CalendarDays} value={w.pool_length.toString()} label={`${w.pool_unit} pool`} />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

function Stat({ icon: Icon, value, label }: { icon: typeof Plus; value: string; label: string }) {
  return (
    <div className="rounded-md bg-muted/60 px-3 py-2">
      <Icon className="h-3.5 w-3.5 text-primary" />
      <div className="mt-1 font-display text-base font-semibold text-deep leading-none">{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
