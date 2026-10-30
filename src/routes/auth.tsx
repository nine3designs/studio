import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { LOGO_URL } from "@/lib/format";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Studio sign in — Nine3 Designs" },
      { name: "description", content: "Sign in to the Nine3 Designs studio workspace." },
      { property: "og:title", content: "Studio sign in — Nine3 Designs" },
      { property: "og:description", content: "Sign in to the Nine3 Designs studio workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up" | "reset">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "reset") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/auth" });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Reset link sent — check your inbox.");
      setMode("in");
    } else if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      navigate({ to: "/dashboard" });
    } else {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/dashboard" } });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Check your email to confirm your account.");
      setMode("in");
    }
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-primary-deep p-12 md:flex">
        <img src={LOGO_URL} alt="Nine3 Designs" className="h-28 self-start md:h-36" />
        <p className="font-script text-3xl font-semibold tracking-wide uppercase text-primary-soft">Studio</p>
      </div>
      <div className="flex items-center justify-center p-8">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div>
            <p className="eyebrow">Nine3 Designs</p>
            <h1 className="mt-2 text-3xl font-light text-primary-deep">{mode === "in" ? "Sign in" : mode === "up" ? "Create studio account" : "Reset your password"}</h1>
            {mode === "up" && <p className="mt-2 text-xs text-muted-foreground">The first account created becomes the studio owner.</p>}
            {mode === "reset" && <p className="mt-2 text-xs text-muted-foreground">We'll email you a secure link to set a new password.</p>}
          </div>
          <div className="space-y-1.5"><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          {mode !== "reset" && <div className="space-y-1.5"><Label>Password</Label><Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>}
          <Button type="submit" disabled={busy} className="w-full">{mode === "in" ? "Sign in" : mode === "up" ? "Create account" : "Email me a reset link"}</Button>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <button type="button" className="hover:text-primary" onClick={() => setMode(mode === "in" ? "up" : "in")}>
              {mode === "in" ? "First time? Create the studio account" : "Already have an account? Sign in"}
            </button>
            {mode === "in" && <button type="button" className="hover:text-primary" onClick={() => setMode("reset")}>Forgot password?</button>}
            {mode !== "in" && <button type="button" className="hover:text-primary" onClick={() => setMode("in")}>Back</button>}
          </div>
        </form>
      </div>
    </div>
  );
}
