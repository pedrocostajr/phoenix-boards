-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view projects they own or are members of" ON public.projects;

-- Create a security definer function to check project access
CREATE OR REPLACE FUNCTION public.check_project_access(project_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM public.projects p
    LEFT JOIN public.project_members pm ON p.id = pm.project_id
    WHERE p.id = project_uuid 
    AND (p.created_by = auth.uid() OR pm.user_id = auth.uid())
  );
$function$;

-- Create the correct RLS policy using the function
CREATE POLICY "Users can view projects they own or are members of"
ON public.projects
FOR SELECT
USING (public.check_project_access(id));