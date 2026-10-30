import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LOGO_URL } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nine3 Designs — Studio & Client Portal" },
      { name: "description", content: "Sign in to the Nine3 Designs studio workspace or your client portal." },
      { property: "og:title", content: "Nine3 Designs — Studio & Client Portal" },
      { property: "og:description", content: "Sign in to the Nine3 Designs studio workspace or your client portal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery") && hash.includes("access_token")) {
      window.location.replace("/auth" + hash);
    }
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-primary-deep px-6 text-center text-primary-foreground">
      <img src={LOGO_URL} alt="Nine3 Designs" className="h-28" />
      <p className="mt-8 font-script text-2xl font-semibold tracking-wide uppercase text-primary-soft">Welcome</p>
      <p className="mt-4 max-w-md text-sm font-light tracking-wide text-primary-foreground/80">
        Your space for projects, proofs, deliverables and invoices with Nine3 Designs.
      </p>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Button asChild className="bg-gold text-gold-foreground hover:bg-gold-soft">
          <Link to="/portal">Client portal</Link>
        </Button>
        <Button asChild variant="outline" className="border-gold/60 bg-transparent text-primary-foreground hover:bg-primary">
          <Link to="/auth">Studio sign in</Link>
        </Button>
      </div>
    </div>
  );
}
