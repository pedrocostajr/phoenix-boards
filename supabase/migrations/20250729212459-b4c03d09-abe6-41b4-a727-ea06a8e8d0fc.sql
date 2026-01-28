-- Add DELETE policies for boards
CREATE POLICY "Project creators can delete boards" 
ON public.boards 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.id = boards.project_id 
  AND p.created_by = auth.uid()
));

-- Add DELETE policy for tasks
CREATE POLICY "Project members can delete tasks" 
ON public.tasks 
FOR DELETE 
USING (EXISTS (
  SELECT 1
  FROM board_columns bc
  JOIN boards b ON bc.board_id = b.id
  JOIN projects p ON b.project_id = p.id
  LEFT JOIN project_members pm ON p.id = pm.project_id
  WHERE bc.id = tasks.column_id 
  AND (p.created_by = auth.uid() OR pm.user_id = auth.uid())
));