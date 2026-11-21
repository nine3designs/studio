import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DocumentSheet, applyFills, collectFields, stripEmoji } from "@/components/DocumentSheet";
import { ProposalDocument } from "@/components/ProposalDocument";
import { useRows } from "@/lib/db";
import { invoiceTotals, money, type LineItem } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/documents/$id")({
  head: () => ({ meta: [{ title: "Document · Nine3 Studio" }] }),
  component: DocViewer,
});

const dmy = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`;
};

function DocViewer() {
  const { id } = Route.useParams();
  const tpl = (useRows("templates", { eq: ["id", id] }).data ?? [])[0];
  const prop = (useRows("proposals", { select: "*, clients(name, company, email)", eq: ["id", id] }).data ?? [])[0];
  const clients = useRows("clients", { order: "name", asc: true }).data ?? [];
  const [fills, setFills] = useState<Record<string, string>>({});
  const [autoDone, setAutoDone] = useState(false);

  const doc: any = tpl ?? prop;
  const fields = useMemo(() => (doc ? collectFields(doc.body ?? "") : []), [doc?.id, doc?.body]);

  // Like invoices: picking a client auto-fills their details, today's date
  // and the package price (saved documents auto-fill from their own client).
  const autoClient = prop?.clients ?? clients.find((c: any) => c.id === prop?.client_id);
  useEffect(() => {
    if (!doc || autoDone) return;
    const saved = (() => { try { return JSON.parse(localStorage.getItem(`nine3-docfill-${doc.id}`) ?? "{}"); } catch { return {}; } })();
    const next: Record<string, string> = { ...saved };
    const set = (k: string, v: string) => { if (v && !next[k]) next[k] = v; };
    if (autoClient) {
      set("Client Name", autoClient.name ?? "");
      set("Business Name", autoClient.company ?? "");
      set("Business", autoClient.company ?? "");
      set("Email", autoClient.email ?? "");
      set("Email Address", autoClient.email ?? "");
    }
    if (prop) set("Project", prop.title ?? "");
    const price = prop ? money(invoiceTotals(prop.items as LineItem[]).total) : "";
    if (prop) set("Package price", price);
    set("Date", dmy(new Date()));
    set("Agreement date", dmy(new Date()));
    setFills(next);
    setAutoDone(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.id]);

  useEffect(() => {
    if (!doc) return;
    localStorage.setItem(`nine3-docfill-${doc.id}`, JSON.stringify(fills));
  }, [doc?.id, fills]);

  useEffect(() => {
    if (!doc) return;
    const kind = prop ? (prop.kind === "contract" ? "Contract" : "Proposal") : stripEmoji(doc.name ?? "Document");
    const who = fills["Business Name"] || fills["Client Name"] || autoClient?.company || autoClient?.name || "";
    document.title = who ? `${who} - ${kind}` : `Nine3 ${kind}`;
  }, [doc?.id, fills, autoClient]);

  if (!doc) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const filled = applyFills(doc.body ?? "", fills);
  const isBranded = doc.kind === "proposal" || doc.kind === "contract";
  const meta = {
    kind: doc.kind,
    title: doc.title ?? doc.name ?? "",
    clientName: fills["Client Name"] ?? autoClient?.name ?? "",
    business: fills["Business Name"] ?? fills["Business"] ?? autoClient?.company ?? "",
    email: fills["Email"] ?? fills["Email Address"] ?? autoClient?.email ?? "",
    project: fills["Project"] ?? (prop?.title ?? ""),
    agreementDate: fills["Agreement date"] ?? fills["Date"] ?? dmy(new Date()),
    priceTotal: prop ? money(invoiceTotals(prop.items as LineItem[]).total) : fills["Package price"] ?? "",
    designerDate: dmy(new Date()),
  };

  return (
    <div>
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link to="/proposals" className="text-xs text-muted-foreground hover:text-primary-soft">← Proposals & Contracts</Link>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => window.print()}><Download className="h-4 w-4" /> Download PDF</Button>
          <Button
            variant="outline"
            onClick={() => {
              const text = filled
                .split("\n")
                .map((l) => l.replace(/^#{1,3}\s+/, "").replace(/^[-*]\s+/, "• ").replace(/^\s*-{3,}\s*$/, "").replace(/\*\*/g, "").replace(/🟢\s*/g, "✓ ").trimEnd())
                .join("\n")
                .replace(/\n{3,}/g, "\n\n");
              navigator.clipboard.writeText(text);
              toast.success("Copied as plain text");
            }}
          >Copy text</Button>
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <section className="no-print h-fit space-y-4 rounded-md border bg-card p-5">
          <p className="eyebrow">Auto-filled from the client record</p>
          <div className="space-y-1.5">
            <Label>Quick fill from client</Label>
            <select
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={prop?.client_id ?? ""}
              onChange={(e) => {
                const c = clients.find((x: any) => x.id === e.target.value);
                if (c) setFills((f) => ({
                  ...f,
                  "Client Name": c.name ?? f["Client Name"] ?? "",
                  "Business Name": c.company ?? f["Business Name"] ?? "",
                  "Business": c.company ?? f["Business"] ?? "",
                  "Email": c.email ?? f["Email"] ?? "",
                  "Email Address": c.email ?? f["Email Address"] ?? "",
                }));
              }}
            >
              <option value="">Choose a client…</option>
              {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {prop && <p className="text-xs text-muted-foreground">Client, project, date and price are filled automatically · adjust anything below.</p>}
          </div>
          {fields.length === 0 && <p className="text-sm text-muted-foreground">This document has no fill-in fields.</p>}
          {fields.map((f) => (
            <div key={f} className="space-y-1.5">
              <Label>{stripEmoji(f)}</Label>
              <Input
                value={fills[f] ?? ""}
                onChange={(e) => setFills({ ...fills, [f]: e.target.value })}
                placeholder={/sign|print name/i.test(f) ? "Sign after printing" : /date/i.test(f) ? "e.g. 5 November 2026" : ""}
              />
            </div>
          ))}
          <p className="text-xs text-muted-foreground">Answers are remembered on this device. Pick "Save as PDF" in the print dialog to download.</p>
        </section>
        {isBranded ? <ProposalDocument meta={meta} body={filled} /> : <DocumentSheet kind={doc.kind} name={doc.name ?? doc.title} body={filled} preparedFor={fills["Client Name"]} />}
      </div>
    </div>
  );
}
