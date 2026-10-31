import { useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, CalendarDays, Check, ChevronDown, ClipboardList, Download, FileText, Heart, HelpCircle, Image as ImageIcon, Menu, PartyPopper, Upload, X, Home, Plus, Trash2 } from "lucide-react";
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
import { effectiveStatus, fmtDate, invoiceTotals, LOGO_URL, money, type LineItem } from "@/lib/format";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export function PortalView({ token }: { token: string | null }) {
  const fetchPortal = useServerFn(getPortal);
  const q = useQuery({ queryKey: ["portal", token], queryFn: () => fetchPortal({ data: { token } }), retry: false });
  if (q.isLoading) return <Shell><PortalLoader /></Shell>;
  if (q.error) return <Shell><Empty>{(q.error as Error).message}</Empty></Shell>;
  const p = q.data!;
  return (
    <Shell name={p.client.company || p.client.name} tone={p.client.portal_type === "sports" ? "sports" : undefined}>
      {p.client.portal_type === "sports" ? <SportsPortal p={p} token={token} /> : <StandardPortal p={p} token={token} />}
    </Shell>
  );
}

function MobileTabs({ tabs, value, onChange }: { tabs: { v: string; l: string }[]; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const current = tabs.find((t) => t.v === value);
  return (
    <div className="mb-6 md:hidden">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center justify-between rounded-md border bg-card px-4 py-3 text-sm font-medium">
        <span className="flex items-center gap-2"><Menu className="h-4 w-4" />{current ? current.l : "Menu"}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-2 space-y-1 rounded-md border bg-card p-2">
          {tabs.map((t) => (
            <button key={t.v} type="button" onClick={() => { onChange(t.v); setOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); }} className={`block w-full rounded px-3 py-2 text-left text-sm hover:bg-accent ${t.v === value ? "bg-accent font-semibold" : ""}`}>
              {t.l}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Shell({ children, name, tone }: { children: ReactNode; name?: string; tone?: "sports" }) {
  return (
    <div className={`min-h-screen bg-background${tone === "sports" ? " sports" : ""}`}>
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
      /* ---- sports premium theme (glass / dark) ---- */
        .sports { background: linear-gradient(180deg, #0A2140 0%, #081B33 45%, #050F1F 100%) !important; color: #EAF2FF; }
        .sports::before { content: ""; position: fixed; inset: 0; pointer-events: none; background:
          radial-gradient(620px 420px at 12% -2%, rgba(30,111,224,.28), transparent 62%),
          radial-gradient(520px 360px at 88% 6%, rgba(255,213,32,.09), transparent 60%),
          radial-gradient(760px 520px at 50% 108%, rgba(30,111,224,.14), transparent 62%); z-index: 0; }
        .sports main, .sports footer, .sports header { position: relative; z-index: 1; }
        .sports header { background: transparent !important; }
        .sports header img { filter: drop-shadow(0 6px 24px rgba(0,0,0,.45)); }
        .sports header p { color: rgba(234,242,255,.6); }
        .sports footer { color: rgba(234,242,255,.4); }
        .sports footer a { color: rgba(234,242,255,.7); }
        .sports .bg-card { background: rgba(255,255,255,.055) !important; border-color: rgba(255,255,255,.12) !important; backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); box-shadow: 0 10px 34px rgba(0,0,0,.28); }
        .sports .rounded-md, .sports .rounded-lg { border-radius: 1.1rem; }
        .sports h1, .sports h2, .sports h3 { color: #fff; }
        .sports .text-primary-deep, .sports .text-foreground { color: #EAF2FF !important; }
        .sports .text-muted-foreground { color: rgba(234,242,255,.55) !important; }
        .sports .eyebrow { color: #FFD520 !important; }
        .sports .border-dashed { border-color: rgba(255,255,255,.25) !important; }
        .sports-hero { position: relative; overflow: hidden; background: linear-gradient(135deg, rgba(30,111,224,.5), rgba(10,53,110,.55)) !important; border: 1px solid rgba(255,255,255,.14) !important; border-radius: 1.5rem !important; backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); box-shadow: 0 24px 64px rgba(0,0,0,.4); }
        .sports-hero::after { content: ""; position: absolute; right: -70px; top: -70px; width: 280px; height: 280px; background: radial-gradient(circle, rgba(255,213,32,.28), transparent 70%); border-radius: 50%; pointer-events: none; }
        .sports [role="progressbar"] { background: rgba(255,255,255,.14) !important; border-radius: 999px; }
        .sports [role="progressbar"] > * { background: #FFD520 !important; }
        .sports [role="tablist"] { gap: 4px; background: rgba(255,255,255,.06) !important; border: 1px solid rgba(255,255,255,.12) !important; border-radius: 999px !important; padding: 6px !important; backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); box-shadow: 0 10px 34px rgba(0,0,0,.28); }
        .sports [role="tab"] { border-radius: 999px !important; color: rgba(234,242,255,.6) !important; font-weight: 600; transition: color .2s, background .2s; }
        .sports [role="tab"]:hover { color: #fff !important; }
        .sports [role="tab"][data-state="active"] { background: #fff !important; color: #0A2547 !important; box-shadow: 0 6px 18px rgba(0,0,0,.35); }
        .sports li.rounded-md { transition: transform .25s ease, background .25s ease, border-color .25s ease; }
        .sports li.rounded-md:hover { background: rgba(255,255,255,.09) !important; transform: translateY(-2px); border-color: rgba(255,255,255,.22) !important; }
        .sports .bg-muted { background: rgba(255,255,255,.08) !important; }
        .sports .text-success { color: #6EE7A0 !important; }
        .sports .bg-success\/15 { background: rgba(110,231,160,.12) !important; }
        .sports .text-destructive { color: #FF8A8A !important; }
        .sports .bg-destructive\/10 { background: rgba(255,138,138,.12) !important; }
        .sports input[type="checkbox"] { accent-color: #FFD520; }        .sports .bg-cream { background: rgba(255,255,255,.06) !important; border-color: rgba(255,255,255,.12) !important; }
        .sports .bg-primary { background: #fff !important; color: #0A2547 !important; }
        .sports .bg-primary:hover { background: rgba(255,255,255,.85) !important; }
        .sports .bg-background { background: rgba(255,255,255,.06) !important; color: #EAF2FF !important; }
        .sports .text-primary { color: #9CC2FF !important; }
        .sports details summary { color: #EAF2FF; }
        .sports .accent-primary { accent-color: #FFD520; }
        .sports ::selection { background: rgba(255,213,32,.35); }
        .sports [role="progressbar"] { background: rgba(255,255,255,.14) !important; border-radius: 999px; }
        .sports [role="progressbar"] > * { background: #FFD520 !important; }
        .sports .fx-card { background: rgba(255,255,255,.05) !important; border-color: rgba(255,255,255,.1) !important; backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); box-shadow: 0 10px 30px rgba(0,0,0,.25); }
        .sports .fx-card:hover { background: rgba(255,255,255,.085) !important; transform: translateY(-2px); border-color: rgba(255,255,255,.2) !important; box-shadow: 0 16px 40px rgba(0,0,0,.35); }
        .sports .fx-card:hover { background: rgba(255,255,255,.085) !important; transform: translateY(-2px); border-color: rgba(255,255,255,.2) !important; box-shadow: 0 16px 40px rgba(0,0,0,.35); }
        .sports [role="tab"] { border-radius: 999px !important; transition: background .2s ease, transform .2s ease, box-shadow .2s ease; }
        .sports [role="tab"]:hover { background: rgba(255,255,255,.1); transform: translateY(-1px); }
        .sports .upload-glass { background: rgba(255,255,255,.04) !important; border-color: rgba(255,255,255,.2) !important; }
        .sports .file-btn { background: linear-gradient(135deg, #FFD520, #E8BE0D); color: #0A2547 !important; }
        .sports .fx-modal textarea, .sports .fx-modal input { background: rgba(255,255,255,.08) !important; border-color: rgba(255,255,255,.15) !important; color: #EAF2FF !important; }
        .sports .fx-modal ::placeholder { color: rgba(255,255,255,.35); }
        .sports .fx-modal { animation: fxpop .28s cubic-bezier(.2,.9,.3,1.15); }
        @keyframes fxpop { from { opacity: 0; transform: translateY(18px) scale(.97); } to { opacity: 1; transform: none; } }
        .sports [role="tablist"] { gap: 4px !important; border-radius: 999px !important; padding: 5px !important; background: rgba(255,255,255,.08) !important; border: 1px solid rgba(255,255,255,.14) !important; }
        .sports [role="tab"] { color: rgba(234,242,255,.72) !important; font-weight: 600; letter-spacing: .09em; }
        .sports [role="tab"][aria-selected="true"] { background: linear-gradient(135deg, #FFD520, #E8BE0D) !important; color: #0A2547 !important; box-shadow: 0 6px 18px rgba(255,213,32,.3); }
        .hero-bg-lines { position: absolute; inset: 0; pointer-events: none; background-image: repeating-linear-gradient(115deg, rgba(255,255,255,.07) 0 1px, transparent 1px 30px), radial-gradient(circle at 88% 15%, rgba(255,213,32,.22), transparent 50%), radial-gradient(circle at 5% 100%, rgba(126,200,227,.15), transparent 45%); }
        .hero-underline { height: 4px; width: 130px; border-radius: 999px; background: linear-gradient(90deg, #FFD520, rgba(255,255,255,.9)); animation: heroshine 2.8s ease-in-out infinite; }
        @keyframes heroshine { 0%,100% { width: 130px; opacity: .95; } 50% { width: 230px; opacity: .55; } }
        @media (max-width: 640px) {
          .sports main { padding-left: 1rem !important; padding-right: 1rem !important; }
          .sports-hero { padding: 1.1rem !important; }
          .sports-hero h2 { font-size: 1.4rem !important; }
          .sports header img { height: 4.25rem !important; }
          .sports .fx-card { padding: .875rem !important; gap: .75rem !important; }
          .sports .fx-date { height: 2.9rem !important; width: 2.9rem !important; }
          .sports section.rounded-md { padding: 1rem !important; }
          .sports section.rounded-md h2 { font-size: 1.05rem !important; }
        }

      `}</style>
      <header className="relative overflow-hidden bg-primary-deep text-primary-foreground" style={tone === "sports" ? { background: "linear-gradient(180deg,#0E55AF,#0A4384)" } : undefined}>
        <div className="hero-bg-lines" aria-hidden="true" />
        <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-2.5 px-6 pb-7 pt-9 text-center md:pt-11">
          <img src={LOGO_URL} alt="Nine3 Designs" className="h-14 w-auto md:h-16" style={{ filter: "drop-shadow(0 8px 22px rgba(0,0,0,.4))" }} />
          <div className="h-px w-28 rounded-full bg-gradient-to-r from-transparent via-white/45 to-transparent" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-white/60">Client Portal</p>
        </div>
        {name && <div className="relative mx-auto max-w-5xl px-6 pb-8 text-center"><p className="text-sm opacity-70">Welcome back,</p><h1 className="font-heading text-3xl font-bold tracking-tight" style={tone === "sports" ? { fontFamily: "'League Spartan', sans-serif" } : undefined}>{name}</h1></div>}
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
      <footer className="pb-8 text-center text-xs text-muted-foreground/80">
        Powered by <a href="https://nine3designs.co.uk" target="_blank" rel="noreferrer" className="hover:text-primary">Nine3 Designs</a> · Your Vision. Our Design.
      </footer>
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
  const [tab, setTab] = useState("overview");
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <MobileTabs value={tab} onChange={setTab} tabs={[
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
        <FavFileGrid p={p} token={token} files={p.deliverables.filter((d: Any) => d.kind !== "proof")} empty="No files yet · your final files will live here." />
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
        {(f.history ?? []).length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium">Earlier versions:</span>
            {(f.history as Any[]).map((h, i) => (
              <a key={i} href={h.url ?? "#"} target="_blank" rel="noreferrer" className="rounded-full border px-2 py-0.5 transition-colors hover:border-primary hover:text-primary">v{i + 1}{h.at ? ` · ${fmtDate(h.at)}` : ""}</a>
            ))}
          </div>
        )}
        {f.status === "pending" && (revising ? (
          <div className="space-y-2">
            <Textarea rows={3} placeholder="What would you like changed?" value={fb} onChange={(e) => setFb(e.target.value)} />
            <div className="flex gap-2"><Button size="sm" onClick={async () => { if (await act({ type: "proof", id: f.id, decision: "revision", feedback: fb }, "Feedback sent")) setRevising(false); }}>Send feedback</Button><Button size="sm" variant="ghost" onClick={() => setRevising(false)}>Cancel</Button></div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => confirm("Approve this design?") && act({ type: "proof", id: f.id, decision: "approved" }, "Design approved · thank you!")}><Check className="h-4 w-4" /> Approve</Button>
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

function UploadBox({ token, kind, label }: { token: string | null; kind: string; label: string }) {
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
    toast.success("Uploaded, thank you!");
    setFiles(null); (e.target as HTMLFormElement).reset();
    setBusy(false);
  }
  const names = files?.length ? Array.from(files).map((f) => f.name).join(", ") : "";
  return (
    <form onSubmit={go} className="upload-glass flex flex-wrap items-end gap-3 rounded-xl border border-dashed p-5">
      <div className="min-w-60 flex-1 space-y-2">
        <p className="text-sm font-medium">{label}</p>
        <label className="flex cursor-pointer flex-wrap items-center gap-2">
          <span className="file-btn inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold shadow-sm transition-transform hover:scale-105">
            <Upload className="h-3.5 w-3.5" /> Choose files
          </span>
          <span className={`max-w-full truncate text-xs ${names ? "text-foreground" : "text-muted-foreground"}`}>{names || "No file chosen"}</span>
          <input type="file" multiple className="hidden" onChange={(e) => setFiles(e.target.files)} />
        </label>
      </div>
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
          <Button onClick={() => act({ type: "accept", id: d.id, name }, "Accepted, thank you!")}>Accept & sign</Button>
        </div>
      )}
    </div>
  );
}

/* ---------------- Player photo albums ---------------- */
function playerName(title: string): string {
  const m = title.match(/^(.*?)\s+sponsored by/i);
  return (m ? m[1] : title).trim() || "Unnamed player";
}

function PhotoAlbums({ photos, empty }: { photos: Any[]; empty: string }) {
  const [openP, setOpenP] = useState<string | null>(null);
  if (photos.length === 0) return <Empty>{empty}</Empty>;
  const groups: { name: string; items: Any[] }[] = [];
  for (const ph of photos) {
    const name = playerName(ph.title ?? "");
    let g = groups.find((x) => x.name === name);
    if (!g) { g = { name, items: [] }; groups.push(g); }
    g.items.push(ph);
  }
  if (openP) {
    const g = groups.find((x) => x.name === openP);
    if (g) return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setOpenP(null)} className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/20"><ArrowLeft className="h-3.5 w-3.5" /> All players</button>
          <div>
            <h3 className="font-heading text-xl font-bold text-white">{g.name}</h3>
            <p className="text-xs text-muted-foreground">{g.items.length} {g.items.length === 1 ? "photo" : "photos"}</p>
          </div>
        </div>
        <FileGrid files={g.items} empty="No photos in this album yet." />
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {groups.map((g) => (
        <button key={g.name} type="button" onClick={() => setOpenP(g.name)} className="fx-card group overflow-hidden rounded-xl border text-left">
          <div className="aspect-square overflow-hidden bg-black/20">
            {g.items[0]?.url ? <img src={g.items[0].url} alt={g.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <div className="flex h-full w-full items-center justify-center text-muted-foreground"><ImageIcon className="h-6 w-6" /></div>}
          </div>
          <div className="p-3">
            <p className="truncate text-sm font-semibold text-white">{g.name}</p>
            <p className="text-xs text-muted-foreground">{g.items.length} {g.items.length === 1 ? "photo" : "photos"}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ---------------- Sports weekly portal ---------------- */
function SportsPortal({ p, token }: { p: Any; token: string | null }) {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = p.fixtures.filter((f: Any) => f.match_date >= today);
  const past = p.fixtures.filter((f: Any) => f.match_date < today).reverse();
  const templates = p.deliverables.filter((d: Any) => d.kind === "template");
  const resources = p.deliverables.filter((d: Any) => d.uploaded_by === "client" && d.kind !== "photo");
  const archive = p.deliverables.filter((d: Any) => d.kind === "completed" || d.kind === "deliverable" || (d.kind === "proof" && d.status === "approved"));
  const proofs = p.deliverables.filter((d: Any) => d.kind === "proof" && d.status !== "approved");
  const photos = p.deliverables.filter((d: Any) => d.kind === "photo");
  const cfg = (p.client.portal_prefs ?? {}).monthly_config ?? null;
  const payMonths: { key: string; label: string; paid: boolean }[] = [];
  if (cfg?.start && cfg?.count) {
    const [sy, sm] = String(cfg.start).split("-").map(Number);
    for (let i = 0; i < Number(cfg.count); i++) {
      const d = new Date(Date.UTC(sy, sm - 1 + i, 1));
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      payMonths.push({ key, label: d.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }), paid: !!(p.client.portal_prefs?.monthly ?? {})[key]?.paid });
    }
  }

  const [openFx, setOpenFx] = useState<Any | null>(null);
  const [tab, setTab] = useState(() => (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("tab")) || "fixtures");
  const [showAllFx, setShowAllFx] = useState(false);
  const [reqOpen, setReqOpen] = useState(false);
  const next = upcoming[0];
  const nextKit = next ? (next.venue === "home" ? p.client.home_kit : p.client.away_kit) : null;
  const nextGfx = next ? ((next.graphics ?? []) as { name: string; done: boolean }[]) : [];
  const gfxDone = nextGfx.filter((x) => x.done).length;

  const tabs = [
    { v: "fixtures", l: "FIXTURES" },
    { v: "proofs", l: "PLAYER PHOTOS" },
    { v: "files", l: "GRAPHICS" },
    { v: "payments", l: "PAYMENTS" },
    { v: "help", l: "HELP" },
    { v: "todo", l: "TO-DO" },
  ];

  return (
    <div className="space-y-8 font-body" style={{ "--font-heading": "'League Spartan', 'Anton', sans-serif", fontFamily: "'Outfit', ui-sans-serif, sans-serif" } as Any}>
      {next && (
        <section className="sports-hero portal-fade relative overflow-hidden rounded-2xl p-6 text-white md:p-8">
          <div className="hero-bg-lines" aria-hidden="true" />
          <button type="button" onClick={() => { setTab("fixtures"); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="absolute right-5 top-5 z-10 rounded-full bg-white/10 p-2 text-white/80 backdrop-blur transition hover:bg-white/20 hover:text-white" aria-label="Back to dashboard"><Home className="h-5 w-5" /></button>
          <p className="eyebrow" style={{ color: "#FFD520" }}>Next match · {fmtDate(next.match_date)}</p>
          <div className="relative mt-2 flex items-center gap-4">
            {p.client.home_kit?.badge && <img src={p.client.home_kit.badge} alt="Team badge" className="h-14 w-14 rounded-xl bg-white/10 object-contain p-1 ring-1 ring-white/25 md:h-16 md:w-16" />}
            <div>
              <h2 className="font-heading text-4xl font-bold tracking-tight md:text-5xl" style={{ fontFamily: "'League Spartan', sans-serif" }}>{p.client.company || p.client.name}</h2>
              <div className="hero-underline mt-2" />
            </div>
          </div>
          <p className="mt-4 text-lg font-medium">
            {next.venue === "home" ? "vs" : "away at"} {next.opponent}
            <span className="ml-2 text-sm opacity-75">{next.venue === "home" ? "Home" : "Away"}{next.competition ? ` · ${next.competition}` : ""}</span>
          </p>
          <div className="relative mt-3 flex items-center gap-3">
            {(["primary", "secondary"] as const).filter((c) => nextKit?.[c]).map((c) => (
              <span key={c} className="h-6 w-6 rounded-sm border-2 border-white/70 shadow-sm" style={{ background: nextKit[c] }} title={nextKit[c]} />
            ))}
            <span className="text-xs opacity-80">{next.venue === "home" ? "Home colours" : "Away colours"}</span>
          </div>
          {nextGfx.length > 0 && (
            <div className="relative mt-4 max-w-xs">
              <div className="mb-1 flex justify-between text-xs opacity-80"><span>Matchday graphics</span><span>{gfxDone}/{nextGfx.length} ready</span></div>
              <Progress value={(gfxDone / nextGfx.length) * 100} />
            </div>
          )}
        </section>
      )}

      <Tabs value={tab} onValueChange={(v: string) => setTab(v)}>
        <MobileTabs tabs={tabs} value={tab} onChange={setTab} />
        <TabsList className="mb-8 hidden flex-wrap md:flex">
          {tabs.map((t) => <TabsTrigger key={t.v} value={t.v}>{t.l}</TabsTrigger>)}
        </TabsList>

        <TabsContent value="fixtures" className="mt-0 space-y-8">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-md border bg-card p-5">
              <p className="eyebrow mb-3">Quick actions</p>
              <div className="flex flex-col gap-2">
                <Button variant="outline" onClick={() => setReqOpen(true)} className="justify-start"><Plus className="h-4 w-4" /> New graphic request</Button>
                <Button variant="outline" onClick={() => next && setOpenFx(next)} disabled={!next} className="justify-start"><Plus className="h-4 w-4" /> Add team sheet</Button>
                {!next && <p className="text-xs text-muted-foreground">No upcoming fixture yet · team sheets attach to a fixture.</p>}
              </div>
            </div>
            <Kit label="Kit colours" k={p.client.home_kit} away={p.client.away_kit} />
          </div>
          <Section title="Upcoming fixtures">
            {upcoming.length === 0 ? <Empty>No upcoming fixtures.</Empty> : (
              <>
                <ul className="grid gap-3 sm:grid-cols-2">{(showAllFx ? upcoming : upcoming.slice(0, 2)).map((f: Any) => <Fixture key={f.id} f={f} client={p.client} onOpen={() => setOpenFx(f)} />)}</ul>
                {upcoming.length > 2 && (
                  <button type="button" onClick={() => setShowAllFx(!showAllFx)} className="mt-1 text-sm font-medium text-primary underline-offset-4 hover:underline">{showAllFx ? "See fewer" : `See all ${upcoming.length} fixtures`}</button>
                )}
              </>
            )}
          </Section>
          {past.length > 0 && (
            <Section title="Previous fixtures">
              <ul className="grid gap-3 sm:grid-cols-2">{past.map((f: Any) => <Fixture key={f.id} f={f} client={p.client} onOpen={() => setOpenFx(f)} />)}</ul>
            </Section>
          )}
        </TabsContent>

        <TabsContent value="todo" className="mt-0 space-y-8">
          <TodoList p={p} token={token} />
          <NotesCard p={p} token={token} />
        </TabsContent>

        <TabsContent value="proofs" className="mt-0 space-y-8">
          <Section title="Player photos">
            <div className="space-y-4">
              <UploadBox token={token} kind="photo" label="Upload player photos" />
              <PhotoAlbums photos={photos} empty="No player photos uploaded yet." />
            </div>
          </Section>
          {proofs.length > 0 && (
            <Section title="Design proofs">
              <Proofs proofs={proofs} token={token} />
            </Section>
          )}
        </TabsContent>

        <TabsContent value="files" className="mt-0 space-y-8">
          <Section title="Templates"><FileGrid files={templates} empty="No templates shared yet." /></Section>
          <Section title="Resource photos">
            <div className="space-y-4">
              <UploadBox token={token} kind="resource" label="Upload sponsor logos or match photos" />
              <FileGrid files={resources} empty="No photos uploaded yet." />
            </div>
          </Section>
          <Section title="Favourites">
            <FavFileGrid p={p} token={token} files={archive} empty="Finished graphics will appear here." />
          </Section>
        </TabsContent>

        <TabsContent value="payments" className="mt-0">
          <Section title="Monthly package">
            {p.client.monthly_fee && <p className="mb-4 text-sm text-muted-foreground">Monthly package: <span className="font-medium text-foreground">{money(p.client.monthly_fee)}</span></p>}
            {payMonths.length === 0 ? <Empty>Payment plan coming soon.</Empty> : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {payMonths.map((m: Any) => (
                  <li key={m.key} className={`flex items-center justify-between rounded-md border px-4 py-3 text-sm ${m.paid ? "border-success/40 bg-success/5" : ""}`}>
                    <span className="font-medium">{m.label}</span>
                    <span className={`text-xs font-medium ${m.paid ? "text-success" : "text-muted-foreground"}`}>{m.paid ? "Paid" : "Upcoming"}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </TabsContent>

        <TabsContent value="help" className="mt-0 space-y-8">
          <WhatNew p={p} token={token} />
          <Section title="Need help?">
            <p className="text-sm text-muted-foreground">Questions about fixtures, graphics or payments? Email the studio at <a className="font-medium text-primary underline-offset-2 hover:underline" href="mailto:natalie@nine3designs.co.uk">natalie@nine3designs.co.uk</a> and we’ll get back to you quickly.</p>
          </Section>
        </TabsContent>
      </Tabs>
      {openFx && <FxModal f={openFx} token={token} onClose={() => setOpenFx(null)} />}
      {reqOpen && <ReqModal token={token} onClose={() => setReqOpen(false)} />}
    </div>
  );
}

function Kit({ label, k, away }: { label: string; k: Any; away?: Any }) {
  const cols = (["primary", "secondary", "accent"] as const).filter((c) => k?.[c]);
  const acols = away ? (["primary", "secondary", "accent"] as const).filter((c) => away?.[c]) : [];
  const block = (kit: Any, list: typeof cols, title?: string) => (
    <div>
      {title && <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>}
      {kit?.badge && <img src={kit.badge} alt={`${title ?? label} badge`} className="mb-3 h-16 w-16 rounded-md border bg-white object-contain" />}
      {list.length === 0 ? <p className="text-sm text-muted-foreground">Not set yet.</p> : (
        <div className="flex flex-wrap gap-3">{list.map((c) => (
          <div key={c} className="text-center"><div className="h-12 w-12 rounded-md border" style={{ background: kit[c] }} /><p className="mt-1 text-xs capitalize text-muted-foreground">{c}</p><p className="text-[10px] uppercase text-muted-foreground">{kit[c]}</p></div>
        ))}</div>
      )}
      {kit?.notes && <p className="mt-3 text-sm text-muted-foreground">{kit.notes}</p>}
    </div>
  );
  return (
    <div className="rounded-md border bg-card p-5">
      <p className="eyebrow mb-3">{label}</p>
      <div className={away ? "grid grid-cols-2 gap-4" : ""}>
        {block(k, cols, away ? "Home" : undefined)}
        {away && block(away, acols, "Away")}
      </div>
    </div>
  );
}

function Fixture({ f, client, onOpen }: { f: Any; client?: Any; onOpen?: () => void }) {
  const g = (f.graphics ?? []) as { name: string; done: boolean; url?: string }[];
  const sheet = g.find((x) => x && x.name === "Team sheet") ?? null;
  const chips = g.filter((x) => x && x.name !== "Team sheet");
  const done = chips.filter((x) => x.done).length;
  const kit = client ? (f.venue === "home" ? client.home_kit : client.away_kit) : null;
  const dots = kit ? (["primary", "secondary"] as const).filter((c) => kit[c]) : [];
  const d = new Date(`${f.match_date}T00:00:00`);
  const pct = chips.length ? Math.round((done / chips.length) * 100) : 0;
  return (
    <li
      className="fx-card flex cursor-pointer gap-4 rounded-xl border p-4"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onOpen?.(); }}
    >
      <div className="fx-date flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border border-white/10 bg-white/[0.06]">
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#FFD520" }}>{d.toLocaleDateString("en-GB", { month: "short" })}</p>
        <p className="font-heading text-xl font-bold leading-none">{d.getDate()}</p>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-heading font-semibold tracking-tight">
            {f.venue === "home" ? "vs" : "away at"} {f.opponent}
          </p>
          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${f.venue === "home" ? "border-[#FFD520]/40 bg-[#FFD520]/10 text-[#FFD520]" : "border-sky-400/40 bg-sky-400/10 text-sky-300"}`}>
            {f.venue}{f.competition ? ` · ${f.competition}` : ""}
          </span>
        </div>
        {dots.length > 0 && (
          <span className="mt-1.5 flex gap-1">{dots.map((c) => <span key={c} className="h-2.5 w-2.5 rounded-full border border-white/40" style={{ background: kit[c] }} />)}</span>
        )}
        <div className="mt-2.5 flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: "#FFD520" }} /></div>
          <span className="text-[11px] text-white/60">{done}/{chips.length} ready</span>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">{chips.map((x, i) => (
          x.done && x.url ? (
            <a key={i} href={x.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success transition-transform hover:scale-105" title="Tap to download">
              <Download className="h-3 w-3" />{x.name}
            </a>
          ) : (
            <span key={i} className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${x.done ? "bg-success/15 text-success" : "bg-white/[0.06] text-white/50"}`}>{x.done && <Check className="h-3 w-3" />}{x.name}</span>
          )
        ))}</div>
        {sheet && (sheet.text || sheet.url) && (
          <p className="mt-2 text-[11px] text-white/50">Team sheet {sheet.text ? "info added" : ""}{sheet.text && sheet.url ? " · " : ""}{sheet.url ? "file uploaded" : ""}</p>
        )}
      </div>
    </li>
  );
}

function FxModal({ f, token, onClose }: { f: Any; token: string | null; onClose: () => void }) {
  const act = useAct(token);
  const g = (f.graphics ?? []) as Any[];
  const sheet = g.find((x) => x && x.name === "Team sheet") ?? null;
  const [text, setText] = useState<string>(sheet?.text ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const d = new Date(`${f.match_date}T00:00:00`);
  async function save() {
    setBusy(true);
    let path: string | undefined;
    if (file) {
      const r = (await act({ type: "uploadUrl", fileName: file.name })) as { path: string; uploadToken: string } | null;
      if (!r) { setBusy(false); return; }
      const { error } = await supabase.storage.from("files").uploadToSignedUrl(r.path, r.uploadToken, file);
      if (error) { toast.error(error.message); setBusy(false); return; }
      path = r.path;
    }
    const ok = await act({ type: "fixtureSheet", id: f.id, text: text.trim() || undefined, path, fileName: file?.name }, "Team sheet saved · thank you!");
    if (ok) onClose();
    setBusy(false);
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm md:items-center" onClick={onClose}>
      <div className="fx-modal max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-white/10 bg-[#0A1E38]/95 p-6 shadow-2xl backdrop-blur-xl md:rounded-2xl" onClick={(e: Any) => e.stopPropagation()}>
        <p className="eyebrow" style={{ color: "#FFD520" }}>{d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</p>
        <div className="mt-1 flex items-start justify-between gap-3">
          <h3 className="font-heading text-2xl font-bold tracking-tight text-white">{f.venue === "home" ? "vs" : "away at"} {f.opponent}</h3>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${f.venue === "home" ? "border-[#FFD520]/40 bg-[#FFD520]/10 text-[#FFD520]" : "border-sky-400/40 bg-sky-400/10 text-sky-300"}`}>{f.venue}</span>
          {f.competition && <span className="rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/70">{f.competition}</span>}
          {sheet?.url && <a href={sheet.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-[10px] font-semibold text-success"><Download className="h-3 w-3" />Current team sheet</a>}
        </div>
        {f.notes && <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.05] p-3 text-xs text-white/70">{f.notes}</p>}
        <div className="mt-5 space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-white/60">Team sheet info</label>
          <Textarea rows={4} value={text} onChange={(e: Any) => setText(e.target.value)} placeholder="Squad list, formations, availability, kick-off notes…" className="fx-sheet-input" />
        </div>
        <label className="mt-4 flex cursor-pointer flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#0A2547] shadow-sm transition-transform hover:scale-105"><Upload className="h-3.5 w-3.5" /> Choose file</span>
          <span className={`max-w-full truncate text-xs ${file ? "text-white" : "text-white/50"}`}>{file ? file.name : "Optional: attach a team sheet file (PDF or image)"}</span>
          <input type="file" className="hidden" onChange={(e: Any) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <div className="mt-6 flex gap-2">
          <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save team sheet"}</Button>
          <Button variant="ghost" onClick={onClose} className="text-white/70 hover:bg-white/10 hover:text-white">Cancel</Button>
        </div>
      </div>
    </div>
  );
}

function TodoList({ p, token }: { p: Any; token: string | null }) {
  const act = useAct(token);
  const [title, setTitle] = useState("");
  const tasks: Any[] = p.tasks ?? [];
  return (
    <Section title="Graphics to-do list">
      <form
        onSubmit={async (e: Any) => { e.preventDefault(); if (!title.trim()) return; const ok = await act({ type: "taskAdd", title: title.trim() }, "Added to the list"); if (ok) setTitle(""); }}
        className="mb-4 flex gap-2"
      >
        <Input value={title} onChange={(e: Any) => setTitle(e.target.value)} placeholder="Add something to the list…" />
        <Button type="submit" variant="outline"><Plus className="h-4 w-4" /> Add</Button>
      </form>
      {tasks.length === 0 ? <Empty>Nothing on the list yet.</Empty> : (
        <ul className="space-y-2">
          {tasks.map((tk: Any) => (
            <li key={tk.id} className="flex items-start gap-3 rounded-md border bg-card p-4">
              <button type="button" aria-label={tk.status === "done" ? "Mark as not done" : "Mark as done"} onClick={() => act({ type: "taskDone", id: tk.id, done: tk.status !== "done" })} className={`mt-0.5 rounded-full border p-0.5 transition ${tk.status === "done" ? "border-success bg-success text-white" : "border-muted-foreground/40 hover:border-primary"}`}><Check className="h-3.5 w-3.5" /></button>
              <div className="min-w-0 flex-1">
                <p className={`font-medium ${tk.status === "done" ? "text-muted-foreground line-through" : ""}`}>{tk.title}</p>
                {tk.notes && <p className="text-sm text-muted-foreground">{tk.notes}</p>}
                <p className="mt-1 text-xs capitalize text-muted-foreground">{tk.priority} priority{tk.due_date ? ` · by ${fmtDate(tk.due_date)}` : ""}</p>
              </div>
              <button type="button" aria-label="Remove item" onClick={() => { if (confirm("Remove this item?")) act({ type: "taskDelete", id: tk.id }, "Removed"); }} className="rounded-full p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function NotesCard({ p, token }: { p: Any; token: string | null }) {
  const act = useAct(token);
  const [text, setText] = useState<string>(p.client.notes ?? "");
  return (
    <Section title="Notes">
      <Textarea rows={5} value={text} onChange={(e: Any) => setText(e.target.value)} placeholder="Anything you want the studio to know…" />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button onClick={() => act({ type: "clientNote", text }, "Notes saved")} disabled={text === (p.client.notes ?? "")}>Save notes</Button>
        <p className="text-xs text-muted-foreground">You and the studio can both edit this.</p>
      </div>
    </Section>
  );
}

function ReqModal({ token, onClose }: { token: string | null; onClose: () => void }) {
  const act = useAct(token);
  const [what, setWhat] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  async function send() {
    if (!what.trim()) return;
    setBusy(true);
    const ok = await act({ type: "newRequest", title: what.trim(), notes: notes.trim() || undefined }, "Request sent · we'll get straight on it");
    if (ok) onClose();
    setBusy(false);
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm md:items-center" onClick={onClose}>
      <div className="fx-modal max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-white/10 bg-[#0A1E38]/95 p-6 shadow-2xl backdrop-blur-xl md:rounded-2xl" onClick={(e: Any) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-heading text-2xl font-bold tracking-tight text-white">New graphic request</h3>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-5 space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-white/60">What do you need?</label>
          <Input value={what} onChange={(e: Any) => setWhat(e.target.value)} placeholder="e.g. Matchday graphic for Saturday" className="fx-sheet-input" />
        </div>
        <div className="mt-4 space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-white/60">Details</label>
          <Textarea rows={4} value={notes} onChange={(e: Any) => setNotes(e.target.value)} placeholder="Names, date, anything specific…" className="fx-sheet-input" />
        </div>
        <div className="mt-6 flex gap-2">
          <Button onClick={send} disabled={busy || !what.trim()}>{busy ? "Sending…" : "Send request"}</Button>
          <Button variant="ghost" onClick={onClose} className="text-white/70 hover:bg-white/10 hover:text-white">Cancel</Button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Portal experience upgrades ---------------- */
function PortalLoader() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center py-24 text-center">
      <div className="load-orb relative flex items-center justify-center rounded-full">
        <img src={LOGO_URL} alt="Nine3 Designs" className="portal-logo-load h-14 w-auto md:h-16" />
      </div>
      <p className="eyebrow mt-8">Preparing your portal</p>
      <div className="load-bar mt-4"><span /></div>
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
          <p className="mt-1 text-sm opacity-80">Everything's signed off · your final files are yours to keep. Download them below or save your favourites.</p>
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
      {shown.length === 0 ? <Empty>Nothing saved yet · tap the heart on any file.</Empty> : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {shown.map((f: Any) => {
            const isFav = favs.includes(f.id);
            return (
              <div key={f.id} className="relative overflow-hidden rounded-md border bg-card">
                <Preview f={f} />
                <button type="button" aria-label={isFav ? "Remove favourite" : "Save favourite"} onClick={() => act({ type: "favourite", id: f.id, on: !isFav })} className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 shadow-sm transition-transform hover:scale-110">
                  <Heart className={`h-3.5 w-3.5 ${isFav ? "fill-current" : ""}`} />
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
      const ok = await act({ type: "bookCall", kind: v.kind, date: v.date, time: v.time || undefined, notes: v.notes || undefined }, "Call requested · we'll confirm within one working day.");
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
  const draftKey = `nine3-q-draft-${p.client?.id ?? "anon"}`;
  const [v, setV] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem(draftKey) ?? "{}"); } catch { return {}; }
  });
  const [savedTick, setSavedTick] = useState(false);
  const [busy, setBusy] = useState(false);
  const done = (p.activity ?? []).some((a: Any) => /questionnaire/i.test(a.message ?? ""));

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      if (Object.keys(v).length) {
        try { localStorage.setItem(draftKey, JSON.stringify(v)); } catch { /* private mode */ }
        setSavedTick(true);
      }
    }, 700);
    return () => clearTimeout(t);
  }, [v, open, draftKey]);

  useEffect(() => {
    if (!open) return;
    const h = (e: BeforeUnloadEvent) => {
      if (Object.values(v).some((x) => x?.trim())) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [open, v]);

  return (
    <Section title="Brand questionnaire">
      {done ? (
        <div className="flex items-start gap-3 text-sm"><ClipboardList className="mt-0.5 h-4 w-4 text-success" /><p>Questionnaire received · thank you! We'll use it to shape your concepts.</p></div>
      ) : open ? (
        <form className="space-y-3" onSubmit={async (e) => {
          e.preventDefault(); setBusy(true);
          const ok = await act({ type: "questionnaire", answers: v }, "Questionnaire sent · thank you!");
          if (ok) setOpen(false);
          setBusy(false);
        }}>
          {Q_FIELDS.map((f) => (
            <div key={f.key} className="space-y-1"><Label className="text-xs">{f.label}</Label><Textarea rows={2} value={v[f.key] ?? ""} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} /></div>
          ))}
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={busy}>{busy ? "Sending…" : "Send answers"}</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Later</Button>
            {savedTick && <span className="ml-auto flex items-center gap-1 text-xs text-success"><Check className="h-3.5 w-3.5" /> All changes saved</span>}
          </div>
          <p className="text-xs text-muted-foreground">Your answers save automatically as you type · come back any time.</p>
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
  { q: "How do I send you files, photos or content?", a: "Use the upload box in Files. Brand assets, copy, photos · anything. It comes straight to us and we get notified." },
  { q: "How do downloads work?", a: "Every finished file is in your download centre with a download button. Tap the heart to save favourites so you can find them again quickly." },
  { q: "When are invoices issued?", a: "Invoices appear here as soon as they're issued, usually monthly. Paid and outstanding amounts are always visible." },
  { q: "Can I book a call?", a: "Yes · choose discovery call or design review, pick a date and we'll confirm by email within one working day." },
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
