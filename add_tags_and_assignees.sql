-- 1. Create project_tags table (custom labels per project)
create table if not exists public.project_tags (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  name text not null,
  color text not null, -- Hex code or preset name
  created_at timestamptz default now()
);

-- 2. Create task_tags junction table
create table if not exists public.task_tags (
  task_id uuid references public.tasks(id) on delete cascade not null,
  tag_id uuid references public.project_tags(id) on delete cascade not null,
  primary key (task_id, tag_id)
);

-- 3. Enable RLS
alter table public.project_tags enable row level security;
alter table public.task_tags enable row level security;

-- 4. Policies for project_tags

-- Drop existing policies if re-running to avoid errors
drop policy if exists "Project members can view tags" on public.project_tags;
drop policy if exists "Project editors can manage tags" on public.project_tags;
drop policy if exists "Project members can view task tags" on public.task_tags;
drop policy if exists "Users can manage task tags if they can edit tasks" on public.task_tags;

-- View: Members of the project
create policy "Project members can view tags"
on public.project_tags for select
using (
  exists (
    select 1 from public.project_members
    where project_members.project_id = project_tags.project_id
    and project_members.user_id = auth.uid()
  ) or exists (
    select 1 from public.projects
    where projects.id = project_tags.project_id
    and projects.created_by = auth.uid()
  )
);

-- Manage: Only editors/admins/owners
create policy "Project editors can manage tags"
on public.project_tags for all
using (
  exists (
    select 1 from public.project_members
    where project_members.project_id = project_tags.project_id
    and project_members.user_id = auth.uid()
    and project_members.role in ('editor', 'admin')
  ) or exists (
    select 1 from public.projects
    where projects.id = project_tags.project_id
    and projects.created_by = auth.uid()
  )
);

-- 5. Policies for task_tags
-- Access is determined by the tag's project. If you can see the tag (i.e. you are in the project), you can see/edit its assignment.

create policy "Project members can view task tags"
on public.task_tags for select
using (
  exists (
    select 1 from public.project_tags
    where project_tags.id = task_tags.tag_id
    and (
      exists (
        select 1 from public.project_members
        where project_members.project_id = project_tags.project_id
        and project_members.user_id = auth.uid()
      ) or exists (
        select 1 from public.projects
        where projects.id = project_tags.project_id
        and projects.created_by = auth.uid()
      )
    )
  )
);

create policy "Users can manage task tags if they can edit tasks"
on public.task_tags for all
using (
  exists (
    select 1 from public.project_tags
    where project_tags.id = task_tags.tag_id
    and (
      exists (
        select 1 from public.project_members
        where project_members.project_id = project_tags.project_id
        and project_members.user_id = auth.uid()
        and project_members.role in ('editor', 'admin')
      ) or exists (
        select 1 from public.projects
        where projects.id = project_tags.project_id
        and projects.created_by = auth.uid()
      )
    )
  )
);
