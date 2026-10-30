import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Empty, FormDialog, PageHeader } from "@/components/common";
import { useRemove, useRows, useSave } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Onboarding · Nine3 Studio" }] }),
  component: Onboarding,
});

function Onboarding() {
  const templates = useRows("templates", { eq: ["kind", "onboarding"], order: "name", asc: true }).data ?? [];
  const clients = useRows("clients", { select: "id, name, status, onboarding_items(done)", order: "name", asc: true }).data ?? [];
  const save = useSave("templates", "Template saved");
  const remove = useRemove("templates");
  const [editing, setEditing] = useState<{ id?: string; name: string; description: string; items: string } | null>(null);

  const inProgress = clients.filter((c) => c.onboarding_items?.length && c.onboarding_items.some((i: { done: boolean }) => !i.done));

  return (
    <div>
      <PageHeader eyebrow="Clients" title="Onboarding" subtitle="Checklist templates you can apply to any client from their page." action={<Button onClick={() => setEditing({ name: "", description: "", items: "" })}><Plus className="h-4 w-4" /> New checklist</Button>} />
      <FormDialog title={editing?.id ? "Edit checklist" : "New checklist"} open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && (
          <form className="space-y-4" onSubmit={async (e) => {
            e.preventDefault();
            await save.mutateAsync({ id: editing.id, kind: "onboarding", name: editing.name, description: editing.description || null, items: editing.items.split("\n").map((s) => s.trim()).filter(Boolean) });
            setEditing(null);
          }}>
            <div className="space-y-1.5"><Label>Name</Label><Input required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="e.g. Brand identity onboarding" /></div>
            <div className="space-y-1.5"><Label>Description</Label><Input value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Steps (one per line)</Label><Textarea rows={8} value={editing.items} onChange={(e) => setEditing({ ...editing, items: e.target.value })} placeholder={"Sign contract\nPay deposit\nComplete brand questionnaire\nUpload existing logos"} /></div>
            <Button type="submit" className="w-full">Save</Button>
          </form>
        )}
      </FormDialog>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="grid gap-4 md:grid-cols-2">
          {templates.length === 0 ? <div className="md:col-span-2"><Empty>No checklist templates yet.</Empty></div> : templates.map((t) => (
            <div key={t.id} className="rounded-md border bg-card p-5">
              <div className="flex items-start justify-between gap-2">
                <div><h3 className="font-semibold text-primary-deep">{t.name}</h3>{t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}</div>
                <div className="flex gap-2">
                  <button onClick={() => setEditing({ id: t.id, name: t.name, description: t.description ?? "", items: (t.items ?? []).join("\n") })} className="text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => confirm("Delete template?") && remove.mutate(t.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">{(t.items ?? []).map((s: string, i: number) => <li key={i}>{s}</li>)}</ol>
            </div>
          ))}
        </div>
        <section className="rounded-md border bg-card p-5">
          <h2 className="mb-4 font-semibold text-primary-deep">Clients onboarding now</h2>
          {inProgress.length === 0 ? <p className="text-sm text-muted-foreground">Nobody mid-onboarding.</p> : (
            <ul className="space-y-4">{inProgress.map((c) => {
              const done = c.onboarding_items.filter((i: { done: boolean }) => i.done).length;
              const pct = Math.round((done / c.onboarding_items.length) * 100);
              return (
                <li key={c.id}>
                  <Link to="/clients/$id" params={{ id: c.id }} className="text-sm font-medium hover:text-primary">{c.name}</Link>
                  <div className="mt-1 flex items-center gap-2"><Progress value={pct} className="h-1.5" /><span className="text-xs text-muted-foreground">{done}/{c.onboarding_items.length}</span></div>
                </li>
              );
            })}</ul>
          )}
        </section>
      </div>
    </div>
  );
}
