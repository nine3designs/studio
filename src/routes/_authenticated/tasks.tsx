import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, FormDialog, PageHeader, QuickForm, StatusBadge } from "@/components/common";
import { useRemove, useRows, useSave } from "@/lib/db";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({ meta: [{ title: "Tasks · Nine3 Studio" }] }),
  component: Tasks,
});

const columns = [
  { key: "todo", label: "To do" },
  { key: "in_progress", label: "In progress" },
  { key: "done", label: "Done" },
];

function Tasks() {
  const tasks = useRows("tasks", { select: "*, projects(name), clients(name)", order: "due_date", asc: true }).data ?? [];
  const projects = useRows("projects").data ?? [];
  const clients = useRows("clients", { order: "name", asc: true }).data ?? [];
  const save = useSave("tasks");
  const remove = useRemove("tasks");
  const [view, setView] = useState<"board" | "list">("board");
  const [open, setOpen] = useState(false);

  const fields = [
    { name: "title", label: "Task", required: true },
    { name: "project_id", label: "Project", type: "select" as const, options: projects.map((p) => ({ value: p.id, label: p.name })) },
    { name: "client_id", label: "Client", type: "select" as const, options: clients.map((c) => ({ value: c.id, label: c.name })) },
    { name: "priority", label: "Priority", type: "select" as const, required: true, options: ["low", "normal", "high"].map((s) => ({ value: s, label: s })) },
    { name: "due_date", label: "Due date", type: "date" as const },
    { name: "notes", label: "Notes", type: "textarea" as const },
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Card = ({ t }: { t: any }) => (
    <div className="rounded-md border bg-card p-3 text-sm">
      <div className="flex items-start justify-between gap-2"><p className="font-medium">{t.title}</p>
        <button onClick={() => remove.mutate(t.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button></div>
      <p className="mt-1 text-xs text-muted-foreground">{[t.projects?.name, t.clients?.name].filter(Boolean).join(" · ")}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className={"text-xs " + (t.priority === "high" ? "text-destructive" : "text-muted-foreground")}>{t.priority} · {fmtDate(t.due_date)}</span>
        <select className="h-7 rounded border bg-transparent px-1 text-xs" value={t.status} onChange={(e) => save.mutate({ id: t.id, status: e.target.value })}>
          {columns.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader eyebrow="Work" title="Tasks" action={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setView(view === "board" ? "list" : "board")}>{view === "board" ? "List view" : "Board view"}</Button>
          <FormDialog title="New task" open={open} onOpenChange={setOpen} trigger={<Button><Plus className="h-4 w-4" /> New task</Button>}>
            <QuickForm fields={fields} initial={{ priority: "normal" }} onSubmit={async (v) => { await save.mutateAsync(v); setOpen(false); }} />
          </FormDialog>
        </div>
      } />
      {tasks.length === 0 ? <Empty>No tasks yet.</Empty> : view === "board" ? (
        <div className="grid gap-4 md:grid-cols-3">
          {columns.map((c) => (
            <div key={c.key} className="rounded-md bg-cream p-3">
              <p className="eyebrow mb-3">{c.label} ({tasks.filter((t) => t.status === c.key).length})</p>
              <div className="space-y-2">{tasks.filter((t) => t.status === c.key).map((t) => <Card key={t.id} t={t} />)}</div>
            </div>
          ))}
        </div>
      ) : (
        <ul className="divide-y rounded-md border bg-card">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center gap-3 p-3 text-sm">
              <input type="checkbox" className="accent-primary" checked={t.status === "done"} onChange={(e) => save.mutate({ id: t.id, status: e.target.checked ? "done" : "todo" })} />
              <span className={t.status === "done" ? "text-muted-foreground line-through" : ""}>{t.title}</span>
              <span className="text-xs text-muted-foreground">{t.projects?.name}</span>
              <span className="ml-auto text-xs text-muted-foreground">{fmtDate(t.due_date)}</span>
              <StatusBadge status={t.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
