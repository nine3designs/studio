import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Empty, PageHeader } from "@/components/common";
import { useRows, useSave } from "@/lib/db";
import { money } from "@/lib/format";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export const Route = createFileRoute("/_authenticated/payments")({
  head: () => ({ meta: [{ title: "Monthly payments · Nine3 Studio" }] }),
  component: Payments,
});

type MonthRow = { key: string; label: string; short?: string; amount: number; paid: boolean; paidAt?: string; overdue: boolean };

function buildMonths(c: Any, today: Date): MonthRow[] {
  const cfg = c.portal_prefs?.monthly_config ?? null;
  if (!cfg?.start || !cfg?.count) return [];
  const amount = Number(cfg.amount ?? c.monthly_fee ?? 0);
  const monthly = (c.portal_prefs?.monthly ?? {}) as Record<string, Any>;
  const [y, m] = String(cfg.start).split("-").map(Number);
  const rows: MonthRow[] = [];
  for (let i = 0; i < Number(cfg.count); i++) {
    const d = new Date(Date.UTC(y, m - 1 + i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const e = monthly[key] ?? {};
    rows.push({
      key,
      label: d.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }),
      short: d.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" }),
      amount: Number(e.amount ?? amount),
      paid: !!e.paid,
      paidAt: e.paid_at,
      overdue: !e.paid && d.getTime() < Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1),
    });
  }
  return rows;
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "paid" | "due" | "over" }) {
  const colour = tone === "paid" ? "text-success" : tone === "over" ? "text-destructive" : tone === "due" ? "text-gold" : "text-foreground";
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`mt-2 font-heading text-3xl font-bold tabular-nums ${colour}`}>{value}</p>
    </div>
  );
}

function Payments() {
  const clients = useRows("clients").data ?? [];
  const save = useSave("clients");
  const sports = clients.filter((c: Any) => c.portal_type === "sports" && c.monthly_fee);

  async function toggle(c: Any, month: MonthRow) {
    const prefs = { ...(c.portal_prefs ?? {}) };
    const monthly = { ...(prefs.monthly ?? {}) };
    const entry = { ...(monthly[month.key] ?? {}) };
    if (entry.paid) {
      delete entry.paid;
      delete entry.paid_at;
    } else {
      entry.paid = true;
      entry.paid_at = new Date().toISOString().slice(0, 10);
    }
    monthly[month.key] = entry;
    await save.mutateAsync({ id: c.id, portal_prefs: { ...prefs, monthly } });
    toast.success(entry.paid ? `${month.label} marked as paid · ${money(month.amount)}` : `${month.label} marked as unpaid`);
  }

  return (
    <div>
      <PageHeader eyebrow="Money" title="Monthly payments" subtitle="Package trackers · tap a month to tick it off." />
      {sports.length === 0 ? <Empty>No monthly-package clients yet.</Empty> : (
        <div className="space-y-12">
          {sports.map((c: Any) => {
            const today = new Date();
            const months = buildMonths(c, today);
            const total = months.reduce((s, m) => s + m.amount, 0);
            const paid = months.filter((m) => m.paid).reduce((s, m) => s + m.amount, 0);
            const overdue = months.filter((m) => m.overdue).reduce((s, m) => s + m.amount, 0);
            const outstanding = total - paid;
            const pct = total ? Math.round((paid / total) * 100) : 0;
            const nextDue = months.find((m) => !m.paid);
            return (
              <section key={c.id}>
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="eyebrow">Monthly package · {money(c.monthly_fee)}/mo</p>
                    <h2 className="font-heading text-2xl font-semibold text-primary-deep">{c.name}</h2>
                    {nextDue && <p className="mt-1 text-sm text-muted-foreground">Next due {nextDue.label}</p>}
                  </div>
                  <div className="w-full max-w-xs">
                    <div className="mb-1.5 flex justify-between text-xs text-muted-foreground"><span>Collected</span><span className="font-semibold text-foreground">{pct}%</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-success transition-all" style={{ width: `${pct}%` }} /></div>
                  </div>
                </div>
                <div className="mb-6 grid gap-4 sm:grid-cols-3">
                  <Kpi label="Paid to date" value={money(paid)} tone="paid" />
                  <Kpi label="Outstanding" value={money(outstanding)} tone="due" />
                  <Kpi label="Overdue" value={money(overdue)} tone={overdue > 0 ? "over" : undefined} />
                </div>
                {months.length === 0 ? <Empty>Set a start month for this package (ask Juno to seed it).</Empty> : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {months.map((m) => (
                      <button
                        type="button"
                        key={m.key}
                        onClick={() => toggle(c, m)}
                        aria-label={m.paid ? `Mark ${m.label} unpaid` : `Mark ${m.label} paid`}
                        className={`group relative rounded-2xl border p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                          m.paid ? "border-success/40 bg-success/5" : m.overdue ? "border-destructive/40 bg-destructive/5" : "bg-card"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-[11px] font-semibold uppercase tracking-widest ${m.paid ? "text-success" : m.overdue ? "text-destructive" : "text-muted-foreground"}`}>
                            {m.paid ? "Paid" : m.overdue ? "Overdue" : "Due"}
                          </p>
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all ${
                              m.paid ? "border-success bg-success text-white" : m.overdue ? "border-destructive/50" : "border-muted-foreground/30 group-hover:border-success"
                            }`}
                          >
                            {m.paid && <Check className="h-4 w-4" />}
                          </span>
                        </div>
                        <p className="mt-2 font-heading text-2xl font-bold tabular-nums text-foreground">{money(m.amount)}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">{m.label}</p>
                        {m.paidAt && <p className="mt-2 text-[11px] text-muted-foreground">Cleared {m.paidAt}</p>}
                      </button>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
