import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard, Users, FolderKanban, CheckSquare, Receipt, Wallet, FileSignature, Tags, ClipboardList, LayoutTemplate, LogOut, Menu, Search,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LOGO_URL } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CommandPalette } from "@/components/CommandPalette";

export const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/invoices", label: "Invoices", icon: Receipt },
  { to: "/expenses", label: "Expenses", icon: Wallet },
  { to: "/proposals", label: "Proposals & Contracts", icon: FileSignature },
  { to: "/pricing", label: "Pricing", icon: Tags },
  { to: "/onboarding", label: "Onboarding", icon: ClipboardList },
  { to: "/templates", label: "Templates", icon: LayoutTemplate },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  return (
    <>
      <nav className="flex flex-col gap-1">
        {nav.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent"
            activeProps={{ className: "bg-sidebar-accent text-sidebar-primary" }}
          >
            <Icon className="h-4 w-4" /> {label}
          </Link>
        ))}
      </nav>
      <button onClick={signOut} className="mt-6 flex items-center gap-3 rounded-sm px-3 py-2 text-left text-sm hover:bg-sidebar-accent">
        <LogOut className="h-4 w-4" /> Sign out
      </button>
    </>
  );
}

export function StudioShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Mobile top bar */}
      <div className="no-print flex items-center justify-between bg-sidebar p-4 text-sidebar-foreground md:hidden">
        <img src={LOGO_URL} alt="Nine3 Designs" className="h-12" />
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="border-sidebar-accent bg-transparent text-sidebar-foreground hover:bg-sidebar-accent">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="bg-sidebar text-sidebar-foreground">
            <SheetHeader>
              <SheetTitle className="text-left text-sidebar-foreground">
                <img src={LOGO_URL} alt="Nine3 Designs" className="h-10" />
              </SheetTitle>
            </SheetHeader>
            <div className="mt-2 px-2"><NavLinks onNavigate={() => setMenuOpen(false)} /></div>
          </SheetContent>
        </Sheet>
      </div>
      {/* Desktop sidebar */}
      <aside className="no-print hidden bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:block md:h-screen md:w-64 md:shrink-0">
        <div className="p-6">
          <img src={LOGO_URL} alt="Nine3 Designs" className="h-20" />
          <p className="mt-3 font-script text-xs font-semibold uppercase tracking-[0.3em] text-sidebar-primary">Studio</p>
        </div>
        <button onClick={() => setPaletteOpen(true)} className="mx-3 mb-2 flex w-[calc(100%-1.5rem)] items-center gap-3 rounded-sm border border-sidebar-accent px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent">
          <Search className="h-4 w-4" /> Search
          <kbd className="ml-auto rounded border border-sidebar-accent px-1.5 text-[10px]">⌘K</kbd>
        </button>
        <div className="px-3 pb-3"><NavLinks /></div>
      </aside>
      <main className="flex-1 px-5 py-8 md:px-10">
        {children}
        <footer className="mt-16 border-t pt-6 text-center text-xs text-muted-foreground">
          Nine3 Studio · crafted by <a href="https://nine3designs.co.uk" target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">Nine3 Designs</a> · Your Vision. Our Design.
        </footer>
      </main>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}

