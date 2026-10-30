import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Empty, PageHeader, StatCard } from "@/components/common";
import { useRows, useSave } from "@/lib/db";
import { effectiveStatus, fmtDate, invoiceTotals, money } from "@/lib/format";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export const Route = createFileRoute("/_authenticated/payments")({
  head: () => ({ meta: [{ title: "Monthly payments · Nine3 Studio" }] }),
  component: Payments,
});

function Payments() {
  const invoices = useRows("invoices", { select: "*, clients(name, monthly_fee, portal_type, portal_enabled)", order: "due_date", asc: true }).data ?? [];
  const save = useSave("invoices");

  const sports = new Map<string, Any>();
  for (const i of invoices) {
    const c = i.clients;
    if (!c || c.portal_type !== "sports") continue;
    if (!sports.has(c.name)) sports.set(c.name, { client: c, list: [] });
    sports.get(c.name)!.list.push(i);
  }

  async function toggle(inv: Any) {
    const paid = inv.status === "paid";
    await save.mutateAsync(
      paid
        ? { id: inv.id, status: "sent", paid_at: null }
        : { id: inv.id, status: "paid", paid_at: new Date().toISOString().slice(0, 10) },
    );
    toast.success(paid ? "Marked as unpaid" : `${inv.number} marked as paid · ${money(invoiceTotals(inv.items, inv.tax_rate).total)}`);
  }

  return (
    <div>
      <PageHeader eyebrow="Money" title="Monthly payments" subtitle="Retainer packages at a glance — tick a box when the money lands." />
      {sports.size === 0 ? <Empty>No monthly-package clients yet.</Empty> : (
        <div className="space-y-10">
          {[...sports.values()].map(({ client, list }) => {
            const paid = list.filter((i: Any) => i.status === "paid").reduce((s: number, i: Any) => s + invoiceTotals(i.items, i.tax_rate).total, 0);
            const outstanding = list.filter((i: Any) => effectiveStatus(i) === "sent").reduce((s: number, i: Any) => s + invoiceTotals(i.items, i.tax_rate).total, 0);
            const overdue = list.filter((i: Any) => effectiveStatus(i) === "overdue").reduce((s: number, i: Any) => s + invoiceTotals(i.items, i.tax_rate).total, 0);
            const nextDue = list.find((i: Any) => effectiveStatus(i) !== "paid");
            return (
              <section key={client.name}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="eyebrow">{client.monthly_fee ? `Monthly package · ${money(client.monthly_fee)}` : "Monthly payments"}</p>
                    <h2 className="font-heading text-2xl font-semibold text-primary-deep">{client.name}</h2>
                    {nextDue && <p className="mt-1 text-sm text-muted-foreground">Next due {fmtDate(nextDue.due_date)} · {nextDue.number}</p>}
                  </div>
                </div>
                <div className="mb-5 grid gap-4 sm:grid-cols-3">
                  <StatCard label="Paid to date" value={money(paid)} />
                  <StatCard label="Outstanding" value={money(outstanding)} />
                  <StatCard label="Overdue" value={<span className={overdue > 0 ? "text-destructive" : ""}>{money(overdue)}</span>} />
                </div>
                <div className="overflow-x-auto rounded-md border bg-card">
                  <table className="w-full text-sm">
                    <thead className="bg-cream text-left text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="p-3">Month</th><th className="p-3">Invoice</th><th className="p-3">Due</th><th className="p-3 text-right">Amount</th><th className="p-3">Status</th><th className="p-3 text-center">Paid</th></tr></thead>
                    <tbody>
                      {list.map((i: Any) => {
                        const st = effectiveStatus(i);
                        const paid = st === "paid";
                        return (
                          <tr key={i.id} className={`border-t transition-colors ${paid ? "bg-success/5" : ""}`}>
                            <td className="p-3 font-medium">{monthLabel(i.due_date ?? i.issue_date)}</td>
                            <td className="p-3"><Link to="/invoices/$id" params={{ id: i.id }} className="font-medium hover:text-primary-soft">{i.number}</Link></td>
                            <td className="p-3">{fmtDate(i.due_date)}</td>
                            <td className="p-3 text-right">{money(invoiceTotals(i.items, i.tax_rate).total)}</td>
                            <td className="p-3"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${paid ? "bg-success/15 text-success" : st === "overdue" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>{paid ? "Paid" : st === "overdue" ? "Overdue" : "Outstanding"}</span></td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => toggle(i)}
                                aria-label={paid ? `Mark ${i.number} unpaid` : `Mark ${i.number} paid`}
                                className={`inline-flex h-6 w-6 items-center justify-center rounded-sm border transition-all ${paid ? "border-success bg-success text-white" : "border-muted-foreground/40 bg-background hover:border-success hover:bg-success/10"}`}
                              >
                                {paid && <Check className="h-4 w-4" />}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function monthLabel(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}
