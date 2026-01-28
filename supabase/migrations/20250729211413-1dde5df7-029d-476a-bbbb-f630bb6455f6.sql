-- Remove ALL existing policies for projects table
DROP POLICY IF EXISTS "Users can view projects they are members of" ON public.projects;
DROP POLICY IF EXISTS "Project creators and admin members can update projects" ON public.projects;
DROP POLICY IF EXISTS "Users can create projects" ON public.projects;

-- Disable RLS temporarily to clean up
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies
-- INSERT Policy - only check created_by matches auth.uid()
CREATE POLICY "insert_own_projects" 
ON public.projects 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

-- SELECT Policy - users can see projects they created
CREATE POLICY "select_own_projects" 
ON public.projects 
FOR SELECT 
USING (auth.uid() = created_by);

-- UPDATE Policy - only project creators can update
CREATE POLICY "update_own_projects" 
ON public.projects 
FOR UPDATE 
USING (auth.uid() = created_by);

-- DELETE Policy - only project creators can delete
CREATE POLICY "delete_own_projects" 
ON public.projects 
FOR DELETE 
USING (auth.uid() = created_by);