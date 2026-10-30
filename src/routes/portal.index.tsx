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
    <div className="flex min-h-screen flex-col items-center justify-center bg-primary-deep p-6 text-primary-foreground">
      <img src={LOGO_URL} alt="Nine3 Designs" className="h-32 md:h-40" />
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-gold">Client portal</p>
      <form className="mt-8 w-full max-w-sm space-y-4 rounded-md bg-card p-6 text-card-foreground" onSubmit={async (e) => {
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
