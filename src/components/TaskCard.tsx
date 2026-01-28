import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MoreVertical, Copy, Trash2, GripVertical, CheckSquare, Plus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ChecklistItem {
  id: string;
  task_id: string;
  text: string;
  completed: boolean;
  position: number;
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

interface TaskCardProps {
  task: Task;
  checklistItems: ChecklistItem[];
  onDuplicate: (taskId: string, taskTitle: string) => void;
  onDelete: (taskId: string, taskTitle: string) => void;
  onUpdate: () => void;
  getPriorityColor: (priority: string) => string;
}

export const TaskCard = ({ 
  task, 
  checklistItems, 
  onDuplicate, 
  onDelete, 
  onUpdate, 
  getPriorityColor 
}: TaskCardProps) => {
  const [showDetails, setShowDetails] = useState(false);
  const [editingTitle, setEditingTitle] = useState(task.title);
  const [editingDescription, setEditingDescription] = useState(task.description || '');
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const { toast } = useToast();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const taskChecklistItems = checklistItems.filter(item => item.task_id === task.id);
  const completedCount = taskChecklistItems.filter(item => item.completed).length;

  const updateTask = async () => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: editingTitle,
          description: editingDescription,
        })
        .eq('id', task.id);

      if (error) throw error;
      
      toast({
        title: "Tarefa atualizada!",
        description: "As alterações foram salvas com sucesso.",
      });
      
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar tarefa",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addChecklistItem = async () => {
    if (!newChecklistItem.trim()) return;

    try {
      const { error } = await supabase
        .from('task_checklist_items')
        .insert([{
          task_id: task.id,
          text: newChecklistItem,
          position: taskChecklistItems.length,
        }]);

      if (error) throw error;

      setNewChecklistItem('');
      toast({
        title: "Item adicionado!",
        description: "Item do checklist criado com sucesso.",
      });
      
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar item",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleChecklistItem = async (itemId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('task_checklist_items')
        .update({ completed })
        .eq('id', itemId);

      if (error) throw error;
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar item",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteChecklistItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('task_checklist_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir item",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card className="hover:shadow-md transition-shadow group cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2 flex-1">
              <div {...listeners} className="cursor-grab active:cursor-grabbing mt-1">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1" onClick={() => setShowDetails(true)}>
                <CardTitle className="text-sm">{task.title}</CardTitle>
                {taskChecklistItems.length > 0 && (
                  <div className="flex items-center gap-2 mt-1">
                    <CheckSquare className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {completedCount}/{taskChecklistItems.length}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onDuplicate(task.id, task.title)}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicar Tarefa
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDelete(task.id, task.title)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir Tarefa
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        {task.description && (
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground line-clamp-3">
              {task.description}
            </p>
          </CardContent>
        )}
      </Card>

      {/* Task Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Tarefa</DialogTitle>
            <DialogDescription>
              Edite os detalhes da tarefa e gerencie o checklist
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Task Info */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="taskTitle">Título</Label>
                <Input
                  id="taskTitle"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="taskDescription">Descrição</Label>
                <Textarea
                  id="taskDescription"
                  value={editingDescription}
                  onChange={(e) => setEditingDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  Prioridade: {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                </Badge>
                <div className={`w-3 h-3 rounded-full ${getPriorityColor(task.priority)}`} />
              </div>
            </div>

            {/* Checklist Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Checklist</h3>
                {taskChecklistItems.length > 0 && (
                  <Badge variant="secondary">
                    {completedCount}/{taskChecklistItems.length} completos
                  </Badge>
                )}
              </div>

              {/* Add New Checklist Item */}
              <div className="flex gap-2">
                <Input
                  placeholder="Adicionar novo item..."
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addChecklistItem()}
                />
                <Button onClick={addChecklistItem} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Checklist Items */}
              <div className="space-y-2">
                {taskChecklistItems
                  .sort((a, b) => a.position - b.position)
                  .map((item) => (
                    <div key={item.id} className="flex items-center gap-2 p-2 rounded border">
                      <Checkbox
                        checked={item.completed}
                        onCheckedChange={(checked) => toggleChecklistItem(item.id, checked as boolean)}
                      />
                      <span className={`flex-1 ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                        {item.text}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteChecklistItem(item.id)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
              </div>

              {taskChecklistItems.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  Nenhum item no checklist ainda
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDetails(false)}>
                Cancelar
              </Button>
              <Button onClick={updateTask}>
                Salvar Alterações
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};