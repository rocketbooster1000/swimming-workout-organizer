import { createFileRoute, Link } from "@tanstack/react-router";
import { Waves, Timer, ClipboardList, Share2 } from "lucide-react";
import poolHero from "@/assets/pool-hero.jpg";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lanes - Offline swim workouts on your device" },
      { name: "description", content: "A local-only workout planner for swimming. Create profiles, compose sets, and keep practices stored on this device." },
      { property: "og:title", content: "Lanes - Offline swim workouts" },
      { property: "og:description", content: "Create local profiles, compose sets, and keep workouts on this device." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-semibold text-deep">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
            <Waves className="h-4 w-4" />
          </span>
          Lanes
        </Link>
        <nav className="flex items-center gap-2">
          <Link to="/auth">
            <Button variant="ghost">Open profiles</Button>
          </Link>
          <Link to="/auth">
            <Button>Create profile</Button>
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl gap-12 px-6 pt-10 pb-20 md:grid-cols-2 md:items-center">
        <div>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Built for coaches on deck
          </p>
          <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight text-deep md:text-6xl">
            Workouts that<br />
            <span className="text-primary">add up.</span>
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted-foreground">
            Drop in sets, pick a stroke, set the interval. Lanes auto-totals yardage and time so you can build practice anywhere, even without a network connection.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/auth">
              <Button size="lg">Create profile</Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline">Open profiles</Button>
            </Link>
          </div>
          <div className="mt-10 grid max-w-md gap-4 sm:grid-cols-3">
            <Feature icon={ClipboardList} label="Warm-up · Main · Cool-down" />
            <Feature icon={Timer} label="Live yardage + time" />
            <Feature icon={Share2} label="Saved per profile" />
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 -z-10 rounded-3xl bg-gradient-to-br from-primary/30 via-accent/40 to-transparent blur-2xl" />
          <div className="overflow-hidden rounded-2xl border border-border shadow-2xl">
            <img src={poolHero} alt="Overhead view of swimming pool lanes" width={1600} height={1024} className="aspect-[16/10] w-full object-cover" />
          </div>
          <div className="ripple-card absolute -bottom-6 -left-6 hidden rounded-xl px-5 py-4 md:block">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Today · Tuesday</div>
            <div className="mt-1 font-display text-2xl font-semibold text-deep">3,400 yd</div>
            <div className="text-sm text-muted-foreground">Threshold · 1:12:00</div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Feature({ icon: Icon, label }: { icon: typeof Waves; label: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/60 p-3">
      <Icon className="h-4 w-4 text-primary" />
      <div className="mt-2 text-xs font-medium text-deep">{label}</div>
    </div>
  );
}
