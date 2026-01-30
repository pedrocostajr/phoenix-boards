import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, MoreVertical, Copy, Trash2, Plus } from 'lucide-react';
import { TaskCard } from './TaskCard';

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

interface DroppableColumnProps {
  column: Column;
  tasks: Task[];
  checklistItems: ChecklistItem[];
  index: number;
  totalColumns: number;
  onMoveColumn: (columnId: string, direction: 'left' | 'right') => void;
  onDuplicateColumn: (columnId: string, columnName: string) => void;
  onDeleteColumn: (columnId: string, columnName: string) => void;
  onDuplicateTask: (taskId: string, taskTitle: string) => void;
  onDeleteTask: (taskId: string, taskTitle: string) => void;
  onUpdateTasks: () => void;
  getPriorityColor: (priority: string) => string;
  newTaskTitle: string;
  setNewTaskTitle: (title: string) => void;
  newTaskDescription: string;
  setNewTaskDescription: (description: string) => void;
  newTaskPriority: 'low' | 'medium' | 'high';
  setNewTaskPriority: (priority: 'low' | 'medium' | 'high') => void;
  onCreateTask: (columnId: string) => void;
}

export const DroppableColumn = ({
  column,
  tasks,
  checklistItems,
  index,
  totalColumns,
  onMoveColumn,
  onDuplicateColumn,
  onDeleteColumn,
  onDuplicateTask,
  onDeleteTask,
  onUpdateTasks,
  getPriorityColor,
  newTaskTitle,
  setNewTaskTitle,
  newTaskDescription,
  setNewTaskDescription,
  newTaskPriority,
  setNewTaskPriority,
  onCreateTask,
}: DroppableColumnProps) => {
  const { setNodeRef } = useDroppable({
    id: column.id,
  });

  const columnTasks = tasks
    .filter(task => task.column_id === column.id)
    .sort((a, b) => a.position - b.position);

  return (
    <div className="bg-white/40 backdrop-blur-md rounded-xl border border-white/20 shadow-xl w-80 flex-shrink-0 flex flex-col h-[750px] transition-all hover:bg-white/50 group/column">
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full shadow-lg ring-2 ring-white/50"
              style={{ backgroundColor: column.color }}
            />
            <h3 className="font-bold text-lg tracking-tight text-foreground/90">{column.name}</h3>
            <Badge variant="secondary" className="bg-white/20 text-foreground/70 border-none px-2.5 py-0.5 rounded-full font-medium">
              {columnTasks.length}
            </Badge>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover/column:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 hover:bg-white/20 rounded-full"
              onClick={() => onMoveColumn(column.id, 'left')}
              disabled={index === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 hover:bg-white/20 rounded-full"
              onClick={() => onMoveColumn(column.id, 'right')}
              disabled={index === totalColumns - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-white/20 rounded-full">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass-morphism">
                <DropdownMenuItem
                  onClick={() => onDuplicateColumn(column.id, column.name)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicar Coluna
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDeleteColumn(column.id, column.name)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir Coluna
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div ref={setNodeRef} className="p-4 space-y-4 flex-grow overflow-y-auto scrollbar-hide">
        <SortableContext items={columnTasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
          {columnTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              checklistItems={checklistItems.filter(item => item.task_id === task.id)}
              onDuplicate={onDuplicateTask}
              onDelete={onDeleteTask}
              onUpdate={onUpdateTasks}
              getPriorityColor={getPriorityColor}
            />
          ))}
        </SortableContext>

        {/* Add Task Button */}
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full border-dashed border-white/30 bg-white/10 hover:bg-white/20 hover:border-white/50 text-foreground/60 transition-all duration-300 rounded-lg group/add"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2 group-hover/add:scale-125 transition-transform" />
              Adicionar tarefa
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-morphism border-white/20">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Criar Nova Tarefa</DialogTitle>
              <DialogDescription className="text-foreground/60">
                Adicione uma nova tarefa à coluna "{column.name}"
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5 py-4">
              <div className="space-y-2">
                <Label htmlFor="quickTaskTitle" className="text-sm font-semibold ml-1">Título da Tarefa</Label>
                <Input
                  id="quickTaskTitle"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Ex: Finalizar interface premium"
                  className="bg-white/5 border-white/10 focus:border-primary/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quickTaskDescription" className="text-sm font-semibold ml-1">Descrição</Label>
                <Textarea
                  id="quickTaskDescription"
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  placeholder="Descreva brevemente o que precisa ser feito..."
                  className="bg-white/5 border-white/10 focus:border-primary/50 min-h-[100px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quickTaskPriority" className="text-sm font-semibold ml-1">Prioridade</Label>
                <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-morphism border-white/10">
                    <SelectItem value="low" className="focus:bg-green-500/20">Baixa</SelectItem>
                    <SelectItem value="medium" className="focus:bg-yellow-500/20">Média</SelectItem>
                    <SelectItem value="high" className="focus:bg-red-500/20">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => onCreateTask(column.id)}
                className="w-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 h-10 font-bold"
              >
                Criar Tarefa
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};