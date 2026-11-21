import { LOGO_WORDMARK_PETROL_URL } from "@/lib/format";
import { parseBlocks, Blocks } from "@/components/DocumentSheet";

export type DocMeta = {
  kind: string;
  title: string;
  clientName?: string;
  business?: string;
  email?: string;
  project?: string;
  agreementDate?: string;
  priceTotal?: string;
  designerDate?: string;
};

const INK = "#131717";
const PETROL = "#174B50";

// Branded proposal/contract sheet matching Nat's template: slim header with
// client email + name + business on the left, Nine3 wordmark on the right,
// big document title, CLIENT / PROJECT / AGREEMENT DATE info grid, body
// sections, price line, dual signature blocks and contact footer.
export function ProposalDocument({ meta, body }: { meta: DocMeta; body: string }) {
  const label = meta.kind === "contract" ? "CONTRACT" : "PROPOSAL";
  const sigLine = <span className="mt-10 block border-t border-[#131717]/50" style={{ width: "11rem" }} />;
  return (
    <div
      className="print-area doc-sheet proposal-doc relative mx-auto w-full max-w-[820px] overflow-hidden bg-white px-10 py-10 shadow-sm md:px-14"
      style={{ color: INK, fontFamily: "'Montserrat', sans-serif", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
    >
      {/* header */}
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          {meta.email && <p className="text-[11px] tracking-wide text-[#131717]/70">{meta.email}</p>}
          <p className="mt-1 text-[15px] font-bold uppercase tracking-[0.08em]" style={{ color: INK }}>
            {meta.clientName || "\u00A0"}
          </p>
          {meta.business && <p className="text-[15px] font-bold uppercase tracking-[0.08em]">{meta.business}</p>}
        </div>
        <img src={LOGO_WORDMARK_PETROL_URL} alt="Nine3 Designs" className="h-9 w-auto shrink-0" />
      </div>

      {/* title */}
      <h1 className="mt-10 text-center font-heading text-[34px] font-bold tracking-[0.02em]" style={{ color: INK, fontFamily: "'Montserrat', sans-serif" }}>
        {label}
      </h1>

      {/* info grid */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="border-l-2 pl-3" style={{ borderColor: PETROL }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#131717]/60">Client</p>
          <p className="mt-1 text-[14px] font-semibold">{meta.clientName || "\u00A0"}</p>
        </div>
        <div className="border-l-2 pl-3" style={{ borderColor: PETROL }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#131717]/60">Project</p>
          <p className="mt-1 text-[14px] font-semibold">{meta.project || "\u00A0"}</p>
        </div>
        <div className="border-l-2 pl-3" style={{ borderColor: PETROL }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#131717]/60">Agreement date</p>
          <p className="mt-1 text-[14px] font-semibold">{meta.agreementDate || "\u00A0"}</p>
        </div>
      </div>

      {/* body sections */}
      <div className="doc-body mt-8">
        <Blocks blocks={parseBlocks(body)} />
      </div>

      {/* price line */}
      {meta.priceTotal && (
        <h2 className="doc-h2 mt-8 text-center !text-[20px]" style={{ color: INK }}>
          {meta.project ? `${meta.project} \u00b7 ` : ""}{meta.priceTotal}
        </h2>
      )}

      {/* signatures */}
      <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#131717]/60">Client</p>
          <p className="mt-3 text-[14px] font-semibold">{meta.clientName}</p>
          {meta.business && <p className="text-[13px]">Business: {meta.business}</p>}
          <p className="mt-6 text-[13px]">Date: {meta.agreementDate || "______________"}</p>
          {sigLine}
          <p className="mt-1 text-[12px] text-[#131717]/60">Signature</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: PETROL }}>Nine3 Designs</p>
          <p className="mt-3 text-[14px] font-semibold">Natalie</p>
          <p className="text-[13px]">Business: Nine3Designs</p>
          <p className="mt-6 text-[13px]">Date: {meta.designerDate || "______________"}</p>
          {sigLine}
          <p className="mt-1 text-[12px] text-[#131717]/60">Signature</p>
        </div>
      </div>

      <footer className="mt-12 text-center text-[13px]" style={{ color: INK }}>
        e: hello@nine3designs.co.uk
      </footer>
    </div>
  );
}
