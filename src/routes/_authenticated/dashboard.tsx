import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Clock, ExternalLink, PartyPopper, Palette } from "lucide-react";
import { Empty, PageHeader, StatCard, StatusBadge } from "@/components/common";
import { useRows } from "@/lib/db";
import { effectiveStatus, fmtDate, invoiceTotals, money, portalLink } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · Nine3 Studio" }] }),
  component: Dashboard,
});

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
        <section className="portal-fade mb-8 overflow-hidden rounded-md bg-primary-deep p-6 text-primary-foreground md:p-8">
          <div className="flex flex-wrap items-center gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-white/10">
              <CalendarDays className="h-8 w-8" />
            </div>
            <div className="min-w-60 flex-1">
              <p className="eyebrow" style={{ color: "#DCE9E5" }}>Next match · {nextClient.name}</p>
              <h2 className="font-heading text-3xl font-semibold">
                {next.venue === "home" ? "vs" : "away at"} {next.opponent}
              </h2>
              <p className="mt-1 text-sm opacity-80">
                {fmtDate(next.match_date)} · {next.venue === "home" ? "Home" : "Away"}
                {next.notes ? ` · ${next.notes}` : ""}
                {next.competition ? ` · ${next.competition}` : ""}
              </p>
              <div className="mt-3 flex gap-2">
                {(["primary", "secondary", "accent"] as const).map((c) => kits[c] && (
                  <span key={c} className="h-6 w-6 rounded-sm border border-white/30" style={{ background: kits[c] }} title={kits[c]} />
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Link to="/tasks" className="rounded-md bg-white/10 px-4 py-2 text-center text-sm font-medium transition-colors hover:bg-white/20">
                Graphics to-do ({tasks.filter((t) => t.status !== "done" && t.client_id === next.client_id).length})
              </Link>
              {nextClient.portal_token && (
                <a href={portalLink(nextClient.portal_token)} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-md bg-gold px-4 py-2 text-sm font-medium text-primary-deep transition-opacity hover:opacity-90">
                  Open portal <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      {sportsClients.length > 0 && (
        <section className="mb-8">
          <div className="mb-3 flex items-center gap-2"><Palette className="h-4 w-4 text-primary" /><h2 className="font-semibold text-primary-deep">Graphics quick links</h2></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sportsClients.map((c) => (
              <div key={c.id} className="rounded-md border bg-card p-4">
                <p className="font-medium">{c.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {tasks.filter((t) => t.client_id === c.id && t.status !== "done").length} to-do ·
                  {" "}{deliverables.filter((d) => d.client_id === c.id && ["completed", "deliverable"].includes(d.kind)).length} in archive
                </p>
                <div className="mt-3 flex gap-2">
                  {c.portal_token && (
                    <a href={portalLink(c.portal_token)} target="_blank" rel="noreferrer" className="rounded-md border px-3 py-1.5 text-xs font-medium text-primary-deep transition-colors hover:bg-accent">Portal</a>
                  )}
                  <Link to="/tasks" className="rounded-md border px-3 py-1.5 text-xs font-medium text-primary-deep transition-colors hover:bg-accent">Tasks</Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {recent.length > 0 && (
        <section className="mb-8">
          <div className="mb-2 flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /><h2 className="font-semibold text-primary-deep">Recently viewed</h2></div>
          <div className="flex flex-wrap gap-2">
            {recent.map((c) => (
              <Link key={c!.id} to="/clients/$id" params={{ id: c!.id }} className="rounded-full border bg-card px-4 py-1.5 text-sm transition-colors hover:bg-accent">{c!.name}</Link>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active projects" value={active.length} />
        <StatCard label="Paid this month" value={money(paidThisMonth)} />
        <StatCard label="Outstanding" value={money(outstanding)} hint="Sent and overdue invoices" />
        <StatCard label="Active clients" value={clients.filter((c) => c.status === "active").length} />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="rounded-md border bg-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold text-primary-deep">Active projects</h2><Link to="/projects" className="text-xs text-primary-soft">View all</Link></div>
          {active.length === 0 ? <Empty>No active projects yet.</Empty> : (
            <ul className="divide-y">
              {active.slice(0, 6).map((p) => (
                <li key={p.id} className="flex items-center justify-between py-3 text-sm">
                  <div><p className="font-medium">{p.name}</p><p className="text-xs text-muted-foreground">{p.clients?.name ?? "No client"}</p></div>
                  <span className="text-xs text-muted-foreground">Due {fmtDate(p.due_date)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-md border bg-card p-5">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold text-primary-deep">Pending tasks</h2><Link to="/tasks" className="text-xs text-primary-soft">View all</Link></div>
          {pending.length === 0 ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><PartyPopper className="h-4 w-4" /> All caught up.</div> : (
            <ul className="space-y-3">
              {pending.slice(0, 7).map((t) => (
                <li key={t.id} className="flex items-start justify-between gap-2 text-sm">
                  <span>{t.title}</span><StatusBadge status={t.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-md border bg-card p-5 lg:col-span-3">
          <h2 className="mb-4 font-semibold text-primary-deep">Recent client activity</h2>
          {activity.length === 0 ? <Empty>Client approvals, uploads and checklist progress will show here.</Empty> : (
            <ul className="divide-y">
              {activity.slice(0, 10).map((a) => (
                <li key={a.id} className="flex justify-between gap-4 py-2 text-sm">
                  <span><span className="font-medium">{a.clients?.name ?? "Studio"}</span> · {a.message}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{fmtDate(a.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
