import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Waves, BarChart3, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { getCurrentProfile, signOutLocal } from "@/lib/local-store";

export function AppHeader() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    signOutLocal();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link to="/dashboard" className="flex items-center gap-2 font-display text-lg font-semibold text-deep">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
            <Waves className="h-3.5 w-3.5" />
          </span>
          Lanes
        </Link>
        <nav className="flex items-center gap-1">
          <div className="hidden rounded-md border border-border bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground sm:block">
            {getCurrentProfile()?.display_name ?? "Profile"}
          </div>
          <Link to="/dashboard">
            <Button variant="ghost" size="sm">
              <ListChecks className="mr-1 h-4 w-4" /> Workouts
            </Button>
          </Link>
          <Link to="/summary">
            <Button variant="ghost" size="sm">
              <BarChart3 className="mr-1 h-4 w-4" /> Summary
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="mr-1 h-4 w-4" /> Sign out
          </Button>
        </nav>
      </div>
    </header>
  );
}
