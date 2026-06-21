import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Waves } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const searchSchema = z.object({ mode: z.enum(["signin", "signup"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Sign in — Lanes" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">(mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (tab === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Account created — diving in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" });
    if (result.error) {
      toast.error(result.error.message || "Google sign-in failed");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="relative hidden bg-deep p-10 text-foam md:flex md:flex-col md:justify-between">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary"><Waves className="h-4 w-4" /></span>
          Lanes
        </Link>
        <div className="relative">
          <div className="bg-lane-stripes absolute inset-0 -z-0 opacity-30" />
          <div className="relative">
            <h2 className="font-display text-4xl font-semibold leading-tight">
              Practice writes<br />itself when the<br />math is done.
            </h2>
            <p className="mt-4 max-w-sm text-foam/70">
              Auto-totaled yardage, intervals, and rest. So you can focus on the swimmers, not the spreadsheet.
            </p>
          </div>
        </div>
        <div className="text-xs text-foam/50">— Lanes · Built for coaches</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-2 md:hidden">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground"><Waves className="h-4 w-4" /></span>
            <span className="font-display text-xl font-semibold">Lanes</span>
          </div>
          <h1 className="font-display text-2xl font-semibold text-deep">
            {tab === "signin" ? "Welcome back, coach" : "Create your coach account"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tab === "signin" ? "Sign in to load your saved workouts." : "Start writing practice in seconds."}
          </p>

          <div className="mt-6 flex rounded-md border border-border bg-muted p-1 text-sm">
            <button onClick={() => setTab("signin")} className={`flex-1 rounded-sm px-3 py-1.5 transition ${tab === "signin" ? "bg-card text-deep shadow-sm" : "text-muted-foreground"}`}>Sign in</button>
            <button onClick={() => setTab("signup")} className={`flex-1 rounded-sm px-3 py-1.5 transition ${tab === "signup" ? "bg-card text-deep shadow-sm" : "text-muted-foreground"}`}>Sign up</button>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            {tab === "signup" && (
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Coach K." />
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "…" : tab === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
          </div>
          <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={loading}>
            Continue with Google
          </Button>
        </div>
      </div>
    </div>
  );
}
