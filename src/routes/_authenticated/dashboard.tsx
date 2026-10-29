import { createFileRoute, Link } from "@tanstack/react-router";
import { Empty, PageHeader, StatCard, StatusBadge } from "@/components/common";
import { useRows } from "@/lib/db";
import { effectiveStatus, fmtDate, invoiceTotals, money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Nine3 Studio" }] }),
  component: Dashboard,
});

function Dashboard() {
  const projects = useRows("projects", { select: "*, clients(name)" }).data ?? [];
  const invoices = useRows("invoices").data ?? [];
  const tasks = useRows("tasks", { select: "*, projects(name)", order: "due_date", asc: true }).data ?? [];
  const activity = useRows("activity_log", { select: "*, clients(name)" }).data ?? [];
  const clients = useRows("clients").data ?? [];

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

  return (
    <div>
      <PageHeader eyebrow={now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} title="Good to see you, Natalie" subtitle="Here's what's happening across the studio." />
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
          {pending.length === 0 ? <Empty>All caught up.</Empty> : (
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
                  <span><span className="font-medium">{a.clients?.name ?? "Studio"}</span> — {a.message}</span>
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
