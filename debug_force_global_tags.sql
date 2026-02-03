-- DEBUG SCRIPT: GLOBAL FORCE DATA
-- This script adds a tag and checklist to ONE task in EVERY project found.
-- This ensures that no matter which project you are viewing, you see data.

do $$
declare
  r_project record;
  v_task_id uuid;
  v_tag_id uuid;
begin
  -- Loop through ALL projects
  for r_project in select id from public.projects loop
      
      -- Find a task in this project (any task)
      -- Assuming tasks have a project_id or can be found via columns
      -- But our schema: tasks might not have project_id direct? 
      -- Tasks belong to board_columns -> boards -> projects.
      
      select t.id into v_task_id
      from public.tasks t
      join public.board_columns bc on t.column_id = bc.id
      join public.boards b on bc.board_id = b.id
      where b.project_id = r_project.id
      limit 1;
      
      if v_task_id is not null then
          -- 1. Create Tag for this Project
          insert into public.project_tags (project_id, name, color)
          values (r_project.id, 'TAG UNIVERSAL', '#0000ff')
          returning id into v_tag_id;
          
          -- 2. Link to Task
          insert into public.task_tags (task_id, tag_id)
          values (v_task_id, v_tag_id);
          
          -- 3. Checklist
          insert into public.task_checklist_items (task_id, text, completed, position)
          values (v_task_id, 'CHECKLIST UNIVERSAL', true, 0);
          
          raise notice 'Dados criados para projeto % na tarefa %', r_project.id, v_task_id;
      end if;
      
  end loop;
end $$;
