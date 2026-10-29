import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, ExternalLink, RefreshCw, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Empty, PageHeader, StatusBadge } from "@/components/common";
import { db, logActivity, openFile, uploadFile, useRemove, useRows, useSave } from "@/lib/db";
import { fmtDate, portalLink, randomToken } from "@/lib/format";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/clients/$id")({
  head: () => ({ meta: [{ title: "Client — Nine3 Studio" }] }),
  component: ClientDetail,
});

const sel = "h-9 rounded-md border border-input bg-transparent px-3 text-sm";

function ClientDetail() {
  const { id } = Route.useParams();
  const client = (useRows("clients", { eq: ["id", id] }).data ?? [])[0];
  if (!client) return <p className="text-sm text-muted-foreground">Loading…</p>;
  return (
    <div>
      <Link to="/clients" className="text-xs text-muted-foreground hover:text-primary-soft">← All clients</Link>
      <PageHeader eyebrow={client.portal_type === "sports" ? "Sports weekly client" : "Client"} title={client.name} subtitle={client.company ?? undefined} />
      <Tabs defaultValue="portal">
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="portal">Details & portal</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
          <TabsTrigger value="files">Proofs & files</TabsTrigger>
          {client.portal_type === "sports" && <TabsTrigger value="sports">Sports</TabsTrigger>}
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="portal"><PortalSettings client={client} /></TabsContent>
        <TabsContent value="onboarding"><Onboarding clientId={id} /></TabsContent>
        <TabsContent value="files"><Files clientId={id} /></TabsContent>
        <TabsContent value="sports"><Sports client={client} /></TabsContent>
        <TabsContent value="activity"><Activity clientId={id} /></TabsContent>
      </Tabs>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PortalSettings({ client }: { client: any }) {
  const save = useSave("clients", "Saved");
  const [v, setV] = useState(client);
  useEffect(() => setV(client), [client]);
  const link = v.access_method === "link" ? portalLink(v.portal_token) : `${typeof window !== "undefined" ? window.location.origin : ""}/portal`;
  const set = (k: string, val: unknown) => setV({ ...v, [k]: val });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="space-y-4 rounded-md border bg-card p-5">
        <h2 className="font-semibold text-primary-deep">Details</h2>
        {([["name", "Name"], ["company", "Company / club"], ["email", "Email"], ["phone", "Phone"]] as const).map(([k, l]) => (
          <div key={k} className="space-y-1.5"><Label>{l}</Label><Input value={v[k] ?? ""} onChange={(e) => set(k, e.target.value)} /></div>
        ))}
        <div className="space-y-1.5"><Label>Status</Label>
          <select className={sel + " w-full"} value={v.status} onChange={(e) => set("status", e.target.value)}>
            <option value="active">Active</option><option value="lead">Lead</option><option value="archived">Archived</option>
          </select>
        </div>
        <div className="space-y-1.5"><Label>Notes</Label><Textarea value={v.notes ?? ""} onChange={(e) => set("notes", e.target.value)} /></div>
      </section>
      <section className="space-y-4 rounded-md border bg-card p-5">
        <h2 className="font-semibold text-primary-deep">Client portal</h2>
        <div className="flex items-center justify-between"><Label>Portal enabled</Label><Switch checked={v.portal_enabled} onCheckedChange={(c) => set("portal_enabled", c)} /></div>
        <div className="space-y-1.5"><Label>Layout</Label>
          <select className={sel + " w-full"} value={v.portal_type} onChange={(e) => set("portal_type", e.target.value)}>
            <option value="standard">Standard client</option><option value="sports">Weekly sports graphics</option>
          </select>
        </div>
        <div className="space-y-1.5"><Label>Access method</Label>
          <select className={sel + " w-full"} value={v.access_method} onChange={(e) => set("access_method", e.target.value)}>
            <option value="link">Secure unique link</option><option value="email">Email sign-in</option>
          </select>
        </div>
        {v.access_method === "email" && (
          <div className="space-y-1.5"><Label>Sign-in email</Label><Input type="email" value={v.portal_email ?? ""} onChange={(e) => set("portal_email", e.target.value)} />
            <p className="text-xs text-muted-foreground">Client enters this email at the portal and receives a sign-in link.</p></div>
        )}
        <div className="space-y-1.5">
          <Label>Portal link</Label>
          <div className="flex gap-2">
            <Input readOnly value={link} className="text-xs" />
            <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(link); toast.success("Link copied"); }}><Copy className="h-4 w-4" /></Button>
            {v.access_method === "link" && <Button variant="outline" size="icon" asChild><a href={link} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a></Button>}
          </div>
          {v.access_method === "link" && (
            <Button variant="ghost" size="sm" onClick={() => { if (confirm("Regenerate link? The old link will stop working.")) save.mutate({ id: v.id, portal_token: randomToken() }); }}>
              <RefreshCw className="h-4 w-4" /> Regenerate link
            </Button>
          )}
        </div>
      </section>
      <div className="lg:col-span-2">
        <Button onClick={() => {
          const { id, name, company, email, phone, status, notes, portal_enabled, portal_type, access_method, portal_email } = v;
          save.mutate({ id, name, company, email, phone, status, notes, portal_enabled, portal_type, access_method, portal_email });
        }}>Save changes</Button>
      </div>
    </div>
  );
}

function Onboarding({ clientId }: { clientId: string }) {
  const items = useRows("onboarding_items", { eq: ["client_id", clientId], order: "position", asc: true }).data ?? [];
  const templates = useRows("templates", { eq: ["kind", "onboarding"] }).data ?? [];
  const save = useSave("onboarding_items");
  const remove = useRemove("onboarding_items");
  const qc = useQueryClient();
  const [title, setTitle] = useState("");

  async function applyTemplate(tid: string) {
    const t = templates.find((x) => x.id === tid);
    if (!t) return;
    const rows = (t.items as string[]).map((title, i) => ({ client_id: clientId, title, position: items.length + i }));
    const { error } = await db.from("onboarding_items").insert(rows);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries();
    toast.success(`Applied "${t.name}"`);
  }
  const doneCount = items.filter((i) => i.done).length;

  return (
    <section className="rounded-md border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-primary-deep">Onboarding checklist <span className="text-sm font-normal text-muted-foreground">({doneCount}/{items.length})</span></h2>
        <select className={sel} value="" onChange={(e) => applyTemplate(e.target.value)}>
          <option value="">Apply a template…</option>
          {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      {items.length === 0 && <Empty>No checklist yet. Apply a template or add items.</Empty>}
      <ul className="divide-y">
        {items.map((i) => (
          <li key={i.id} className="flex items-center gap-3 py-2 text-sm">
            <input type="checkbox" checked={i.done} onChange={(e) => save.mutate({ id: i.id, done: e.target.checked, done_at: e.target.checked ? new Date().toISOString() : null })} className="accent-primary" />
            <span className={i.done ? "text-muted-foreground line-through" : ""}>{i.title}</span>
            <button className="ml-auto text-muted-foreground hover:text-destructive" onClick={() => remove.mutate(i.id)}><Trash2 className="h-4 w-4" /></button>
          </li>
        ))}
      </ul>
      <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!title) return; save.mutate({ client_id: clientId, title, position: items.length }); setTitle(""); }}>
        <Input placeholder="Add checklist item" value={title} onChange={(e) => setTitle(e.target.value)} /><Button type="submit">Add</Button>
      </form>
    </section>
  );
}

const kinds = [
  { value: "proof", label: "Design proof (needs approval)" },
  { value: "deliverable", label: "Final deliverable" },
  { value: "template", label: "Weekly template" },
  { value: "completed", label: "Completed work (archive)" },
];

function Files({ clientId }: { clientId: string }) {
  const files = useRows("deliverables", { eq: ["client_id", clientId] }).data ?? [];
  const save = useSave("deliverables");
  const remove = useRemove("deliverables");
  const [kind, setKind] = useState("proof");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { toast.error("Choose a file"); return; }
    setBusy(true);
    try {
      const path = await uploadFile(clientId, file);
      await save.mutateAsync({ client_id: clientId, kind, title: title || file.name, file_path: path, file_name: file.name, status: kind === "proof" ? "pending" : "shared", week_of: new Date().toISOString().slice(0, 10) });
      await logActivity(clientId, `Studio shared ${kind}: ${title || file.name}`);
      setTitle(""); setFile(null);
      toast.success("Shared with client");
    } catch (err) { toast.error((err as Error).message); }
    setBusy(false);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="grid gap-3 rounded-md border bg-card p-5 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
        <div className="space-y-1.5"><Label>Type</Label><select className={sel + " w-full"} value={kind} onChange={(e) => setKind(e.target.value)}>{kinds.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</select></div>
        <div className="space-y-1.5"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Logo concepts v2" /></div>
        <div className="space-y-1.5"><Label>File</Label><Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
        <Button type="submit" disabled={busy}><Upload className="h-4 w-4" /> Share</Button>
      </form>
      {files.length === 0 ? <Empty>Nothing shared yet.</Empty> : (
        <div className="overflow-x-auto rounded-md border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-cream text-left text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="p-3">Title</th><th className="p-3">Type</th><th className="p-3">From</th><th className="p-3">Status</th><th className="p-3">Feedback</th><th className="p-3"></th></tr></thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.id} className="border-t align-top">
                  <td className="p-3"><button className="font-medium hover:text-primary-soft" onClick={() => f.file_path && openFile(f.file_path)}>{f.title}</button><p className="text-xs text-muted-foreground">{fmtDate(f.created_at)}</p></td>
                  <td className="p-3 capitalize">{f.kind}</td>
                  <td className="p-3 capitalize">{f.uploaded_by}</td>
                  <td className="p-3"><StatusBadge status={f.status} /></td>
                  <td className="max-w-xs whitespace-pre-wrap p-3 text-xs">{f.feedback}</td>
                  <td className="p-3 text-right"><button className="text-muted-foreground hover:text-destructive" onClick={() => confirm("Delete?") && remove.mutate(f.id)}><Trash2 className="h-4 w-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

type Kit = { primary?: string; secondary?: string; accent?: string; notes?: string };
const DEFAULT_GRAPHICS = ["Matchday", "Starting lineup", "Half-time score", "Full-time result"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Sports({ client }: { client: any }) {
  const save = useSave("clients", "Saved");
  const fixtures = useRows("sports_fixtures", { eq: ["client_id", client.id], order: "match_date", asc: true }).data ?? [];
  const saveFx = useSave("sports_fixtures");
  const removeFx = useRemove("sports_fixtures");
  const [home, setHome] = useState<Kit>(client.home_kit ?? {});
  const [away, setAway] = useState<Kit>(client.away_kit ?? {});
  const [fee, setFee] = useState(client.monthly_fee ?? "");
  const [fx, setFx] = useState({ match_date: "", opponent: "", venue: "home", competition: "" });

  const kitEditor = (label: string, k: Kit, set: (k: Kit) => void) => (
    <div className="space-y-3 rounded-md border bg-cream p-4">
      <p className="eyebrow">{label}</p>
      <div className="grid grid-cols-3 gap-2">
        {(["primary", "secondary", "accent"] as const).map((c) => (
          <label key={c} className="space-y-1 text-xs capitalize">{c}
            <input type="color" className="block h-10 w-full cursor-pointer rounded border" value={k[c] ?? "#404a3b"} onChange={(e) => set({ ...k, [c]: e.target.value })} />
          </label>
        ))}
      </div>
      <Input placeholder="Notes (e.g. white shorts, gold trim)" value={k.notes ?? ""} onChange={(e) => set({ ...k, notes: e.target.value })} />
    </div>
  );

  return (
    <div className="space-y-6">
      <section className="rounded-md border bg-card p-5">
        <h2 className="mb-4 font-semibold text-primary-deep">Team colours</h2>
        <div className="grid gap-4 md:grid-cols-2">{kitEditor("Home kit", home, setHome)}{kitEditor("Away kit", away, setAway)}</div>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="space-y-1.5"><Label>Monthly fee (£)</Label><Input type="number" step="0.01" value={fee} onChange={(e) => setFee(e.target.value)} className="w-40" /></div>
          <Button onClick={() => save.mutate({ id: client.id, home_kit: home, away_kit: away, monthly_fee: fee === "" ? null : Number(fee) })}>Save sports settings</Button>
        </div>
      </section>
      <section className="rounded-md border bg-card p-5">
        <h2 className="mb-4 font-semibold text-primary-deep">Matchday graphics to-do</h2>
        <form className="mb-4 grid gap-2 md:grid-cols-[auto_1fr_auto_1fr_auto]" onSubmit={(e) => {
          e.preventDefault();
          if (!fx.match_date || !fx.opponent) { toast.error("Date and opponent required"); return; }
          saveFx.mutate({ ...fx, client_id: client.id, graphics: DEFAULT_GRAPHICS.map((name) => ({ name, done: false })) });
          setFx({ match_date: "", opponent: "", venue: "home", competition: "" });
        }}>
          <Input type="date" value={fx.match_date} onChange={(e) => setFx({ ...fx, match_date: e.target.value })} />
          <Input placeholder="Opponent" value={fx.opponent} onChange={(e) => setFx({ ...fx, opponent: e.target.value })} />
          <select className={sel} value={fx.venue} onChange={(e) => setFx({ ...fx, venue: e.target.value })}><option value="home">Home</option><option value="away">Away</option></select>
          <Input placeholder="Competition" value={fx.competition} onChange={(e) => setFx({ ...fx, competition: e.target.value })} />
          <Button type="submit">Add fixture</Button>
        </form>
        {fixtures.length === 0 ? <Empty>No fixtures yet.</Empty> : (
          <ul className="space-y-3">
            {fixtures.map((f) => (
              <li key={f.id} className="rounded-md border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{fmtDate(f.match_date)} · vs {f.opponent} <span className="text-xs uppercase text-muted-foreground">({f.venue}{f.competition ? ` · ${f.competition}` : ""})</span></p>
                  <button className="text-muted-foreground hover:text-destructive" onClick={() => removeFx.mutate(f.id)}><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="mt-2 flex flex-wrap gap-3">
                  {(f.graphics as { name: string; done: boolean }[]).map((g, i) => (
                    <label key={i} className="flex items-center gap-1.5 text-sm">
                      <input type="checkbox" className="accent-primary" checked={g.done} onChange={(e) => {
                        const graphics = [...f.graphics]; graphics[i] = { ...g, done: e.target.checked };
                        saveFx.mutate({ id: f.id, graphics });
                      }} />{g.name}
                    </label>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Activity({ clientId }: { clientId: string }) {
  const rows = useRows("activity_log", { eq: ["client_id", clientId] }).data ?? [];
  return rows.length === 0 ? <Empty>No activity yet.</Empty> : (
    <ul className="divide-y rounded-md border bg-card">
      {rows.map((a) => <li key={a.id} className="flex justify-between gap-4 p-3 text-sm"><span><span className="capitalize text-muted-foreground">{a.actor}:</span> {a.message}</span><span className="text-xs text-muted-foreground">{fmtDate(a.created_at)}</span></li>)}
    </ul>
  );
}
