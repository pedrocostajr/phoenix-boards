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
    <div className="bg-card rounded-lg border w-80 flex-shrink-0">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: column.color }}
          />
          <h3 className="font-semibold">{column.name}</h3>
          <Badge variant="secondary" className="ml-auto">
            {columnTasks.length}
          </Badge>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => onMoveColumn(column.id, 'left')}
              disabled={index === 0}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => onMoveColumn(column.id, 'right')}
              disabled={index === totalColumns - 1}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
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
      
      <div ref={setNodeRef} className="p-4 space-y-3 h-[600px] overflow-y-auto">
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
            <Button variant="outline" className="w-full border-dashed" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar tarefa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova Tarefa</DialogTitle>
              <DialogDescription>
                Adicione uma nova tarefa à coluna "{column.name}"
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="quickTaskTitle">Título da Tarefa</Label>
                <Input
                  id="quickTaskTitle"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Digite o título da tarefa"
                />
              </div>
              <div>
                <Label htmlFor="quickTaskDescription">Descrição</Label>
                <Textarea
                  id="quickTaskDescription"
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  placeholder="Digite a descrição da tarefa"
                />
              </div>
              <div>
                <Label htmlFor="quickTaskPriority">Prioridade</Label>
                <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
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
              <Button 
                onClick={() => onCreateTask(column.id)} 
                className="w-full"
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