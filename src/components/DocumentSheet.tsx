import { Fragment, type ReactNode } from "react";
import { LOGO_WORDMARK_LIGHT_URL } from "@/lib/format";

const KIND_LABEL: Record<string, string> = {
  proposal: "Proposal",
  contract: "Contract",
  reference: "Document",
};

// Only genuine form labels become fillable fields; other bold
// "label:" lines stay as normal paragraphs.
const FIELD_RE = /^(client name|business name|business|company|email|email address|project|start date|estimated completion date|completion date|client signature|signature|date|print name|sign|venue|wedding date)$/i;

export function stripEmoji(s: string) {
  return s.replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, "").trim();
}

// Collect fillable fields from a template body: [Brackets], {client},
// bold label lines like **Client Name:** and £XXXX price slots.
export function collectFields(body: string): string[] {
  const out: string[] = [];
  const push = (v: string) => { if (v && !out.includes(v)) out.push(v); };
  for (const m of body.matchAll(/\[([A-Za-z][^\][]{1,40})\]/g)) push(m[1].trim());
  if (/\{client\}/.test(body)) push("Client Name");
  if (/£XXXX/.test(body)) push("Package price");
  for (const raw of body.split("\n")) {
    const m = raw.match(/^\s*\*\*(.+?):\s*\*\*\s*$/);
    if (m) {
      const label = stripEmoji(m[1]).trim();
      if (FIELD_RE.test(label)) push(label);
    } else if (/^\s*(Signature|Print Name)\s*:?\s*$/i.test(raw)) {
      push(stripEmoji(raw).replace(/:$/, "").trim());
    }
  }
  return out;
}

// Substitute filled values into the body before rendering.
export function applyFills(body: string, fills: Record<string, string>): string {
  const val = (label: string) => fills[label] ?? fills[label.toLowerCase()] ?? "";
  let out = body;
  for (const m of [...body.matchAll(/\[([A-Za-z][^\][]{1,40})\]/g)].map((m) => m[1].trim())) {
    const v = val(m);
    if (v) out = out.replaceAll(`[${m}]`, v);
  }
  const client = val("Client Name");
  if (client) out = out.replaceAll("{client}", client);
  const price = val("Package price");
  if (price) out = out.replaceAll("£XXXX", price);
  return out
    .split("\n")
    .map((raw) => {
      const m = raw.match(/^\s*\*\*(.+?):\s*\*\*\s*$/);
      if (m) {
        const label = stripEmoji(m[1]).trim();
        if (FIELD_RE.test(label)) {
          const v = val(label);
          return v ? `**${label}:** ${v}` : raw;
        }
        return raw;
      }
      const sigLabel = stripEmoji(raw).replace(/:$/, "").trim();
      if (/^(Signature|Print Name)$/i.test(sigLabel) && val(sigLabel)) {
        return `${sigLabel}: ${val(sigLabel)}`;
      }
      return raw;
    })
    .join("\n");
}

// Inline markdown: **bold** and *italic*.
function inline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g).filter(Boolean);
  return parts.map((p, i) => {
    if (p.startsWith("***") && p.endsWith("***")) return <strong key={i}><em>{p.slice(3, -3)}</em></strong>;
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("*") && p.endsWith("*") && p.length > 2) return <em key={i}>{p.slice(1, -1)}</em>;
    return <Fragment key={i}>{p}</Fragment>;
  });
}

type Block =
  | { t: "h"; level: number; text: string }
  | { t: "p"; text: string }
  | { t: "ul"; items: string[]; tick?: boolean }
  | { t: "ol"; items: string[] }
  | { t: "field"; label: string; value: string; tall: boolean }
  | { t: "hr" };

export function parseBlocks(body: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of body.split("\n")) {
    const line = raw.split("\\*").join("*").replace(/\s+$/, "");
    if (!line.trim() || /^\s*\*\*\s*$/.test(line)) continue;
    const h = line.match(/^\s*(#{1,4})\s+(.*)$/);
    if (h) { blocks.push({ t: "h", level: h[1].length, text: stripEmoji(h[2]) }); continue; }
    if (/^\s*-{3,}\s*$/.test(line)) { blocks.push({ t: "hr" }); continue; }
    const tick = line.match(/^\s*🟢\s*(.*)$/);
    if (tick) {
      const last = blocks[blocks.length - 1];
      if (last?.t === "ul" && last.tick) last.items.push(tick[1]);
      else blocks.push({ t: "ul", items: [tick[1]], tick: true });
      continue;
    }
    const ul = line.match(/^\s*[-*]\s+(.*)$/);
    if (ul) {
      const last = blocks[blocks.length - 1];
      if (last?.t === "ul" && !last.tick) last.items.push(ul[1]);
      else blocks.push({ t: "ul", items: [ul[1]] });
      continue;
    }
    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (ol) {
      const last = blocks[blocks.length - 1];
      if (last?.t === "ol") last.items.push(ol[2]);
      else blocks.push({ t: "ol", items: [ol[2]] });
      continue;
    }
    const fieldLabel = stripEmoji((line.match(/^\s*\*\*(.+?):\s*\*\*\s*$/) ?? [])[1] ?? "").trim();
    if (fieldLabel && FIELD_RE.test(fieldLabel)) {
      blocks.push({ t: "field", label: fieldLabel, value: "", tall: /sign/i.test(fieldLabel) });
      continue;
    }
    const sig = line.match(/^\s*(Signature|Print Name)\s*:?\s*$/i);
    if (sig) {
      blocks.push({ t: "field", label: sig[1], value: "", tall: true });
      continue;
    }
    blocks.push({ t: "p", text: line.trim() });
  }
  return blocks;
}

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        if (b.t === "hr") return <hr key={i} className="doc-rule" />;
        if (b.t === "h") {
          const Tag = b.level < 3 ? "h2" : "h3";
          return <Tag key={i} className={b.level < 3 ? "doc-h2" : "doc-h3"}>{b.text}</Tag>;
        }
        if (b.t === "ul")
          return b.tick ? (
            <ul key={i} className="doc-ticks">
              {b.items.map((it, k) => (
                <li key={k}><span className="doc-tick">✓</span><span>{inline(it)}</span></li>
              ))}
            </ul>
          ) : (
            <ul key={i} className="doc-list">
              {b.items.map((it, k) => <li key={k}>{inline(it)}</li>)}
            </ul>
          );
        if (b.t === "ol")
          return (
            <ol key={i} className="doc-list doc-ol">
              {b.items.map((it, k) => <li key={k}>{inline(it)}</li>)}
            </ol>
          );
        if (b.t === "field")
          return (
            <p key={i} className="doc-field">
              <strong>{b.label}:</strong>
              <span className={b.tall ? "doc-sign" : "doc-blank"}>{b.value ? inline(b.value) : "\u00A0"}</span>
            </p>
          );
        return <p key={i} className="doc-p">{inline(b.text)}</p>;
      })}
    </>
  );
}

export function DocumentSheet({ kind, name, body, preparedFor }: { kind: string; name: string; body: string; preparedFor?: string }) {
  const label = KIND_LABEL[kind] ?? "Document";
  return (
    <div
      className="print-area doc-sheet rounded-md border bg-card p-8 shadow-sm md:p-12"
      style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
    >
      <header
        className="relative overflow-hidden rounded-sm px-8 py-9 text-center text-white"
        style={{
          background: "linear-gradient(105deg,#174B50 0%,#1F5D64 55%,#2A5E57 100%)",
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.13]"
          style={{ backgroundImage: "repeating-linear-gradient(60deg, rgba(255,255,255,0.4) 0 1px, transparent 1px 16px)" }}
        />
        <div className="relative">
          <img src={LOGO_WORDMARK_LIGHT_URL} alt="Nine3 Designs" className="mx-auto h-14 w-auto" />
          <p className="mt-3 text-xs uppercase tracking-[0.3em] text-white/80" style={{ fontFamily: "Jost, sans-serif" }}>
            {label}{preparedFor ? ` · prepared for ${preparedFor}` : ""}
          </p>
        </div>
      </header>
      <h1 className="mt-8 text-center text-2xl font-semibold tracking-tight text-primary-deep md:text-3xl" style={{ fontFamily: "League Spartan, sans-serif" }}>{name}</h1>
      <p className="mt-1 text-center text-xs uppercase tracking-[0.25em] text-muted-foreground">Nine3 Designs · nine3designs.co.uk</p>
      <div className="doc-body mt-8">
        <Blocks blocks={parseBlocks(body)} />
      </div>
      <footer className="mt-10 border-t pt-4 text-center text-xs text-muted-foreground">
        Nine3 Designs · hello@nine3designs.co.uk · nine3designs.co.uk · Swinton, South Yorkshire
      </footer>
    </div>
  );
}
