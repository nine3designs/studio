# Nine3 Designs Studio Workspace + Client Portals

## Branding
- Colors: olive primary (#404A3B / #333C30 / #566150), gold accent (#C8A96A / #D8BC84), cream backgrounds (#FEF9F3 / #F6F1EA), charcoal text (#2B2B2B / #333333). All set up as theme colors.
- Fonts: Raleway for everything, Allura for signature touches (greetings, portal headers).
- Logo: the Nine3 porcelain logo from nine3designs.co.uk.

## Phase 1 — Foundation
- Turn on Lovable Cloud (database, sign-in, file storage).
- Admin sign-in for Natalie (email + password). Admin role kept in its own table.
- Studio layout with sidebar: Dashboard, Clients, Projects, Tasks, Invoices, Expenses, Proposals & Contracts, Pricing, Onboarding, Templates.

## Phase 2 — Internal workspace
- **Dashboard**: active projects, revenue (paid / outstanding this month), pending tasks, recent client activity feed.
- **Clients**: directory, client detail, portal settings (email sign-in or secure link), copy-link button, regenerate link, choose portal type (Standard or Sports Weekly).
- **Projects & Tasks**: projects with milestones, status, due dates; task list and board view.
- **Invoices**: line items, status (draft / sent / paid / overdue), printable PDF-style view with download.
- **Expenses**: log with category, amount, receipt upload.
- **Proposals, Contracts, Pricing**: build documents from pricing packages, send to client, client can accept.
- **Onboarding & Templates**: reusable checklist templates applied to clients.

## Phase 3 — Client portals
- Access at `/portal/...` via email sign-in or secure unique link (per-client choice).
- **Standard portal**: welcome, onboarding checklist, project milestones, shared deliverables, file uploads, downloadable invoices, design proofs (approve or request revisions with feedback).
- **Sports Weekly portal** (modeled on SPS Ladies): matchday graphics to-do list, team colours (home and away kits), weekly templates, resource photo uploads, completed work archive, monthly payment summary.

## Technical details
- TanStack Start routes: `/auth`, `/_authenticated/*` for studio, `/portal/$token` (link access) and `/portal` (email-signed-in clients).
- Tables: clients, projects, milestones, tasks, invoices, invoice_items, expenses, proposals, pricing_packages, onboarding_templates, onboarding_items, deliverables, proofs, proof_feedback, sports_fixtures, team_kits, activity_log, user_roles.
- Link-access portal data served through server functions that verify the token (hashed, regenerable); email-portal clients scoped by RLS to their own client record.
- Storage buckets (private) for deliverables, client uploads, receipts; signed URLs for downloads.
- Invoice PDF via print-styled page + browser "Save as PDF".

## Delivery order
Phase 1 and 2 core (dashboard, clients, projects, invoices) first, then portals, then proposals/expenses/templates polish.
