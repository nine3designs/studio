import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Empty, FormDialog, PageHeader, QuickForm, StatusBadge } from "@/components/common";
import { useRows, useSave } from "@/lib/db";
import { portalLink } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/clients/")({
  head: () => ({ meta: [{ title: "Clients — Nine3 Studio" }] }),
  component: Clients,
});

const clientFields = [
  { name: "name", label: "Client name", required: true },
  { name: "company", label: "Company / club" },
  { name: "email", label: "Email", type: "email" as const },
  { name: "phone", label: "Phone" },
  { name: "portal_type", label: "Portal layout", type: "select" as const, required: true, options: [{ value: "standard", label: "Standard client" }, { value: "sports", label: "Weekly sports graphics" }] },
  { name: "access_method", label: "Portal access", type: "select" as const, required: true, options: [{ value: "link", label: "Secure unique link" }, { value: "email", label: "Email sign-in" }] },
];

function Clients() {
  const clients = useRows("clients", { order: "name", asc: true }).data ?? [];
  const save = useSave("clients", "Client added");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader eyebrow="Directory" title="Clients" action={
        <FormDialog open={open} onOpenChange={setOpen} title="New client" trigger={<Button><Plus className="h-4 w-4" /> Add client</Button>}>
          <QuickForm fields={clientFields} initial={{ portal_type: "standard", access_method: "link" }} onSubmit={async (v) => {
            const row = await save.mutateAsync({ ...v, portal_email: v["email"] });
            setOpen(false);
            navigate({ to: "/clients/$id", params: { id: row.id } });
          }} />
        </FormDialog>
      } />
      {clients.length === 0 ? <Empty>No clients yet — add your first one.</Empty> : (
        <div className="overflow-x-auto rounded-md border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-cream text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-3">Client</th><th className="p-3">Portal</th><th className="p-3">Access</th><th className="p-3">Status</th><th className="p-3"></th></tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="p-3"><Link to="/clients/$id" params={{ id: c.id }} className="font-medium hover:text-primary-soft">{c.name}</Link><p className="text-xs text-muted-foreground">{c.company}</p></td>
                  <td className="p-3">{c.portal_type === "sports" ? "Sports weekly" : "Standard"}</td>
                  <td className="p-3">{c.access_method === "link" ? "Secure link" : `Email · ${c.portal_email ?? "not set"}`}</td>
                  <td className="p-3"><StatusBadge status={c.status} /></td>
                  <td className="p-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => {
                      navigator.clipboard.writeText(c.access_method === "link" ? portalLink(c.portal_token) : `${window.location.origin}/portal`);
                      toast.success("Portal link copied");
                    }}><Copy className="h-4 w-4" /> Copy link</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
