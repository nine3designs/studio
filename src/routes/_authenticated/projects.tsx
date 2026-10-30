import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { useState } from "react";
import { Copy, LayoutTemplate, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Empty, FormDialog, PageHeader, QuickForm, StatusBadge } from "@/components/common";
import { logActivity, useRemove, useRows, useSave } from "@/lib/db";
import { fmtDate, money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/projects")({
  head: () => ({ meta: [{ title: "Projects · Nine3 Studio" }] }),
  component: Projects,
});

function Projects() {
  const projects = useRows("projects", { select: "*, clients(name), milestones(*)" }).data ?? [];
  const clients = useRows("clients", { order: "name", asc: true }).data ?? [];
  const templates = useRows("templates", { eq: ["kind", "project"], order: "name", asc: true }).data ?? [];
  const save = useSave("projects", "Project saved");
  const saveMilestone = useSave("milestones");
  const remove = useRemove("projects");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editing, setEditing] = useState<any | null>(null);
  const [fromTpl, setFromTpl] = useState<{ name: string; client_id: string; due_date: string; template_id: string } | null>(null);
  const [filter, setFilter] = useState("active");

  const fields = [
    { name: "name", label: "Project name", required: true },
    { name: "client_id", label: "Client", type: "select" as const, options: clients.map((c) => ({ value: c.id, label: c.name })) },
    { name: "description", label: "Description", type: "textarea" as const },
    { name: "status", label: "Status", type: "select" as const, required: true, options: ["active", "on_hold", "completed"].map((s) => ({ value: s, label: s.replace("_", " ") })) },
    { name: "start_date", label: "Start date", type: "date" as const },
    { name: "due_date", label: "Due date", type: "date" as const },
    { name: "budget", label: "Budget (£)", type: "number" as const },
  ];
  const shown = projects.filter((p) => filter === "all" || p.status === filter);

  async function createFromTemplate(v: typeof fromTpl) {
    if (!v?.template_id || !v.name) return;
    const t = templates.find((x) => x.id === v.template_id);
    if (!t) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const proj = await save.mutateAsync({ name: v.name, client_id: v.client_id || null, description: t.description ?? null, status: "active", due_date: v.due_date || null });
    const items = (t.items ?? []) as string[];
    await Promise.all(items.map((title, i) => saveMilestone.mutateAsync({ project_id: proj.id, title, position: i })));
    if (proj.client_id) await logActivity(proj.client_id, `Project created from template: ${v.name}`);
    setFromTpl(null);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function duplicate(p: any) {
    const proj = await save.mutateAsync({ name: `${p.name} (copy)`, client_id: p.client_id, description: p.description, status: "active", start_date: null, due_date: null, budget: p.budget });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ms = [...(p.milestones ?? [])].sort((a: any, b: any) => a.position - b.position);
    await Promise.all(ms.map((m: any, i: number) => saveMilestone.mutateAsync({ project_id: proj.id, title: m.title, due_date: m.due_date, position: i })));
    toast.success("Project duplicated");
  }

  return (
    <div>
      <PageHeader eyebrow="Work" title="Projects" action={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setFromTpl({ name: "", client_id: "", due_date: "", template_id: templates[0]?.id ?? "" })}><LayoutTemplate className="h-4 w-4" /> New from template</Button>
          <Button onClick={() => setEditing({ status: "active" })}><Plus className="h-4 w-4" /> New project</Button>
        </div>
      } />
      <div className="mb-4 flex gap-2">
        {["active", "on_hold", "completed", "all"].map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="capitalize">{f.replace("_", " ")}</Button>
        ))}
      </div>
      <FormDialog title={editing?.id ? "Edit project" : "New project"} open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && <QuickForm fields={fields} initial={editing} onSubmit={async (v) => {
          const { clients: _c, milestones: _m, ...row } = v;
          await save.mutateAsync(row); setEditing(null);
        }} />}
      </FormDialog>
      <FormDialog title="New project from template" open={!!fromTpl} onOpenChange={(o) => !o && setFromTpl(null)}>
        {fromTpl && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); createFromTemplate(fromTpl); }}>
            <div className="space-y-1.5"><Label>Template</Label>
              <select required className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={fromTpl.template_id} onChange={(e) => setFromTpl({ ...fromTpl, template_id: e.target.value })}>
                <option value="">Choose a project template…</option>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}{t.items?.length ? ` (${t.items.length} milestones)` : ""}</option>)}
              </select>
              {templates.length === 0 && <p className="text-xs text-muted-foreground">No project templates yet · create one under Templates first.</p>}
            </div>
            <div className="space-y-1.5"><Label>Project name</Label><Input required value={fromTpl.name} onChange={(e) => setFromTpl({ ...fromTpl, name: e.target.value })} placeholder="e.g. OSG Home Solutions · Brand refresh" /></div>
            <div className="space-y-1.5"><Label>Client</Label><select className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={fromTpl.client_id} onChange={(e) => setFromTpl({ ...fromTpl, client_id: e.target.value })}><option value="">·</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div className="space-y-1.5"><Label>Due date</Label><Input type="date" value={fromTpl.due_date} onChange={(e) => setFromTpl({ ...fromTpl, due_date: e.target.value })} /></div>
            <Button type="submit" className="w-full">Create project</Button>
          </form>
        )}
      </FormDialog>
      {shown.length === 0 ? <Empty>No projects here.</Empty> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {shown.map((p) => <ProjectCard key={p.id} p={p} onEdit={() => setEditing(p)} onDelete={() => confirm("Delete project?") && remove.mutate(p.id)} onDuplicate={() => duplicate(p)} />)}
        </div>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ProjectCard({ p, onEdit, onDelete, onDuplicate }: { p: any; onEdit: () => void; onDelete: () => void; onDuplicate: () => void }) {
  const saveM = useSave("milestones");
  const removeM = useRemove("milestones");
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ms = [...(p.milestones ?? [])].sort((a: any, b: any) => a.position - b.position);
  const pct = ms.length ? Math.round((ms.filter((m) => m.done).length / ms.length) * 100) : 0;

  return (
    <div className="rounded-md border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{p.clients?.name ?? "Internal"}</p>
          <h3 className="mt-1 text-lg font-medium text-primary-deep">{p.name}</h3>
          <p className="text-xs text-muted-foreground">Due {fmtDate(p.due_date)}{p.budget ? ` · ${money(p.budget)}` : ""}</p>
        </div>
        <div className="flex items-center gap-2"><StatusBadge status={p.status} />
          <button title="Duplicate project" onClick={onDuplicate} className="text-muted-foreground hover:text-primary"><Copy className="h-4 w-4" /></button>
          <button onClick={onEdit} className="text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></button>
          <button onClick={onDelete} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>
      {p.description && <p className="mt-3 text-sm text-muted-foreground">{p.description}</p>}
      <div className="mt-4 flex items-center gap-3"><Progress value={pct} className="h-1.5" /><span className="text-xs text-muted-foreground">{pct}%</span></div>
      <ul className="mt-3 space-y-1.5">
        {ms.map((m) => (
          <li key={m.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="accent-primary" checked={m.done} onChange={(e) => saveM.mutate({ id: m.id, done: e.target.checked })} />
            <span className={m.done ? "text-muted-foreground line-through" : ""}>{m.title}</span>
            <span className="ml-auto text-xs text-muted-foreground">{m.due_date ? fmtDate(m.due_date) : ""}</span>
            <button onClick={() => removeM.mutate(m.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
          </li>
        ))}
      </ul>
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!title) return; saveM.mutate({ project_id: p.id, title, due_date: due || null, position: ms.length }); setTitle(""); setDue(""); }}>
        <Input placeholder="Add milestone" value={title} onChange={(e) => setTitle(e.target.value)} className="h-8" />
        <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="h-8 w-40" />
        <Button size="sm" type="submit">Add</Button>
      </form>
    </div>
  );
}
