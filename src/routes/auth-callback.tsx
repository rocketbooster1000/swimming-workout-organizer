import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { getCurrentProfile } from "@/lib/local-store";

export const Route = createFileRoute("/auth-callback")({
  ssr: false,
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate({ to: getCurrentProfile() ? "/dashboard" : "/auth", replace: true });
  }, [navigate]);

  return (
    <main className="grid min-h-screen place-items-center bg-background px-6">
      <div className="max-w-sm text-center">
        <p className="text-sm font-medium text-muted-foreground">Loading...</p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-deep">
          Opening your offline session
        </h1>
      </div>
    </main>
  );
}
