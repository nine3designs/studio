import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Empty, FormDialog, PageHeader, QuickForm } from "@/components/common";
import { useRemove, useRows, useSave } from "@/lib/db";
import { money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/pricing")({
  head: () => ({ meta: [{ title: "Pricing · Nine3 Studio" }] }),
  component: Pricing,
});

const BILLING = [{ value: "one-off", label: "One-off" }, { value: "monthly", label: "Per month" }, { value: "hourly", label: "Per hour" }, { value: "per-item", label: "Per item" }];
const suffix: Record<string, string> = { monthly: " / month", hourly: " / hour", "per-item": " each" };

function Pricing() {
  const rows = useRows("pricing_packages", { order: "price", asc: true }).data ?? [];
  const save = useSave("pricing_packages", "Package saved");
  const remove = useRemove("pricing_packages");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editing, setEditing] = useState<any | null>(null);
  const [features, setFeatures] = useState("");

  const open = (r: Record<string, unknown>) => { setFeatures(((r["features"] as string[]) ?? []).join("\n")); setEditing(r); };
  const fields = [
    { name: "name", label: "Package name", required: true },
    { name: "price", label: "Price (£)", type: "number" as const, required: true },
    { name: "billing", label: "Billing", type: "select" as const, required: true, options: BILLING },
    { name: "description", label: "Short description", type: "textarea" as const },
  ];

  return (
    <div>
      <PageHeader eyebrow="Sales" title="Pricing" subtitle="Your packages · pull them into proposals with one click." action={<Button onClick={() => open({ billing: "one-off", active: true })}><Plus className="h-4 w-4" /> New package</Button>} />
      <FormDialog title={editing?.id ? "Edit package" : "New package"} open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && <>
          <div className="mb-4 space-y-1.5"><Label>What's included (one per line)</Label><Textarea rows={5} value={features} onChange={(e) => setFeatures(e.target.value)} /></div>
          <QuickForm fields={fields} initial={editing} onSubmit={async (v) => {
            await save.mutateAsync({ ...v, features: features.split("\n").map((s) => s.trim()).filter(Boolean) }); setEditing(null);
          }} />
        </>}
      </FormDialog>
      {rows.length === 0 ? <Empty>No packages yet.</Empty> : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <div key={r.id} className={`flex flex-col rounded-md border bg-card p-6 ${r.active ? "" : "opacity-50"}`}>
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-lg font-semibold text-primary-deep">{r.name}</h3>
                <div className="flex gap-2">
                  <button onClick={() => open(r)} className="text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => confirm("Delete package?") && remove.mutate(r.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <p className="mt-2 text-3xl font-light text-primary-deep">{money(r.price)}<span className="text-sm text-muted-foreground">{suffix[r.billing] ?? ""}</span></p>
              {r.description && <p className="mt-2 text-sm text-muted-foreground">{r.description}</p>}
              <ul className="mt-4 flex-1 space-y-1.5">{(r.features ?? []).map((f: string, i: number) => <li key={i} className="flex gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{f}</li>)}</ul>
              <label className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" className="accent-primary" checked={r.active} onChange={(e) => save.mutate({ id: r.id, active: e.target.checked })} /> Offered</label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
