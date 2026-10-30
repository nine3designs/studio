import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Empty, FormDialog, PageHeader, StatusBadge } from "@/components/common";
import { logActivity, useRemove, useRows, useSave } from "@/lib/db";
import { fmtDate, invoiceTotals, money, type LineItem } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/proposals")({
  head: () => ({ meta: [{ title: "Proposals & Contracts · Nine3 Studio" }] }),
  component: Proposals,
});

type Draft = { id?: string; kind: string; title: string; client_id: string | null; body: string; items: LineItem[]; status: string };
const sel = "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm";

function Proposals() {
  const rows = useRows("proposals", { select: "*, clients(name)" }).data ?? [];
  const clients = useRows("clients", { order: "name", asc: true }).data ?? [];
  const templates = (useRows("templates", { order: "name", asc: true }).data ?? []).filter((t) => t.kind === "proposal" || t.kind === "contract");
  const packages = (useRows("pricing_packages", { order: "price", asc: true }).data ?? []).filter((p) => p.active);
  const save = useSave("proposals", "Saved");
  const remove = useRemove("proposals");
  const [d, setD] = useState<Draft | null>(null);
  const [kind, setKind] = useState("all");
  const shown = rows.filter((r) => kind === "all" || r.kind === kind);

  const clientName = (id: string | null) => clients.find((c) => c.id === id)?.name ?? "";
  const setItem = (i: number, patch: Partial<LineItem>) => d && setD({ ...d, items: d.items.map((x, k) => (k === i ? { ...x, ...patch } : x)) });

  async function send(r: { id: string; client_id: string | null; kind: string; title: string }) {
    if (!r.client_id) { alert("Pick a client first."); return; }
    await save.mutateAsync({ id: r.id, status: "sent" });
    await logActivity(r.client_id, `Studio sent ${r.kind}: ${r.title}`);
  }

  return (
    <div>
      <PageHeader eyebrow="Sales" title="Proposals & Contracts" subtitle="Sent documents appear in the client's portal, where they can accept and sign." action={<Button onClick={() => setD({ kind: "proposal", title: "", client_id: null, body: "", items: [], status: "draft" })}><Plus className="h-4 w-4" /> New document</Button>} />
      <div className="mb-4 flex gap-2">
        {["all", "proposal", "contract"].map((k) => <Button key={k} size="sm" variant={kind === k ? "default" : "outline"} className="capitalize" onClick={() => setKind(k)}>{k === "all" ? "All" : k + "s"}</Button>)}
      </div>

      <FormDialog title={d?.id ? "Edit document" : "New document"} open={!!d} onOpenChange={(o) => !o && setD(null)}>
        {d && (
          <form className="space-y-4" onSubmit={async (e) => {
            e.preventDefault();
            await save.mutateAsync({ id: d.id, kind: d.kind, title: d.title, client_id: d.client_id, body: d.body, items: d.items.filter((i) => i.description) });
            setD(null);
          }}>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Type</Label><select className={sel} value={d.kind} onChange={(e) => setD({ ...d, kind: e.target.value })}><option value="proposal">Proposal</option><option value="contract">Contract</option></select></div>
              <div className="space-y-1.5"><Label>Client</Label><select className={sel} value={d.client_id ?? ""} onChange={(e) => setD({ ...d, client_id: e.target.value || null })}><option value="">·</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            </div>
            <div className="space-y-1.5"><Label>Title</Label><Input required value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} /></div>
            {templates.length > 0 && <div className="space-y-1.5"><Label>Start from a template</Label><select className={sel} value="" onChange={(e) => {
              const t = templates.find((x) => x.id === e.target.value);
              if (t) setD({ ...d, kind: t.kind, body: (t.body ?? "").replaceAll("{client}", clientName(d.client_id) || "{client}") });
            }}><option value="">Choose…</option>{templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>}
            <div className="space-y-1.5"><Label>Wording</Label><Textarea rows={8} value={d.body} onChange={(e) => setD({ ...d, body: e.target.value })} /></div>
            <div className="space-y-2">
              <div className="flex items-center justify-between"><Label>Pricing</Label>
                {packages.length > 0 && <select className="h-8 rounded-md border border-input bg-transparent px-2 text-xs" value="" onChange={(e) => {
                  const p = packages.find((x) => x.id === e.target.value);
                  if (p) setD({ ...d, items: [...d.items, { description: p.name, quantity: 1, rate: Number(p.price) }] });
                }}><option value="">+ Add package…</option>{packages.map((p) => <option key={p.id} value={p.id}>{p.name} ({money(p.price)})</option>)}</select>}
              </div>
              {d.items.map((it, i) => (
                <div key={i} className="grid grid-cols-[1fr_60px_90px_auto] gap-2">
                  <Input placeholder="Item" value={it.description} onChange={(e) => setItem(i, { description: e.target.value })} />
                  <Input type="number" value={it.quantity} onChange={(e) => setItem(i, { quantity: Number(e.target.value) })} />
                  <Input type="number" step="0.01" value={it.rate} onChange={(e) => setItem(i, { rate: Number(e.target.value) })} />
                  <button type="button" onClick={() => setD({ ...d, items: d.items.filter((_, k) => k !== i) })} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              <div className="flex justify-between"><Button type="button" size="sm" variant="outline" onClick={() => setD({ ...d, items: [...d.items, { description: "", quantity: 1, rate: 0 }] })}>Add line</Button><span className="text-sm font-medium">Total {money(invoiceTotals(d.items).total)}</span></div>
            </div>
            <Button type="submit" className="w-full">Save draft</Button>
          </form>
        )}
      </FormDialog>

      {shown.length === 0 ? <Empty>No documents yet.</Empty> : (
        <div className="overflow-x-auto rounded-md border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-cream text-left text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="p-3">Title</th><th className="p-3">Client</th><th className="p-3">Type</th><th className="p-3">Status</th><th className="p-3 text-right">Value</th><th className="p-3"></th></tr></thead>
            <tbody>{shown.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3"><p className="font-medium">{r.title}</p><p className="text-xs text-muted-foreground">{r.status === "accepted" ? `Signed by ${r.accepted_name} · ${fmtDate(r.accepted_at)}` : fmtDate(r.created_at)}</p></td>
                <td className="p-3">{r.clients?.name ?? "·"}</td>
                <td className="p-3 capitalize">{r.kind}</td>
                <td className="p-3"><StatusBadge status={r.status} /></td>
                <td className="p-3 text-right">{money(invoiceTotals(r.items).total)}</td>
                <td className="p-3"><div className="flex justify-end gap-2">
                  {r.status === "draft" && <Button size="sm" variant="outline" onClick={() => send(r)}><Send className="h-3.5 w-3.5" /> Send</Button>}
                  {r.status !== "accepted" && <select className="h-8 rounded-md border border-input bg-transparent px-2 text-xs" value={r.status} onChange={(e) => save.mutate({ id: r.id, status: e.target.value })}><option value="draft">Draft</option><option value="sent">Sent</option><option value="declined">Declined</option></select>}
                  <button onClick={() => setD({ id: r.id, kind: r.kind, title: r.title, client_id: r.client_id, body: r.body ?? "", items: r.items ?? [], status: r.status })} className="text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => confirm("Delete?") && remove.mutate(r.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
