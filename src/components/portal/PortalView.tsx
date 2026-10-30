import { useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, Check, ChevronDown, ClipboardList, Download, FileText, Heart, HelpCircle, Menu, PartyPopper, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  if (q.isLoading) return <Shell><PortalLoader /></Shell>;
  if (q.error) return <Shell><Empty>{(q.error as Error).message}</Empty></Shell>;
  const p = q.data!;
  return (
    <Shell name={p.client.company || p.client.name}>
      {p.client.portal_type === "sports" ? <SportsPortal p={p} token={token} /> : <StandardPortal p={p} token={token} />}
    </Shell>
  );
}

function MobileTabs({ tabs }: { tabs: { v: string; l: string }[] }) {
  const [open, setOpen] = useState(false);
  const pick = (v: string) => {
    const el = document.querySelector<HTMLButtonElement>(`[role="tab"][value="${v}"], [data-value="${v}"]`);
    if (el) el.click();
    setOpen(false);
  };
  return (
    <div className="mb-6 md:hidden">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between rounded-md border bg-card px-4 py-3 text-sm font-medium">
        <span>Menu</span>
        {open ? <ChevronDown className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>
      {open && (
        <div className="mt-2 space-y-1 rounded-md border bg-card p-2">
          {tabs.map((t) => (
            <button key={t.v} type="button" onClick={() => pick(t.v)} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-accent">
              {t.l}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Shell({ children, name }: { children: ReactNode; name?: string }) {
  return (
    <div className="min-h-screen bg-background">
      <style>{`
        .portal-fade { animation: portalFade .45s ease both; }
        @keyframes portalFade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        [role="progressbar"] > * { transition: transform .9s cubic-bezier(.2,.8,.2,1); }
        .pop-in { animation: popIn .5s ease both; }
        @keyframes popIn { 0% { opacity: 0; transform: scale(.92); } 60% { transform: scale(1.02); } 100% { opacity: 1; transform: scale(1); } }
        .confetti-piece { position: fixed; top: -6vh; width: 8px; height: 14px; border-radius: 2px; z-index: 60; animation: confettiFall linear forwards; }
        @keyframes confettiFall { 0% { transform: translateY(-4vh) rotate(0deg); opacity: 1; } 100% { transform: translateY(108vh) rotate(720deg); opacity: 0; } }
        .portal-logo-load { animation: logoPulse 1.6s ease-in-out infinite; }
        @keyframes logoPulse { 0%,100% { opacity: .8; transform: scale(1); } 50% { opacity: 1; transform: scale(1.05); } }
      `}</style>
      <header className="bg-primary-deep text-primary-foreground">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-6">
          <img src={LOGO_URL} alt="Nine3 Designs" className="h-16 md:h-20" />
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
      <MobileTabs tabs={[
        { v: "overview", l: "Overview" },
        { v: "proofs", l: `Proofs${pending ? ` (${pending})` : ""}` },
        { v: "files", l: "Files" },
        { v: "invoices", l: "Invoices" },
        { v: "documents", l: "Proposals & contracts" },
        { v: "bookcall", l: "Book a call" },
        { v: "help", l: "Help" },
      ]} />
      <TabsList className="mb-6 hidden flex-wrap md:flex">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="proofs">Proofs{pending ? ` (${pending})` : ""}</TabsTrigger>
        <TabsTrigger value="files">Files</TabsTrigger>
        <TabsTrigger value="invoices">Invoices</TabsTrigger>
        <TabsTrigger value="documents">Proposals & contracts</TabsTrigger>
        <TabsTrigger value="bookcall"><CalendarDays className="h-4 w-4" /> Book a call</TabsTrigger>
        <TabsTrigger value="help"><HelpCircle className="h-4 w-4" /> Help</TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="grid gap-6 md:grid-cols-2">
        <div className="md:col-span-2 portal-fade"><CompletionBanner p={p} token={token} /></div>
        <div className="md:col-span-2 portal-fade"><WhatNew p={p} token={token} /></div>
        <OnboardingList p={p} token={token} />
        <QuestionnaireCard p={p} token={token} />
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
        <FavFileGrid p={p} token={token} files={p.deliverables.filter((d: Any) => d.kind !== "proof")} empty="No files yet — your final files will live here." />
      </TabsContent>
      <TabsContent value="invoices"><Invoices invoices={p.invoices} /></TabsContent>
      <TabsContent value="documents"><Documents docs={p.proposals} token={token} /></TabsContent>
      <TabsContent value="bookcall" className="portal-fade"><BookCall token={token} /></TabsContent>
      <TabsContent value="help" className="portal-fade"><HelpCentre /></TabsContent>
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
    <div className="space-y-8 font-body" style={{ "--font-heading": "'League Spartan', 'Anton', sans-serif", fontFamily: "'Raleway', ui-sans-serif, sans-serif" } as Any}>
      <div className="grid gap-6 md:grid-cols-2">
        <Kit label="Home kit" k={p.client.home_kit} />
        <Kit label="Away kit" k={p.client.away_kit} />
      </div>
      <WhatNew p={p} token={token} />

      {(p.tasks ?? []).length > 0 && (
        <Section title="Graphics to-do list">
          <ul className="space-y-2">
            {p.tasks.map((tk: Any) => (
              <li key={tk.id} className="flex items-start gap-3 rounded-md border bg-card p-4">
                <Check className={`mt-0.5 h-4 w-4 ${tk.status === "done" ? "text-success" : "text-muted-foreground/30"}`} />
                <div className="min-w-0">
                  <p className="font-medium">{tk.title}</p>
                  {tk.notes && <p className="text-sm text-muted-foreground">{tk.notes}</p>}
                  <p className="mt-1 text-xs capitalize text-muted-foreground">{tk.priority} priority{tk.due_date ? ` · by ${fmtDate(tk.due_date)}` : ""}</p>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {p.client.notes && (
        <Section title="Team sheet">
          <div className="rounded-md border bg-card p-5"><p className="whitespace-pre-wrap text-sm leading-relaxed">{p.client.notes}</p></div>
        </Section>
      )}

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
        <FavFileGrid p={p} token={token} files={archive} empty="Finished graphics will appear here." />
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
      <Section title="Help & FAQs"><HelpCentre /></Section>
    </div>
  );
}

function Kit({ label, k }: { label: string; k: Any }) {
  const cols = (["primary", "secondary", "accent"] as const).filter((c) => k?.[c]);
  return (
    <div className="rounded-md border bg-card p-5">
      <p className="eyebrow mb-3">{label}</p>
      {k?.badge && <img src={k.badge} alt={`${label} badge`} className="mb-4 h-20 w-20 rounded-md border object-contain bg-white" />}
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

/* ---------------- Portal experience upgrades ---------------- */
function PortalLoader() {
  return (
    <div className="flex flex-col items-center py-24 text-center">
      <img src={LOGO_URL} alt="Nine3 Designs" className="portal-logo-load h-20" />
      <p className="mt-6 text-sm text-muted-foreground">Preparing your portal…</p>
    </div>
  );
}

const CONFETTI_COLORS = ["#174B50", "#C8A96A", "#7EC8E3", "#FFD520", "#0E55AF", "#EFECE5"];

function Confetti({ count = 90 }: { count?: number }) {
  const [pieces] = useState(() => Array.from({ length: count }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.8,
    dur: 2.2 + Math.random() * 1.6,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  })));
  const [gone, setGone] = useState(false);
  useEffect(() => { const t = setTimeout(() => setGone(true), 4500); return () => clearTimeout(t); }, []);
  if (gone) return null;
  return <>{pieces.map((p, i) => <span key={i} className="confetti-piece" style={{ left: `${p.left}%`, background: p.color, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s` }} />)}</>;
}

function pickTab(v: string) {
  document.querySelector<HTMLButtonElement>(`[role="tab"][value="${v}"], [data-value="${v}"]`)?.click();
}

function CompletionBanner({ p }: { p: Any; token: string | null }) {
  const projects = (p.projects ?? []).filter((pr: Any) => (pr.milestones ?? []).length > 0);
  const completed = projects.filter((pr: Any) => pr.status === "completed" || (pr.milestones ?? []).every((m: Any) => m.done));
  const [celebrate, setCelebrate] = useState(false);
  useEffect(() => { if (completed.length > 0) setCelebrate(true); }, [completed.length]);
  if (completed.length === 0) return null;
  const pr = completed[0];
  return (
    <section className="pop-in relative overflow-hidden rounded-md border bg-primary-deep p-6 text-primary-foreground">
      {celebrate && <Confetti />}
      <div className="relative z-10 flex flex-wrap items-center gap-4">
        <PartyPopper className="h-9 w-9 shrink-0" />
        <div className="min-w-60 flex-1">
          <p className="eyebrow opacity-70">Project complete</p>
          <h3 className="font-heading text-2xl font-semibold">{pr.name} is wrapped!</h3>
          <p className="mt-1 text-sm opacity-80">Everything's signed off — your final files are yours to keep. Download them below or save your favourites.</p>
        </div>
        <Button size="sm" onClick={() => pickTab("files")}><Download className="h-4 w-4" /> Download centre</Button>
      </div>
    </section>
  );
}

function WhatNew({ p }: { p: Any; token: string | null }) {
  const key = "nine3-seen-" + p.client.id;
  const [seen, setSeen] = useState<number | null>(null);
  useEffect(() => { setSeen(Number(localStorage.getItem(key) || 0)); }, [key]);
  if (seen === null) return null;
  const items = (p.activity ?? []).filter((a: Any) => a.actor === "studio");
  if (items.length === 0) return null;
  const fresh = items.filter((a: Any) => new Date(a.created_at).getTime() > seen);
  return (
    <Section title={fresh.length ? `What's new (${fresh.length})` : "Recent updates"}>
      <ul className="space-y-2 text-sm">
        {(fresh.length ? fresh : items.slice(0, 5)).map((a: Any) => (
          <li key={a.id} className="flex items-center justify-between gap-3 rounded-md border bg-cream px-3 py-2">
            <span>{a.message}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{fmtDate(a.created_at)}</span>
          </li>
        ))}
      </ul>
      {fresh.length > 0 && (
        <div className="mt-3"><Button size="sm" variant="outline" onClick={() => { localStorage.setItem(key, String(Date.now())); setSeen(Date.now()); }}>Mark all as seen</Button></div>
      )}
    </Section>
  );
}

function FavFileGrid({ p, token, files, empty }: { p: Any; token: string | null; files: Any[]; empty?: string }) {
  const act = useAct(token);
  const [favOnly, setFavOnly] = useState(false);
  const favs: string[] = Array.isArray(p.client?.portal_prefs?.favourites) ? p.client.portal_prefs.favourites : [];
  if (files.length === 0) return <Empty>{empty}</Empty>;
  const shown = favOnly ? files.filter((f: Any) => favs.includes(f.id)) : [...files].sort((a: Any, b: Any) => Number(favs.includes(b.id)) - Number(favs.includes(a.id)));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">Tap the heart to save favourites.</p>
        <Button size="sm" variant={favOnly ? "default" : "outline"} onClick={() => setFavOnly(!favOnly)}>
          <Heart className={`h-3.5 w-3.5 ${favOnly ? "" : "text-muted-foreground"}`} /> Favourites{favs.length ? ` (${favs.length})` : ""}
        </Button>
      </div>
      {shown.length === 0 ? <Empty>Nothing saved yet — tap the heart on any file.</Empty> : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {shown.map((f: Any) => {
            const isFav = favs.includes(f.id);
            return (
              <div key={f.id} className="relative overflow-hidden rounded-md border bg-card">
                <Preview f={f} />
                <button type="button" aria-label={isFav ? "Remove favourite" : "Save favourite"} onClick={() => act({ type: "favourite", id: f.id, on: !isFav })} className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 shadow-sm transition-transform hover:scale-110">
                  <Heart className={`h-4 w-4 ${isFav ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
                </button>
                <div className="flex items-center justify-between gap-2 p-2">
                  <div className="min-w-0"><p className="truncate text-sm">{f.title}</p><p className="text-xs text-muted-foreground">{f.uploaded_by === "client" ? "From you" : "From Nine3"} · {fmtDate(f.created_at)}</p></div>
                  {f.url && <a href={f.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary"><Download className="h-4 w-4" /></a>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BookCall({ token, compact }: { token: string | null; compact?: boolean }) {
  const act = useAct(token);
  const [v, setV] = useState({ kind: "discovery", date: "", time: "", notes: "" });
  const [busy, setBusy] = useState(false);
  return (
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true);
      const ok = await act({ type: "bookCall", kind: v.kind, date: v.date, time: v.time || undefined, notes: v.notes || undefined }, "Call requested — we'll confirm within one working day.");
      if (ok) setV({ kind: "discovery", date: "", time: "", notes: "" });
      setBusy(false);
    }}>
      <div className="space-y-1.5"><Label>Type of call</Label>
        <select className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value })}>
          <option value="discovery">Discovery call</option>
          <option value="review">Design review</option>
        </select>
      </div>
      <div className="space-y-1.5"><Label>Preferred date</Label><Input type="date" required value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>Preferred time</Label><Input type="time" value={v.time} onChange={(e) => setV({ ...v, time: e.target.value })} /></div>
      <div className="space-y-1.5 sm:col-span-2"><Label>Anything we should know?</Label><Textarea rows={3} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} placeholder="Optional" /></div>
      {!compact && <p className="text-xs text-muted-foreground sm:col-span-2">Pick a date and we'll confirm your slot by email within one working day.</p>}
      <div className="sm:col-span-2"><Button type="submit" disabled={busy}>{busy ? "Sending…" : "Request call"}</Button></div>
    </form>
  );
}

const Q_FIELDS: { key: string; label: string }[] = [
  { key: "Business", label: "Tell us about your business (one or two lines)" },
  { key: "Audience", label: "Who are your customers?" },
  { key: "Feel", label: "What should people feel when they see your brand?" },
  { key: "Colours", label: "Colours you love / want to avoid" },
  { key: "Inspiration", label: "Brands or websites you admire" },
  { key: "Extra", label: "Anything else we should know?" },
];

function QuestionnaireCard({ p, token }: { p: Any; token: string | null }) {
  const act = useAct(token);
  const [open, setOpen] = useState(false);
  const [v, setV] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const done = (p.activity ?? []).some((a: Any) => /questionnaire/i.test(a.message ?? ""));
  return (
    <Section title="Brand questionnaire">
      {done ? (
        <div className="flex items-start gap-3 text-sm"><ClipboardList className="mt-0.5 h-4 w-4 text-success" /><p>Questionnaire received — thank you! We'll use it to shape your concepts.</p></div>
      ) : open ? (
        <form className="space-y-3" onSubmit={async (e) => {
          e.preventDefault(); setBusy(true);
          const ok = await act({ type: "questionnaire", answers: v }, "Questionnaire sent — thank you!");
          if (ok) setOpen(false);
          setBusy(false);
        }}>
          {Q_FIELDS.map((f) => (
            <div key={f.key} className="space-y-1"><Label className="text-xs">{f.label}</Label><Textarea rows={2} value={v[f.key] ?? ""} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} /></div>
          ))}
          <div className="flex gap-2"><Button type="submit" disabled={busy}>{busy ? "Sending…" : "Send answers"}</Button><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Later</Button></div>
        </form>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">A few quick questions so we can nail your brief. Takes about five minutes.</p>
          <Button size="sm" onClick={() => setOpen(true)}><ClipboardList className="h-4 w-4" /> Fill it in</Button>
        </>
      )}
    </Section>
  );
}

const FAQS: { q: string; a: string }[] = [
  { q: "How do I approve a design?", a: "Open Proofs, review the design, then choose Approve or Request changes. If you'd like tweaks, tell us what to change and we'll get straight on it." },
  { q: "How do I send you files, photos or content?", a: "Use the upload box in Files. Brand assets, copy, photos — anything. It comes straight to us and we get notified." },
  { q: "How do downloads work?", a: "Every finished file is in your download centre with a download button. Tap the heart to save favourites so you can find them again quickly." },
  { q: "When are invoices issued?", a: "Invoices appear here as soon as they're issued, usually monthly. Paid and outstanding amounts are always visible." },
  { q: "Can I book a call?", a: "Yes — choose discovery call or design review, pick a date and we'll confirm by email within one working day." },
  { q: "Something looks wrong, or I need a hand", a: "Email natalie@nine3designs.co.uk and we'll sort it quickly." },
];

function HelpCentre() {
  return (
    <div className="space-y-2">
      {FAQS.map((f) => (
        <details key={f.q} className="group rounded-md border bg-card p-4">
          <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-medium">{f.q}<ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" /></summary>
          <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
