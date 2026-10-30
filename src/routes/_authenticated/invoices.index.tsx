import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, PageHeader, StatCard, StatusBadge } from "@/components/common";
import { useRows, useSave } from "@/lib/db";
import { effectiveStatus, fmtDate, invoiceTotals, money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/invoices/")({
  head: () => ({ meta: [{ title: "Invoices · Nine3 Studio" }] }),
  component: Invoices,
});

function Invoices() {
  const invoices = useRows("invoices", { select: "*, clients(name)", order: "issue_date" }).data ?? [];
  const save = useSave("invoices");
  const navigate = useNavigate();

  const sum = (pred: (s: string) => boolean) => invoices.filter((i) => pred(effectiveStatus(i))).reduce((s, i) => s + invoiceTotals(i.items, i.tax_rate).total, 0);

  async function create() {
    const n = `N3-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, "0")}`;
    const due = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
    const row = await save.mutateAsync({ number: n, due_date: due, items: [{ description: "Design services", quantity: 1, rate: 0 }] });
    navigate({ to: "/invoices/$id", params: { id: row.id } });
  }

  return (
    <div>
      <PageHeader eyebrow="Money" title="Invoices" action={<Button onClick={create}><Plus className="h-4 w-4" /> New invoice</Button>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Paid" value={money(sum((s) => s === "paid"))} />
        <StatCard label="Awaiting payment" value={money(sum((s) => s === "sent"))} />
        <StatCard label="Overdue" value={money(sum((s) => s === "overdue"))} />
      </div>
      {invoices.length === 0 ? <Empty>No invoices yet.</Empty> : (
        <div className="overflow-x-auto rounded-md border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-cream text-left text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="p-3">Number</th><th className="p-3">Client</th><th className="p-3">Issued</th><th className="p-3">Due</th><th className="p-3 text-right">Total</th><th className="p-3">Status</th></tr></thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id} className="border-t">
                  <td className="p-3"><Link to="/invoices/$id" params={{ id: i.id }} className="font-medium hover:text-primary-soft">{i.number}</Link></td>
                  <td className="p-3">{i.clients?.name ?? "·"}</td>
                  <td className="p-3">{fmtDate(i.issue_date)}</td>
                  <td className="p-3">{fmtDate(i.due_date)}</td>
                  <td className="p-3 text-right">{money(invoiceTotals(i.items, i.tax_rate).total)}</td>
                  <td className="p-3"><StatusBadge status={effectiveStatus(i)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
