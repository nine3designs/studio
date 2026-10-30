import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, CalendarDays, ExternalLink, FolderKanban, PartyPopper, Palette, PiggyBank, Receipt, Users } from "lucide-react";
import { Empty, PageHeader, StatusBadge } from "@/components/common";
import { useRows } from "@/lib/db";
import { effectiveStatus, fmtDate, invoiceTotals, money, portalLink } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · Nine3 Studio" }] }),
  component: Dashboard,
});

function Card({ title, icon: Icon, action, children, className = "" }: { title?: string; icon?: any; action?: any; children: any; className?: string }) {
  return (
    <section className={`dash-card rounded-2xl border bg-card p-6 shadow-[0_1px_2px_rgba(23,43,43,.04),0_12px_32px_-16px_rgba(23,43,43,.18)] ${className}`}>
      {title && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {Icon && <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>}
            <h2 className="font-heading text-[15px] font-semibold tracking-tight text-primary-deep">{title}</h2>
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

function Kpi({ label, value, hint, icon: Icon, tone }: { label: string; value: any; hint?: string; icon: any; tone: string }) {
  return (
    <div className="dash-card group relative overflow-hidden rounded-2xl border bg-card p-5 shadow-[0_1px_2px_rgba(23,43,43,.04),0_12px_32px_-16px_rgba(23,43,43,.18)] transition-transform duration-300 hover:-translate-y-1">
      <div className="flex items-start justify-between">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 transition-colors group-hover:text-primary" />
      </div>
      <p className="mt-4 font-heading text-3xl font-bold tabular-nums tracking-tight text-primary-deep">{value}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">{label}</p>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground/70">{hint}</p>}
    </div>
  );
}

function Dashboard() {
  const projects = useRows("projects", { select: "*, clients(name)" }).data ?? [];
  const invoices = useRows("invoices").data ?? [];
  const tasks = useRows("tasks", { select: "*, projects(name)", order: "due_date", asc: true }).data ?? [];
  const activity = useRows("activity_log", { select: "*, clients(name)" }).data ?? [];
  const clients = useRows("clients").data ?? [];
  const fixtures = useRows("sports_fixtures", { order: "match_date", asc: true }).data ?? [];
  const deliverables = useRows("deliverables", { select: "id, client_id, kind" }).data ?? [];

  const now = new Date();
  const monthKey = now.toISOString().slice(0, 7);
  const paidThisMonth = invoices
    .filter((i) => i.status === "paid" && (i.paid_at ?? i.issue_date)?.startsWith(monthKey))
    .reduce((s, i) => s + invoiceTotals(i.items, i.tax_rate).total, 0);
  const outstanding = invoices
    .filter((i) => ["sent", "overdue"].includes(effectiveStatus(i)))
    .reduce((s, i) => s + invoiceTotals(i.items, i.tax_rate).total, 0);
  const active = projects.filter((p) => p.status === "active");
  const pending = tasks.filter((t) => t.status !== "done");

  const today = now.toISOString().slice(0, 10);
  const next = fixtures.find((f) => f.match_date >= today);
  const nextClient = next ? clients.find((c) => c.id === next.client_id) : undefined;
  const sportsClients = clients.filter((c) => c.portal_type === "sports" && c.portal_enabled);
  const kits = ((next?.venue === "home" ? nextClient?.home_kit : nextClient?.away_kit) ?? {}) as { primary?: string; secondary?: string; accent?: string };
  const recentIds: string[] = (() => { try { return JSON.parse(localStorage.getItem("nine3-recent-clients") ?? "[]"); } catch { return []; } })();
  const recent = recentIds.map((rid) => clients.find((c) => c.id === rid)).filter(Boolean);

  return (
    <div>
      <PageHeader eyebrow={now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} title="Good to see you, Natalie" subtitle="Here's what's happening across the studio." />

      {next && nextClient && (
        <section className="dash-hero mb-6 overflow-hidden rounded-3xl p-7 text-white md:p-9">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 backdrop-blur">
              <CalendarDays className="h-8 w-8 text-[#FFD520]" />
            </div>
            <div className="min-w-60 flex-1">
              <p className="eyebrow" style={{ color: "#FFD520" }}>Next match · {nextClient.name}</p>
              <h2 className="font-heading text-3xl font-bold tracking-tight md:text-4xl">
                {next.venue === "home" ? "vs" : "away at"} {next.opponent}
              </h2>
              <p className="mt-1 text-sm text-white/70">
                {fmtDate(next.match_date)} · {next.venue === "home" ? "Home" : "Away"}
                {next.notes ? ` · ${next.notes}` : ""}
                {next.competition ? ` · ${next.competition}` : ""}
              </p>
              <div className="mt-3 flex gap-2">
                {(["primary", "secondary", "accent"] as const).map((c) => kits[c] && (
                  <span key={c} className="h-6 w-6 rounded-md border-2 border-white/70 shadow-sm" style={{ background: kits[c] }} title={kits[c]} />
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Link to="/tasks" className="rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-center text-sm font-semibold backdrop-blur transition-colors hover:bg-white/20">
                Graphics to-do ({tasks.filter((t) => t.status !== "done" && t.client_id === next.client_id).length})
              </Link>
              {nextClient.portal_token && (
                <a href={portalLink(nextClient.portal_token)} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-full bg-[#FFD520] px-5 py-2.5 text-sm font-semibold text-[#0A2547] shadow-lg transition-transform hover:scale-[1.03]">
                  Open portal <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Active projects" value={active.length} icon={FolderKanban} tone="bg-primary/10 text-primary" />
        <Kpi label="Paid this month" value={money(paidThisMonth)} icon={PiggyBank} tone="bg-success/10 text-success" />
        <Kpi label="Outstanding" value={money(outstanding)} hint="Sent and overdue invoices" icon={Receipt} tone="bg-gold/15 text-gold-foreground" />
        <Kpi label="Active clients" value={clients.filter((c) => c.status === "active").length} icon={Users} tone="bg-primary-soft/30 text-primary" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Active projects" icon={FolderKanban} className="lg:col-span-2"
          action={<Link to="/projects" className="text-xs font-medium text-primary-soft hover:underline">View all</Link>}>
          {active.length === 0 ? <Empty>No active projects yet.</Empty> : (
            <ul className="divide-y divide-border/70">
              {active.slice(0, 6).map((p) => (
                <li key={p.id} className="group flex items-center justify-between gap-4 py-3 text-sm transition-colors">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-primary/60" />
                    <div className="min-w-0"><p className="truncate font-medium">{p.name}</p><p className="text-xs text-muted-foreground">{p.clients?.name ?? "No client"}</p></div>
                  </div>
                  <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">Due {fmtDate(p.due_date)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Pending tasks" icon={PartyPopper} action={<Link to="/tasks" className="text-xs font-medium text-primary-soft hover:underline">View all</Link>}>
          {pending.length === 0 ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><PartyPopper className="h-4 w-4" /> All caught up.</div> : (
            <ul className="space-y-2.5">
              {pending.slice(0, 7).map((t) => (
                <li key={t.id} className="flex items-start justify-between gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted/60">
                  <span className="min-w-0 truncate">{t.title}</span><StatusBadge status={t.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recent client activity" className="lg:col-span-2">
          {activity.length === 0 ? <Empty>Client approvals, uploads and checklist progress will show here.</Empty> : (
            <ul className="divide-y divide-border/70">
              {activity.slice(0, 8).map((a) => (
                <li key={a.id} className="flex justify-between gap-4 py-2.5 text-sm">
                  <span className="min-w-0"><span className="font-medium">{a.clients?.name ?? "Studio"}</span> · <span className="text-muted-foreground">{a.message}</span></span>
                  <span className="shrink-0 text-xs text-muted-foreground">{fmtDate(a.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Quick links" icon={Palette}>
          <div className="space-y-4">
            {sportsClients.length > 0 && (
              <div className="space-y-2">
                {sportsClients.map((c) => (
                  <div key={c.id} className="group flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/60 p-3 transition-all hover:border-primary/30 hover:shadow-sm">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {tasks.filter((t) => t.client_id === c.id && t.status !== "done").length} to-do ·
                        {" "}{deliverables.filter((d) => d.client_id === c.id && ["completed", "deliverable"].includes(d.kind)).length} in archive
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      {c.portal_token && (
                        <a href={portalLink(c.portal_token)} target="_blank" rel="noreferrer" className="rounded-full border px-3 py-1.5 text-xs font-medium text-primary-deep transition-colors hover:bg-primary hover:text-white">Portal</a>
                      )}
                      <Link to="/tasks" className="rounded-full border px-3 py-1.5 text-xs font-medium text-primary-deep transition-colors hover:bg-primary hover:text-white">Tasks</Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {recent.length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Recently viewed</p>
                <div className="flex flex-wrap gap-2">
                  {recent.map((c) => (
                    <Link key={c!.id} to="/clients/$id" params={{ id: c!.id }} className="rounded-full border bg-background/60 px-3.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent">{c!.name}</Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      <style>{`
        .dash-hero { position: relative; background: linear-gradient(120deg, #174B50 0%, #0F3A40 55%, #0A2B31 100%); box-shadow: 0 24px 60px -24px rgba(23,75,80,.55); }
        .dash-hero::after { content: ""; position: absolute; right: -80px; top: -80px; width: 320px; height: 320px; background: radial-gradient(circle, rgba(200,169,106,.22), transparent 70%); border-radius: 50%; pointer-events: none; }
        .dash-card { transition: transform .3s ease, box-shadow .3s ease; }
        .dash-card:hover { box-shadow: 0 1px 2px rgba(23,43,43,.04), 0 18px 44px -18px rgba(23,43,43,.28); }
      `}</style>
    </div>
  );
}
