-- Create project_tags table
CREATE TABLE IF NOT EXISTS public.project_tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#6366f1',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create task_tags junction table
CREATE TABLE IF NOT EXISTS public.task_tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    tag_id UUID REFERENCES public.project_tags(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(task_id, tag_id)
);

-- Enable RLS
ALTER TABLE public.project_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_tags ENABLE ROW LEVEL SECURITY;

-- Policies for project_tags
CREATE POLICY "Users can view tags of projects they are members of" ON public.project_tags
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_members.project_id = project_tags.project_id
            AND project_members.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = project_tags.project_id
            AND projects.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can insert tags to projects they are members of" ON public.project_tags
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_members.project_id = project_tags.project_id
            AND project_members.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = project_tags.project_id
            AND projects.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can delete tags from projects they are members of" ON public.project_tags
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_members.project_id = project_tags.project_id
            AND project_members.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = project_tags.project_id
            AND projects.created_by = auth.uid()
        )
    );

-- Policies for task_tags (simplified: if you can see the task, you can see its tags)
CREATE POLICY "Users can view task tags" ON public.task_tags
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tasks
            JOIN public.board_columns ON tasks.column_id = board_columns.id
            JOIN public.boards ON board_columns.board_id = boards.id
            LEFT JOIN public.project_members ON boards.project_id = project_members.project_id
            LEFT JOIN public.projects ON boards.project_id = projects.id
            WHERE tasks.id = task_tags.task_id
            AND (project_members.user_id = auth.uid() OR projects.created_by = auth.uid())
        )
    );

CREATE POLICY "Users can manage task tags" ON public.task_tags
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.tasks
            JOIN public.board_columns ON tasks.column_id = board_columns.id
            JOIN public.boards ON board_columns.board_id = boards.id
            LEFT JOIN public.project_members ON boards.project_id = project_members.project_id
            LEFT JOIN public.projects ON boards.project_id = projects.id
            WHERE tasks.id = task_tags.task_id
            AND (project_members.user_id = auth.uid() OR projects.created_by = auth.uid())
        )
    );
