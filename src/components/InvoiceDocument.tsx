import { fmtDate, invoiceTotals, LOGO_WORDMARK_LIGHT_URL, money, type LineItem } from "@/lib/format";

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
      <div className="relative overflow-hidden rounded-sm p-8 text-center text-white" style={{ background: "linear-gradient(105deg,#101f3a 0%,#1c2a3d 55%,#2b353f 100%)" }}>
        <div className="absolute inset-0 opacity-[0.14]" style={{ backgroundImage: "repeating-linear-gradient(60deg, rgba(255,255,255,0.35) 0 1px, transparent 1px 16px)" }} />
        <div className="relative">
          <img src={LOGO_WORDMARK_LIGHT_URL} alt="Nine3 Designs" className="mx-auto h-16 w-auto" />
          <p className="mt-2 text-xs uppercase tracking-[0.3em] text-white/70">{docLabel} · {inv.number}</p>
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
          <p><span className="text-muted-foreground">{isQuote ? "Quote date:" : "Date of invoice:"}</span> {fmtDate(inv.issue_date)}</p>
          <p><span className="text-muted-foreground">{isQuote ? "Valid until:" : "Payment due:"}</span> {fmtDate(inv.due_date)}</p>
          <p><span className="text-muted-foreground">Reference:</span> {inv.number}</p>
          <p className="capitalize"><span className="text-muted-foreground">Status:</span> {inv.status.replace("quote_", "quote ")}</p>
        </div>
      </div>
      <table className="mt-8 w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="py-2">Item description</th><th className="py-2 text-right">Qty</th><th className="py-2 text-right">Price</th><th className="py-2 text-right">Amount</th>
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
      <div className="ml-auto mt-6 w-72 space-y-1 text-sm">
        <div className="flex justify-between"><span>Subtotal</span><span>{money(t.subtotal)}</span></div>
        {Number(inv.tax_rate) > 0 && <div className="flex justify-between"><span>VAT ({inv.tax_rate}%)</span><span>{money(t.tax)}</span></div>}
        <div className="flex justify-between border-t pt-2 text-lg font-semibold text-primary-deep"><span>Grand total</span><span>{money(t.total)}</span></div>
        {!isQuote && <div className="flex justify-between text-muted-foreground"><span>Deposit due (50%)</span><span>{money(t.total / 2)}</span></div>}
      </div>
      {!isQuote && (
        <div className="mt-8 grid grid-cols-2 gap-6 rounded-sm bg-muted/40 p-4 text-sm">
          <div>
            <p className="eyebrow mb-1">Payable to</p>
            <p className="font-semibold">Nine3 Designs</p>
            <p className="text-muted-foreground">e: hello@nine3designs.co.uk</p>
          </div>
          <div>
            <p className="eyebrow mb-1">Bank details</p>
            <p>Sort code: 04-03-33</p>
            <p>Account number: 40426946</p>
          </div>
        </div>
      )}
      {inv.notes && <p className="mt-8 whitespace-pre-wrap text-sm text-muted-foreground">{inv.notes}</p>}
      <div className="mt-8 border-t pt-4 text-xs text-muted-foreground">
        <p className="mb-1 font-semibold text-foreground">Terms and conditions</p>
        <p>Payment due within 7 days of receipt of invoice. Overdue payments will incur statutory interest charged at 8% of the invoice total plus the Bank of England base rate and a £50.00 compensation charge.</p>
      </div>
      <p className="mt-8 text-center text-xs text-muted-foreground">Nine3 Designs · nine3designs.co.uk · e: hello@nine3designs.co.uk</p>
    </div>
  );
}
