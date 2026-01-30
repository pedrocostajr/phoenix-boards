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
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card
        className="group relative overflow-hidden bg-white/70 backdrop-blur-sm border-white/40 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer rounded-xl"
        onClick={() => setShowDetails(true)}
      >
        {/* Priority indicator bar */}
        <div
          className={`absolute left-0 top-0 bottom-0 w-1.5 ${getPriorityColor(task.priority)} shadow-[2px_0_8px_rgba(0,0,0,0.1)]`}
        />

        <CardHeader className="pb-3 pt-4 pl-6 pr-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold py-0 h-4 border-white/50 bg-white/30">
                  {task.priority === 'high' ? 'Urgente' : task.priority === 'medium' ? 'Médio' : 'Baixo'}
                </Badge>
                {taskChecklistItems.length > 0 && (
                  <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-full bg-primary/5 text-primary">
                    <CheckSquare className="h-3 w-3" />
                    <span className="text-[10px] font-bold">
                      {completedCount}/{taskChecklistItems.length}
                    </span>
                  </div>
                )}
              </div>
              <CardTitle className="text-[15px] font-semibold leading-tight text-foreground/90 group-hover:text-primary transition-colors truncate">
                {task.title}
              </CardTitle>
            </div>

            <div className="flex items-center gap-1">
              <div {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-black/5 rounded group-hover:opacity-100 opacity-0 transition-opacity">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-black/5 rounded-full">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="glass-morphism border-white/20">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(task.id, task.title); }}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicar Tarefa
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={(e) => { e.stopPropagation(); onDelete(task.id, task.title); }}
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
          <CardContent className="pb-4 pl-6 pr-4 pt-0">
            <p className="text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          </CardContent>
        )}
      </Card>

      {/* Task Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col glass-morphism border-white/20 p-0 rounded-2xl shadow-2xl">
          <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
            <DialogHeader className="space-y-2">
              <div className="flex items-center gap-3 mb-2">
                <Badge className={`${getPriorityColor(task.priority)} shadow-lg border-none text-white px-3`}>
                  Prioridade {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                </Badge>
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Detalhes da Tarefa</span>
              </div>
              <DialogTitle className="text-3xl font-black tracking-tight leading-none">
                {editingTitle || "Sem título"}
              </DialogTitle>
              <DialogDescription className="text-foreground/60 text-base">
                Gerencie as informações e o progresso desta tarefa
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
              <div className="md:col-span-2 space-y-8">
                {/* Title Edit */}
                <div className="space-y-3">
                  <Label htmlFor="taskTitle" className="text-sm font-bold uppercase tracking-wider text-foreground/70 ml-1">Título</Label>
                  <Input
                    id="taskTitle"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    className="bg-white/10 border-white/20 focus:border-primary/50 text-lg font-medium p-6 rounded-xl"
                  />
                </div>

                {/* Description Edit */}
                <div className="space-y-3">
                  <Label htmlFor="taskDescription" className="text-sm font-bold uppercase tracking-wider text-foreground/70 ml-1">Descrição</Label>
                  <Textarea
                    id="taskDescription"
                    value={editingDescription}
                    onChange={(e) => setEditingDescription(e.target.value)}
                    rows={4}
                    placeholder="Adicione uma descrição detalhada..."
                    className="bg-white/10 border-white/20 focus:border-primary/50 text-base p-4 rounded-xl resize-none"
                  />
                </div>

                {/* Checklist Section */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="h-5 w-5 text-primary" />
                      <h3 className="text-xl font-bold">Checklist</h3>
                    </div>
                    {taskChecklistItems.length > 0 && (
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-bold">
                        {completedCount}/{taskChecklistItems.length}
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
                      className="bg-white/5 border-white/10"
                    />
                    <Button onClick={addChecklistItem} size="sm" className="bg-primary hover:bg-primary/90 shadow-md">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Checklist Items */}
                  <div className="grid gap-3">
                    {taskChecklistItems
                      .sort((a, b) => a.position - b.position)
                      .map((item) => (
                        <div key={item.id} className="group/item flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all">
                          <Checkbox
                            checked={item.completed}
                            onCheckedChange={(checked) => toggleChecklistItem(item.id, checked as boolean)}
                            className="w-5 h-5 rounded-md border-white/30"
                          />
                          <span className={`flex-1 text-sm font-medium transition-all ${item.completed ? 'line-through text-muted-foreground' : 'text-foreground/90'}`}>
                            {item.text}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteChecklistItem(item.id)}
                            className="h-8 w-8 p-0 opacity-0 group-hover/item:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                  </div>

                  {taskChecklistItems.length === 0 && (
                    <div className="text-center py-8 rounded-2xl border border-dashed border-white/10 text-muted-foreground/60">
                      Nenhum item no checklist ainda
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar Info */}
              <div className="space-y-6 border-l border-white/10 pl-8">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Status & Meta</h4>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">Prioridade</p>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getPriorityColor(task.priority)}`} />
                        <span className="text-sm font-bold capitalize">{task.priority}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">Criado em</p>
                      <p className="text-sm font-medium">{new Date(task.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Ações Rápidas</h4>
                  <div className="grid gap-2">
                    <Button variant="outline" className="justify-start bg-white/5 border-white/10" onClick={() => onDuplicate(task.id, task.title)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicar
                    </Button>
                    <Button variant="outline" className="justify-start text-destructive hover:bg-destructive/10 border-white/10" onClick={() => onDelete(task.id, task.title)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons Footer */}
          <div className="p-6 bg-black/10 border-t border-white/10 flex justify-end gap-3 rounded-b-2xl">
            <Button variant="ghost" onClick={() => setShowDetails(false)} className="hover:bg-white/10">
              Cancelar
            </Button>
            <Button onClick={updateTask} className="bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 px-8 font-bold">
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};