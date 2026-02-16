-- Enable RLS on tasks if not already
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view tasks of projects they are members of" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert tasks to projects they are members of" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks of projects they are members of" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete tasks of projects they are members of" ON public.tasks;

-- View Policy
CREATE POLICY "Users can view tasks" ON public.tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.board_columns
            JOIN public.boards ON board_columns.board_id = boards.id
            LEFT JOIN public.project_members ON boards.project_id = project_members.project_id
            LEFT JOIN public.projects ON boards.project_id = projects.id
            WHERE board_columns.id = tasks.column_id
            AND (project_members.user_id = auth.uid() OR projects.created_by = auth.uid())
        )
    );

-- Insert Policy
CREATE POLICY "Users can insert tasks" ON public.tasks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.board_columns
            JOIN public.boards ON board_columns.board_id = boards.id
            LEFT JOIN public.project_members ON boards.project_id = project_members.project_id
            LEFT JOIN public.projects ON boards.project_id = projects.id
            WHERE board_columns.id = tasks.column_id
            AND (project_members.user_id = auth.uid() OR projects.created_by = auth.uid())
        )
    );

-- Update Policy (Crucial for Assignee)
CREATE POLICY "Users can update tasks" ON public.tasks
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.board_columns
            JOIN public.boards ON board_columns.board_id = boards.id
            LEFT JOIN public.project_members ON boards.project_id = project_members.project_id
            LEFT JOIN public.projects ON boards.project_id = projects.id
            WHERE board_columns.id = tasks.column_id
            AND (project_members.user_id = auth.uid() OR projects.created_by = auth.uid())
        )
    );

-- Delete Policy
CREATE POLICY "Users can delete tasks" ON public.tasks
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.board_columns
            JOIN public.boards ON board_columns.board_id = boards.id
            LEFT JOIN public.project_members ON boards.project_id = project_members.project_id
            LEFT JOIN public.projects ON boards.project_id = projects.id
            WHERE board_columns.id = tasks.column_id
            AND (project_members.user_id = auth.uid() OR projects.created_by = auth.uid())
        )
    );
