import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

type Access = { token?: string | null };

// Resolves which client the caller may see: a secure link token (link access)
// or a signed-in user whose email matches the client's portal email (email access).
async function resolveClient(access: Access) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  if (access.token) {
    const { data } = await supabaseAdmin.from("clients").select("*").eq("portal_token", access.token).eq("access_method", "link").eq("portal_enabled", true).maybeSingle();
    if (!data) throw new Error("This portal link is not valid.");
    return { client: data, admin: supabaseAdmin };
  }
  const auth = getRequestHeader("authorization");
  const jwt = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!jwt) throw new Error("Please sign in to view your portal.");
  const { data: u } = await supabaseAdmin.auth.getUser(jwt);
  const email = u.user?.email?.toLowerCase();
  if (!email) throw new Error("Please sign in to view your portal.");
  const { data } = await supabaseAdmin.from("clients").select("*").ilike("portal_email", email).eq("access_method", "email").eq("portal_enabled", true).maybeSingle();
  if (!data) throw new Error("No portal is set up for this email address yet.");
  return { client: data, admin: supabaseAdmin };
}

export const getPortal = createServerFn({ method: "POST" })
  .inputValidator((d: Access) => ({ token: typeof d?.token === "string" ? d.token : null }))
  .handler(async ({ data }) => {
    const { client, admin } = await resolveClient(data);
    const cid = client.id;
    const [onb, projects, files, invoices, proposals, fixtures] = await Promise.all([
      admin.from("onboarding_items").select("*").eq("client_id", cid).order("position"),
      admin.from("projects").select("id, name, description, status, due_date, milestones(id, title, due_date, done, position)").eq("client_id", cid).order("created_at", { ascending: false }),
      admin.from("deliverables").select("*").eq("client_id", cid).order("created_at", { ascending: false }),
      admin.from("invoices").select("id, number, issue_date, due_date, status, items, tax_rate, paid_at").eq("client_id", cid).neq("status", "draft").order("issue_date", { ascending: false }),
      admin.from("proposals").select("id, kind, title, body, items, status, accepted_name, accepted_at, created_at").eq("client_id", cid).neq("status", "draft").order("created_at", { ascending: false }),
      admin.from("sports_fixtures").select("*").eq("client_id", cid).order("match_date"),
    ]);
    const deliverables = await Promise.all((files.data ?? []).map(async (f) => {
      let url: string | null = null;
      if (f.file_path) url = (await admin.storage.from("files").createSignedUrl(f.file_path, 3600)).data?.signedUrl ?? null;
      return { ...f, url };
    }));
    return {
      client: { id: cid, name: client.name, company: client.company, portal_type: client.portal_type, home_kit: client.home_kit, away_kit: client.away_kit, monthly_fee: client.monthly_fee },
      onboarding: onb.data ?? [],
      projects: projects.data ?? [],
      deliverables,
      invoices: invoices.data ?? [],
      proposals: proposals.data ?? [],
      fixtures: fixtures.data ?? [],
    };
  });

type Action =
  | { type: "onboarding"; id: string; done: boolean }
  | { type: "proof"; id: string; decision: "approved" | "revision"; feedback?: string }
  | { type: "accept"; id: string; name: string }
  | { type: "uploadUrl"; fileName: string }
  | { type: "recordUpload"; path: string; fileName: string; title?: string; kind?: string };

export const portalAction = createServerFn({ method: "POST" })
  .inputValidator((d: Access & { action: Action }) => d)
  .handler(async ({ data }) => {
    const { client, admin } = await resolveClient({ token: data.token ?? null });
    const a = data.action;
    const cid = client.id;
    const log = (message: string) => admin.from("activity_log").insert({ client_id: cid, actor: "client", message });

    if (a.type === "onboarding") {
      const { data: row } = await admin.from("onboarding_items").update({ done: !!a.done, done_at: a.done ? new Date().toISOString() : null }).eq("id", a.id).eq("client_id", cid).select("title").maybeSingle();
      if (row && a.done) await log(`Completed onboarding step: ${row.title}`);
      return { ok: true };
    }
    if (a.type === "proof") {
      if (a.decision !== "approved" && a.decision !== "revision") throw new Error("Invalid decision");
      if (a.decision === "revision" && !a.feedback?.trim()) throw new Error("Please tell us what to change.");
      const { data: row } = await admin.from("deliverables").update({ status: a.decision, feedback: a.feedback?.slice(0, 4000) ?? null }).eq("id", a.id).eq("client_id", cid).eq("kind", "proof").select("title").maybeSingle();
      if (!row) throw new Error("Proof not found");
      await log(a.decision === "approved" ? `Approved proof: ${row.title}` : `Requested revisions on: ${row.title}`);
      return { ok: true };
    }
    if (a.type === "accept") {
      const name = a.name?.trim();
      if (!name) throw new Error("Please type your full name to accept.");
      const { data: row } = await admin.from("proposals").update({ status: "accepted", accepted_name: name.slice(0, 200), accepted_at: new Date().toISOString() }).eq("id", a.id).eq("client_id", cid).eq("status", "sent").select("title, kind").maybeSingle();
      if (!row) throw new Error("This document can no longer be accepted.");
      await log(`Accepted ${row.kind}: ${row.title} (signed ${name})`);
      return { ok: true };
    }
    if (a.type === "uploadUrl") {
      const path = `${cid}/client-${crypto.randomUUID()}-${String(a.fileName).replace(/[^\w.-]+/g, "_").slice(0, 120)}`;
      const { data: up, error } = await admin.storage.from("files").createSignedUploadUrl(path);
      if (error || !up) throw new Error("Upload could not start");
      return { path, uploadToken: up.token };
    }
    if (a.type === "recordUpload") {
      if (!a.path.startsWith(`${cid}/client-`)) throw new Error("Invalid upload");
      const kind = a.kind === "resource" ? "resource" : "upload";
      await admin.from("deliverables").insert({ client_id: cid, kind, title: (a.title || a.fileName).slice(0, 200), file_path: a.path, file_name: a.fileName.slice(0, 200), status: "shared", uploaded_by: "client", week_of: new Date().toISOString().slice(0, 10) });
      await log(`Uploaded ${kind === "resource" ? "resource photo" : "file"}: ${a.title || a.fileName}`);
      return { ok: true };
    }
    throw new Error("Unknown action");
  });
