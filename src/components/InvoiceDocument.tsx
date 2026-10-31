import { fmtDate, invoiceTotals, LOGO_URL, money, type LineItem } from "@/lib/format";

export type InvoiceDoc = {
  number: string;
  issue_date: string;
  due_date?: string | null;
  status: string;
  items: LineItem[];
  tax_rate: number;
  notes?: string | null;
  client?: { name: string; company?: string | null; email?: string | null } | null;
};

export function InvoiceDocument({ inv }: { inv: InvoiceDoc }) {
  const t = invoiceTotals(inv.items, inv.tax_rate);
  const isQuote = inv.status.startsWith("quote");
  const docLabel = isQuote ? "Quote" : "Invoice";
  return (
    <div className="print-area rounded-md border bg-card p-10 shadow-sm">
      <div className="flex items-start justify-between gap-6 rounded-sm bg-primary-deep p-6">
        <img src={LOGO_URL} alt="Nine3 Designs" className="h-12" />
        <div className="text-right text-primary-foreground">
          <p className="text-xs uppercase tracking-[0.3em] text-gold">{docLabel}</p>
          <p className="text-2xl font-light">{inv.number}</p>
        </div>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-6 text-sm">
        <div>
          <p className="eyebrow mb-1">Billed to</p>
          <p className="font-semibold">{inv.client?.name ?? "·"}</p>
          {inv.client?.company && <p>{inv.client.company}</p>}
          {inv.client?.email && <p className="text-muted-foreground">{inv.client.email}</p>}
        </div>
        <div className="text-right">
          <p><span className="text-muted-foreground">Issued:</span> {fmtDate(inv.issue_date)}</p>
          <p><span className="text-muted-foreground">{isQuote ? "Valid until:" : "Due:"}</span> {fmtDate(inv.due_date)}</p>
          <p className="capitalize"><span className="text-muted-foreground">Status:</span> {inv.status.replace("quote_", "quote ")}</p>
        </div>
      </div>
      <table className="mt-8 w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="py-2">Description</th><th className="py-2 text-right">Qty</th><th className="py-2 text-right">Rate</th><th className="py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {inv.items.map((i, k) => (
            <tr key={k} className="border-b">
              <td className="py-2">{i.description}</td>
              <td className="py-2 text-right">{i.quantity}</td>
              <td className="py-2 text-right">{money(i.rate)}</td>
              <td className="py-2 text-right">{money(Number(i.quantity) * Number(i.rate))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="ml-auto mt-6 w-64 space-y-1 text-sm">
        <div className="flex justify-between"><span>Subtotal</span><span>{money(t.subtotal)}</span></div>
        {Number(inv.tax_rate) > 0 && <div className="flex justify-between"><span>VAT ({inv.tax_rate}%)</span><span>{money(t.tax)}</span></div>}
        <div className="flex justify-between border-t pt-2 text-lg font-semibold text-primary-deep"><span>Total</span><span>{money(t.total)}</span></div>
      </div>
      {inv.notes && <p className="mt-8 whitespace-pre-wrap text-sm text-muted-foreground">{inv.notes}</p>}
      <p className="mt-10 font-script text-lg font-semibold uppercase tracking-widest text-primary">{isQuote ? "Approval" : "Thank you"}</p>
      <p className="text-xs text-muted-foreground">Nine3 Designs · nine3designs.co.uk</p>
    </div>
  );
}
