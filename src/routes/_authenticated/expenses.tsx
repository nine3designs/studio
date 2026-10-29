import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Paperclip, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Empty, FormDialog, PageHeader, QuickForm, StatCard } from "@/components/common";
import { openFile, uploadFile, useRemove, useRows, useSave } from "@/lib/db";
import { fmtDate, money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/expenses")({
  head: () => ({ meta: [{ title: "Expenses — Nine3 Studio" }] }),
  component: Expenses,
});

const CATEGORIES = ["General", "Software", "Stock & fonts", "Equipment", "Printing", "Travel", "Marketing", "Training"];

function Expenses() {
  const rows = useRows("expenses", { select: "*, projects(name)", order: "spent_on" }).data ?? [];
  const projects = useRows("projects", { order: "name", asc: true }).data ?? [];
  const save = useSave("expenses", "Expense saved");
  const remove = useRemove("expenses");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editing, setEditing] = useState<any | null>(null);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  const shown = rows.filter((r) => !month || r.spent_on.startsWith(month));
  const total = shown.reduce((s, r) => s + Number(r.amount), 0);
  const year = new Date().getFullYear().toString();
  const yearTotal = rows.filter((r) => r.spent_on.startsWith(year)).reduce((s, r) => s + Number(r.amount), 0);
  const byCat = Object.entries(shown.reduce<Record<string, number>>((m, r) => ({ ...m, [r.category]: (m[r.category] ?? 0) + Number(r.amount) }), {})).sort((a, b) => b[1] - a[1]);

  const fields = [
    { name: "description", label: "Description", required: true },
    { name: "amount", label: "Amount (£)", type: "number" as const, required: true },
    { name: "spent_on", label: "Date", type: "date" as const, required: true },
    { name: "category", label: "Category", type: "select" as const, required: true, options: CATEGORIES.map((c) => ({ value: c, label: c })) },
    { name: "vendor", label: "Supplier" },
    { name: "project_id", label: "Project (optional)", type: "select" as const, options: projects.map((p) => ({ value: p.id, label: p.name })) },
  ];

  return (
    <div>
      <PageHeader eyebrow="Money" title="Expenses" action={<Button onClick={() => { setReceipt(null); setEditing({ category: "General", spent_on: new Date().toISOString().slice(0, 10) }); }}><Plus className="h-4 w-4" /> Add expense</Button>} />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard label="This view" value={money(total)} hint={`${shown.length} expenses`} />
        <StatCard label={`Total ${year}`} value={money(yearTotal)} />
        <div className="rounded-md border bg-card p-5"><p className="eyebrow mb-2">By category</p>{byCat.length === 0 ? <p className="text-sm text-muted-foreground">—</p> : byCat.slice(0, 4).map(([c, v]) => <p key={c} className="flex justify-between text-sm"><span>{c}</span><span>{money(v)}</span></p>)}</div>
      </div>
      <div className="mb-4 flex items-end gap-3">
        <div className="space-y-1.5"><Label>Month</Label><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-48" /></div>
        <Button variant="outline" size="sm" onClick={() => setMonth("")}>Show all</Button>
      </div>
      <FormDialog title={editing?.id ? "Edit expense" : "Add expense"} open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && <>
          <div className="mb-4 space-y-1.5"><Label>Receipt</Label><Input type="file" onChange={(e) => setReceipt(e.target.files?.[0] ?? null)} />{editing.receipt_path && <p className="text-xs text-muted-foreground">A receipt is attached — choose a file to replace it.</p>}</div>
          <QuickForm fields={fields} initial={editing} onSubmit={async (v) => {
            const { projects: _p, ...row } = v;
            try { if (receipt) row["receipt_path"] = await uploadFile("expenses", receipt); } catch (e) { toast.error((e as Error).message); return; }
            await save.mutateAsync(row); setEditing(null);
          }} />
        </>}
      </FormDialog>
      {shown.length === 0 ? <Empty>No expenses for this period.</Empty> : (
        <div className="overflow-x-auto rounded-md border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-cream text-left text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="p-3">Date</th><th className="p-3">Description</th><th className="p-3">Category</th><th className="p-3">Project</th><th className="p-3 text-right">Amount</th><th className="p-3"></th></tr></thead>
            <tbody>{shown.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3">{fmtDate(r.spent_on)}</td>
                <td className="p-3"><p className="font-medium">{r.description}</p>{r.vendor && <p className="text-xs text-muted-foreground">{r.vendor}</p>}</td>
                <td className="p-3">{r.category}</td>
                <td className="p-3 text-muted-foreground">{r.projects?.name ?? "—"}</td>
                <td className="p-3 text-right">{money(r.amount)}</td>
                <td className="p-3"><div className="flex justify-end gap-2">
                  {r.receipt_path && <button title="Receipt" onClick={() => openFile(r.receipt_path)} className="text-muted-foreground hover:text-primary"><Paperclip className="h-4 w-4" /></button>}
                  <button onClick={() => { setReceipt(null); setEditing(r); }} className="text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => confirm("Delete expense?") && remove.mutate(r.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
