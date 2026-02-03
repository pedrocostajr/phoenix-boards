-- ==========================================
-- SINGLE MIGRATION SCRIPT FOR PHOENIX BOARD
-- Features: Custom Tags, Assignees, Checklists
-- ==========================================

-- 1. TAGS SYSTEM
-- Create project_tags table
create table if not exists public.project_tags (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  name text not null,
  color text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create task_tags junction table
create table if not exists public.task_tags (
  task_id uuid references public.tasks(id) on delete cascade not null,
  tag_id uuid references public.project_tags(id) on delete cascade not null,
  primary key (task_id, tag_id)
);

-- Enable RLS for tags
alter table public.project_tags enable row level security;
alter table public.task_tags enable row level security;

-- Drop existing policies to avoid conflicts if re-running
drop policy if exists "Project members can view tags" on public.project_tags;
drop policy if exists "Project editors can manage tags" on public.project_tags;
drop policy if exists "Project members can view task tags" on public.task_tags;
drop policy if exists "Users can manage task tags if they can edit tasks" on public.task_tags;

-- Policies for project_tags
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

-- Policies for task_tags
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


-- 2. ASSIGNEES
-- Add assigned_to column to tasks if not exists
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name='tasks' and column_name='assigned_to') then
        alter table public.tasks add column assigned_to uuid references auth.users(id);
    end if;
end $$;


-- 3. CHECKLIST SYSTEM
-- Create checklist table
create table if not exists public.task_checklist_items (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references public.tasks(id) on delete cascade not null,
  text text not null,
  completed boolean default false,
  position integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for checklist
alter table public.task_checklist_items enable row level security;

-- Drop existing policies
drop policy if exists "Project members can view checklist items" on public.task_checklist_items;
drop policy if exists "Project editors can manage checklist items" on public.task_checklist_items;

-- Policies for checklist
create policy "Project members can view checklist items"
on public.task_checklist_items for select
using (
  exists (
    select 1 from public.tasks
    join public.board_columns on tasks.column_id = board_columns.id
    join public.boards on board_columns.board_id = boards.id
    where tasks.id = task_checklist_items.task_id
    and (
      exists (
        select 1 from public.project_members
        where project_members.project_id = boards.project_id
        and project_members.user_id = auth.uid()
      ) or exists (
        select 1 from public.projects
        where projects.id = boards.project_id
        and projects.created_by = auth.uid()
      )
    )
  )
);

create policy "Project editors can manage checklist items"
on public.task_checklist_items for all
using (
  exists (
    select 1 from public.tasks
    join public.board_columns on tasks.column_id = board_columns.id
    join public.boards on board_columns.board_id = boards.id
    where tasks.id = task_checklist_items.task_id
    and (
      exists (
        select 1 from public.project_members
        where project_members.project_id = boards.project_id
        and project_members.user_id = auth.uid()
        and project_members.role in ('editor', 'admin')
      ) or exists (
        select 1 from public.projects
        where projects.id = boards.project_id
        and projects.created_by = auth.uid()
      )
    )
  )
);
