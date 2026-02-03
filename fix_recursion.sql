-- 1. Drop existing policies to start fresh and clean recursion
drop policy if exists "Members can view shared projects" on public.projects;
drop policy if exists "Users can manage their own projects" on public.projects;
drop policy if exists "Members can view team" on public.project_members;
drop policy if exists "Owners can manage members" on public.project_members;

-- 2. Create Helper Functions (SECURITY DEFINER) to bypass RLS loops
create or replace function public.is_project_member(_project_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 
    from public.project_members 
    where project_id = _project_id 
    and user_id = auth.uid()
  );
end;
$$ language plpgsql security definer;

create or replace function public.is_project_owner(_project_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 
    from public.projects 
    where id = _project_id 
    and created_by = auth.uid()
  );
end;
$$ language plpgsql security definer;

-- 3. Re-create Policies using the functions

-- PROJECTS TABLE
create policy "Users can see projects (Owner or Member)"
on public.projects
for select
using (
  created_by = auth.uid() 
  or 
  public.is_project_member(id)
);

create policy "Users can update own projects"
on public.projects
for update
using (created_by = auth.uid());

create policy "Users can delete own projects"
on public.projects
for delete
using (created_by = auth.uid());

create policy "Users can insert projects"
on public.projects
for insert
with check (created_by = auth.uid());


-- PROJECT MEMBERS TABLE
create policy "Users can view members (Owner or Member)"
on public.project_members
for select
using (
  public.is_project_owner(project_id)
  or
  public.is_project_member(project_id)
);

create policy "Owners can manage members"
on public.project_members
for all
using (
  public.is_project_owner(project_id)
);
