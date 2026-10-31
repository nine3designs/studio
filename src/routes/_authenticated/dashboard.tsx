import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowUpRight, CalendarDays, Check, ChevronRight, ClipboardList, ExternalLink, FolderKanban, PartyPopper, PiggyBank, Receipt, Users } from "lucide-react";
import { StatusBadge } from "@/components/common";
import { nav as allNav } from "@/components/StudioShell";
import { useRows, useSave } from "@/lib/db";
import { effectiveStatus, fmtDate, invoiceTotals, money, portalLink } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · Nine3 Studio" }] }),
  component: Dashboard,
});

function Tile({ label, value, icon: Icon, tone, to }: { label: string; value: any; icon: any; tone: string; to?: string }) {
  const inner = (
    <>
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4 w-4" /></span>
      <span className="mt-3 font-heading text-2xl font-bold tabular-nums tracking-tight text-primary-deep md:text-3xl">{value}</span>
      <span className="mt-0.5 text-xs font-medium text-muted-foreground">{label}</span>
    </>
  );
  const cls = "zd-card flex flex-col rounded-2xl border border-white/60 bg-white/70 p-4 shadow-[0_10px_30px_-18px_rgba(23,75,80,.35)] backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-18px_rgba(23,75,80,.45)]";
  return to ? <Link to={to as never} className={cls}>{inner}<ArrowUpRight className="absolute right-3 top-3 h-4 w-4 text-muted-foreground/30" /></Link> : <div className={cls + " relative"}>{inner}</div>;
}

function Dashboard() {
  const projects = useRows("projects", { select: "*, clients(name)" }).data ?? [];
  const invoices = useRows("invoices").data ?? [];
  const tasks = useRows("tasks", { select: "*, projects(name)", order: "due_date", asc: true }).data ?? [];
  const activity = useRows("activity_log", { select: "*, clients(name)" }).data ?? [];
  const clients = useRows("clients").data ?? [];
  const fixtures = useRows("sports_fixtures", { order: "match_date", asc: true }).data ?? [];
  const taskSave = useSave("tasks");
  const [tlTab, setTlTab] = useState("upcoming");

  const now = new Date();
  const monthKey = now.toISOString().slice(0, 7);
  const paidThisMonth = invoices.filter((i) => i.status === "paid" && (i.paid_at ?? i.issue_date)?.startsWith(monthKey)).reduce((s, i) => s + invoiceTotals(i.items, i.tax_rate).total, 0);
  const outstanding = invoices.filter((i) => ["sent", "overdue"].includes(effectiveStatus(i))).reduce((s, i) => s + invoiceTotals(i.items, i.tax_rate).total, 0);
  const active = projects.filter((p) => p.status === "active");
  const pending = tasks.filter((t) => t.status !== "done");
  const doneTasks = tasks.filter((t) => t.status === "done");
  const today = now.toISOString().slice(0, 10);
  const overdue = pending.filter((t) => t.due_date && t.due_date < today);
  const pct = tasks.length ? Math.round((doneTasks.length / tasks.length) * 100) : 0;
  const tlRows = tlTab === "upcoming" ? pending.filter((t) => !(t.due_date && t.due_date < today)).slice(0, 5)
    : tlTab === "overdue" ? overdue.slice(0, 5)
    : doneTasks.slice(-5).reverse();
  const tlEmpty = tlTab === "upcoming" ? "Nothing upcoming." : tlTab === "overdue" ? "Nothing overdue." : "No completed tasks yet.";

  const next = fixtures.find((f) => f.match_date >= today);
  const nextClient = next ? clients.find((c) => c.id === next.client_id) : undefined;
  const kits = ((next?.venue === "home" ? nextClient?.home_kit : nextClient?.away_kit) ?? {}) as { primary?: string; secondary?: string; accent?: string; badge?: string };
  const sportsClients = clients.filter((c) => c.portal_type === "sports" && c.portal_enabled);
  const recentIds: string[] = (() => { try { return JSON.parse(localStorage.getItem("nine3-recent-clients") ?? "[]"); } catch { return []; } })();
  const recent = recentIds.map((rid) => clients.find((c) => c.id === rid)).filter(Boolean);
  const wanted = ["Clients", "Projects", "Tasks", "Invoices", "Monthly payments", "Templates"];
  const nav = allNav.filter((n) => wanted.includes(n.label));

  return (
    <div className="dash-wrap relative overflow-hidden rounded-3xl p-4 sm:p-6 lg:p-8">
      <div className="dash-glow" aria-hidden="true" />
      <header className="relative mb-6">
        <p className="eyebrow">Welcome back · {now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</p>
        <h1 className="font-heading mt-1 text-3xl font-bold tracking-tight text-primary-deep md:text-5xl">Your Studio Dashboard</h1>
        <div className="dash-underline mt-2" />
      </header>

      {next && nextClient && (
        <section className="dash-hero relative mb-6 overflow-hidden rounded-2xl p-5 text-white md:p-7">
          <div className="hero-bg-lines" aria-hidden="true" />
          <div className="relative grid gap-4 md:flex md:flex-wrap md:items-center md:gap-5">
            <div className="flex items-center gap-4">
            {kits.badge ? <img src={kits.badge} alt="badge" className="h-14 w-14 shrink-0 rounded-xl bg-white/10 object-contain p-1 ring-1 ring-white/25" /> : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 backdrop-blur"><CalendarDays className="h-7 w-7 text-[#FFD520]" /></div>
            )}
            <div className="min-w-0 flex-1">
              <p className="eyebrow" style={{ color: "#FFD520" }}>Next match · {nextClient.name}</p>
              <h2 className="font-heading text-2xl font-bold tracking-tight md:text-3xl">{next.venue === "home" ? "vs" : "away at"} {next.opponent}</h2>
              <div className="dash-underline mt-2" style={{ background: "linear-gradient(90deg,#FFD520,rgba(255,255,255,.8))" }} />
              <p className="mt-2 text-sm text-white/75">{fmtDate(next.match_date)} · {next.venue === "home" ? "Home" : "Away"}{next.competition ? ` · ${next.competition}` : ""}</p>
            </div>
            </div>
            <div className="flex flex-col gap-2 md:ml-auto">
              <Link to="/tasks" className="rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-center text-sm font-semibold backdrop-blur transition-colors hover:bg-white/20">Graphics to-do ({tasks.filter((t) => t.status !== "done" && t.client_id === next.client_id).length})</Link>
              {nextClient.portal_token && <a href={portalLink(nextClient.portal_token)} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-full bg-[#FFD520] px-5 py-2.5 text-sm font-semibold text-[#0A2547] shadow-lg transition-transform hover:scale-[1.03]">Open portal <ExternalLink className="h-4 w-4" /></a>}
            </div>
          </div>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Active projects" value={active.length} icon={FolderKanban} tone="bg-primary/10 text-primary" />
        <Tile label="Paid this month" value={money(paidThisMonth)} icon={PiggyBank} tone="bg-success/10 text-success" />
        <Tile label="Outstanding" value={money(outstanding)} icon={Receipt} tone="bg-gold/15 text-gold-foreground" />
        <Tile label="Active clients" value={clients.filter((c) => c.status === "active").length} icon={Users} tone="bg-primary-soft/30 text-primary" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <section className="zd-card lg:col-span-2 rounded-2xl border border-white/60 bg-white/70 p-5 shadow-[0_10px_30px_-18px_rgba(23,75,80,.35)] backdrop-blur">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-lg font-bold tracking-tight text-primary-deep">Your Task Timeline</h2>
              <p className="text-xs text-muted-foreground">{doneTasks.length}/{tasks.length} done · see your progress take shape</p>
            </div>
            <Link to="/tasks" className="flex items-center gap-1 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-deep">All tasks</Link>
          </div>
          <div className="zd-progress mt-2 mb-4"><span style={{ width: `${pct}%` }} /></div>
          <div className="zd-tabs mb-3 inline-flex rounded-full border border-border/60 bg-background/60 p-1">
            {[["upcoming", `Upcoming (${pending.filter((t) => !(t.due_date && t.due_date < today)).length})`], ["overdue", `Overdue (${overdue.length})`], ["completed", "Completed"]].map(([v, l]) => (
              <button key={v as string} type="button" onClick={() => setTlTab(v as string)} className={`zd-tab rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${tlTab === v ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-primary"}`}>{l}</button>
            ))}
          </div>
          {tlRows.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">{tlEmpty}</p> : (
            <ul className="space-y-2">
              {tlRows.map((t) => (
                <li key={t.id} className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/70 px-3 py-2.5">
                  {tlTab !== "completed" ? (
                    <button type="button" aria-label="Mark done" onClick={() => taskSave.mutate({ id: t.id, status: "done" })} className="rounded-full border border-muted-foreground/30 p-1 text-muted-foreground transition hover:border-primary hover:text-primary"><Check className="h-3.5 w-3.5" /></button>
                  ) : <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success text-white"><Check className="h-3 w-3" /></span>}
                  <span className={`min-w-0 flex-1 truncate text-sm font-medium ${tlTab === "completed" ? "text-muted-foreground line-through" : ""}`}>{t.title}</span>
                  {t.projects?.name && <span className="hidden shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground sm:inline">{t.projects.name}</span>}
                  <span className="shrink-0 text-[11px] text-muted-foreground">{t.due_date ? fmtDate(t.due_date) : ""}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="zd-card rounded-2xl border border-white/60 bg-white/70 p-5 shadow-[0_10px_30px_-18px_rgba(23,75,80,.35)] backdrop-blur">
          <h2 className="font-heading text-lg font-bold tracking-tight text-primary-deep">Quick links</h2>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {nav.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to as never} className="group flex flex-col items-center gap-1.5 rounded-xl border border-border/60 bg-background/70 px-2 py-3.5 text-center transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-white"><Icon className="h-4 w-4" /></span>
                <span className="text-xs font-semibold text-primary-deep">{label}</span>
              </Link>
            ))}
          </div>
          {sportsClients.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Sports portals</p>
              {sportsClients.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/70 p-2.5">
                  <span className="min-w-0 truncate text-sm font-medium">{c.name}</span>
                  <div className="flex shrink-0 gap-1.5">
                    {c.portal_token && <a href={portalLink(c.portal_token)} target="_blank" rel="noreferrer" className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-deep">Portal</a>}
                    <Link to="/tasks" className="rounded-full border px-3 py-1.5 text-xs font-semibold text-primary-deep transition hover:bg-accent">Tasks</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
          {recent.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Recently viewed</p>
              <div className="flex flex-wrap gap-1.5">
                {recent.map((c) => <Link key={c!.id} to="/clients/$id" params={{ id: c!.id }} className="rounded-full border bg-background/60 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent">{c!.name}</Link>)}
              </div>
            </div>
          )}
        </section>

        <section className="zd-card lg:col-span-2 rounded-2xl border border-white/60 bg-white/70 p-5 shadow-[0_10px_30px_-18px_rgba(23,75,80,.35)] backdrop-blur">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-heading text-lg font-bold tracking-tight text-primary-deep">Active projects</h2>
            <Link to="/projects" className="rounded-full border px-3 py-1.5 text-xs font-semibold text-primary-deep transition hover:bg-accent">View all</Link>
          </div>
          {active.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No active projects yet.</p> : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {active.slice(0, 6).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/70 px-3 py-2.5">
                  <div className="min-w-0"><p className="truncate text-sm font-medium">{p.name}</p><p className="text-[11px] text-muted-foreground">{p.clients?.name ?? "No client"}</p></div>
                  <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">{fmtDate(p.due_date)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="zd-card rounded-2xl border border-white/60 bg-white/70 p-5 shadow-[0_10px_30px_-18px_rgba(23,75,80,.35)] backdrop-blur">
          <h2 className="font-heading text-lg font-bold tracking-tight text-primary-deep">Recent activity</h2>
          {activity.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No activity yet.</p> : (
            <ul className="mt-3 space-y-2.5">
              {activity.slice(0, 5).map((a) => (
                <li key={a.id} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                  <span className="min-w-0"><span className="font-medium">{a.clients?.name ?? "Studio"}</span> <span className="text-muted-foreground">{a.message}</span></span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <style>{`
        .dash-wrap { background: linear-gradient(155deg,#F8F4EB 0%,#F1EDE4 30%,#DCE9E5 68%,#EFE3CE 100%); }
        .dash-glow { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(circle at 85% 5%, rgba(200,169,106,.18), transparent 45%), radial-gradient(circle at 5% 90%, rgba(23,75,80,.08), transparent 40%); }
        .dash-glow + * { position: relative; }
        .dash-hero { background: linear-gradient(120deg,#174B50 0%,#0F3A40 55%,#0A2B31 100%); box-shadow: 0 24px 60px -24px rgba(23,75,80,.55); }
        .hero-bg-lines { position: absolute; inset: 0; pointer-events: none; background-image: repeating-linear-gradient(115deg, rgba(255,255,255,.06) 0 1px, transparent 1px 30px), radial-gradient(circle at 88% 15%, rgba(255,213,32,.18), transparent 50%); }
        .dash-underline { height: 4px; width: 110px; border-radius: 999px; background: linear-gradient(90deg,#C8A96A,rgba(23,75,80,.25)); animation: dashshine 2.8s ease-in-out infinite; }
        @keyframes dashshine { 0%,100% { width: 110px; opacity: .95; } 50% { width: 190px; opacity: .55; } }
        .zd-progress { height: 8px; border-radius: 999px; background: rgba(23,75,80,.1); overflow: hidden; }
        .zd-progress span { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg,#174B50,#C8A96A); transition: width .6s ease; }
        @media (prefers-reduced-motion: reduce) { .dash-underline { animation: none; } }
        @media (max-width: 640px) { .dash-wrap { padding: 1rem !important; border-radius: 1.25rem !important; } .dash-hero { padding: 1.1rem !important; } .dash-hero h2 { font-size: 1.3rem !important; } }
      `}</style>
    </div>
  );
}
