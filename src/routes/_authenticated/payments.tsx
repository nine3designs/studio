import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Empty, PageHeader, StatCard } from "@/components/common";
import { useRows, useSave } from "@/lib/db";
import { money } from "@/lib/format";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export const Route = createFileRoute("/_authenticated/payments")({
  head: () => ({ meta: [{ title: "Monthly payments · Nine3 Studio" }] }),
  component: Payments,
});

type MonthRow = { key: string; label: string; amount: number; paid: boolean; paidAt?: string; overdue: boolean };

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
      amount: Number(e.amount ?? amount),
      paid: !!e.paid,
      paidAt: e.paid_at,
      overdue: !e.paid && d.getTime() < Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1),
    });
  }
  return rows;
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
      <PageHeader eyebrow="Money" title="Monthly payments" subtitle="Retainer packages at a glance · tick a box when the money lands." />
      {sports.length === 0 ? <Empty>No monthly-package clients yet.</Empty> : (
        <div className="space-y-10">
          {sports.map((c: Any) => {
            const today = new Date();
            const months = buildMonths(c, today);
            const paid = months.filter((m) => m.paid).reduce((s, m) => s + m.amount, 0);
            const overdue = months.filter((m) => m.overdue).reduce((s, m) => s + m.amount, 0);
            const outstanding = months.filter((m) => !m.paid && !m.overdue).reduce((s, m) => s + m.amount, 0);
            const nextDue = months.find((m) => !m.paid);
            return (
              <section key={c.id}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="eyebrow">Monthly package · {money(c.monthly_fee)}</p>
                    <h2 className="font-heading text-2xl font-semibold text-primary-deep">{c.name}</h2>
                    {nextDue && <p className="mt-1 text-sm text-muted-foreground">Next due {nextDue.label}</p>}
                  </div>
                </div>
                <div className="mb-5 grid gap-4 sm:grid-cols-3">
                  <StatCard label="Paid to date" value={money(paid)} />
                  <StatCard label="Outstanding" value={money(outstanding)} />
                  <StatCard label="Overdue" value={<span className={overdue > 0 ? "text-destructive" : ""}>{money(overdue)}</span>} />
                </div>
                {months.length === 0 ? <Empty>Set a start month for this package (ask Juno to seed it).</Empty> : (
                  <div className="overflow-x-auto rounded-md border bg-card">
                    <table className="w-full text-sm">
                      <thead className="bg-cream text-left text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="p-3">Month</th><th className="p-3 text-right">Amount</th><th className="p-3">Status</th><th className="p-3 text-center">Paid</th></tr></thead>
                      <tbody>
                        {months.map((m) => (
                          <tr key={m.key} className={`border-t transition-colors ${m.paid ? "bg-success/5" : m.overdue ? "bg-destructive/5" : ""}`}>
                            <td className="p-3 font-medium">{m.label}</td>
                            <td className="p-3 text-right">{money(m.amount)}</td>
                            <td className="p-3">
                              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${m.paid ? "bg-success/15 text-success" : m.overdue ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
                                {m.paid ? `Paid${m.paidAt ? ` · ${m.paidAt}` : ""}` : m.overdue ? "Overdue" : "Outstanding"}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => toggle(c, m)}
                                aria-label={m.paid ? `Mark ${m.label} unpaid` : `Mark ${m.label} paid`}
                                className={`inline-flex h-6 w-6 items-center justify-center rounded-sm border transition-all ${m.paid ? "border-success bg-success text-white" : "border-muted-foreground/40 bg-background hover:border-success hover:bg-success/10"}`}
                              >
                                {m.paid && <Check className="h-4 w-4" />}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
