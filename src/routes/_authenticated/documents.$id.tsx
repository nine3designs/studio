import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DocumentSheet, applyFills, collectFields, stripEmoji } from "@/components/DocumentSheet";
import { useRows } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/documents/$id")({
  head: () => ({ meta: [{ title: "Document · Nine3 Studio" }] }),
  component: DocViewer,
});

function DocViewer() {
  const { id } = Route.useParams();
  const tpl = (useRows("templates", { eq: ["id", id] }).data ?? [])[0];
  const clients = useRows("clients", { order: "name", asc: true }).data ?? [];
  const [fills, setFills] = useState<Record<string, string>>({});

  const fields = useMemo(() => (tpl ? collectFields(tpl.body ?? "") : []), [tpl?.id, tpl?.body]);

  useEffect(() => {
    if (!tpl) return;
    try {
      const saved = JSON.parse(localStorage.getItem(`nine3-docfill-${tpl.id}`) ?? "{}");
      setFills(saved);
    } catch { setFills({}); }
  }, [tpl?.id]);

  useEffect(() => {
    if (!tpl) return;
    localStorage.setItem(`nine3-docfill-${tpl.id}`, JSON.stringify(fills));
  }, [tpl?.id, fills]);

  if (!tpl) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const preparedFor = fills["Client Name"] ?? "";
  const filled = applyFills(tpl.body ?? "", fills);
  const isSig = (label: string) => /sign|print name/i.test(label);
  const isDate = (label: string) => /date/i.test(label);

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
          <p className="eyebrow">Fill in before you download</p>
          <div className="space-y-1.5">
            <Label>Quick fill from client</Label>
            <select
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value=""
              onChange={(e) => {
                const c = clients.find((x) => x.id === e.target.value);
                if (c) setFills((f) => ({ ...f, "Client Name": c.company || c.name }));
              }}
            >
              <option value="">Choose a client…</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {fields.length === 0 && <p className="text-sm text-muted-foreground">This template has no fill-in fields.</p>}
          {fields.map((f) => (
            <div key={f} className="space-y-1.5">
              <Label>{stripEmoji(f)}</Label>
              <Input
                value={fills[f] ?? ""}
                onChange={(e) => setFills({ ...fills, [f]: e.target.value })}
                placeholder={isSig(f) ? "Sign after printing" : isDate(f) ? "e.g. 5 November 2026" : ""}
              />
            </div>
          ))}
          <p className="text-xs text-muted-foreground">Answers are remembered on this device. Pick "Save as PDF" in the print dialog to download.</p>
        </section>
        <DocumentSheet kind={tpl.kind} name={tpl.name} body={filled} preparedFor={preparedFor || undefined} />
      </div>
    </div>
  );
}
