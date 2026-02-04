-- FIX SCRIPT: ROBUST RLS POLICIES
-- This script re-enables RLS and sets up permissible policies for Owners and Editors.

-- 1. Re-enable RLS
alter table public.project_tags enable row level security;
alter table public.task_tags enable row level security;
alter table public.task_checklist_items enable row level security;

-- 2. Clean up existing policies to avoid conflicts
drop policy if exists "Project members can view tags" on public.project_tags;
drop policy if exists "Project editors can manage tags" on public.project_tags;
drop policy if exists "Project members can view task tags" on public.task_tags;
drop policy if exists "Users can manage task tags if they can edit tasks" on public.task_tags;
drop policy if exists "Project members can view checklist items" on public.task_checklist_items;
drop policy if exists "Project editors can manage checklist items" on public.task_checklist_items;
drop policy if exists "Enable read access for all users" on public.project_tags;
drop policy if exists "Enable insert for authenticated users only" on public.project_tags;
drop policy if exists "Enable update for users based on email" on public.project_tags;
drop policy if exists "Enable delete for users based on user_id" on public.project_tags;

-- 3. Define Helper Logic (implicitly via policies)

-- ==========================
-- TABLE: project_tags
-- ==========================
-- READ: Members OR Owners
create policy "tags_read_policy"
on public.project_tags for select
using (
  auth.uid() in (
    select user_id from public.project_members where project_id = project_tags.project_id
  ) 
  or 
  auth.uid() in (
    select created_by from public.projects where id = project_tags.project_id
  )
);

-- WRITE (Insert/Update/Delete): Editors, Admins OR Owners
create policy "tags_write_policy"
on public.project_tags for all
using (
  auth.uid() in (
    select user_id from public.project_members 
    where project_id = project_tags.project_id 
    and role in ('editor', 'admin')
  )
  or
  auth.uid() in (
    select created_by from public.projects where id = project_tags.project_id
  )
);

-- ==========================
-- TABLE: task_tags
-- ==========================
-- READ
create policy "task_tags_read_policy"
on public.task_tags for select
using (
  exists (
    select 1 from public.project_tags
    where project_tags.id = task_tags.tag_id
    and (
      auth.uid() in (
        select created_by from public.projects where id = project_tags.project_id
      )
      or
      auth.uid() in (
        select user_id from public.project_members where project_id = project_tags.project_id
      )
    )
  )
);

-- WRITE
create policy "task_tags_write_policy"
on public.task_tags for all
using (
  exists (
    select 1 from public.project_tags
    where project_tags.id = task_tags.tag_id
    and (
      auth.uid() in (
        select created_by from public.projects where id = project_tags.project_id
      )
      or
      auth.uid() in (
        select user_id from public.project_members 
        where project_id = project_tags.project_id 
        and role in ('editor', 'admin')
      )
    )
  )
);

-- ==========================
-- TABLE: task_checklist_items
-- ==========================
-- READ
create policy "checklist_read_policy"
on public.task_checklist_items for select
using (
  exists (
    select 1 from public.tasks
    join public.board_columns on tasks.column_id = board_columns.id
    join public.boards on board_columns.board_id = boards.id
    where tasks.id = task_checklist_items.task_id
    and (
      boards.project_id in (select id from public.projects where created_by = auth.uid())
      or
      boards.project_id in (select project_id from public.project_members where user_id = auth.uid())
    )
  )
);

-- WRITE
create policy "checklist_write_policy"
on public.task_checklist_items for all
using (
  exists (
    select 1 from public.tasks
    join public.board_columns on tasks.column_id = board_columns.id
    join public.boards on board_columns.board_id = boards.id
    where tasks.id = task_checklist_items.task_id
    and (
      boards.project_id in (select id from public.projects where created_by = auth.uid())
      or
      boards.project_id in (select project_id from public.project_members where user_id = auth.uid() and role in ('editor', 'admin'))
    )
  )
);
