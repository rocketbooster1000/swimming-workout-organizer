import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { createProfile, getCurrentProfile, listProfiles, setCurrentProfile } from "@/lib/local-store";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Profiles - Lanes" }] }),
  component: ProfilePicker,
});

function ProfilePicker() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState(listProfiles());
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getCurrentProfile()) navigate({ to: "/dashboard" });
  }, [navigate]);

  useEffect(() => {
    setProfiles(listProfiles());
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      createProfile(name);
      toast.success("Profile created.");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create profile");
    } finally {
      setLoading(false);
    }
  }

  function openProfile(profileId: string) {
    try {
      setCurrentProfile(profileId);
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open profile");
    }
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="relative hidden bg-deep p-10 text-foam md:flex md:flex-col md:justify-between">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary">
            <Waves className="h-4 w-4" />
          </span>
          Lanes
        </Link>
        <div className="relative">
          <div className="bg-lane-stripes absolute inset-0 -z-0 opacity-30" />
          <div className="relative">
            <h2 className="font-display text-4xl font-semibold leading-tight">
              Choose a profile
              <br />
              and keep your
              <br />
              workouts local.
            </h2>
            <p className="mt-4 max-w-sm text-foam/70">
              Each profile lives on this device only. No passwords, no cloud sync, no internet required.
            </p>
          </div>
        </div>
        <div className="text-xs text-foam/50">Lanes - Offline profiles only</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-2 md:hidden">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
              <Waves className="h-4 w-4" />
            </span>
            <span className="font-display text-xl font-semibold">Lanes</span>
          </div>
          <h1 className="font-display text-2xl font-semibold text-deep">Profiles on this device</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Open an existing profile or create a new one. Everything stays in this browser.
          </p>

          <div className="mt-6 space-y-2">
            {profiles.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card/60 p-4 text-sm text-muted-foreground">
                No profiles yet. Create the first one below.
              </div>
            ) : (
              profiles.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => openProfile(profile.id)}
                  className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-left transition hover:border-primary hover:bg-accent/40"
                >
                  <div>
                    <div className="font-display text-base font-semibold text-deep">{profile.display_name}</div>
                    <div className="text-xs text-muted-foreground">
                      Created {new Date(profile.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <span className="text-sm text-primary">Open</span>
                </button>
              ))
            )}
          </div>

          <form onSubmit={handleCreate} className="mt-6 space-y-3">
            <div>
              <label htmlFor="name" className="text-sm font-medium text-deep">
                New profile
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Coach K."
                className="mt-1"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "..." : "Create profile"}
            </Button>
          </form>

          <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> local profiles <div className="h-px flex-1 bg-border" />
          </div>
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Profiles are just labels for this device. Clearing browser data removes them.
          </div>
        </div>
      </div>
    </div>
  );
}
