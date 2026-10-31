import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PortalView } from "@/components/portal/PortalView";
import { supabase } from "@/integrations/supabase/client";
import { LOGO_URL } from "@/lib/format";

export const Route = createFileRoute("/portal/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Client portal sign in · Nine3 Designs" },
      { name: "description", content: "Sign in to your Nine3 Designs client portal." },
      { property: "og:title", content: "Client portal · Nine3 Designs" },
      { property: "og:description", content: "Sign in to your Nine3 Designs client portal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EmailPortal,
});

function EmailPortal() {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSignedIn(!!data.session); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!ready) return null;
  if (signedIn) return (
    <>
      <PortalView token={null} />
      <div className="pb-10 text-center"><button className="text-xs text-muted-foreground hover:text-primary" onClick={() => supabase.auth.signOut()}>Sign out</button></div>
    </>
  );

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-6 text-primary-foreground" style={{ background: "linear-gradient(165deg,#0A2B31 0%,#123E42 45%,#174B50 100%)" }}>
      <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: "radial-gradient(600px 400px at 85% 0%, rgba(183,194,196,.18), transparent 55%), radial-gradient(500px 360px at 8% 100%, rgba(255,255,255,.06), transparent 50%)" }} aria-hidden="true" />
      <img src={LOGO_URL} alt="Nine3 Designs" className="relative h-20 w-auto md:h-24" style={{ filter: "drop-shadow(0 10px 26px rgba(0,0,0,.45))" }} />
      <div className="relative mt-5 h-px w-28 rounded-full bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      <p className="relative mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-[#B7C2C4]">Client portal</p>
      <form className="relative mt-8 w-full max-w-sm space-y-4 rounded-2xl border border-white/50 bg-white/90 p-6 text-card-foreground shadow-[0_30px_80px_rgba(0,0,0,.35)] backdrop-blur" onSubmit={async (e) => {
        e.preventDefault();
        const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + "/portal" } });
        if (error) toast.error(error.message); else setSent(true);
      }}>
        {sent ? <p className="text-center text-sm">Check your inbox · we've emailed you a sign-in link.</p> : <>
          <div className="space-y-1.5"><Label>Your email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <Button type="submit" className="w-full">Email me a sign-in link</Button>
          <p className="text-center text-xs text-muted-foreground">Use the email address Nine3 Designs has on file for you.</p>
        </>}
      </form>
    </div>
  );
}
