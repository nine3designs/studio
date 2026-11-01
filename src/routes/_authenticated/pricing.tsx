import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Empty, FormDialog, PageHeader, QuickForm } from "@/components/common";
import { useRemove, useRows, useSave } from "@/lib/db";
import { money } from "@/lib/format";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

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
  const [openId, setOpenId] = useState<string | null>(null);
  const [features, setFeatures] = useState("");

  const open = (r: Any) => { setFeatures(((r.features as string[]) ?? []).join("\n")); setEditing(r); };
  const fields = [
    { name: "name", label: "Package name", required: true },
    { name: "price", label: "Price (£)", type: "number" as const, required: true },
    { name: "billing", label: "Billing", type: "select" as const, required: true, options: BILLING },
    { name: "description", label: "Short description", type: "textarea" as const },
  ];

  const packages = rows.filter((r: Any) => !String(r.name).startsWith("Extra ·"));
  const extras = rows.filter((r: Any) => String(r.name).startsWith("Extra ·"));

  const GlassCard = ({ r }: { r: Any }) => (
    <button
      type="button"
      onClick={() => setOpenId(r.id)}
      className={`zd-card group flex min-h-36 flex-col items-start justify-between rounded-2xl border border-white/70 bg-white/55 p-5 text-left shadow-[0_10px_30px_-18px_rgba(23,75,80,.35)] backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:bg-white/80 hover:shadow-[0_18px_44px_-18px_rgba(23,75,80,.45)] ${r.active ? "" : "opacity-45"}`}
    >
      <span className="text-[10px] font-semibold uppercase tracking-widest text-primary/70">{String(r.name).startsWith("Extra ·") ? "Extra" : "Package"}{r.active ? "" : " · hidden"}</span>
      <span className="mt-3 block font-heading text-base font-bold leading-snug tracking-tight text-primary-deep">{r.name.replace(/^Extra · /, "")}</span>
      <span className="mt-2 font-heading text-2xl font-bold tabular-nums tracking-tight text-primary-deep md:text-[1.7rem]">
        {money(r.price)}<span className="text-xs font-medium text-muted-foreground">{suffix[r.billing] ?? ""}</span>
      </span>
      <span className="mt-3 text-[11px] font-semibold text-primary underline-offset-4 group-hover:underline">Tap to view · edit</span>
    </button>
  );

  const detail = rows.find((r: Any) => r.id === openId);

  const Grid = ({ list, title }: { list: Any[]; title: string }) => list.length === 0 ? null : (
    <section className="mb-10">
      <h2 className="mb-4 font-heading text-lg font-bold tracking-tight text-primary-deep">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {list.map((r: Any) => <GlassCard key={r.id} r={r} />)}
      </div>
    </section>
  );

  return (
    <div className="pricing-glass-wrap rounded-3xl p-4 sm:p-6">
      <PageHeader eyebrow="Sales" title="Pricing" subtitle="Your packages · pull them into proposals with one click. Tap any card to see the details." action={<Button onClick={() => open({ billing: "one-off", active: true })}><Plus className="h-4 w-4" /> New package</Button>} />
      <FormDialog title={editing?.id ? "Edit package" : "New package"} open={!!editing} onOpenChange={(o: boolean) => !o && setEditing(null)}>
        {editing && <>
          <div className="mb-4 space-y-1.5"><Label>What's included (one per line)</Label><Textarea rows={5} value={features} onChange={(e: Any) => setFeatures(e.target.value)} /></div>
          <QuickForm fields={fields} initial={editing} onSubmit={async (v: Any) => {
            await save.mutateAsync({ ...v, features: features.split("\n").map((s: string) => s.trim()).filter(Boolean) }); setEditing(null);
          }} />
        </>}
      </FormDialog>
      {rows.length === 0 ? <Empty>No packages yet.</Empty> : (
        <>
          <Grid list={packages} title="Packages" />
          <Grid list={extras} title="Extras" />
        </>
      )}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm md:items-center md:p-6" onClick={() => setOpenId(null)}>
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-white/70 bg-white/90 p-7 shadow-[0_40px_90px_-20px_rgba(23,75,80,.5)] backdrop-blur-xl md:rounded-3xl" onClick={(e: Any) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">{String(detail.name).startsWith("Extra ·") ? "Extra" : "Package"}</p>
                <h3 className="mt-1 font-heading text-2xl font-bold tracking-tight text-primary-deep">{detail.name}</h3>
              </div>
              <button type="button" onClick={() => setOpenId(null)} className="rounded-full p-1.5 text-muted-foreground transition hover:bg-accent hover:text-primary" aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <p className="mt-4 font-heading text-4xl font-bold tabular-nums tracking-tight text-primary-deep">{money(detail.price)}<span className="text-sm font-medium text-muted-foreground">{suffix[detail.billing] ?? ""}</span></p>
            {detail.description && <p className="mt-3 text-sm text-muted-foreground">{detail.description}</p>}
            {(detail.features ?? []).length > 0 && (
              <ul className="mt-5 space-y-2">{(detail.features as string[]).map((f: string, i: number) => <li key={i} className="flex gap-2.5 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{f}</li>)}</ul>
            )}
            <p className="mt-5 text-xs text-muted-foreground">{detail.active ? "Offered · shows in proposals" : "Not currently offered"}</p>
            <div className="mt-6 flex flex-wrap gap-2 border-t border-border/60 pt-5">
              <Button onClick={() => open(detail)}><Pencil className="h-4 w-4" /> Edit</Button>
              <Button variant="outline" onClick={() => save.mutate({ id: detail.id, active: !detail.active })}>{detail.active ? "Hide from proposals" : "Offer this"}</Button>
              <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => { if (confirm("Delete package?")) { remove.mutate(detail.id); setOpenId(null); } }}><Trash2 className="h-4 w-4" /> Delete</Button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        .pricing-glass-wrap { background: linear-gradient(150deg,#F5F1E8 0%,#EFECE5 40%,#DCE9E5 100%); }
        @media (max-width: 640px) { .pricing-glass-wrap { padding: 1rem !important; } }
      `}</style>
    </div>
  );
}
