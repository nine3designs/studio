import { useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Download, FileText, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Empty, StatusBadge } from "@/components/common";
import { supabase } from "@/integrations/supabase/client";
import { getPortal, portalAction } from "@/lib/portal.functions";
import { effectiveStatus, fmtDate, invoiceTotals, LOGO_URL, money, monthlyPayments, type LineItem } from "@/lib/format";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export function PortalView({ token }: { token: string | null }) {
  const fetchPortal = useServerFn(getPortal);
  const q = useQuery({ queryKey: ["portal", token], queryFn: () => fetchPortal({ data: { token } }), retry: false });
  if (q.isLoading) return <Shell><p className="py-20 text-center text-sm text-muted-foreground">Loading your portal…</p></Shell>;
  if (q.error) return <Shell><Empty>{(q.error as Error).message}</Empty></Shell>;
  const p = q.data!;
  return (
    <Shell name={p.client.company || p.client.name}>
      {p.client.portal_type === "sports" ? <SportsPortal p={p} token={token} /> : <StandardPortal p={p} token={token} />}
    </Shell>
  );
}

function Shell({ children, name }: { children: ReactNode; name?: string }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary-deep text-primary-foreground">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-6">
          <img src={LOGO_URL} alt="Nine3 Designs" className="h-14" />
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">Client portal</p>
        </div>
        {name && <div className="mx-auto max-w-5xl px-6 pb-8"><p className="text-sm opacity-70">Welcome,</p><h1 className="font-heading text-3xl font-semibold">{name}</h1></div>}
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}

function useAct(token: string | null) {
  const act = useServerFn(portalAction);
  const qc = useQueryClient();
  return async (action: Any, success?: string) => {
    try {
      const r = await act({ data: { token, action } });
      await qc.invalidateQueries({ queryKey: ["portal", token] });
      if (success) toast.success(success);
      return r;
    } catch (e) { toast.error((e as Error).message); return null; }
  };
}

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="rounded-md border bg-card p-5"><h2 className="mb-4 font-heading font-semibold text-primary-deep">{title}</h2>{children}</section>
);

/* ---------------- Standard portal ---------------- */
function StandardPortal({ p, token }: { p: Any; token: string | null }) {
  const proofs = p.deliverables.filter((d: Any) => d.kind === "proof");
  const pending = proofs.filter((d: Any) => d.status === "pending").length;
  return (
    <Tabs defaultValue="overview">
      <TabsList className="mb-6 flex-wrap">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="proofs">Proofs{pending ? ` (${pending})` : ""}</TabsTrigger>
        <TabsTrigger value="files">Files</TabsTrigger>
        <TabsTrigger value="invoices">Invoices</TabsTrigger>
        <TabsTrigger value="documents">Proposals & contracts</TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="grid gap-6 md:grid-cols-2">
        <OnboardingList p={p} token={token} />
        <Section title="Project progress">
          {p.projects.length === 0 ? <Empty>No projects yet.</Empty> : p.projects.map((pr: Any) => {
            const ms = [...(pr.milestones ?? [])].sort((a: Any, b: Any) => a.position - b.position);
            const pct = ms.length ? Math.round((ms.filter((m: Any) => m.done).length / ms.length) * 100) : 0;
            return (
              <div key={pr.id} className="mb-5 last:mb-0">
                <div className="flex justify-between gap-2"><p className="font-medium">{pr.name}</p><StatusBadge status={pr.status} /></div>
                <div className="mt-2 flex items-center gap-3"><Progress value={pct} className="h-1.5" /><span className="text-xs text-muted-foreground">{pct}%</span></div>
                <ul className="mt-2 space-y-1 text-sm">
                  {ms.map((m: Any) => <li key={m.id} className="flex items-center gap-2"><Check className={`h-3.5 w-3.5 ${m.done ? "text-success" : "text-muted-foreground/30"}`} /><span className={m.done ? "text-muted-foreground" : ""}>{m.title}</span><span className="ml-auto text-xs text-muted-foreground">{m.due_date ? fmtDate(m.due_date) : ""}</span></li>)}
                </ul>
              </div>
            );
          })}
        </Section>
      </TabsContent>
      <TabsContent value="proofs"><Proofs proofs={proofs} token={token} /></TabsContent>
      <TabsContent value="files" className="space-y-6">
        <UploadBox token={token} kind="upload" label="Send us files (brand assets, copy, photos)" />
        <FileGrid files={p.deliverables.filter((d: Any) => d.kind !== "proof")} />
      </TabsContent>
      <TabsContent value="invoices"><Invoices invoices={p.invoices} /></TabsContent>
      <TabsContent value="documents"><Documents docs={p.proposals} token={token} /></TabsContent>
    </Tabs>
  );
}

function OnboardingList({ p, token }: { p: Any; token: string | null }) {
  const act = useAct(token);
  const items = p.onboarding;
  const pct = items.length ? Math.round((items.filter((i: Any) => i.done).length / items.length) * 100) : 0;
  return (
    <Section title="Onboarding checklist">
      {items.length === 0 ? <Empty>Nothing to do here yet.</Empty> : <>
        <div className="mb-3 flex items-center gap-3"><Progress value={pct} className="h-1.5" /><span className="text-xs text-muted-foreground">{pct}%</span></div>
        <ul className="space-y-2">
          {items.map((i: Any) => (
            <li key={i.id}><label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1 accent-primary" checked={i.done} onChange={(e) => act({ type: "onboarding", id: i.id, done: e.target.checked })} />
              <span><span className={i.done ? "text-muted-foreground line-through" : ""}>{i.title}</span>{i.description && <span className="block text-xs text-muted-foreground">{i.description}</span>}</span>
            </label></li>
          ))}
        </ul>
      </>}
    </Section>
  );
}

function Proofs({ proofs, token }: { proofs: Any[]; token: string | null }) {
  if (proofs.length === 0) return <Empty>No designs waiting for review.</Empty>;
  return <div className="grid gap-6 md:grid-cols-2">{proofs.map((f) => <ProofCard key={f.id} f={f} token={token} />)}</div>;
}

function ProofCard({ f, token }: { f: Any; token: string | null }) {
  const act = useAct(token);
  const [fb, setFb] = useState("");
  const [revising, setRevising] = useState(false);
  return (
    <div className="overflow-hidden rounded-md border bg-card">
      <Preview f={f} />
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2"><div><p className="font-medium">{f.title}</p><p className="text-xs text-muted-foreground">{fmtDate(f.created_at)}</p></div><StatusBadge status={f.status} /></div>
        {f.feedback && <p className="whitespace-pre-wrap rounded bg-cream p-2 text-xs">Your notes: {f.feedback}</p>}
        {f.status === "pending" && (revising ? (
          <div className="space-y-2">
            <Textarea rows={3} placeholder="What would you like changed?" value={fb} onChange={(e) => setFb(e.target.value)} />
            <div className="flex gap-2"><Button size="sm" onClick={async () => { if (await act({ type: "proof", id: f.id, decision: "revision", feedback: fb }, "Feedback sent")) setRevising(false); }}>Send feedback</Button><Button size="sm" variant="ghost" onClick={() => setRevising(false)}>Cancel</Button></div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => confirm("Approve this design?") && act({ type: "proof", id: f.id, decision: "approved" }, "Design approved — thank you!")}><Check className="h-4 w-4" /> Approve</Button>
            <Button size="sm" variant="outline" onClick={() => setRevising(true)}>Request changes</Button>
          </div>
        ))}
      </div>
    </div>
  );
}

const isImage = (n?: string | null) => !!n && /\.(png|jpe?g|gif|webp|svg)$/i.test(n);

function Preview({ f }: { f: Any }) {
  if (f.url && isImage(f.file_name)) return <a href={f.url} target="_blank" rel="noreferrer"><img src={f.url} alt={f.title} className="aspect-[4/3] w-full bg-cream object-contain" /></a>;
  return <a href={f.url ?? "#"} target="_blank" rel="noreferrer" className="flex aspect-[4/3] items-center justify-center bg-cream text-muted-foreground"><FileText className="h-10 w-10" /></a>;
}

function FileGrid({ files, empty = "No files yet." }: { files: Any[]; empty?: string }) {
  if (files.length === 0) return <Empty>{empty}</Empty>;
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {files.map((f) => (
        <div key={f.id} className="overflow-hidden rounded-md border bg-card">
          <Preview f={f} />
          <div className="flex items-center justify-between gap-2 p-2">
            <div className="min-w-0"><p className="truncate text-sm">{f.title}</p><p className="text-xs text-muted-foreground">{f.uploaded_by === "client" ? "From you" : "From Nine3"} · {fmtDate(f.created_at)}</p></div>
            {f.url && <a href={f.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary"><Download className="h-4 w-4" /></a>}
          </div>
        </div>
      ))}
    </div>
  );
}

function UploadBox({ token, kind, label }: { token: string | null; kind: "upload" | "resource"; label: string }) {
  const act = useAct(token);
  const [files, setFiles] = useState<FileList | null>(null);
  const [busy, setBusy] = useState(false);
  async function go(e: React.FormEvent) {
    e.preventDefault();
    if (!files?.length) return;
    setBusy(true);
    for (const file of Array.from(files)) {
      const r = (await act({ type: "uploadUrl", fileName: file.name })) as { path: string; uploadToken: string } | null;
      if (!r) break;
      const { error } = await supabase.storage.from("files").uploadToSignedUrl(r.path, r.uploadToken, file);
      if (error) { toast.error(error.message); break; }
      await act({ type: "recordUpload", path: r.path, fileName: file.name, kind });
    }
    toast.success("Uploaded — thank you!");
    setFiles(null); (e.target as HTMLFormElement).reset();
    setBusy(false);
  }
  return (
    <form onSubmit={go} className="flex flex-wrap items-end gap-3 rounded-md border border-dashed bg-card p-5">
      <div className="min-w-60 flex-1 space-y-1.5"><p className="text-sm font-medium">{label}</p><Input type="file" multiple onChange={(e) => setFiles(e.target.files)} /></div>
      <Button type="submit" disabled={busy || !files?.length}><Upload className="h-4 w-4" /> {busy ? "Uploading…" : "Upload"}</Button>
    </form>
  );
}

function Invoices({ invoices }: { invoices: Any[] }) {
  if (invoices.length === 0) return <Empty>No invoices yet.</Empty>;
  return (
    <div className="overflow-x-auto rounded-md border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-cream text-left text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="p-3">Invoice</th><th className="p-3">Issued</th><th className="p-3">Due</th><th className="p-3">Status</th><th className="p-3 text-right">Total</th></tr></thead>
        <tbody>{invoices.map((i) => (
          <tr key={i.id} className="border-t"><td className="p-3 font-medium">{i.number}</td><td className="p-3">{fmtDate(i.issue_date)}</td><td className="p-3">{fmtDate(i.due_date)}</td><td className="p-3"><StatusBadge status={effectiveStatus(i)} /></td><td className="p-3 text-right">{money(invoiceTotals(i.items as LineItem[], i.tax_rate).total)}</td></tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function Documents({ docs, token }: { docs: Any[]; token: string | null }) {
  if (docs.length === 0) return <Empty>No proposals or contracts yet.</Empty>;
  return <div className="space-y-6">{docs.map((d) => <DocCard key={d.id} d={d} token={token} />)}</div>;
}

function DocCard({ d, token }: { d: Any; token: string | null }) {
  const act = useAct(token);
  const [name, setName] = useState("");
  const items = (d.items ?? []) as LineItem[];
  const total = invoiceTotals(items).total;
  return (
    <div className="rounded-md border bg-card p-6">
      <div className="flex items-start justify-between gap-3"><div><p className="eyebrow capitalize">{d.kind}</p><h3 className="mt-1 font-heading text-xl font-semibold text-primary-deep">{d.title}</h3></div><StatusBadge status={d.status} /></div>
      {d.body && <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{d.body}</p>}
      {items.length > 0 && (
        <table className="mt-4 w-full text-sm"><tbody>
          {items.map((i, k) => <tr key={k} className="border-t"><td className="py-2">{i.description}</td><td className="py-2 text-right text-muted-foreground">{i.quantity} × {money(i.rate)}</td><td className="py-2 text-right">{money(i.quantity * i.rate)}</td></tr>)}
          <tr className="border-t font-semibold"><td className="py-2" colSpan={2}>Total</td><td className="py-2 text-right">{money(total)}</td></tr>
        </tbody></table>
      )}
      {d.status === "accepted" ? <p className="mt-4 text-sm text-success">Accepted by {d.accepted_name} on {fmtDate(d.accepted_at)}</p> : d.status === "sent" && (
        <div className="mt-5 flex flex-wrap items-end gap-2 border-t pt-4">
          <div className="flex-1 space-y-1"><p className="text-xs text-muted-foreground">Type your full name to accept and sign</p><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" /></div>
          <Button onClick={() => act({ type: "accept", id: d.id, name }, "Accepted — thank you!")}>Accept & sign</Button>
        </div>
      )}
    </div>
  );
}

/* ---------------- Sports weekly portal ---------------- */
function SportsPortal({ p, token }: { p: Any; token: string | null }) {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = p.fixtures.filter((f: Any) => f.match_date >= today);
  const past = p.fixtures.filter((f: Any) => f.match_date < today).reverse();
  const templates = p.deliverables.filter((d: Any) => d.kind === "template");
  const resources = p.deliverables.filter((d: Any) => d.uploaded_by === "client");
  const archive = p.deliverables.filter((d: Any) => d.kind === "completed" || d.kind === "deliverable" || (d.kind === "proof" && d.status === "approved"));
  const proofs = p.deliverables.filter((d: Any) => d.kind === "proof" && d.status !== "approved");
  const months = monthlyPayments(p.invoices);

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2">
        <Kit label="Home kit" k={p.client.home_kit} />
        <Kit label="Away kit" k={p.client.away_kit} />
      </div>

      <Section title="Matchday graphics to-do">
        {upcoming.length === 0 ? <Empty>No upcoming fixtures.</Empty> : <ul className="space-y-3">{upcoming.map((f: Any) => <Fixture key={f.id} f={f} />)}</ul>}
      </Section>

      {proofs.length > 0 && <Section title="Graphics to review"><Proofs proofs={proofs} token={token} /></Section>}

      <Section title="Weekly templates"><FileGrid files={templates} empty="No templates shared yet." /></Section>

      <Section title="Resource photos">
        <div className="space-y-4">
          <UploadBox token={token} kind="resource" label="Upload player photos, sponsor logos or match photos" />
          <FileGrid files={resources} empty="No photos uploaded yet." />
        </div>
      </Section>

      <Section title="Completed work archive">
        <FileGrid files={archive} empty="Finished graphics will appear here." />
        {past.length > 0 && <ul className="mt-4 space-y-2">{past.map((f: Any) => <Fixture key={f.id} f={f} />)}</ul>}
      </Section>

      <Section title="Monthly payments">
        {p.client.monthly_fee && <p className="mb-3 text-sm text-muted-foreground">Monthly package: <span className="font-medium text-foreground">{money(p.client.monthly_fee)}</span></p>}
        {months.length === 0 ? <Empty>No invoices yet.</Empty> : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="py-2">Month</th><th className="py-2 text-right">Billed</th><th className="py-2 text-right">Paid</th><th className="py-2 text-right">Owed</th></tr></thead>
            <tbody>{months.map((m) => (
              <tr key={m.month} className="border-t"><td className="py-2">{new Date(m.month + "-01T00:00:00").toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</td><td className="py-2 text-right">{money(m.billed)}</td><td className="py-2 text-right text-success">{money(m.paid)}</td><td className={`py-2 text-right ${m.owed ? "font-semibold text-destructive" : ""}`}>{money(m.owed)}</td></tr>
            ))}</tbody>
          </table>
        )}
      </Section>
    </div>
  );
}

function Kit({ label, k }: { label: string; k: Any }) {
  const cols = (["primary", "secondary", "accent"] as const).filter((c) => k?.[c]);
  return (
    <div className="rounded-md border bg-card p-5">
      <p className="eyebrow mb-3">{label}</p>
      {cols.length === 0 ? <p className="text-sm text-muted-foreground">Not set yet.</p> : (
        <div className="flex gap-3">{cols.map((c) => (
          <div key={c} className="text-center"><div className="h-14 w-14 rounded-md border" style={{ background: k[c] }} /><p className="mt-1 text-xs capitalize text-muted-foreground">{c}</p><p className="text-[10px] uppercase text-muted-foreground">{k[c]}</p></div>
        ))}</div>
      )}
      {k?.notes && <p className="mt-3 text-sm text-muted-foreground">{k.notes}</p>}
    </div>
  );
}

function Fixture({ f }: { f: Any }) {
  const g = (f.graphics ?? []) as { name: string; done: boolean }[];
  const done = g.filter((x) => x.done).length;
  return (
    <li className="rounded-md border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">{fmtDate(f.match_date)} · vs {f.opponent} <span className="text-xs uppercase text-muted-foreground">({f.venue}{f.competition ? ` · ${f.competition}` : ""})</span></p>
        <span className="text-xs text-muted-foreground">{done}/{g.length} ready</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">{g.map((x, i) => (
        <span key={i} className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${x.done ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>{x.done && <Check className="h-3 w-3" />}{x.name}</span>
      ))}</div>
    </li>
  );
}
