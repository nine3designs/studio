import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { LOGO_MARK_URL, LOGO_MARK_WHITE_URL } from "@/lib/format";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Studio sign in · Nine3 Designs" },
      { name: "description", content: "Sign in to the Nine3 Designs studio workspace." },
      { property: "og:title", content: "Studio sign in · Nine3 Designs" },
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
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    (async () => {
      const hash = window.location.hash;
      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
      const isRecoveryHash = hashParams.get("type") === "recovery" && !!hashParams.get("access_token");
      const code = params.get("code");
      if (isRecoveryHash) {
        history.replaceState(null, "", window.location.pathname);
        setRecovery(true);
        return;
      }
      if (code) {
        try { await supabase.auth.exchangeCodeForSession(window.location.href); } catch { /* noop */ }
        history.replaceState(null, "", window.location.pathname);
        const { data } = await supabase.auth.getSession();
        if (data.session) setRecovery(true);
      }
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (recovery) {
      if (password !== confirm) {
        setBusy(false);
        toast.error("Passwords don't match.");
        return;
      }
      const { error } = await supabase.auth.updateUser({ password });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Password updated · you're signed in.");
      navigate({ to: "/dashboard" });
    } else if (mode === "reset") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/auth" });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Reset link sent · check your inbox.");
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

  const title = recovery ? "Choose a new password" : mode === "in" ? "Sign in" : mode === "up" ? "Create studio account" : "Reset your password";

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-primary-deep p-12 md:flex">
        <img src={LOGO_MARK_WHITE_URL} alt="Nine3 Designs" className="h-40 self-start md:h-52" />
        <p className="font-script text-3xl font-semibold tracking-wide uppercase text-primary-soft">Studio</p>
      </div>
      <div className="flex items-center justify-center p-8">
        <form onSubmit={submit} className="w-full max-w-md space-y-7">
          <div>
            <img src={LOGO_MARK_URL} alt="Nine3 Designs" className="h-24 w-24 md:hidden" />
            <p className="eyebrow mt-6 md:mt-0">Nine3 Designs</p>
            <h1 className="mt-3 text-4xl font-light leading-snug text-primary-deep">{title}</h1>
            {recovery && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Pick something you'll remember · minimum 6 characters.</p>}
            {mode === "up" && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">The first account created becomes the studio owner.</p>}
            {mode === "reset" && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">We'll email you a secure link to set a new password.</p>}
          </div>
          {recovery ? (
            <>
              <div className="space-y-2.5"><Label>New password</Label><Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
              <div className="space-y-2.5"><Label>Confirm new password</Label><Input type="password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
            </>
          ) : (
            <>
              <div className="space-y-2.5"><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              {mode !== "reset" && <div className="space-y-2.5"><Label>Password</Label><Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>}
            </>
          )}
          <Button type="submit" disabled={busy} className="w-full py-3">{recovery ? "Save new password" : mode === "in" ? "Sign in" : mode === "up" ? "Create account" : "Email me a reset link"}</Button>
          {!recovery && (
            <div className="flex items-center justify-end gap-6 text-sm text-muted-foreground">
              {mode === "in" && <button type="button" className="hover:text-primary" onClick={() => setMode("reset")}>Forgot password?</button>}
              {mode !== "in" && <button type="button" className="hover:text-primary" onClick={() => setMode("in")}>Back</button>}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
