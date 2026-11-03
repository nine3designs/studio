import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronDown, ClipboardList, Clock, FileText, Menu, Pencil, Play, Plus, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/common";
import { supabase } from "@/integrations/supabase/client";
import { portalAction } from "@/lib/portal.functions";
import { effectiveStatus, fmtDate, invoiceTotals, money, type LineItem } from "@/lib/format";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

const COLUMNS = [
  { key: "todo", label: "To Do" },
  { key: "doing", label: "In Progress" },
  { key: "done", label: "Done" },
] as const;
type ColKey = (typeof COLUMNS)[number]["key"];

const londonDay = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date(iso));

function weekStart(dayKey: string) {
  const d = new Date(dayKey + "T12:00:00Z");
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

function fmtMins(mins: number) {
  const m = Math.max(0, Math.round(Number(mins) || 0));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h && r) return `${h}h ${r}m`;
  if (h) return `${h}h`;
  return `${r}m`;
}

function hms(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function relDay(iso: string) {
  const day = londonDay(iso);
  const today = londonDay(new Date().toISOString());
  if (day === today) return "Today";
  const yesterday = new Date(Date.now() - 86400000);
  if (day === londonDay(yesterday.toISOString())) return "Yesterday";
  return new Date(day + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

type Act = (action: Any, success?: string) => Promise<Any | null>;

export function PMPortal({ p, token }: { p: Any; token: string | null }) {
  const act0 = useServerFn(portalAction);
  const qc = useQueryClient();
  const act: Act = async (action, success) => {
    try {
      const r = await act0({ data: { token, action } });
      await qc.invalidateQueries({ queryKey: ["portal", token] });
      if (success) toast.success(success);
      return r;
    } catch (e) { toast.error((e as Error).message); return null; }
  };

  const prefs = p.client.portal_prefs ?? {};
  const rate = Number(prefs.rate ?? 17);
  const badge = p.client.home_kit?.badge as string | undefined;

  const [viewer, setViewer] = useState<"Sara" | "Natalie">("Sara");
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const uid = data.session?.user?.id;
        if (!uid) return;
        const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: uid, _role: "admin" });
        if (isAdmin) setViewer("Natalie");
      } catch { /* stay as client viewer */ }
    })();
  }, []);

  const [tab, setTab] = useState<"dashboard" | "board" | "time">(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    return t === "board" || t === "time" ? t : "dashboard";
  });
  const [menuOpen, setMenuOpen] = useState(false);

  const entries: Any[] = p.time ?? [];
  const cards: Any[] = p.board ?? [];
  const running = entries.find((e: Any) => !e.ended_at);
  const doneEntries = entries.filter((e: Any) => e.ended_at && Number(e.minutes) > 0);
  const unbilled = doneEntries.filter((e: Any) => !e.billed);
  const unbilledMins = unbilled.reduce((s: number, e: Any) => s + Number(e.minutes), 0);

  const [, setTick] = useState(0);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [running?.id]);

  const stats = useMemo(() => {
    const today = londonDay(new Date().toISOString());
    const thisWeek = weekStart(today);
    const thisMonth = today.slice(0, 7);
    let week = 0, month = 0;
    for (const e of doneEntries) {
      const day = londonDay(e.started_at ?? e.created_at);
      if (weekStart(day) === thisWeek) week += Number(e.minutes);
      if (day.slice(0, 7) === thisMonth) month += Number(e.minutes);
    }
    const open = cards.filter((c: Any) => c.status !== "done").length;
    return { week, month, open, thisWeek };
  }, [p.time, p.board]);

  const weeks = useMemo(() => {
    const out: { key: string; label: string; mins: number }[] = [];
    const base = new Date(stats.thisWeek + "T12:00:00Z");
    for (let i = 5; i >= 0; i--) {
      const d = new Date(base);
      d.setUTCDate(d.getUTCDate() - i * 7);
      const key = d.toISOString().slice(0, 10);
      let mins = 0;
      for (const e of doneEntries) if (weekStart(londonDay(e.started_at ?? e.created_at)) === key) mins += Number(e.minutes);
      const start = new Date(key + "T12:00:00Z");
      out.push({ key, label: "w/c " + start.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" }), mins });
    }
    return out;
  }, [p.time]);

  const maxWeek = Math.max(60, ...weeks.map((w) => w.mins));

  const tabs = [
    { v: "dashboard", l: "Dashboard" },
    { v: "board", l: "To-Do Board" },
    { v: "time", l: "Time & Invoices" },
  ];

  return (
    <div className="pm">
      <style>{PM_STYLES}</style>

      <div className="mb-6 md:hidden">
        <button type="button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} className="flex w-full items-center justify-between rounded-xl border bg-card px-4 py-3 text-sm font-medium">
          <span className="flex items-center gap-2"><Menu className="h-4 w-4" />{tabs.find((t) => t.v === tab)?.l}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
        </button>
        {menuOpen && (
          <div className="mt-2 space-y-1 rounded-xl border bg-card p-2">
            {tabs.map((t) => (
              <button key={t.v} type="button" onClick={() => { setTab(t.v as Any); setMenuOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); }} className={`block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-accent ${t.v === tab ? "bg-[#eef0f2] font-semibold text-[#0d1c34]" : ""}`}>
                {t.l}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="hidden md:flex md:gap-1 md:rounded-full md:bg-[#e6e8ea] md:p-1 md:w-fit mb-6">
        {tabs.map((t) => (
          <button key={t.v} type="button" onClick={() => setTab(t.v as Any)} className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${t.v === tab ? "bg-white text-[#0d1c34] shadow-sm" : "text-[#5e5e5e] hover:text-[#0d1c34]"}`}>
            {t.l}
          </button>
        ))}
      </div>

      {tab === "dashboard" && (
        <Dashboard p={p} stats={stats} weeks={weeks} maxWeek={maxWeek} rate={rate} unbilledMins={unbilledMins} running={running} viewer={viewer} badge={badge} go={setTab} />
      )}
      {tab === "board" && <Board p={p} viewer={viewer} act={act} go={setTab} />}
      {tab === "time" && <TimeTab entries={entries} running={running} unbilledMins={unbilledMins} rate={rate} viewer={viewer} act={act} cards={cards} invoices={p.invoices} />}
    </div>
  );
}

/* ---------------- styles ---------------- */

const PM_STYLES = `
.pm { --pm-navy:#0d1c34; --pm-navy2:#1e3050; --pm-orange:#f59a2b; --pm-orange-deep:#d97406; --pm-soft:#eef0f2; --pm-ink:#1f2630; --pm-muted:#5e5e5e; --pm-line:#e6e8ea; }
.pm { color: var(--pm-ink); font-family: 'Poppins', sans-serif; }
.pm h1, .pm h2, .pm h3 { font-family: 'Playfair Display', serif; color: var(--pm-navy); }
.pm .pm-hero { background: linear-gradient(135deg, #0d1c34 0%, #1e3050 62%, #2f3844 130%); border-radius: 1.4rem; color: #fff; box-shadow: 0 18px 44px rgba(13,28,52,.28); }
.pm .pm-hero h1, .pm .pm-hero h2, .pm .pm-hero h3 { color: #fff; }
.pm .pm-eyebrow { color: var(--pm-orange); font-size: .65rem; font-weight: 600; letter-spacing: .35em; text-transform: uppercase; }
.pm .pm-tile { background: #fff; border: 1px solid var(--pm-line); border-radius: 1.25rem; box-shadow: 0 6px 20px rgba(13,28,52,.05); }
.pm .pm-tile-icon { width: 2.5rem; height: 2.5rem; display: flex; align-items: center; justify-content: center; border-radius: .9rem; background: rgba(245,154,43,.12); color: var(--pm-orange-deep); flex: none; }
.pm .pm-tile-icon.navy { background: rgba(13,28,52,.07); color: var(--pm-navy); }
.pm .pm-col { background: var(--pm-soft); border-radius: 1.25rem; padding: .9rem; min-height: 120px; }
.pm .pm-col.drop { outline: 2px dashed var(--pm-orange); outline-offset: 2px; }
.pm .pm-card { background: #fff; border: 1px solid var(--pm-line); border-radius: .95rem; box-shadow: 0 3px 12px rgba(13,28,52,.05); }
.pm .pm-btn { background: var(--pm-navy); color: #fff; border-radius: 999px; font-weight: 500; font-size: .875rem; }
.pm .pm-btn:hover { background: var(--pm-navy2); }
.pm .pm-btn-orange { background: var(--pm-orange); color: #3d2400; border-radius: 999px; font-weight: 500; font-size: .875rem; }
.pm .pm-btn-orange:hover { background: var(--pm-orange-deep); color: #fff; }
.pm .pm-chip { display: inline-flex; align-items: center; gap: .35rem; border-radius: 999px; background: rgba(13,28,52,.06); color: var(--pm-navy); font-size: .7rem; font-weight: 600; padding: .2rem .6rem; }
.pm .pm-chip.orange { background: rgba(245,154,43,.16); color: #a35803; }
.pm input, .pm textarea, .pm select { font-family: 'Poppins', sans-serif; }
.pm .timer-num { font-variant-numeric: tabular-nums; letter-spacing: .04em; }
.pm .pm-bar { background: var(--pm-navy); border-radius: 6px 6px 3px 3px; min-height: 4px; width: 100%; }
.pm .pm-bar.now { background: var(--pm-orange); }
.pm .pm-dot { width: .55rem; height: .55rem; border-radius: 999px; flex: none; }
.pm .clamp2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
`;

/* ---------------- dashboard ---------------- */

function Dashboard({ p, stats, weeks, maxWeek, rate, unbilledMins, running, viewer, badge, go }: Any) {
  const cards: Any[] = p.board ?? [];
  const upNext = cards.filter((c: Any) => c.status !== "done").sort((a: Any, b: Any) => a.position - b.position).slice(0, 4);
  const doneList = cards.filter((c: Any) => c.status === "done").sort((a: Any, b: Any) => String(b.updated_at).localeCompare(String(a.updated_at))).slice(0, 5);
  const activity: Any[] = (p.activity ?? []).slice(0, 6);
  const first = (p.client.name ?? "").split(" ")[0] || "Sara";

  return (
    <div className="space-y-5">
      <div className="pm-hero p-6 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            {badge ? <img src={badge} alt="Advanced Assessment & Solutions" className="h-14 w-auto max-w-[240px] self-start rounded-xl bg-white/95 px-3.5 py-2.5 object-contain shadow-lg md:self-auto" /> : null}
            <div>
              <p className="pm-eyebrow">Project portal</p>
              <h1 className="mt-1 text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: "'Playfair Display', serif" }}>Welcome back, {first}</h1>
              <p className="mt-1.5 text-sm text-white/60">Graphics & admin support · {money(rate)} per hour</p>
            </div>
          </div>
          <div className="md:ml-auto md:text-right">
            {running ? (
              <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur">
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#f59a2b]">On the clock</p>
                <p className="timer-num mt-1 text-2xl font-semibold text-white">{hms(Date.now() - Date.parse(running.started_at))}</p>
                {running.note ? <p className="mt-0.5 text-xs text-white/60">{running.note}</p> : null}
              </div>
            ) : (
              <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur">
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/50">Timer</p>
                <p className="mt-1 text-sm text-white/80">Not tracking right now</p>
              </div>
            )}
            {unbilledMins > 0 && (
              <p className="mt-2 text-xs text-white/60">{fmtMins(unbilledMins)} unbilled · {money((unbilledMins / 60) * rate)}</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Tile icon={<ClipboardList className="h-5 w-5" />} tone="navy" label="Open tasks" value={String(stats.open)} sub="on the board" />
        <Tile icon={<Clock className="h-5 w-5" />} label="This week" value={fmtMins(stats.week)} sub="hours logged" />
        <Tile icon={<CalendarDays className="h-5 w-5" />} tone="navy" label="This month" value={fmtMins(stats.month)} sub="hours logged" />
        <Tile icon={<FileText className="h-5 w-5" />} label="Unbilled" value={money((unbilledMins / 60) * rate)} sub={`${fmtMins(unbilledMins)} · ${money(rate)}/hr`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="pm-tile p-5 lg:col-span-2">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Hours · last 6 weeks</h2>
            <span className="pm-chip orange">{money(rate)}/hr</span>
          </div>
          <div className="mt-5 flex items-end justify-between gap-3" style={{ height: 130 }}>
            {weeks.map((w) => (
              <div key={w.key} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <span className="text-[10px] font-medium text-[#5e5e5e]">{w.mins ? fmtMins(w.mins) : ""}</span>
                <div className={w.key === stats.thisWeek ? "pm-bar now" : "pm-bar"} style={{ height: `${Math.max(3, (w.mins / maxWeek) * 92)}%` }} />
                <span className="text-center text-[10px] text-[#5e5e5e]">{w.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="pm-tile p-5">
          <h2 className="text-lg font-semibold">Up next</h2>
          {upNext.length === 0 ? <p className="mt-3 text-sm text-[#5e5e5e]">Nothing queued · add tasks on the board.</p> : (
            <ul className="mt-4 space-y-3">
              {upNext.map((c: Any) => (
                <li key={c.id} className="flex items-start gap-2.5">
                  <span className="pm-dot mt-1.5" style={{ background: c.status === "doing" ? "#f59a2b" : "#0d1c34" }} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.title}</p>
                    {c.notes ? <p className="clamp2 text-xs text-[#5e5e5e]">{c.notes}</p> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <button type="button" onClick={() => go("board")} className="mt-4 text-xs font-semibold text-[#d97406] hover:underline">Open the board ·</button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="pm-tile p-5">
          <h2 className="text-lg font-semibold">Recently completed</h2>
          {doneList.length === 0 ? <p className="mt-3 text-sm text-[#5e5e5e]">Finished tasks will collect here.</p> : (
            <ul className="mt-4 space-y-2.5">
              {doneList.map((c: Any) => (
                <li key={c.id} className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-[#0d1c34]"><Check className="h-3 w-3 text-white" /></span>
                  <p className="min-w-0 flex-1 truncate text-sm text-[#5e5e5e] line-through">{c.title}</p>
                  <span className="text-xs text-[#5e5e5e]">{fmtDate(c.updated_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="pm-tile p-5">
          <h2 className="text-lg font-semibold">Latest activity</h2>
          {activity.length === 0 ? <p className="mt-3 text-sm text-[#5e5e5e]">Activity will show here as you work together.</p> : (
            <ul className="mt-4 space-y-2.5">
              {activity.map((a: Any) => (
                <li key={a.id} className="flex items-baseline justify-between gap-3">
                  <p className="min-w-0 text-sm"><span className="font-medium">{a.actor === "client" ? "Sara" : a.actor}</span> <span className="text-[#5e5e5e]">{a.message}</span></p>
                  <span className="flex-none text-xs text-[#5e5e5e]">{fmtDate(a.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Tile({ icon, label, value, sub, tone }: { icon: Any; label: string; value: string; sub: string; tone?: "navy" }) {
  return (
    <div className="pm-tile p-4 md:p-5">
      <div className={`pm-tile-icon ${tone === "navy" ? "navy" : ""}`}>{icon}</div>
      <p className="mt-3 text-xs font-medium text-[#5e5e5e]">{label}</p>
      <p className="mt-0.5 text-xl font-semibold md:text-2xl" style={{ fontFamily: "'Playfair Display', serif" }}>{value}</p>
      <p className="mt-0.5 text-[11px] text-[#5e5e5e]">{sub}</p>
    </div>
  );
}

/* ---------------- board ---------------- */

function Board({ p, viewer, act, go }: { p: Any; viewer: string; act: Act; go: Any }) {
  const cards: Any[] = p.board ?? [];
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [composer, setComposer] = useState<ColKey | null>(null);
  const [editing, setEditing] = useState<Any | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const colCards = (key: string) => cards.filter((c: Any) => c.status === key).sort((a: Any, b: Any) => a.position - b.position || String(a.created_at).localeCompare(String(b.created_at)));

  async function dropInto(status: string, beforeId?: string) {
    if (!dragId) return;
    const ids = colCards(status).filter((c: Any) => c.id !== dragId).map((c: Any) => c.id);
    const idx = beforeId ? ids.indexOf(beforeId) : ids.length;
    ids.splice(idx < 0 ? ids.length : idx, 0, dragId);
    setOverCol(null); setDragId(null);
    await act({ type: "cardOrder", status, ids });
  }

  async function nudge(card: Any, dir: -1 | 1) {
    const order = COLUMNS.map((c) => c.key);
    const i = order.indexOf(card.status);
    const next = order[Math.min(order.length - 1, Math.max(0, i + dir))];
    if (!next || next === card.status) return;
    await act({ type: "cardEdit", id: card.id, status: next }, `Moved to ${COLUMNS.find((c) => c.key === next)?.label}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Task board</h2>
          <p className="pm-drag-hint mt-0.5 text-xs text-[#5e5e5e]">Drag cards between columns · or use the arrows on each card</p>
          <p className="pm-drag-hide mt-0.5 text-xs text-[#5e5e5e]">Use the arrows on each card to move tasks</p>
        </div>
        <Button className="pm-btn" onClick={() => setComposer("todo")}><Plus className="h-4 w-4" /> Add task</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const list = colCards(col.key);
          const isOver = overCol === col.key;
          return (
            <div key={col.key}
              className={`pm-col ${isOver ? "drop" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setOverCol(col.key); }}
              onDragLeave={() => setOverCol((c) => (c === col.key ? null : c))}
              onDrop={(e) => { e.preventDefault(); dropInto(col.key); }}>
              <div className="mb-3 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold" style={{ fontFamily: "'Poppins', sans-serif" }}>{col.label}</h3>
                  <span className="pm-chip">{list.length}</span>
                </div>
                <button type="button" onClick={() => setComposer(col.key)} aria-label={`Add to ${col.label}`} className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#0d1c34] shadow-sm hover:text-[#d97406]"><Plus className="h-4 w-4" /></button>
              </div>

              {composer === col.key && <AddComposer col={col.key} onCancel={() => setComposer(null)} onSubmit={async (title, notes) => {
                const r = await act({ type: "cardAdd", title, notes, status: col.key }, "Task added");
                if (r) setComposer(null);
              }} />}

              <div className="space-y-2.5">
                {list.length === 0 && composer !== col.key && <p className="rounded-xl border border-dashed border-[#d5dade] bg-white/50 px-3 py-6 text-center text-xs text-[#5e5e5e]">Nothing here yet</p>}
                {list.map((c: Any) => (
                  <div key={c.id}
                    draggable
                    onDragStart={() => setDragId(c.id)}
                    onDragEnd={() => { setDragId(null); setOverCol(null); }}
                    onDragOver={(e) => { if (dragId && dragId !== c.id) e.preventDefault(); }}
                    onDrop={(e) => { e.preventDefault(); e.stopPropagation(); dropInto(col.key, c.id); }}
                    className={`pm-card cursor-grab p-3.5 active:cursor-grabbing ${dragId === c.id ? "opacity-50" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium leading-snug ${c.status === "done" ? "text-[#5e5e5e] line-through" : ""}`}>{c.title}</p>
                      <span className={`pm-chip flex-none ${c.status === "doing" ? "orange" : ""}`}>{c.created_by?.split(" ")[0] ?? "·"}</span>
                    </div>
                    {c.notes ? <p className="clamp2 mt-1.5 text-xs text-[#5e5e5e]">{c.notes}</p> : null}
                    <div className="mt-3 flex items-center gap-1 border-t border-[#f0f1f3] pt-2.5">
                      <IconBtn label="Move left" onClick={() => nudge(c, -1)} disabled={c.status === "todo"}><ArrowLeft className="h-3.5 w-3.5" /></IconBtn>
                      <IconBtn label="Move right" onClick={() => nudge(c, 1)} disabled={c.status === "done"}><ArrowRight className="h-3.5 w-3.5" /></IconBtn>
                      <IconBtn label="Edit task" onClick={() => setEditing(c)}><Pencil className="h-3.5 w-3.5" /></IconBtn>
                      <span className="ml-auto text-[10px] text-[#9aa0a6]">{c.updated_at ? relDay(c.updated_at) : ""}</span>
                      <IconBtn label="Delete task" danger={confirmDel === c.id} onClick={() => {
                        if (confirmDel === c.id) { act({ type: "cardDelete", id: c.id }, "Task removed"); setConfirmDel(null); }
                        else { setConfirmDel(c.id); setTimeout(() => setConfirmDel((k) => (k === c.id ? null : k)), 2600); }
                      }}><Trash2 className="h-3.5 w-3.5" /></IconBtn>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          {editing && (
            <EditCard card={editing} onSave={async (title, notes) => {
              const r = await act({ type: "cardEdit", id: editing.id, title, notes }, "Task updated");
              if (r) setEditing(null);
            }} onDelete={async () => {
              const r = await act({ type: "cardDelete", id: editing.id }, "Task removed");
              if (r) setEditing(null);
            }} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IconBtn({ children, label, onClick, disabled, danger }: { children: Any; label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded-full text-[#5e5e5e] hover:bg-[#eef0f2] hover:text-[#0d1c34] disabled:opacity-30 ${danger ? "bg-[#fdecea] text-[#c0392b]" : ""}`}>
      {children}
    </button>
  );
}

function AddComposer({ col, onSubmit, onCancel }: { col: string; onSubmit: (title: string, notes: string) => Promise<Any | null>; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form className="mb-2.5 rounded-xl border border-[#e6e8ea] bg-white p-3 shadow-sm" onSubmit={async (e) => { e.preventDefault(); if (!title.trim() || busy) return; setBusy(true); await onSubmit(title.trim(), notes.trim()); setBusy(false); setTitle(""); setNotes(""); }}>
      <Input autoFocus placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} className="h-9" />
      <Textarea placeholder="Details (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-2 text-sm" />
      <div className="mt-2.5 flex gap-2">
        <Button type="submit" className="pm-btn-orange h-8 flex-1" disabled={busy}>Add task</Button>
        <Button type="button" variant="ghost" className="h-8 flex-1" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

function EditCard({ card, onSave, onDelete }: { card: Any; onSave: (title: string, notes: string) => Promise<Any | null>; onDelete: () => Promise<Any | null> }) {
  const [title, setTitle] = useState(card.title ?? "");
  const [notes, setNotes] = useState(card.notes ?? "");
  const [confirm, setConfirm] = useState(false);
  return (
    <div>
      <DialogHeader><DialogTitle>Edit task</DialogTitle></DialogHeader>
      <div className="mt-4 space-y-3">
        <div className="space-y-1.5"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Details</Label><Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      </div>
      <div className="mt-5 flex items-center justify-between gap-2">
        <Button type="button" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={async () => { if (!confirm) { setConfirm(true); setTimeout(() => setConfirm(false), 2600); return; } await onDelete(); }}>{confirm ? "Really delete?" : "Delete"}</Button>
        <Button type="button" className="pm-btn" onClick={async () => { if (!title.trim()) { toast.error("Title can't be empty."); return; } await onSave(title.trim(), notes.trim()); }}>Save changes</Button>
      </div>
    </div>
  );
}

/* ---------------- time ---------------- */

function TimeTab({ entries, running, unbilledMins, rate, viewer, act, cards, invoices }: Any) {
  const isNat = viewer === "Natalie";
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [running?.id]);

  const todayKey = londonDay(new Date().toISOString());
  const groups = useMemo(() => {
    const map = new Map<string, Any[]>();
    for (const e of entries.filter((x: Any) => x.ended_at)) {
      const day = londonDay(e.started_at ?? e.created_at);
      (map.get(day) ?? map.set(day, []).get(day)!).push(e);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [entries]);
  const cardTitle = (id: string) => cards.find((c: Any) => c.id === id)?.title;
  const dayLabel = (key: string) => new Date(key + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/London" });

  return (
    <div className="space-y-5">
      <div className="pm-hero p-6 md:p-7">
        <div className="flex flex-col gap-5 md:flex-row md:items-center">
          <div>
            <p className="pm-eyebrow">Time tracking</p>
            <p className="timer-num mt-1 text-4xl font-semibold text-white md:text-5xl" style={{ fontFamily: "'Poppins', sans-serif" }}>
              {running ? hms(Date.now() - Date.parse(running.started_at)) : "00:00:00"}
            </p>
            <p className="mt-1.5 text-sm text-white/60">{running ? (running.note ? `Tracking · ${running.note}` : "Tracking · no note added") : isNat ? "Ready when you are" : "Natalie's live work timer"}</p>
          </div>
          {isNat && (
            <div className="md:ml-auto">
              {running ? (
                <Button className="pm-btn-orange h-11 px-7" disabled={busy} onClick={async () => { setBusy(true); await act({ type: "timeStop", id: running.id }, "Timer stopped · hours logged"); setBusy(false); }}>
                  <Square className="h-4 w-4" /> Stop timer
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Input placeholder="What are you working on? (optional)" value={note} onChange={(e) => setNote(e.target.value)} className="h-11 w-full bg-white/10 text-white placeholder:text-white/40 md:w-64" />
                  <Button className="pm-btn-orange h-11 px-6" disabled={busy} onClick={async () => { setBusy(true); await act({ type: "timeStart", note: note.trim() }, "Timer started"); setBusy(false); setNote(""); }}>
                    <Play className="h-4 w-4" /> Start
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="pm-tile p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Unbilled work</h2>
            <p className="mt-0.5 text-xs text-[#5e5e5e]">Hours logged since the last invoice · {money(rate)} per hour</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold" style={{ fontFamily: "'Playfair Display', serif" }}>{money((unbilledMins / 60) * rate)}</p>
            <p className="text-xs text-[#5e5e5e]">{fmtMins(unbilledMins)}</p>
          </div>
        </div>
        {isNat && unbilledMins > 0 && (
          <div className="mt-4 border-t border-[#f0f1f3] pt-4">
            <Button className="pm-btn h-10" disabled={busy} onClick={async () => {
              setBusy(true);
              const r = await act({ type: "timeInvoice" });
              setBusy(false);
              if (r?.number) toast.success(`Invoice ${r.number} created as a draft · review & send it in your studio`);
            }}><FileText className="h-4 w-4" /> Create invoice · {fmtMins(unbilledMins)} · {money((unbilledMins / 60) * rate)}</Button>
            <p className="mt-2 text-xs text-[#5e5e5e]">Creates a draft invoice (one line per day) in your studio · nothing is sent to Sara until you mark it sent.</p>
          </div>
        )}
        {!isNat && unbilledMins === 0 && <p className="mt-3 text-sm text-[#5e5e5e]">All logged hours have been invoiced.</p>}
      </div>

      {isNat && <ManualLog act={act} cards={cards} todayKey={todayKey} />}

      <div className="pm-tile p-5">
        <h2 className="text-lg font-semibold">Work log</h2>
        {groups.length === 0 ? <p className="mt-3 text-sm text-[#5e5e5e]">No hours logged yet.</p> : (
          <div className="mt-4 space-y-5">
            {groups.map(([day, list]) => (
              <div key={day}>
                <div className="flex items-center justify-between border-b border-[#f0f1f3] pb-2">
                  <p className="text-sm font-semibold">{day === todayKey ? "Today" : dayLabel(day)}</p>
                  <span className="pm-chip">{fmtMins(list.reduce((s: number, e: Any) => s + Number(e.minutes), 0))}</span>
                </div>
                <ul className="mt-2 space-y-2">
                  {list.sort((a: Any, b: Any) => String(b.started_at ?? b.created_at).localeCompare(String(a.started_at ?? a.created_at))).map((e: Any) => (
                    <EntryRow key={e.id} e={e} cardTitle={cardTitle(e.card_id)} isNat={isNat} act={act} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pm-tile p-5">
        <h2 className="text-lg font-semibold">Invoices</h2>
        {invoices.length === 0 ? <p className="mt-3 text-sm text-[#5e5e5e]">Invoices raised for this work will appear here.</p> : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-[#5e5e5e]"><tr><th className="pb-2">Invoice</th><th className="pb-2">Issued</th><th className="pb-2">Due</th><th className="pb-2">Status</th><th className="pb-2 text-right">Total</th></tr></thead>
              <tbody>
                {invoices.map((i: Any) => (
                  <tr key={i.id} className="border-t border-[#f0f1f3]">
                    <td className="py-2.5 font-medium">{i.number}</td>
                    <td className="py-2.5 text-[#5e5e5e]">{fmtDate(i.issue_date)}</td>
                    <td className="py-2.5 text-[#5e5e5e]">{fmtDate(i.due_date)}</td>
                    <td className="py-2.5"><StatusBadge status={effectiveStatus(i)} /></td>
                    <td className="py-2.5 text-right">{money(invoiceTotals(i.items as LineItem[], i.tax_rate).total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function EntryRow({ e, cardTitle, isNat, act }: Any) {
  const [open, setOpen] = useState(false);
  const [mins, setMins] = useState(String(Math.round(Number(e.minutes))));
  const [note, setNote] = useState(e.note ?? "");
  const [confirm, setConfirm] = useState(false);
  const billedChip = e.billed ? <span className="pm-chip">Invoiced</span> : null;
  return (
    <li className="flex items-center gap-3 rounded-xl bg-[#f7f8f9] px-3 py-2.5">
      <span className="pm-dot" style={{ background: e.billed ? "#c6cbd1" : "#f59a2b" }} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{e.note || cardTitle || "Support work"}</p>
        {cardTitle && e.note ? <p className="truncate text-xs text-[#5e5e5e]">{cardTitle}</p> : null}
      </div>
      {billedChip}
      <span className="flex-none text-sm font-medium">{fmtMins(e.minutes)}</span>
      {isNat && (
        <span className="flex flex-none items-center gap-1">
          <IconBtn label="Edit entry" onClick={() => setOpen(true)}><Pencil className="h-3.5 w-3.5" /></IconBtn>
          <IconBtn label="Delete entry" danger={confirm} onClick={() => {
            if (confirm) { act({ type: "timeDelete", id: e.id }, "Entry removed"); setConfirm(false); }
            else { setConfirm(true); setTimeout(() => setConfirm(false), 2600); }
          }}><Trash2 className="h-3.5 w-3.5" /></IconBtn>
        </span>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit time entry</DialogTitle></DialogHeader>
          <div className="mt-4 space-y-3">
            <div className="space-y-1.5"><Label>Minutes</Label><Input type="number" min="1" value={mins} onChange={(e) => setMins(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Note</Label><Input value={note} onChange={(e) => setNote(e.target.value)} /></div>
          </div>
          <Button type="button" className="pm-btn mt-5 w-full" onClick={async () => {
            const m = Math.round(Number(mins));
            if (!m || m <= 0) { toast.error("Enter the minutes worked."); return; }
            const r = await act({ type: "timeUpdate", id: e.id, minutes: m, note: note.trim() }, "Entry updated");
            if (r) setOpen(false);
          }}>Save entry</Button>
        </DialogContent>
      </Dialog>
    </li>
  );
}

function ManualLog({ act, cards, todayKey }: Any) {
  const [date, setDate] = useState(todayKey);
  const [h, setH] = useState("");
  const [m, setM] = useState("");
  const [note, setNote] = useState("");
  const [cardId, setCardId] = useState("");
  const [busy, setBusy] = useState(false);
  const total = (Number(h) || 0) * 60 + (Number(m) || 0);
  const open = cards.filter((c: Any) => c.status !== "done").slice(0, 50);
  return (
    <form className="pm-tile p-5" onSubmit={async (e) => {
      e.preventDefault();
      if (!total) { toast.error("Enter how long you worked."); return; }
      setBusy(true);
      const r = await act({ type: "timeAdd", date, minutes: total, note: note.trim(), cardId: cardId || undefined }, "Time logged");
      setBusy(false);
      if (r) { setH(""); setM(""); setNote(""); setCardId(""); }
    }}>
      <h2 className="text-lg font-semibold">Log time manually</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={date} max={todayKey} onChange={(e) => setDate(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Hours</Label><Input type="number" min="0" max="23" placeholder="0" value={h} onChange={(e) => setH(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Minutes</Label><Input type="number" min="0" max="59" placeholder="0" value={m} onChange={(e) => setM(e.target.value)} /></div>
        <div className="col-span-2 space-y-1.5"><Label>What was it for? (optional)</Label><Input placeholder="e.g. Blog graphics, inbox tidy-up" value={note} onChange={(e) => setNote(e.target.value)} /></div>
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div className="min-w-52 flex-1 space-y-1.5"><Label>Link to a board task (optional)</Label>
          <select value={cardId} onChange={(e) => setCardId(e.target.value)} className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
            <option value="">No linked task</option>
            {open.map((c: Any) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
        <Button type="submit" className="pm-btn-orange h-9" disabled={busy}>Add entry</Button>
      </div>
    </form>
  );
}
