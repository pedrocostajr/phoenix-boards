-- Fix infinite recursion in projects RLS policy
-- Create a security definer function to check project access
CREATE OR REPLACE FUNCTION public.check_project_access(project_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.projects p
    LEFT JOIN public.project_members pm ON p.id = pm.project_id
    WHERE p.id = project_uuid 
    AND (p.created_by = auth.uid() OR pm.user_id = auth.uid())
  );
$$;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view projects they are members of" ON public.projects;
DROP POLICY IF EXISTS "Project creators and admin members can update projects" ON public.projects;

-- Create new policies using the security definer function
CREATE POLICY "Users can view projects they are members of" 
ON public.projects 
FOR SELECT 
USING (public.check_project_access(id));

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

-- Fix search_path for existing functions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'client'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;