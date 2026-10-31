import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock, Check, FileText, PiggyBank, Receipt, TrendingUp, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Empty } from "@/components/common";
import { useRows, useSave } from "@/lib/db";
import { money } from "@/lib/format";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export const Route = createFileRoute("/_authenticated/payments")({
  head: () => ({ meta: [{ title: "Monthly payments · Nine3 Studio" }] }),
  component: Payments,
});

type MonthRow = { key: string; label: string; short?: string; amount: number; paid: boolean; paidAt?: string; invoiced: boolean; invoicedAt?: string; overdue: boolean };

function buildMonths(c: Any, today: Date): MonthRow[] {
  const cfg = c.portal_prefs?.monthly_config ?? null;
  if (!cfg?.start || !cfg?.count) return [];
  const amount = Number(cfg.amount ?? c.monthly_fee ?? 0);
  const monthly = (c.portal_prefs?.monthly ?? {}) as Record<string, Any>;
  const [y, m] = String(cfg.start).split("-").map(Number);
  const rows: MonthRow[] = [];
  for (let i = 0; i < Number(cfg.count); i++) {
    const d = new Date(Date.UTC(y, m - 1 + i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const e = monthly[key] ?? {};
    rows.push({
      key,
      label: d.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }),
      short: d.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }),
      amount: Number(e.amount ?? amount),
      paid: !!e.paid,
      paidAt: e.paid_at,
      invoiced: !!e.invoiced,
      invoicedAt: e.invoiced_at,
      overdue: !e.paid && !!e.invoiced && d.getTime() < Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1),
    });
  }
  return rows;
}

function Kpi({ label, value, sub, icon: Icon, tone }: { label: string; value: string; sub?: string; icon: any; tone: string }) {
  return (
    <div className="zd-card flex flex-col rounded-2xl border border-white/60 bg-white/70 p-4 shadow-[0_10px_30px_-18px_rgba(23,75,80,.35)] backdrop-blur">
      <div className="flex items-center justify-between">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4 w-4" /></span>
        {sub && <span className="text-[11px] font-medium text-muted-foreground">{sub}</span>}
      </div>
      <p className="mt-3 font-heading text-2xl font-bold tabular-nums tracking-tight text-primary-deep md:text-3xl">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

function Donut({ pct }: { pct: number }) {
  const r = 42, c = 2 * Math.PI * r, off = c * (1 - Math.min(100, Math.max(0, pct)) / 100);
  return (
    <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(23,75,80,.1)" strokeWidth="9" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="url(#goldgrad)" strokeWidth="9" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} style={{ transition: "stroke-dashoffset 1s ease" }} />
        <defs><linearGradient id="goldgrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#174B50" /><stop offset="100%" stopColor="#B7C2C4" /></linearGradient></defs>
      </svg>
      <div className="absolute text-center"><p className="font-heading text-2xl font-bold text-primary-deep">{pct}%</p><p className="text-[10px] uppercase tracking-widest text-muted-foreground">collected</p></div>
    </div>
  );
}

function CashChart({ rows }: { rows: { short: string; collected: number; scheduled: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => Math.max(r.scheduled, r.collected)));
  return (
    <div>
      <div className="flex h-44 items-end gap-1.5 sm:gap-2">
        {rows.map((r) => (
          <div key={r.short + r.scheduled} className="flex min-w-0 flex-1 flex-col items-center gap-1.5" title={`${r.short} · collected ${money(r.collected)} of ${money(r.scheduled)}`}>
            <div className="relative flex w-full max-w-10 flex-1 items-end">
              {r.scheduled > 0 && <div className="absolute inset-x-0 bottom-0 rounded-t-lg border border-dashed border-primary/30 bg-primary/5" style={{ height: `${Math.max(3, (r.scheduled / max) * 100)}%` }} />}
              {r.collected > 0 && <div className="relative w-full rounded-t-lg bg-gradient-to-t from-[#123E42] to-[#1E5F66] shadow-[0_6px_16px_-6px_rgba(23,75,80,.5)]" style={{ height: `${Math.max(3, (r.collected / max) * 100)}%` }} />}
            </div>
            <span className="truncate text-[9px] font-medium uppercase tracking-wide text-muted-foreground">{r.short}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-gradient-to-t from-[#123E42] to-[#1E5F66]" /> Collected</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border border-dashed border-primary/40 bg-primary/5" /> Scheduled</span>
      </div>
    </div>
  );
}

function Payments() {
  const clients = useRows("clients").data ?? [];
  const save = useSave("clients");
  const sports = clients.filter((c: Any) => c.portal_type === "sports" && c.monthly_fee);

  async function toggle(c: Any, month: MonthRow) {
    const prefs = { ...(c.portal_prefs ?? {}) };
    const monthly = { ...(prefs.monthly ?? {}) };
    const entry = { ...(monthly[month.key] ?? {}) };
    if (entry.paid) {
      delete entry.paid;
      delete entry.paid_at;
    } else {
      entry.paid = true;
      entry.paid_at = new Date().toISOString().slice(0, 10);
    }
    monthly[month.key] = entry;
    await save.mutateAsync({ id: c.id, portal_prefs: { ...prefs, monthly } });
    toast.success(entry.paid ? `${month.label} marked as paid · ${money(month.amount)}` : `${month.label} marked as unpaid`);
  }

  async function toggleInvoiced(c: Any, month: MonthRow) {
    const prefs = { ...(c.portal_prefs ?? {}) };
    const monthly = { ...(prefs.monthly ?? {}) };
    const entry = { ...(monthly[month.key] ?? {}) };
    if (entry.invoiced) {
      delete entry.invoiced;
      delete entry.invoiced_at;
    } else {
      entry.invoiced = true;
      entry.invoiced_at = new Date().toISOString().slice(0, 10);
    }
    monthly[month.key] = entry;
    await save.mutateAsync({ id: c.id, portal_prefs: { ...prefs, monthly } });
    toast.success(entry.invoiced ? `Invoice marked sent · ${month.label}` : `${month.label} marked not invoiced`);
  }

  const today = new Date();
  let totalEarned = 0, outstandingTotal = 0, overdueTotal = 0, scheduledTotal = 0;
  const monthMap = new Map<string, { short: string; collected: number; scheduled: number; order: string }>();
  for (const c of sports) {
    for (const m of buildMonths(c, today)) {
      scheduledTotal += m.amount;
      if (m.paid) totalEarned += m.amount; else if (m.invoiced) outstandingTotal += m.amount;
      if (m.overdue) overdueTotal += m.amount;
      const e = monthMap.get(m.key) ?? { short: m.short ?? m.key, collected: 0, scheduled: 0, order: m.key };
      e.scheduled += m.amount;
      if (m.paid) e.collected += m.amount;
      monthMap.set(m.key, e);
    }
  }
  const chartRows = Array.from(monthMap.values()).sort((a, b) => a.order.localeCompare(b.order)).slice(-12);
  const pct = scheduledTotal ? Math.round((totalEarned / scheduledTotal) * 100) : 0;
  const runRate = sports.reduce((s, c) => s + Number(c.monthly_fee ?? 0), 0);
  const nextDue: { client: Any; month: MonthRow } | null = (() => {
    let best: { client: Any; month: MonthRow } | null = null;
    for (const c of sports) {
      const m = buildMonths(c, today).find((x) => !x.paid);
      if (m && (!best || m.key < best.month.key)) best = { client: c, month: m };
    }
    return best;
  })();

  return (
    <div className="dash-wrap relative overflow-hidden rounded-3xl p-4 sm:p-6 lg:p-8">
      <div className="dash-glow" aria-hidden="true" />
      <header className="relative mb-6">
        <p className="eyebrow">Accounting</p>
        <h1 className="font-heading mt-1 text-3xl font-bold tracking-tight text-primary-deep md:text-4xl">Money dashboard</h1>
        <div className="dash-underline mt-2" />
      </header>

      {sports.length === 0 ? <Empty>No monthly-package clients yet.</Empty> : (
        <div className="relative space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Total earned" value={money(totalEarned)} icon={PiggyBank} tone="bg-success/10 text-success" />
            <Kpi label="Outstanding" value={money(outstandingTotal)} icon={Receipt} tone="bg-gold/15 text-gold-foreground" />
            <Kpi label="Overdue" value={money(overdueTotal)} icon={TriangleAlert} tone={overdueTotal > 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"} />
            <Kpi label="Monthly run-rate" value={money(runRate)} icon={TrendingUp} tone="bg-primary/10 text-primary" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <section className="zd-card rounded-2xl border border-white/60 bg-white/70 p-5 shadow-[0_10px_30px_-18px_rgba(23,75,80,.35)] backdrop-blur lg:col-span-2">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-heading text-lg font-bold tracking-tight text-primary-deep">Cash flow</h2>
                  <p className="text-xs text-muted-foreground">Collected vs scheduled · last 12 months</p>
                </div>
                {nextDue && (
                  <span className="hidden items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary sm:flex">
                    <CalendarClock className="h-3.5 w-3.5" /> Next due {nextDue.month.label} · {nextDue.client.name}
                  </span>
                )}
              </div>
              {chartRows.length === 0 ? <Empty>No payment schedule yet.</Empty> : <CashChart rows={chartRows} />}
            </section>

            <section className="zd-card flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/60 bg-white/70 p-5 text-center shadow-[0_10px_30px_-18px_rgba(23,75,80,.35)] backdrop-blur">
              <h2 className="font-heading self-start text-lg font-bold tracking-tight text-primary-deep">Progress</h2>
              <Donut pct={pct} />
              <p className="text-xs text-muted-foreground">Projected package income <span className="font-semibold text-primary-deep">{money(scheduledTotal)}</span></p>
              <p className="text-[11px] text-muted-foreground">Run-rate forecast · {money(runRate * 12)}/yr at current packages</p>
            </section>
          </div>

          {sports.map((c: Any) => {
            const months = buildMonths(c, today);
            const paid = months.filter((m) => m.paid).reduce((s, m) => s + m.amount, 0);
            const overdue = months.filter((m) => m.overdue).reduce((s, m) => s + m.amount, 0);
            const total = months.reduce((s, m) => s + m.amount, 0);
            const cpct = total ? Math.round((paid / total) * 100) : 0;
            const nextDueC = months.find((m) => !m.paid);
            return (
              <section key={c.id} className="zd-card rounded-2xl border border-white/60 bg-white/70 p-5 shadow-[0_10px_30px_-18px_rgba(23,75,80,.35)] backdrop-blur">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="eyebrow">Monthly package · {money(c.monthly_fee)}/mo</p>
                    <h2 className="font-heading mt-0.5 text-2xl font-bold text-primary-deep">{c.name}</h2>
                    {nextDueC && <p className="mt-1 text-sm text-muted-foreground">Next due {nextDueC.label}</p>}
                  </div>
                  <div className="w-full max-w-xs">
                    <div className="zd-progress"><span style={{ width: `${cpct}%` }} /></div>
                    <p className="mt-1 text-right text-[11px] font-semibold text-muted-foreground">{cpct}% collected</p>
                  </div>
                </div>
                {overdue > 0 && (
                  <p className="mb-4 flex items-center gap-2 rounded-xl bg-destructive/10 px-3.5 py-2.5 text-xs font-semibold text-destructive"><TriangleAlert className="h-3.5 w-3.5" /> {money(overdue)} overdue · chase before the next drop</p>
                )}
                {months.length === 0 ? <Empty>Set a start month for this package (ask Juno to seed it).</Empty> : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {months.map((m) => (
                      <button
                        type="button"
                        key={m.key}
                        onClick={() => toggle(c, m)}
                        aria-label={m.paid ? `Mark ${m.label} unpaid` : `Mark ${m.label} paid`}
                        className={`group relative rounded-2xl border p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                          m.paid ? "border-success/40 bg-success/5" : m.overdue ? "border-destructive/40 bg-destructive/5" : "bg-card"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-[11px] font-semibold uppercase tracking-widest ${m.paid ? "text-success" : m.overdue ? "text-destructive" : "text-muted-foreground"}`}>
                            {m.paid ? "Paid" : m.overdue ? "Overdue" : "Due"}
                          </p>
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all ${
                              m.paid ? "border-success bg-success text-white" : m.overdue ? "border-destructive/50" : "border-muted-foreground/30 group-hover:border-success"
                            }`}
                          >
                            {m.paid && <Check className="h-4 w-4" />}
                          </span>
                        </div>
                        <p className="mt-2 font-heading text-2xl font-bold tabular-nums text-foreground">{money(m.amount)}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">{m.label}</p>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          {m.paidAt ? <p className="text-[11px] text-muted-foreground">Cleared {m.paidAt}</p> : <span />}
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(ev) => { ev.stopPropagation(); toggleInvoiced(c, m); }}
                            onKeyDown={(ev) => { if (ev.key === "Enter") { ev.stopPropagation(); toggleInvoiced(c, m); } }}
                            className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${m.invoiced ? "border-success/40 bg-success/10 text-success" : "border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary"}`}
                          >
                            <FileText className="h-3 w-3" /> {m.invoiced ? "Invoice sent" : "Mark invoiced"}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
