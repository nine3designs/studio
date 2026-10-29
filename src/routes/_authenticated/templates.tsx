import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Empty, FormDialog, PageHeader } from "@/components/common";
import { useRemove, useRows, useSave } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/templates")({
  head: () => ({ meta: [{ title: "Templates — Nine3 Studio" }] }),
  component: Templates,
});

export const DOC_KINDS = [
  { value: "proposal", label: "Proposal" },
  { value: "contract", label: "Contract" },
  { value: "email", label: "Email" },
  { value: "brief", label: "Brief / questionnaire" },
];

type Draft = { id?: string; kind: string; name: string; description: string; body: string };

function Templates() {
  const all = useRows("templates", { order: "name", asc: true }).data ?? [];
  const rows = all.filter((t) => t.kind !== "onboarding");
  const save = useSave("templates", "Template saved");
  const remove = useRemove("templates");
  const [editing, setEditing] = useState<Draft | null>(null);
  const [kind, setKind] = useState("all");
  const shown = rows.filter((r) => kind === "all" || r.kind === kind);

  return (
    <div>
      <PageHeader eyebrow="Library" title="Templates" subtitle="Reusable proposal, contract and email wording. Onboarding checklists live under Onboarding." action={<Button onClick={() => setEditing({ kind: "proposal", name: "", description: "", body: "" })}><Plus className="h-4 w-4" /> New template</Button>} />
      <div className="mb-4 flex flex-wrap gap-2">
        {[{ value: "all", label: "All" }, ...DOC_KINDS].map((k) => <Button key={k.value} size="sm" variant={kind === k.value ? "default" : "outline"} onClick={() => setKind(k.value)}>{k.label}</Button>)}
      </div>
      <FormDialog title={editing?.id ? "Edit template" : "New template"} open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && (
          <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); await save.mutateAsync({ ...editing, description: editing.description || null }); setEditing(null); }}>
            <div className="space-y-1.5"><Label>Type</Label><select className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={editing.kind} onChange={(e) => setEditing({ ...editing, kind: e.target.value })}>{DOC_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</select></div>
            <div className="space-y-1.5"><Label>Name</Label><Input required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Description</Label><Input value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Wording</Label><Textarea rows={12} value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} placeholder="Use {client} where the client's name should go." /></div>
            <Button type="submit" className="w-full">Save</Button>
          </form>
        )}
      </FormDialog>
      {shown.length === 0 ? <Empty>No templates here yet.</Empty> : (
        <div className="grid gap-4 md:grid-cols-2">
          {shown.map((t) => (
            <div key={t.id} className="rounded-md border bg-card p-5">
              <div className="flex items-start justify-between gap-2">
                <div><p className="eyebrow">{DOC_KINDS.find((k) => k.value === t.kind)?.label ?? t.kind}</p><h3 className="mt-1 font-semibold text-primary-deep">{t.name}</h3>{t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}</div>
                <div className="flex gap-2">
                  <button title="Copy wording" onClick={() => { navigator.clipboard.writeText(t.body ?? ""); toast.success("Copied"); }} className="text-muted-foreground hover:text-primary"><Copy className="h-4 w-4" /></button>
                  <button onClick={() => setEditing({ id: t.id, kind: t.kind, name: t.name, description: t.description ?? "", body: t.body ?? "" })} className="text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => confirm("Delete template?") && remove.mutate(t.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              {t.body && <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm text-muted-foreground">{t.body}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
