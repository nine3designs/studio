import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useRows } from "@/lib/db";
import { nav } from "@/components/StudioShell";

export function CommandPalette({ open: controlled, onOpenChange }: { open?: boolean; onOpenChange?: (o: boolean) => void }) {
  const [internal, setInternal] = useState(false);
  const open = controlled ?? internal;
  const setOpen = (o: boolean) => { setInternal(o); onOpenChange?.(o); };
  const navigate = useNavigate();
  const clients = useRows("clients", { order: "name", asc: true }).data ?? [];
  const projects = useRows("projects", { select: "id, name, status" }).data ?? [];
  const invoices = useRows("invoices", { select: "id, number, status" }).data ?? [];

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  });

  function go(fn: () => void) {
    setOpen(false);
    fn();
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen} className="z-[70]">
      <CommandInput placeholder="Search or jump to… (clients, projects, invoices, pages)" />
      <CommandList>
        <CommandEmpty>No matches found.</CommandEmpty>
        <CommandGroup heading="Pages">
          {nav.map(({ to, label, icon: Icon }) => (
            <CommandItem key={to} value={`page ${label}`} onSelect={() => go(() => navigate({ to: to as never }))}>
              <Icon className="h-4 w-4" /> {label}
            </CommandItem>
          ))}
        </CommandGroup>
        {clients.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Clients">
              {clients.slice(0, 10).map((c) => (
                <CommandItem key={c.id} value={`client ${c.name}`} onSelect={() => go(() => navigate({ to: "/clients/$id", params: { id: c.id } }))}>
                  {c.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        {projects.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Projects">
              {projects.slice(0, 10).map((p) => (
                <CommandItem key={p.id} value={`project ${p.name}`} onSelect={() => go(() => navigate({ to: "/projects" }))}>
                  {p.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        {invoices.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Invoices">
              {invoices.slice(0, 10).map((i) => (
                <CommandItem key={i.id} value={`invoice ${i.number}`} onSelect={() => go(() => navigate({ to: "/invoices/$id", params: { id: i.id } }))}>
                  {i.number}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
