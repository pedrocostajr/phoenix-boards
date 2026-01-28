-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'client')),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create projects table  
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create boards table
CREATE TABLE public.boards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create board columns table
CREATE TABLE public.board_columns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  column_id UUID NOT NULL REFERENCES public.board_columns(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date TIMESTAMP WITH TIME ZONE,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project members table for permissions
CREATE TABLE public.project_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'client')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view all profiles" 
ON public.profiles FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for projects
CREATE POLICY "Users can view projects they are members of" 
ON public.projects FOR SELECT 
USING (
  auth.uid() = created_by OR 
  EXISTS (
    SELECT 1 FROM public.project_members 
    WHERE project_id = projects.id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create projects" 
ON public.projects FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Project creators and admin members can update projects" 
ON public.projects FOR UPDATE 
USING (
  auth.uid() = created_by OR 
  EXISTS (
    SELECT 1 FROM public.project_members 
    WHERE project_id = projects.id AND user_id = auth.uid() AND role = 'admin'
  )
);

-- Create RLS policies for boards
CREATE POLICY "Users can view boards in their projects" 
ON public.boards FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    LEFT JOIN public.project_members pm ON p.id = pm.project_id
    WHERE p.id = boards.project_id 
    AND (p.created_by = auth.uid() OR pm.user_id = auth.uid())
  )
);

CREATE POLICY "Project members can create boards" 
ON public.boards FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    LEFT JOIN public.project_members pm ON p.id = pm.project_id
    WHERE p.id = boards.project_id 
    AND (p.created_by = auth.uid() OR pm.user_id = auth.uid())
  )
);

CREATE POLICY "Project admin members can update boards" 
ON public.boards FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    LEFT JOIN public.project_members pm ON p.id = pm.project_id
    WHERE p.id = boards.project_id 
    AND (p.created_by = auth.uid() OR (pm.user_id = auth.uid() AND pm.role = 'admin'))
  )
);

-- Create RLS policies for board_columns
CREATE POLICY "Users can view columns in their project boards" 
ON public.board_columns FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.boards b
    JOIN public.projects p ON b.project_id = p.id
    LEFT JOIN public.project_members pm ON p.id = pm.project_id
    WHERE b.id = board_columns.board_id 
    AND (p.created_by = auth.uid() OR pm.user_id = auth.uid())
  )
);

CREATE POLICY "Project members can manage columns" 
ON public.board_columns FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.boards b
    JOIN public.projects p ON b.project_id = p.id
    LEFT JOIN public.project_members pm ON p.id = pm.project_id
    WHERE b.id = board_columns.board_id 
    AND (p.created_by = auth.uid() OR pm.user_id = auth.uid())
  )
);

-- Create RLS policies for tasks
CREATE POLICY "Users can view tasks in their project boards" 
ON public.tasks FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.board_columns bc
    JOIN public.boards b ON bc.board_id = b.id
    JOIN public.projects p ON b.project_id = p.id
    LEFT JOIN public.project_members pm ON p.id = pm.project_id
    WHERE bc.id = tasks.column_id 
    AND (p.created_by = auth.uid() OR pm.user_id = auth.uid())
  )
);

CREATE POLICY "Project members can create tasks" 
ON public.tasks FOR INSERT 
WITH CHECK (
  auth.uid() = created_by AND
  EXISTS (
    SELECT 1 FROM public.board_columns bc
    JOIN public.boards b ON bc.board_id = b.id
    JOIN public.projects p ON b.project_id = p.id
    LEFT JOIN public.project_members pm ON p.id = pm.project_id
    WHERE bc.id = tasks.column_id 
    AND (p.created_by = auth.uid() OR pm.user_id = auth.uid())
  )
);

CREATE POLICY "Project members can update tasks" 
ON public.tasks FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.board_columns bc
    JOIN public.boards b ON bc.board_id = b.id
    JOIN public.projects p ON b.project_id = p.id
    LEFT JOIN public.project_members pm ON p.id = pm.project_id
    WHERE bc.id = tasks.column_id 
    AND (p.created_by = auth.uid() OR pm.user_id = auth.uid())
  )
);

-- Create RLS policies for project_members
CREATE POLICY "Users can view project members" 
ON public.project_members FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_members.project_id 
    AND (p.created_by = auth.uid() OR user_id = auth.uid())
  )
);

CREATE POLICY "Project creators can manage members" 
ON public.project_members FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_members.project_id AND p.created_by = auth.uid()
  )
);

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'client'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_boards_updated_at
  BEFORE UPDATE ON public.boards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();