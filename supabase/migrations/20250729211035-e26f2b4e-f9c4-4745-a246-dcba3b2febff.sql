-- Fix the INSERT policy for projects table
-- The issue is that we need to ensure the created_by field matches auth.uid()

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can create projects" ON public.projects;

-- Create corrected INSERT policy
CREATE POLICY "Users can create projects" 
ON public.projects 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

-- Also ensure we have proper UPDATE and SELECT policies
DROP POLICY IF EXISTS "Project creators and admin members can update projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view projects they are members of" ON public.projects;

-- Recreate policies with proper logic
CREATE POLICY "Users can view projects they are members of" 
ON public.projects 
FOR SELECT 
USING (
  (auth.uid() = created_by) OR 
  (EXISTS (
    SELECT 1 
    FROM public.project_members 
    WHERE project_id = projects.id 
    AND user_id = auth.uid()
  ))
);

CREATE POLICY "Project creators and admin members can update projects" 
ON public.projects 
FOR UPDATE 
USING (
  (auth.uid() = created_by) OR 
  (EXISTS (
    SELECT 1 
    FROM public.project_members 
    WHERE project_id = projects.id 
    AND user_id = auth.uid() 
    AND role = 'admin'
  ))
);