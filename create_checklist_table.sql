-- Create task_checklist_items table if it doesn't exist
create table if not exists public.task_checklist_items (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references public.tasks(id) on delete cascade not null,
  text text not null,
  completed boolean default false,
  position integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.task_checklist_items enable row level security;

-- Policies
-- View: Members of the project (via task -> column -> board -> project)
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

-- Manage: Only editors/admins/owners
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
