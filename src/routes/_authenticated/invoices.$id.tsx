import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { InvoiceDocument } from "@/components/InvoiceDocument";
import { logActivity, useRemove, useRows, useSave } from "@/lib/db";
import type { LineItem } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/invoices/$id")({
  head: () => ({ meta: [{ title: "Invoice — Nine3 Studio" }] }),
  component: InvoiceEditor,
});

const sel = "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm";

function InvoiceEditor() {
  const { id } = Route.useParams();
  const inv = (useRows("invoices", { eq: ["id", id] }).data ?? [])[0];
  const clients = useRows("clients", { order: "name", asc: true }).data ?? [];
  const save = useSave("invoices", "Invoice saved");
  const remove = useRemove("invoices");
  const navigate = useNavigate();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [v, setV] = useState<any>(null);
  useEffect(() => { if (inv) setV(inv); }, [inv]);
  if (!v) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const items: LineItem[] = v.items ?? [];
  const setItem = (i: number, k: keyof LineItem, val: string) => {
    const next = [...items]; next[i] = { ...(next[i] as LineItem), [k]: k === "description" ? val : Number(val) }; setV({ ...v, items: next });
  };
  const client = clients.find((c) => c.id === v.client_id);

  async function persist(extra: Record<string, unknown> = {}) {
    const { id, client_id, number, issue_date, due_date, status, items, notes, tax_rate, paid_at } = { ...v, ...extra };
    await save.mutateAsync({ id, client_id, number, issue_date, due_date, status, items, notes, tax_rate, paid_at });
    if (extra["status"] && client_id) await logActivity(client_id, `Invoice ${number} marked ${extra["status"]}`);
  }

  return (
    <div>
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link to="/invoices" className="text-xs text-muted-foreground hover:text-primary-soft">← All invoices</Link>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => window.print()}><Download className="h-4 w-4" /> Download PDF</Button>
          {v.status === "draft" && <Button variant="outline" onClick={() => persist({ status: "sent" })}>Mark sent</Button>}
          {v.status !== "paid" && <Button variant="outline" onClick={() => persist({ status: "paid", paid_at: new Date().toISOString().slice(0, 10) })}>Mark paid</Button>}
          <Button onClick={() => persist()}>Save</Button>
          <Button variant="ghost" onClick={async () => { if (confirm("Delete invoice?")) { await remove.mutateAsync(v.id); navigate({ to: "/invoices" }); } }}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <section className="no-print space-y-4 rounded-md border bg-card p-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Number</Label><Input value={v.number} onChange={(e) => setV({ ...v, number: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Status</Label><select className={sel} value={v.status} onChange={(e) => setV({ ...v, status: e.target.value })}>{["draft", "sent", "paid", "void"].map((s) => <option key={s}>{s}</option>)}</select></div>
          </div>
          <div className="space-y-1.5"><Label>Client</Label><select className={sel} value={v.client_id ?? ""} onChange={(e) => setV({ ...v, client_id: e.target.value || null })}><option value="">—</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>Issued</Label><Input type="date" value={v.issue_date ?? ""} onChange={(e) => setV({ ...v, issue_date: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Due</Label><Input type="date" value={v.due_date ?? ""} onChange={(e) => setV({ ...v, due_date: e.target.value || null })} /></div>
            <div className="space-y-1.5"><Label>VAT %</Label><Input type="number" value={v.tax_rate} onChange={(e) => setV({ ...v, tax_rate: Number(e.target.value) })} /></div>
          </div>
          <div className="space-y-2">
            <Label>Line items</Label>
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-[1fr_60px_90px_auto] gap-2">
                <Input value={it.description} onChange={(e) => setItem(i, "description", e.target.value)} />
                <Input type="number" value={it.quantity} onChange={(e) => setItem(i, "quantity", e.target.value)} />
                <Input type="number" step="0.01" value={it.rate} onChange={(e) => setItem(i, "rate", e.target.value)} />
                <button onClick={() => setV({ ...v, items: items.filter((_, k) => k !== i) })} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={() => setV({ ...v, items: [...items, { description: "", quantity: 1, rate: 0 }] })}><Plus className="h-4 w-4" /> Add line</Button>
          </div>
          <div className="space-y-1.5"><Label>Notes / payment details</Label><Textarea value={v.notes ?? ""} onChange={(e) => setV({ ...v, notes: e.target.value })} /></div>
        </section>
        <InvoiceDocument inv={{ ...v, items, client }} />
      </div>
    </div>
  );
}
