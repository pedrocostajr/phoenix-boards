-- DEBUG SCRIPT: FORCE INSERT DATA (FIXED)
-- Explicitly providing 'position' to avoid constraints errors.

do $$
declare
  v_project_id uuid;
  v_task_id uuid;
  v_tag_id uuid;
begin
  -- Get first project and task
  select id into v_project_id from public.projects limit 1;
  select id into v_task_id from public.tasks order by created_at desc limit 1;
  
  if v_project_id is not null and v_task_id is not null then
      
      -- 1. Create a Test Tag
      insert into public.project_tags (project_id, name, color)
      values (v_project_id, 'TESTE_DEBUG', '#ff0000')
      returning id into v_tag_id;
      
      -- 2. Link Tag to Task
      insert into public.task_tags (task_id, tag_id)
      values (v_task_id, v_tag_id);
      
      -- 3. Add Checklist Item (position = 0)
      insert into public.task_checklist_items (task_id, text, completed, position)
      values (v_task_id, 'CHECKLIST TESTE', false, 0);
      
      raise notice 'Dados de teste criados com sucesso na tarefa %', v_task_id;
  else
      raise notice 'Nenhum projeto ou tarefa encontrado.';
  end if;
end $$;
