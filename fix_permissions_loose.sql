-- ⚠️ DEBUG MODE: Permissive Policies
-- This script simplifies permission checks to "Are you logged in?"
-- resolving issues where complex joins (projects <-> boards <-> columns) fail silently.

-- 1. Tasks Table
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Drop complex policies
DROP POLICY IF EXISTS "Users can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view tasks of projects they are members of" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert tasks to projects they are members of" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks of projects they are members of" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete tasks of projects they are members of" ON public.tasks;

-- Create simple authenticated policies
CREATE POLICY "Enable all for tasks" ON public.tasks 
FOR ALL USING (auth.role() = 'authenticated');


-- 2. Project Tags
ALTER TABLE public.project_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view tags of projects they are members of" ON public.project_tags;
DROP POLICY IF EXISTS "Users can insert tags to projects they are members of" ON public.project_tags;
DROP POLICY IF EXISTS "Users can delete tags from projects they are members of" ON public.project_tags;
DROP POLICY IF EXISTS "Allow authenticated project_tags" ON public.project_tags;

CREATE POLICY "Enable all for project_tags" ON public.project_tags 
FOR ALL USING (auth.role() = 'authenticated');


-- 3. Task Tags (Junction)
ALTER TABLE public.task_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view task tags" ON public.task_tags;
DROP POLICY IF EXISTS "Users can manage task tags" ON public.task_tags;
DROP POLICY IF EXISTS "Allow authenticated task_tags" ON public.task_tags;

CREATE POLICY "Enable all for task_tags" ON public.task_tags 
FOR ALL USING (auth.role() = 'authenticated');

-- 4. Verify Project Members (Just in case)
CREATE POLICY "Enable read for project_members" ON public.project_members
FOR SELECT USING (auth.role() = 'authenticated');
