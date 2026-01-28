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
import { DndContext, DragEndEvent, DragOverEvent, PointerSensor, useSensor, useSensors, closestCorners } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { DroppableColumn } from '@/components/DroppableColumn';

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
  assigned_to: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
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
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBoardName, setNewBoardName] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [selectedColumnId, setSelectedColumnId] = useState('');
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnColor, setNewColumnColor] = useState('#6366f1');
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
    }
  }, [projectId]);

  useEffect(() => {
    if (selectedBoard) {
      fetchBoardData();
    }
  }, [selectedBoard]);

  const fetchProjectData = async () => {
    try {
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      const { data: boardsData, error: boardsError } = await supabase
        .from('boards')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (boardsError) throw boardsError;
      setBoards(boardsData || []);
      
      if (boardsData && boardsData.length > 0) {
        setSelectedBoard(boardsData[0]);
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
        .select('*')
        .eq('board_id', selectedBoard.id)
        .order('position', { ascending: true });

      if (columnsError) throw columnsError;
      setColumns(columnsData || []);

      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .in('column_id', (columnsData || []).map(col => col.id))
        .order('position', { ascending: true });

      if (tasksError) throw tasksError;
      setTasks(tasksData || []);

      // Fetch checklist items for all tasks
      if (tasksData && tasksData.length > 0) {
        const { data: checklistData, error: checklistError } = await supabase
          .from('task_checklist_items')
          .select('*')
          .in('task_id', tasksData.map(task => task.id))
          .order('position', { ascending: true });

        if (checklistError) throw checklistError;
        setChecklistItems(checklistData || []);
      } else {
        setChecklistItems([]);
      }
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

  const createTask = async () => {
    if (!newTaskTitle.trim() || !selectedColumnId || !user?.id) {
      if (!user?.id) {
        toast({
          title: "Erro de autenticação",
          description: "Você precisa estar logado para criar tarefas.",
          variant: "destructive",
        });
      }
      return;
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .insert([{
          title: newTaskTitle,
          description: newTaskDescription,
          column_id: selectedColumnId,
          priority: newTaskPriority,
          position: tasks.filter(t => t.column_id === selectedColumnId).length,
          created_by: user.id
        }]);

      if (error) throw error;

      toast({
        title: "Tarefa criada!",
        description: `A tarefa "${newTaskTitle}" foi criada com sucesso.`,
      });

      setNewTaskTitle('');
      setNewTaskDescription('');
      setSelectedColumnId('');
      fetchBoardData();
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
    const overColumnId = over.id as string;

    const activeTask = tasks.find(task => task.id === activeTaskId);
    if (!activeTask) return;

    // If moving to the same column
    if (activeTask.column_id === overColumnId) {
      const columnTasks = tasks
        .filter(task => task.column_id === overColumnId)
        .sort((a, b) => a.position - b.position);

      const oldIndex = columnTasks.findIndex(task => task.id === activeTaskId);
      let newIndex = columnTasks.length - 1;

      // If we're dropping on another task, find the new position
      if (over.data?.current?.type === 'task') {
        newIndex = columnTasks.findIndex(task => task.id === over.id);
      }

      if (oldIndex !== newIndex) {
        const newOrderedTasks = arrayMove(columnTasks, oldIndex, newIndex);
        
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
        }
      }
    } else {
      // Moving to different column
      try {
        const targetColumnTasks = tasks.filter(task => task.column_id === overColumnId);
        const newPosition = targetColumnTasks.length;

        await supabase
          .from('tasks')
          .update({ 
            column_id: overColumnId,
            position: newPosition
          })
          .eq('id', activeTaskId);

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
      }
    }
  };

  const createTaskInColumn = (columnId: string) => {
    setSelectedColumnId(columnId);
    createTask();
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
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
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/5 to-primary/5">
      {/* Header */}
      <header className="bg-card border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <div>
                <h1 className="text-xl font-bold">{project.name}</h1>
                <p className="text-sm text-muted-foreground">{project.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Board
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Novo Board</DialogTitle>
                    <DialogDescription>
                      Crie um novo board para organizar suas tarefas
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="boardName">Nome do Board</Label>
                      <Input
                        id="boardName"
                        value={newBoardName}
                        onChange={(e) => setNewBoardName(e.target.value)}
                        placeholder="Digite o nome do board"
                      />
                    </div>
                    <Button onClick={createBoard} className="w-full">
                      Criar Board
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      {/* Boards Tabs */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-4 py-3 overflow-x-auto">
            {boards.map((board) => (
              <div key={board.id} className="flex items-center gap-1">
                <Button
                  variant={selectedBoard?.id === board.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedBoard(board)}
                  className="whitespace-nowrap"
                >
                  {board.name}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {selectedBoard ? (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">{selectedBoard.name}</h2>
              <div className="flex gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Coluna
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Criar Nova Coluna</DialogTitle>
                      <DialogDescription>
                        Adicione uma nova coluna ao board
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="columnName">Nome da Coluna</Label>
                        <Input
                          id="columnName"
                          value={newColumnName}
                          onChange={(e) => setNewColumnName(e.target.value)}
                          placeholder="Digite o nome da coluna"
                        />
                      </div>
                      <div>
                        <Label htmlFor="columnColor">Cor da Coluna</Label>
                        <Input
                          id="columnColor"
                          type="color"
                          value={newColumnColor}
                          onChange={(e) => setNewColumnColor(e.target.value)}
                        />
                      </div>
                      <Button onClick={createColumn} className="w-full">
                        Criar Coluna
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Tarefa
                    </Button>
                  </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Nova Tarefa</DialogTitle>
                    <DialogDescription>
                      Adicione uma nova tarefa ao board
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="taskTitle">Título da Tarefa</Label>
                      <Input
                        id="taskTitle"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="Digite o título da tarefa"
                      />
                    </div>
                    <div>
                      <Label htmlFor="taskDescription">Descrição</Label>
                      <Textarea
                        id="taskDescription"
                        value={newTaskDescription}
                        onChange={(e) => setNewTaskDescription(e.target.value)}
                        placeholder="Digite a descrição da tarefa"
                      />
                    </div>
                    <div>
                      <Label htmlFor="taskColumn">Coluna</Label>
                      <Select value={selectedColumnId} onValueChange={setSelectedColumnId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma coluna" />
                        </SelectTrigger>
                        <SelectContent>
                          {columns.map((column) => (
                            <SelectItem key={column.id} value={column.id}>
                              {column.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="taskPriority">Prioridade</Label>
                      <Select value={newTaskPriority} onValueChange={(value: 'low' | 'medium' | 'high') => setNewTaskPriority(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Baixa</SelectItem>
                          <SelectItem value="medium">Média</SelectItem>
                          <SelectItem value="high">Alta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={createTask} className="w-full">
                      Criar Tarefa
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
              collisionDetection={closestCorners}
            >
              <div className="overflow-x-auto pb-4">
                <div className="flex gap-6 min-w-max">
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
                    />
                  ))}
                  
                  {/* Add Column Button */}
                  <div className="w-80 flex-shrink-0">
                    <Dialog>
                      <DialogTrigger asChild>
                        <div className="bg-muted/50 border-2 border-dashed border-muted-foreground/25 rounded-lg h-[680px] flex flex-col items-center justify-center cursor-pointer hover:border-muted-foreground/50 transition-colors">
                          <Plus className="h-8 w-8 text-muted-foreground mb-2" />
                          <span className="text-muted-foreground font-medium">Nova Coluna</span>
                        </div>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Criar Nova Coluna</DialogTitle>
                          <DialogDescription>
                            Adicione uma nova coluna ao board
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="columnName">Nome da Coluna</Label>
                            <Input
                              id="columnName"
                              value={newColumnName}
                              onChange={(e) => setNewColumnName(e.target.value)}
                              placeholder="Digite o nome da coluna"
                            />
                          </div>
                          <div>
                            <Label htmlFor="columnColor">Cor da Coluna</Label>
                            <Input
                              id="columnColor"
                              type="color"
                              value={newColumnColor}
                              onChange={(e) => setNewColumnColor(e.target.value)}
                            />
                          </div>
                          <Button onClick={createColumn} className="w-full">
                            Criar Coluna
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            </DndContext>
          </>
        ) : (
          <div className="text-center py-16">
            <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhum board criado</h3>
            <p className="text-muted-foreground mb-6">
              Crie seu primeiro board para começar a organizar suas tarefas
            </p>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Board
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Board</DialogTitle>
                  <DialogDescription>
                    Crie um novo board para organizar suas tarefas
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="boardName">Nome do Board</Label>
                    <Input
                      id="boardName"
                      value={newBoardName}
                      onChange={(e) => setNewBoardName(e.target.value)}
                      placeholder="Digite o nome do board"
                    />
                  </div>
                  <Button onClick={createBoard} className="w-full">
                    Criar Board
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </main>
    </div>
  );
};

export default Project;