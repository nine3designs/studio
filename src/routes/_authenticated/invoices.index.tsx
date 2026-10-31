import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { FileSignature, Plus } from "lucide-react";
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
  const [filter, setFilter] = useState<"all" | "invoices" | "quotes">("all");

  const isQuote = (s: string) => s.startsWith("quote");
  const sum = (pred: (s: string) => boolean) => invoices.filter((i) => !isQuote(effectiveStatus(i)) && pred(effectiveStatus(i))).reduce((s, i) => s + invoiceTotals(i.items, i.tax_rate).total, 0);

  async function create(kind: "invoice" | "quote") {
    const y = new Date().getFullYear();
    const n = kind === "quote" ? `N3-Q-${y}-${String(invoices.length + 1).padStart(3, "0")}` : `N3-${y}-${String(invoices.length + 1).padStart(3, "0")}`;
    const due = kind === "quote" ? null : new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
    const row = await save.mutateAsync({ number: n, status: kind === "quote" ? "quote_draft" : "draft", due_date: due, items: [{ description: "Design services", quantity: 1, rate: 0 }] });
    navigate({ to: "/invoices/$id", params: { id: row.id } });
  }

  const shown = invoices.filter((i) => filter === "all" || (filter === "quotes" ? isQuote(effectiveStatus(i)) : !isQuote(effectiveStatus(i))));

  return (
    <div>
      <PageHeader eyebrow="Money" title="Invoices & Quotes" action={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => create("quote")}><FileSignature className="h-4 w-4" /> New quote</Button>
          <Button onClick={() => create("invoice")}><Plus className="h-4 w-4" /> New invoice</Button>
        </div>
      } />
      <div className="mb-4 flex gap-2">
        {(["all", "invoices", "quotes"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full border px-4 py-1.5 text-xs font-semibold capitalize transition-colors ${filter === f ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/25 text-muted-foreground hover:border-primary hover:text-primary"}`}>{f}</button>
        ))}
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Paid" value={money(sum((s) => s === "paid"))} />
        <StatCard label="Awaiting payment" value={money(sum((s) => s === "sent"))} />
        <StatCard label="Overdue" value={money(sum((s) => s === "overdue"))} />
      </div>
      {shown.length === 0 ? <Empty>{filter === "all" ? "Nothing here yet." : `No ${filter} yet.`}</Empty> : (
        <div className="overflow-x-auto rounded-md border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-cream text-left text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="p-3">Number</th><th className="p-3">Client</th><th className="p-3">Issued</th><th className="p-3">Due</th><th className="p-3 text-right">Total</th><th className="p-3">Status</th></tr></thead>
            <tbody>
              {shown.map((i) => (
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
