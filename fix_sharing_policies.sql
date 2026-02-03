-- 1. Ensure table exists
create table if not exists public.project_members (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text default 'editor' check (role in ('viewer', 'editor', 'admin')),
  created_at timestamptz default now(),
  unique(project_id, user_id)
);

-- 2. Validate RLS is enabled on both tables
alter table public.projects enable row level security;
alter table public.project_members enable row level security;

-- 3. Policy: Owners can do everything on their projects
drop policy if exists "Users can manage their own projects" on public.projects;
create policy "Users can manage their own projects"
on public.projects
for all
using (auth.uid() = created_by);

-- 4. Policy: Members can VIEW projects they are invited to
drop policy if exists "Members can view shared projects" on public.projects;
create policy "Members can view shared projects"
on public.projects
for select
using (
  exists (
    select 1 from public.project_members
    where project_id = projects.id
    and user_id = auth.uid()
  )
);

-- 5. Policies for project_members table
-- View: Members can see who else is on the project
drop policy if exists "Members can view team" on public.project_members;
create policy "Members can view team"
on public.project_members
for select
using (
  exists (
    select 1 from public.projects
    where id = project_members.project_id
    and (created_by = auth.uid() or exists (
      select 1 from public.project_members as pm
      where pm.project_id = project_members.project_id
      and pm.user_id = auth.uid()
    ))
  )
);

-- Insert/Delete: Only Project Owners can manage members
drop policy if exists "Owners can manage members" on public.project_members;
create policy "Owners can manage members"
on public.project_members
for all
using (
  exists (
    select 1 from public.projects
    where id = project_members.project_id
    and created_by = auth.uid()
  )
);
