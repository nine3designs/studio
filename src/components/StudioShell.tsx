import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  LayoutDashboard, Users, FolderKanban, CheckSquare, Receipt, Wallet, FileSignature, Tags, ClipboardList, LayoutTemplate, LogOut,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LOGO_URL } from "@/lib/format";

const nav = [
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

export function StudioShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="no-print bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0">
        <div className="flex items-center justify-between p-6 md:block">
          <img src={LOGO_URL} alt="Nine3 Designs" className="h-10" />
          <p className="font-script text-xs font-semibold uppercase tracking-[0.3em] text-sidebar-primary md:mt-3">Studio</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex shrink-0 items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent"
              activeProps={{ className: "bg-sidebar-accent text-sidebar-primary" }}
            >
              <Icon className="h-4 w-4" /> {label}
            </Link>
          ))}
          <button onClick={signOut} className="flex shrink-0 items-center gap-3 rounded-sm px-3 py-2 text-left text-sm hover:bg-sidebar-accent md:mt-6">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </nav>
      </aside>
      <main className="flex-1 px-5 py-8 md:px-10">{children}</main>
    </div>
  );
}
