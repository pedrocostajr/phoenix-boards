-- Add checklist support to tasks
CREATE TABLE public.task_checklist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for task_checklist_items
ALTER TABLE public.task_checklist_items ENABLE ROW LEVEL SECURITY;

-- Create policies for checklist items
CREATE POLICY "Project members can view task checklist items"
ON public.task_checklist_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.tasks t
    JOIN public.board_columns bc ON t.column_id = bc.id
    JOIN public.boards b ON bc.board_id = b.id
    JOIN public.projects p ON b.project_id = p.id
    LEFT JOIN public.project_members pm ON p.id = pm.project_id
    WHERE t.id = task_checklist_items.task_id
    AND (p.created_by = auth.uid() OR pm.user_id = auth.uid())
  )
);

CREATE POLICY "Project members can create task checklist items"
ON public.task_checklist_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.tasks t
    JOIN public.board_columns bc ON t.column_id = bc.id
    JOIN public.boards b ON bc.board_id = b.id
    JOIN public.projects p ON b.project_id = p.id
    LEFT JOIN public.project_members pm ON p.id = pm.project_id
    WHERE t.id = task_checklist_items.task_id
    AND (p.created_by = auth.uid() OR pm.user_id = auth.uid())
  )
);

CREATE POLICY "Project members can update task checklist items"
ON public.task_checklist_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.tasks t
    JOIN public.board_columns bc ON t.column_id = bc.id
    JOIN public.boards b ON bc.board_id = b.id
    JOIN public.projects p ON b.project_id = p.id
    LEFT JOIN public.project_members pm ON p.id = pm.project_id
    WHERE t.id = task_checklist_items.task_id
    AND (p.created_by = auth.uid() OR pm.user_id = auth.uid())
  )
);

CREATE POLICY "Project members can delete task checklist items"
ON public.task_checklist_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.tasks t
    JOIN public.board_columns bc ON t.column_id = bc.id
    JOIN public.boards b ON bc.board_id = b.id
    JOIN public.projects p ON b.project_id = p.id
    LEFT JOIN public.project_members pm ON p.id = pm.project_id
    WHERE t.id = task_checklist_items.task_id
    AND (p.created_by = auth.uid() OR pm.user_id = auth.uid())
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_task_checklist_items_updated_at
BEFORE UPDATE ON public.task_checklist_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();