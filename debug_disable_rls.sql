-- DEBUG SCRIPT: DISABLE RLS
-- Use this to verifying if permissions are hiding the data.

alter table public.project_tags disable row level security;
alter table public.task_tags disable row level security;
alter table public.task_checklist_items disable row level security;

-- NOTE: To re-enable security later, execute the 'fix_all_features.sql' script again.
