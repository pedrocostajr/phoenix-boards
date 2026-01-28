-- Fix the projects table RLS policy
-- The issue is that created_by must be set and match auth.uid()

-- Drop the existing insert policy
DROP POLICY IF EXISTS "insert_own_projects" ON public.projects;

-- Create a more explicit insert policy that ensures created_by is set correctly
CREATE POLICY "insert_own_projects" 
ON public.projects 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND created_by IS NOT NULL 
  AND auth.uid() = created_by
);