import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, ArrowLeft, Settings, Users, Calendar, Filter, Trash2, MoreVertical, Edit, ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DndContext, DragEndEvent, DragOverEvent, DragStartEvent, PointerSensor, MouseSensor, TouchSensor, useSensor, useSensors, closestCorners, DragOverlay, defaultDropAnimationSideEffects, DropAnimation } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DroppableColumn } from '@/components/DroppableColumn';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskCard } from '@/components/TaskCard';

interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

interface Board {
  id: string;
  name: string;
  project_id: string;
  created_at: string;
  updated_at: string;
}

interface Column {
  id: string;
  name: string;
  color: string;
  position: number;
  board_id: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  column_id: string;
  position: number;
  priority: string;
  due_date: string | null;
  completed: boolean;
  assigned_to: string | null; // User ID
  created_by: string;
  created_at: string;
  updated_at: string;
  tags?: Tag[]; // Populated in frontend
}

interface Tag {
  id: string;
  name: string;
  color: string;
  project_id: string;
}

interface Profile {
  user_id: string;
  approved: boolean;
  full_name?: string; // Optional if not always present
  email?: string; // Optional
}

interface ChecklistItem {
  id: string;
  task_id: string;
  text: string;
  completed: boolean;
  position: number;
}

const Project = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [projectTags, setProjectTags] = useState<Tag[]>([]);
  const [projectMembers, setProjectMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBoardName, setNewBoardName] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [selectedColumnId, setSelectedColumnId] = useState('');
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnColor, setNewColumnColor] = useState('#6366f1');
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isRenamingBoard, setIsRenamingBoard] = useState(false);
  const [renamingBoardId, setRenamingBoardId] = useState('');
  const [renamingBoardName, setRenamingBoardName] = useState('');
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    }),
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    })
  );

  useEffect(() => {
    if (!authLoading && !user) {
      console.log('🚪 Usuário não autenticado, redirecionando para /auth');
      navigate('/auth');
      return;
    }

    if (projectId && user) {
      fetchProjectData();
    }
  }, [projectId, user, authLoading, navigate]);

  useEffect(() => {
    if (selectedBoard) {
      fetchBoardData();
    }
  }, [selectedBoard, projectTags]);

  const fetchProjectData = async () => {
    try {
      const [projectResponse, boardsResponse, tagsResponse] = await Promise.all([
        supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single(),
        supabase
          .from('boards')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false }),
        supabase
          .from('project_tags')
          .select('*')
          .eq('project_id', projectId)
      ]);

      if (projectResponse.error) throw projectResponse.error;
      setProject(projectResponse.data);

      if (boardsResponse.error) throw boardsResponse.error;
      setBoards(boardsResponse.data || []);

      if (tagsResponse.error && tagsResponse.error.code !== 'PGRST116') {
        // Ignore if table doesn't exist yet (during migration) or just log
        console.log("Tags fetch warning:", tagsResponse.error);
      }
      setProjectTags(tagsResponse.data || []);



      // Fetch potential assignees (members)
      // For now, let's just fetch all profiles as we don't have a direct atomic "project_members" join easy here without knowing exact policy
      // Ideally: select * from profiles where user_id in (select user_id from project_members where project_id = ...)
      // But let's simplified: fetch all profiles for now or assume we can fetch them.
      // Better: Fetch project members if the table exists
      const { data: members, error: membersError } = await supabase
        .from('project_members')
        .select('user_id, role')
        .eq('project_id', projectId);

      if (!membersError && members) {
        const userIds = members.map(m => m.user_id);
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('*')
            .in('user_id', userIds);
          setProjectMembers(profiles || []);
        }
      }

      if (boardsResponse.data && boardsResponse.data.length > 0) {
        // Only override if we don't have a selection or the selection is invalid
        setSelectedBoard(prev => prev ? prev : boardsResponse.data[0]);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao carregar projeto",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBoardData = async () => {
    if (!selectedBoard) return;

    try {
      const { data: columnsData, error: columnsError } = await supabase
        .from('board_columns')
        .select(`
          *,
          tasks (*)
        `)
        .eq('board_id', selectedBoard.id)
        .order('position', { ascending: true });

      if (columnsError) throw columnsError;

      const columnsRaw = columnsData || [];

      // Extract Task IDs to fetch related data
      const allTasksRaw = columnsRaw.flatMap(col => col.tasks || []);
      const taskIds = allTasksRaw.map((t: any) => t.id);

      // Fetch Checklists and Tags manually (Robust separate queries)
      let checklists: any[] = [];
      let taskTagsRef: any[] = [];

      if (taskIds.length > 0) {
        const { data: checklistsData } = await supabase
          .from('task_checklist_items')
          .select('*')
          .in('task_id', taskIds);

        const { data: taskTagsData } = await supabase
          .from('task_tags')
          .select('task_id, tag_id')
          .in('task_id', taskIds);

        checklists = checklistsData || [];
        taskTagsRef = taskTagsData || [];
      }

      // Map data back to columns structure
      const columns = columnsRaw.map((col: any) => ({
        ...col,
        tasks: (col.tasks || []).map((task: any) => {
          const taskChecklists = checklists.filter(c => c.task_id === task.id).sort((a: any, b: any) => a.position - b.position);

          // Map tag relationship to actual tag objects
          const taskTagsObjects = taskTagsRef
            .filter(tt => tt.task_id === task.id)
            .map(tt => projectTags.find(pt => pt.id === tt.tag_id))
            .filter(Boolean);

          return {
            ...task,
            task_checklist_items: taskChecklists,
            tags: taskTagsObjects
          };
        })
      }));

      // Flatten for sorting/state
      setColumns(columns);

      const allTasks = columns.flatMap(col => col.tasks || [])
        .sort((a: any, b: any) => a.position - b.position);
      setTasks(allTasks);

      const allChecklists = allTasks.flatMap((task: any) => task.task_checklist_items || []);
      setChecklistItems(allChecklists);


    } catch (error: any) {
      toast({
        title: "Erro ao carregar board",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const createBoard = async () => {
    if (!newBoardName.trim() || !projectId) return;

    try {
      const { data, error } = await supabase
        .from('boards')
        .insert([{ name: newBoardName, project_id: projectId }])
        .select()
        .single();

      if (error) throw error;

      // Create default columns
      const defaultColumns = [
        { name: 'A Fazer', color: '#ef4444', position: 0 },
        { name: 'Em Progresso', color: '#f59e0b', position: 1 },
        { name: 'Concluído', color: '#10b981', position: 2 }
      ];

      const { error: columnsError } = await supabase
        .from('board_columns')
        .insert(defaultColumns.map(col => ({ ...col, board_id: data.id })));

      if (columnsError) throw columnsError;

      toast({
        title: "Board criado!",
        description: `O board "${newBoardName}" foi criado com sucesso.`,
      });

      setNewBoardName('');
      fetchProjectData();
    } catch (error: any) {
      toast({
        title: "Erro ao criar board",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const createTask = async (columnIdOverride?: string, manualTitle?: string) => {
    const targetColumnId = columnIdOverride || selectedColumnId;
    const titleToUse = manualTitle || newTaskTitle;

    if (!titleToUse.trim() || !targetColumnId || !user?.id) {
      if (!user?.id) {
        toast({
          title: "Erro de autenticação",
          description: "Você precisa estar logado para criar tarefas.",
          variant: "destructive",
        });
      }
      return;
    }

    // Check for batch creation (multiple lines) only if it's not a recursive call (manualTitle is undefined)
    if (!manualTitle && titleToUse.includes('\n')) {
      const lines = titleToUse.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      if (lines.length > 1) {
        if (window.confirm(`Detectamos ${lines.length} itens. Deseja criar ${lines.length} cartões individuais?`)) {
          try {
            let createdCount = 0;
            for (const line of lines) {
              // Clean up common checklist formats like "[ ] Task", "- [ ] Task", "1. Task"
              const cleanLine = line
                .replace(/^\[\s*x?\s*\]\s*/i, '') // [ ] or [x]
                .replace(/^-\s*\[\s*x?\s*\]\s*/i, '') // - [ ]
                .replace(/^\*\s*/, '') // * Task
                .replace(/^-\s*/, '') // - Task
                .replace(/^\d+\.\s*/, ''); // 1. Task

              if (cleanLine.trim()) {
                await createTask(targetColumnId, cleanLine.trim());
                createdCount++;
              }
            }

            if (createdCount > 0) {
              setNewTaskTitle('');
              setNewTaskDescription('');
              setSelectedColumnId('');

              toast({
                title: "Criação em massa concluída",
                description: `${createdCount} tarefas foram criadas com sucesso.`,
              });
            }
          } catch (error) {
            console.error("Erro na criação em massa:", error);
          }
          return;
        }
      }
    }

    try {
      const { data: newTask, error } = await supabase
        .from('tasks')
        .insert([{
          title: titleToUse,
          description: newTaskDescription,
          column_id: targetColumnId,
          priority: newTaskPriority,
          position: tasks.filter(t => t.column_id === targetColumnId).length,
          created_by: user.id
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Erro Supabase ao criar tarefa:', error);
        throw error;
      }

      // Optimistic update
      setTasks(prev => [...prev, newTask]);

      // Only show toast and clear input if it's a single manual creation
      if (!manualTitle) {
        toast({
          title: "Tarefa criada!",
          description: `A tarefa "${titleToUse}" foi criada com sucesso.`,
        });

        setNewTaskTitle('');
        setNewTaskDescription('');
        setSelectedColumnId('');
      }

    } catch (error: any) {
      toast({
        title: "Erro ao criar tarefa",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const duplicateBoard = async (boardId: string, boardName: string) => {
    if (!user?.id || !projectId) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para duplicar boards.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get original board
      const { data: originalBoard, error: boardError } = await supabase
        .from('boards')
        .select('*')
        .eq('id', boardId)
        .single();

      if (boardError) throw boardError;

      // Create new board
      const { data: newBoard, error: newBoardError } = await supabase
        .from('boards')
        .insert([{
          name: `${originalBoard.name} (Cópia)`,
          project_id: projectId
        }])
        .select()
        .single();

      if (newBoardError) throw newBoardError;

      // Get columns from original board
      const { data: originalColumns, error: columnsError } = await supabase
        .from('board_columns')
        .select('*')
        .eq('board_id', boardId)
        .order('position');

      if (columnsError) throw columnsError;

      // Duplicate columns
      const columnMapping: { [key: string]: string } = {};
      for (const column of originalColumns || []) {
        const { data: newColumn, error: newColumnError } = await supabase
          .from('board_columns')
          .insert([{
            name: column.name,
            color: column.color,
            position: column.position,
            board_id: newBoard.id
          }])
          .select()
          .single();

        if (newColumnError) throw newColumnError;
        columnMapping[column.id] = newColumn.id;
      }

      // Get tasks from original columns
      const { data: originalTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .in('column_id', Object.keys(columnMapping))
        .order('position');

      if (tasksError) throw tasksError;

      // Duplicate tasks
      for (const task of originalTasks || []) {
        const { error: newTaskError } = await supabase
          .from('tasks')
          .insert([{
            title: task.title,
            description: task.description,
            column_id: columnMapping[task.column_id],
            position: task.position,
            priority: task.priority,
            due_date: task.due_date,
            completed: false, // Reset completion status
            created_by: user.id
          }]);

        if (newTaskError) throw newTaskError;
      }

      toast({
        title: "Board duplicado!",
        description: `O board "${originalBoard.name}" foi duplicado com sucesso.`,
      });

      fetchProjectData();
    } catch (error: any) {
      toast({
        title: "Erro ao duplicar board",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateBoard = async () => {
    if (!renamingBoardId || !renamingBoardName.trim()) return;

    try {
      const { error } = await supabase
        .from('boards')
        .update({ name: renamingBoardName })
        .eq('id', renamingBoardId);

      if (error) throw error;

      toast({
        title: "Board renomeado!",
        description: "O nome do board foi atualizado com sucesso.",
      });

      setIsRenamingBoard(false);
      setRenamingBoardId('');
      setRenamingBoardName('');
      fetchProjectData();
    } catch (error: any) {
      toast({
        title: "Erro ao renomear board",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteBoard = async (boardId: string, boardName: string) => {
    if (!confirm(`Tem certeza que deseja excluir o board "${boardName}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('boards')
        .delete()
        .eq('id', boardId);

      if (error) throw error;

      toast({
        title: "Board excluído!",
        description: `O board "${boardName}" foi excluído com sucesso.`,
      });

      // If we deleted the selected board, clear selection
      if (selectedBoard?.id === boardId) {
        setSelectedBoard(null);
        setColumns([]);
        setTasks([]);
      }

      fetchProjectData();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir board",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const createColumn = async () => {
    if (!newColumnName.trim() || !selectedBoard) return;

    try {
      const { error } = await supabase
        .from('board_columns')
        .insert([{
          name: newColumnName,
          color: newColumnColor,
          board_id: selectedBoard.id,
          position: columns.length
        }]);

      if (error) throw error;

      toast({
        title: "Coluna criada!",
        description: `A coluna "${newColumnName}" foi criada com sucesso.`,
      });

      setNewColumnName('');
      setNewColumnColor('#6366f1');
      fetchBoardData();
    } catch (error: any) {
      toast({
        title: "Erro ao criar coluna",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const duplicateColumn = async (columnId: string, columnName: string) => {
    if (!selectedBoard) {
      toast({
        title: "Erro",
        description: "Nenhum board selecionado.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get original column
      const { data: originalColumn, error: columnError } = await supabase
        .from('board_columns')
        .select('*')
        .eq('id', columnId)
        .single();

      if (columnError) throw columnError;

      // Create new column
      const { data: newColumn, error: newColumnError } = await supabase
        .from('board_columns')
        .insert([{
          name: `${originalColumn.name} (Cópia)`,
          color: originalColumn.color,
          board_id: selectedBoard.id,
          position: columns.length
        }])
        .select()
        .single();

      if (newColumnError) throw newColumnError;

      // Get tasks from original column
      const { data: originalTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('column_id', columnId)
        .order('position');

      if (tasksError) throw tasksError;

      // Duplicate tasks
      for (const task of originalTasks || []) {
        const { error: newTaskError } = await supabase
          .from('tasks')
          .insert([{
            title: task.title,
            description: task.description,
            column_id: newColumn.id,
            position: task.position,
            priority: task.priority,
            due_date: task.due_date,
            completed: false, // Reset completion status
            created_by: user?.id || task.created_by
          }]);

        if (newTaskError) throw newTaskError;
      }

      toast({
        title: "Coluna duplicada!",
        description: `A coluna "${originalColumn.name}" foi duplicada com sucesso.`,
      });

      fetchBoardData();
    } catch (error: any) {
      toast({
        title: "Erro ao duplicar coluna",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteColumn = async (columnId: string, columnName: string) => {
    if (!confirm(`Tem certeza que deseja excluir a coluna "${columnName}"? Todas as tarefas desta coluna também serão excluídas.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('board_columns')
        .delete()
        .eq('id', columnId);

      if (error) throw error;

      toast({
        title: "Coluna excluída!",
        description: `A coluna "${columnName}" foi excluída com sucesso.`,
      });

      fetchBoardData();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir coluna",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const duplicateTask = async (taskId: string, taskTitle: string) => {
    if (!user?.id) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para duplicar tarefas.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get original task
      const { data: originalTask, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (taskError) throw taskError;

      // Create new task
      const { error: newTaskError } = await supabase
        .from('tasks')
        .insert([{
          title: `${originalTask.title} (Cópia)`,
          description: originalTask.description,
          column_id: originalTask.column_id,
          position: tasks.filter(t => t.column_id === originalTask.column_id).length,
          priority: originalTask.priority,
          due_date: originalTask.due_date,
          completed: false, // Reset completion status
          created_by: user.id
        }]);

      if (newTaskError) throw newTaskError;

      toast({
        title: "Tarefa duplicada!",
        description: `A tarefa "${originalTask.title}" foi duplicada com sucesso.`,
      });

      fetchBoardData();
    } catch (error: any) {
      toast({
        title: "Erro ao duplicar tarefa",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteTask = async (taskId: string, taskTitle: string) => {
    if (!confirm(`Tem certeza que deseja excluir a tarefa "${taskTitle}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: "Tarefa excluída!",
        description: `A tarefa "${taskTitle}" foi excluída com sucesso.`,
      });

      fetchBoardData();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir tarefa",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const moveColumn = async (columnId: string, direction: 'left' | 'right') => {
    const currentColumn = columns.find(col => col.id === columnId);
    if (!currentColumn) return;

    const sortedColumns = [...columns].sort((a, b) => a.position - b.position);
    const currentIndex = sortedColumns.findIndex(col => col.id === columnId);

    if (direction === 'left' && currentIndex === 0) return;
    if (direction === 'right' && currentIndex === sortedColumns.length - 1) return;

    const swapIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    const swapColumn = sortedColumns[swapIndex];

    try {
      // Swap positions
      await Promise.all([
        supabase
          .from('board_columns')
          .update({ position: swapColumn.position })
          .eq('id', currentColumn.id),
        supabase
          .from('board_columns')
          .update({ position: currentColumn.position })
          .eq('id', swapColumn.id)
      ]);

      fetchBoardData();
    } catch (error: any) {
      toast({
        title: "Erro ao mover coluna",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeTaskId = active.id as string;
    const activeTask = tasks.find(task => task.id === activeTaskId);

    if (!activeTask) return;

    // Determine the over column ID
    let overColumnId: string;
    const overTask = tasks.find(t => t.id === over.id);
    if (overTask) {
      overColumnId = overTask.column_id;
    } else {
      // Check if it matches a column ID potentially
      const overColumn = boards.find(b => b.id === over.id) ? over.id : columns.find(c => c.id === over.id)?.id;
      overColumnId = overColumn as string;
    }

    if (!overColumnId) return;

    // If moving to the same column
    if (activeTask.column_id === overColumnId) {
      const columnTasks = tasks
        .filter(task => task.column_id === overColumnId)
        .sort((a, b) => a.position - b.position);

      const oldIndex = columnTasks.findIndex(task => task.id === activeTaskId);
      let newIndex = columnTasks.length - 1;

      // If we're dropping on another task, find the new position
      if (over.data?.current?.type === 'task' || overTask) {
        newIndex = columnTasks.findIndex(task => task.id === over.id);
      }

      if (oldIndex !== newIndex) {
        const newOrderedTasks = arrayMove(columnTasks, oldIndex, newIndex);

        // Optimistic UI update
        const newTasks = [...tasks];
        const taskIndex = newTasks.findIndex(t => t.id === activeTaskId);
        // We actually need to reorder the entire list for this column locally to look right immediately
        // But for simplicity, we trigger fetchBoardData usually. Let's try to update locally first.
        setTasks(prevTasks => {
          const otherTasks = prevTasks.filter(t => t.column_id !== overColumnId);
          return [...otherTasks, ...newOrderedTasks];
        });

        // Update positions in database
        try {
          const updates = newOrderedTasks.map((task, index) =>
            supabase
              .from('tasks')
              .update({ position: index })
              .eq('id', task.id)
          );

          await Promise.all(updates);
          fetchBoardData();
        } catch (error: any) {
          toast({
            title: "Erro ao reordenar tarefas",
            description: error.message,
            variant: "destructive",
          });
          fetchBoardData(); // Revert on error
        }
      }
    } else {
      // Moving to different column
      try {
        const targetColumnTasks = tasks.filter(task => task.column_id === overColumnId);
        // Calculate new position
        let newPosition = targetColumnTasks.length;
        if (overTask) {
          const overTaskIndex = targetColumnTasks.findIndex(t => t.id === over.id);
          if (overTaskIndex !== -1) newPosition = overTaskIndex;
        }

        // Optimistic Update
        setTasks(prev => prev.map(t => {
          if (t.id === activeTaskId) {
            return { ...t, column_id: overColumnId, position: newPosition };
          }
          return t;
        }));

        await supabase
          .from('tasks')
          .update({
            column_id: overColumnId,
            position: newPosition
          })
          .eq('id', activeTaskId);

        // We also need to update positions of other tasks in the new column if inserted in middle
        // But for MVP just appending or placing, sorting handles it. 
        // Ideally we should re-index the target column but let's stick to simple move first.

        fetchBoardData();

        toast({
          title: "Tarefa movida!",
          description: "A tarefa foi movida para a nova coluna.",
        });
      } catch (error: any) {
        toast({
          title: "Erro ao mover tarefa",
          description: error.message,
          variant: "destructive",
        });
        fetchBoardData(); // Revert
      }
    }
  };

  const createTaskInColumn = (columnId: string) => {
    setSelectedColumnId(columnId);
    createTask(columnId);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find(t => t.id === active.id);
    setActiveTask(task || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Logic for cross-column drag styling if needed
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1115] relative overflow-hidden flex flex-col">
        {/* Skeleton Header */}
        <div className="bg-[#1a1d23]/80 border-b border-white/5 h-20 flex items-center px-6 sticky top-0 z-50">
          <Skeleton className="h-10 w-32 bg-white/5 rounded-full" />
          <div className="h-8 w-px bg-white/10 mx-6" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48 bg-white/5" />
            <Skeleton className="h-3 w-32 bg-white/5" />
          </div>
        </div>

        {/* Skeleton Sub-nav */}
        <div className="bg-[#15181e] h-16 border-b border-white/5 px-6 flex items-center gap-3">
          <Skeleton className="h-10 w-32 bg-white/10 rounded-full" />
          <Skeleton className="h-10 w-24 bg-white/5 rounded-full" />
          <Skeleton className="h-10 w-28 bg-white/5 rounded-full" />
        </div>

        {/* Skeleton Kanban Board */}
        <div className="flex-grow p-8 flex gap-8 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-80 flex-shrink-0 flex flex-col gap-4">
              {/* Column Header Skeleton */}
              <div className="h-14 bg-white/5 rounded-xl flex items-center px-4 justify-between border border-white/5">
                <Skeleton className="h-5 w-32 bg-white/5" />
                <Skeleton className="h-6 w-6 rounded-full bg-white/5" />
              </div>
              {/* content */}
              <div className="flex-1 space-y-4">
                <Skeleton className="h-32 w-full bg-white/5 rounded-xl" />
                <Skeleton className="h-24 w-full bg-white/5 rounded-xl" />
                <Skeleton className="h-32 w-full bg-white/5 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Projeto não encontrado</h2>
          <Button onClick={() => navigate('/dashboard')}>
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1115] relative overflow-hidden">
      {/* Premium Background Mesh Gradient */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/30 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/20 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-violet-600/10 blur-[120px] rounded-full animate-pulse" />
      </div>

      <div className="relative z-10 flex flex-col h-screen">
        {/* Header */}
        <header className="bg-[#1a1d23]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50">
          <div className="max-w-[1800px] mx-auto px-6">
            <div className="flex justify-between items-center h-20">
              <div className="flex items-center gap-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/dashboard')}
                  className="hover:bg-white/5 text-muted-foreground hover:text-white rounded-full transition-all"
                >
                  <ArrowLeft className="h-5 w-5 mr-1" />
                  Dashboard
                </Button>
                <div className="h-8 w-px bg-white/10" />
                <div className="flex flex-col">
                  <h1 className="text-2xl font-black tracking-tighter text-white uppercase">{project.name}</h1>
                  {project.description && (
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest leading-none mt-1">{project.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white rounded-full">
                  <Users className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white rounded-full">
                  <Settings className="h-5 w-5" />
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="bg-primary hover:bg-primary/90 text-white font-bold px-6 rounded-full shadow-lg shadow-primary/20 transition-all active:scale-95">
                      <Plus className="h-5 w-5 mr-2" />
                      Novo Board
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="glass-morphism border-white/20">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-black tracking-tight">Criar Novo Board</DialogTitle>
                      <DialogDescription className="text-foreground/60 font-medium">
                        Crie um novo board para organizar suas tarefas
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="boardName" className="font-bold text-sm tracking-wider uppercase ml-1">Nome do Board</Label>
                        <Input
                          id="boardName"
                          value={newBoardName}
                          onChange={(e) => setNewBoardName(e.target.value)}
                          placeholder="Ex: Tarefas de Engenharia"
                          className="bg-white/5 border-white/10 h-12 rounded-xl focus:border-primary/50"
                        />
                      </div>
                      <Button onClick={createBoard} className="w-full h-12 bg-primary font-bold text-lg rounded-xl shadow-xl shadow-primary/10">
                        Criar Board
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </header>

        {/* Boards Sub-navigation */}
        <div className="bg-[#15181e] border-b border-white/5">
          <div className="max-w-[1800px] mx-auto px-6 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 py-4">
              {boards.map((board) => (
                <div key={board.id} className="flex items-center group/tab">
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedBoard(board)}
                    className={`
                      relative h-10 px-6 rounded-full font-bold transition-all duration-300
                      ${selectedBoard?.id === board.id
                        ? "bg-white/10 text-white shadow-lg ring-1 ring-white/20"
                        : "text-muted-foreground hover:text-white hover:bg-white/5"}
                    `}
                  >
                    {board.name}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-white transition-opacity rounded-full hover:bg-white/10 ml-1">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="glass-morphism border-white/20">
                      <DropdownMenuItem
                        onClick={() => {
                          setRenamingBoardId(board.id);
                          setRenamingBoardName(board.name);
                          setIsRenamingBoard(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Renomear Board
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => duplicateBoard(board.id, board.name)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicar Board
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => deleteBoard(board.id, board.name)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir Board
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Rename Board Dialog */}
        <Dialog open={isRenamingBoard} onOpenChange={setIsRenamingBoard}>
          <DialogContent className="glass-morphism border-white/20">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight">Renomear Board</DialogTitle>
              <DialogDescription className="text-foreground/60">
                Digite o novo nome para o board
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="renameBoardName" className="font-bold text-sm tracking-wider uppercase ml-1">Novo Nome</Label>
                <Input
                  id="renameBoardName"
                  value={renamingBoardName}
                  onChange={(e) => setRenamingBoardName(e.target.value)}
                  placeholder="Ex: Tarefas de Fevereiro"
                  className="bg-white/5 border-white/10 h-12 rounded-xl focus:border-primary/50"
                />
              </div>
              <Button onClick={updateBoard} className="w-full h-12 bg-primary font-bold text-lg rounded-xl shadow-xl shadow-primary/10 transition-all active:scale-95">
                Salvar Alterações
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Main Content Area */}
        <main className="flex-grow overflow-hidden relative">
          {selectedBoard ? (
            <div className="h-full flex flex-col p-8">
              <div className="flex justify-between items-center mb-10 px-2">
                <div className="flex items-center gap-4">
                  <h2 className="text-4xl font-black tracking-tighter text-white">{selectedBoard.name}</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setRenamingBoardId(selectedBoard.id);
                      setRenamingBoardName(selectedBoard.name);
                      setIsRenamingBoard(true);
                    }}
                    className="text-muted-foreground hover:text-white hover:bg-white/10 rounded-full"
                  >
                    <Edit className="h-5 w-5" />
                  </Button>
                  <Badge className="bg-primary/20 text-primary border-primary/30 uppercase font-black tracking-widest text-[10px] py-1 px-3">
                    Live View
                  </Badge>
                </div>
                <div className="flex gap-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-full px-6 font-bold transition-all active:scale-95">
                        <Plus className="h-5 w-5 mr-2 text-primary" />
                        Nova Coluna
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="glass-morphism border-white/20">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-black tracking-tight">Criar Nova Coluna</DialogTitle>
                        <DialogDescription className="text-foreground/60 font-medium">
                          Adicione uma nova coluna ao board
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-6 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="columnName" className="font-bold text-sm tracking-widest uppercase ml-1">Nome da Coluna</Label>
                          <Input
                            id="columnName"
                            value={newColumnName}
                            onChange={(e) => setNewColumnName(e.target.value)}
                            placeholder="Ex: Tarefas Pendentes"
                            className="bg-white/5 border-white/10 h-12 rounded-xl focus:border-primary/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="columnColor" className="font-bold text-sm tracking-widest uppercase ml-1">Cor de Destaque</Label>
                          <div className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                            <Input
                              id="columnColor"
                              type="color"
                              value={newColumnColor}
                              onChange={(e) => setNewColumnColor(e.target.value)}
                              className="w-20 h-10 p-1 bg-transparent border-none"
                            />
                            <div className="flex-1 flex items-center bg-white/5 rounded-lg px-4 text-xs font-mono text-muted-foreground uppercase">
                              {newColumnColor}
                            </div>
                          </div>
                        </div>
                        <Button onClick={createColumn} className="w-full h-12 bg-primary font-extrabold text-lg rounded-xl shadow-xl shadow-primary/20 transition-all active:scale-95">
                          Criar Coluna
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* Kanban Board with Drag & Drop */}
              <DndContext
                sensors={sensors}
                onDragEnd={handleDragEnd}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                collisionDetection={closestCorners}
              >
                <div className="h-full overflow-x-auto pb-8 custom-scrollbar">
                  <div className="flex gap-8 min-w-max h-full px-2 pt-2">
                    {columns
                      .sort((a, b) => a.position - b.position)
                      .map((column, index) => (
                        <DroppableColumn
                          key={column.id}
                          column={column}
                          tasks={tasks}
                          checklistItems={checklistItems}
                          index={index}
                          totalColumns={columns.length}
                          onMoveColumn={moveColumn}
                          onDuplicateColumn={duplicateColumn}
                          onDeleteColumn={deleteColumn}
                          onDuplicateTask={duplicateTask}
                          onDeleteTask={deleteTask}
                          onUpdateTasks={fetchBoardData}
                          getPriorityColor={getPriorityColor}
                          newTaskTitle={newTaskTitle}
                          setNewTaskTitle={setNewTaskTitle}
                          newTaskDescription={newTaskDescription}
                          setNewTaskDescription={setNewTaskDescription}
                          newTaskPriority={newTaskPriority}
                          setNewTaskPriority={setNewTaskPriority}
                          onCreateTask={createTaskInColumn}
                          projectTags={projectTags}
                          onTagsUpdate={fetchProjectData}
                          projectMembers={projectMembers}
                          projectId={projectId}
                        />
                      ))}

                    {/* Add Column Placeholder */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <button className="w-80 h-[120px] rounded-2xl bg-white/[0.03] border-2 border-dashed border-white/10 hover:border-primary/50 hover:bg-white/[0.05] transition-all duration-300 group/new">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover/new:bg-primary/20 group-hover/new:text-primary transition-colors">
                              <Plus className="h-6 w-6" />
                            </div>
                            <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60 group-hover/new:text-primary transition-colors">Nova Coluna</span>
                          </div>
                        </button>
                      </DialogTrigger>
                      <DialogContent className="glass-morphism border-white/20">
                        <DialogHeader>
                          <DialogTitle className="text-2xl font-black">Nova Coluna</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-6 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="columnName" className="font-bold text-xs uppercase tracking-widest ml-1">Nome</Label>
                            <Input
                              id="columnName"
                              value={newColumnName}
                              onChange={(e) => setNewColumnName(e.target.value)}
                              placeholder="Ex: Em Revisão"
                              className="bg-white/5 border-white/10"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="columnColor" className="font-bold text-xs uppercase tracking-widest ml-1">Cor</Label>
                            <Input
                              id="columnColor"
                              type="color"
                              value={newColumnColor}
                              onChange={(e) => setNewColumnColor(e.target.value)}
                              className="w-full h-12 bg-transparent border-white/10"
                            />
                          </div>
                          <Button onClick={createColumn} className="w-full bg-primary font-bold shadow-xl shadow-primary/20">
                            Confirmar
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <DragOverlay dropAnimation={{
                  sideEffects: defaultDropAnimationSideEffects({
                    styles: {
                      active: {
                        opacity: '0.5',
                      },
                    },
                  }),
                }}>
                  {activeTask ? (
                    <div className="w-80 pointer-events-none rotate-2 scale-105 shadow-2xl">
                      <TaskCard
                        task={activeTask}
                        checklistItems={checklistItems.filter(item => item.task_id === activeTask.id)}
                        onDuplicate={() => { }}
                        onDelete={() => { }}
                        onUpdate={() => { }}
                        getPriorityColor={getPriorityColor}
                        projectTags={projectTags}
                        projectMembers={projectMembers}
                        projectId={projectId}
                      />
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
              <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Users className="h-10 w-10 text-muted-foreground/40" />
              </div>
              <div className="space-y-4 max-w-md">
                <h3 className="text-3xl font-black tracking-tighter text-white">Nenhum board encontrado</h3>
                <p className="text-muted-foreground font-medium">
                  Este projeto ainda não possui boards. Crie um novo board para começar a organizar suas tarefas de forma profissional.
                </p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90 text-white font-bold h-12 px-8 rounded-full shadow-2xl shadow-primary/20 transition-all active:scale-95">
                    <Plus className="h-5 w-5 mr-2" />
                    Criar Primeiro Board
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass-morphism border-white/20">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black">Novo Board</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="boardName" className="font-bold text-xs uppercase tracking-widest ml-1">Nome do Board</Label>
                      <Input
                        id="boardName"
                        value={newBoardName}
                        onChange={(e) => setNewBoardName(e.target.value)}
                        placeholder="Ex: Roadmap 2024"
                        className="bg-white/5 border-white/10"
                      />
                    </div>
                    <Button onClick={createBoard} className="w-full bg-primary font-bold shadow-xl shadow-primary/20">
                      Criar Board
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
export default Project;
