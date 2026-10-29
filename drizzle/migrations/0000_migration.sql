create type public.app_role as enum ('admin','user');
create table public.user_roles (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade not null, role app_role not null, unique(user_id, role));
grant select on public.user_roles to authenticated; grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role app_role) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.user_roles where user_id=_user_id and role=_role) $$;

-- first account becomes studio admin
create or replace function public.handle_first_admin() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.user_roles where role='admin') then
    insert into public.user_roles(user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_first_admin after insert on auth.users for each row execute function public.handle_first_admin();

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$ begin new.updated_at = now(); return new; end $$;

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null, company text, email text, phone text, notes text,
  status text not null default 'active',
  portal_type text not null default 'standard', -- standard | sports
  access_method text not null default 'link', -- link | email
  portal_email text,
  portal_token text not null default encode(gen_random_bytes(24),'hex') unique,
  portal_enabled boolean not null default true,
  home_kit jsonb not null default '{}'::jsonb,
  away_kit jsonb not null default '{}'::jsonb,
  monthly_fee numeric(10,2),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.projects (id uuid primary key default gen_random_uuid(), client_id uuid references public.clients(id) on delete cascade, name text not null, description text, status text not null default 'active', start_date date, due_date date, budget numeric(10,2), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.milestones (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade, title text not null, due_date date, done boolean not null default false, position int not null default 0, created_at timestamptz not null default now());
create table public.tasks (id uuid primary key default gen_random_uuid(), project_id uuid references public.projects(id) on delete set null, client_id uuid references public.clients(id) on delete set null, title text not null, notes text, status text not null default 'todo', priority text not null default 'normal', due_date date, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.invoices (id uuid primary key default gen_random_uuid(), client_id uuid references public.clients(id) on delete set null, number text not null, issue_date date not null default current_date, due_date date, status text not null default 'draft', items jsonb not null default '[]'::jsonb, notes text, tax_rate numeric(5,2) not null default 0, paid_at date, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.expenses (id uuid primary key default gen_random_uuid(), description text not null, category text not null default 'General', amount numeric(10,2) not null default 0, spent_on date not null default current_date, vendor text, receipt_path text, project_id uuid references public.projects(id) on delete set null, created_at timestamptz not null default now());
create table public.pricing_packages (id uuid primary key default gen_random_uuid(), name text not null, description text, price numeric(10,2) not null default 0, billing text not null default 'one-off', features jsonb not null default '[]'::jsonb, active boolean not null default true, created_at timestamptz not null default now());
create table public.proposals (id uuid primary key default gen_random_uuid(), client_id uuid references public.clients(id) on delete set null, kind text not null default 'proposal', title text not null, body text, items jsonb not null default '[]'::jsonb, status text not null default 'draft', accepted_name text, accepted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.templates (id uuid primary key default gen_random_uuid(), kind text not null default 'onboarding', name text not null, description text, items jsonb not null default '[]'::jsonb, body text, created_at timestamptz not null default now());
create table public.onboarding_items (id uuid primary key default gen_random_uuid(), client_id uuid not null references public.clients(id) on delete cascade, title text not null, description text, done boolean not null default false, done_at timestamptz, position int not null default 0, created_at timestamptz not null default now());
create table public.deliverables (id uuid primary key default gen_random_uuid(), client_id uuid not null references public.clients(id) on delete cascade, project_id uuid references public.projects(id) on delete set null, kind text not null default 'deliverable', title text not null, description text, file_path text, file_name text, status text not null default 'shared', feedback text, uploaded_by text not null default 'studio', week_of date, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.sports_fixtures (id uuid primary key default gen_random_uuid(), client_id uuid not null references public.clients(id) on delete cascade, match_date date not null, opponent text not null, venue text not null default 'home', competition text, graphics jsonb not null default '[]'::jsonb, notes text, created_at timestamptz not null default now());
create table public.activity_log (id uuid primary key default gen_random_uuid(), client_id uuid references public.clients(id) on delete cascade, actor text not null default 'studio', message text not null, created_at timestamptz not null default now());

do $$ declare t text; begin
  foreach t in array array['clients','projects','milestones','tasks','invoices','expenses','pricing_packages','proposals','templates','onboarding_items','deliverables','sports_fixtures','activity_log'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "admin all" on public.%I for all to authenticated using (public.has_role(auth.uid(),''admin'')) with check (public.has_role(auth.uid(),''admin''))', t);
  end loop;
end $$;

create trigger t_clients before update on public.clients for each row execute function public.touch_updated_at();
create trigger t_projects before update on public.projects for each row execute function public.touch_updated_at();
create trigger t_tasks before update on public.tasks for each row execute function public.touch_updated_at();
create trigger t_invoices before update on public.invoices for each row execute function public.touch_updated_at();
create trigger t_proposals before update on public.proposals for each row execute function public.touch_updated_at();
create trigger t_deliverables before update on public.deliverables for each row execute function public.touch_updated_at();

create policy "admin files" on storage.objects for all to authenticated using (bucket_id='files' and public.has_role(auth.uid(),'admin')) with check (bucket_id='files' and public.has_role(auth.uid(),'admin'));

-- starter content
insert into public.pricing_packages(name, description, price, billing, features) values
('Brand Starter','Logo suite and core brand guidelines',650,'one-off','["Primary & secondary logo","Colour palette","Typography pairing","Mini brand guide"]'),
('Brand Signature','Full identity with collateral',1450,'one-off','["Everything in Starter","Stationery set","Social templates","Full brand book"]'),
('Matchday Weekly','Weekly sports graphics for clubs',180,'monthly','["Matchday & result graphics","Lineup and fixtures","Weekly templates","Monthly archive"]');
insert into public.templates(kind, name, description, items) values
('onboarding','Brand client onboarding','Standard checklist for new branding clients','["Sign proposal & contract","Pay deposit invoice","Complete brand questionnaire","Upload existing assets & inspiration","Book kickoff call"]'),
('onboarding','Sports club onboarding','Weekly sports graphics setup','["Confirm home & away kit colours","Upload club badge and sponsor logos","Share fixture list","Upload player photos","Set up monthly payment"]');