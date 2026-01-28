-- Update RLS policy for projects to allow members to view shared projects
DROP POLICY IF EXISTS "select_own_projects" ON public.projects;

CREATE POLICY "Users can view projects they own or are members of"
ON public.projects
FOR SELECT
USING (
  auth.uid() = created_by OR
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = projects.id
    AND pm.user_id = auth.uid()
  )
);