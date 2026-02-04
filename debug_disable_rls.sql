-- DEBUG SCRIPT: DISABLE RLS TEMPORARILY
-- This allows us to confirm if the issue is strictly permissions-related.
-- WARNING: This makes data public/writable by anyone with the anon key (if policies didn't exist, but disabling RLS bypasses policies).
-- Run this, then try your update. If it works, run 'fix_rls_policies.sql'.

alter table public.project_tags disable row level security;
alter table public.task_tags disable row level security;
alter table public.task_checklist_items disable row level security;

-- Also potentially these if issues persist with tasks/columns
-- alter table public.tasks disable row level security;
-- alter table public.board_columns disable row level security;
