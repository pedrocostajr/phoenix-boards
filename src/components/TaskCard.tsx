import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MoreVertical, Copy, Trash2, GripVertical, CheckSquare, Plus, X, Tag as TagIcon, User as UserIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  tags?: Tag[];
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
  full_name?: string;
  email?: string;
}

interface TaskCardProps {
  task: Task;
  checklistItems: ChecklistItem[];
  onDuplicate: (taskId: string, taskTitle: string) => void;
  onDelete: (taskId: string, taskTitle: string) => void;
  onUpdate: () => void;
  getPriorityColor: (priority: string) => string;
  projectTags?: Tag[];
  onTagsUpdate?: () => void;
  projectMembers?: Profile[];
  projectId?: string;
}

export const TaskCard = ({
  task,
  checklistItems,
  onDuplicate,
  onDelete,
  onUpdate,
  getPriorityColor,
  projectTags = [],
  projectMembers = [],
  projectId
}: TaskCardProps) => {
  const [showDetails, setShowDetails] = useState(false);
  const [editingTitle, setEditingTitle] = useState(task.title);
  const [editingDescription, setEditingDescription] = useState(task.description || '');
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [newTaskTag, setNewTaskTag] = useState('');
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

  const updateAssignee = async (userId: string | null) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ assigned_to: userId })
        .eq('id', task.id);

      if (error) throw error;
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erro ao atribuir responsável",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const toggleTag = async (tagId: string) => {
    const hasTag = task.tags?.some(t => t.id === tagId);
    try {
      if (hasTag) {
        // Find the record to delete. Since we don't have the task_tag ID easily, we match by task_id and tag_id
        const tagToDelete = task.tags?.find(t => t.id === tagId);
        // We use delete with match
        await supabase.from('task_tags').delete().match({ task_id: task.id, tag_id: tagId });
      } else {
        await supabase.from('task_tags').insert({ task_id: task.id, tag_id: tagId });
      }
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar etiqueta",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const createTag = async () => {
    if (!newTaskTag.trim()) return;
    try {
      // Check if exists
      const existing = projectTags.find(pt => pt.name.toLowerCase() === newTaskTag.toLowerCase());
      if (existing) {
        await toggleTag(existing.id);
      } else {
        // Create new
        // We need the project ID. Since we are in a task, we might not have it directly on the task object if not joined.
        // But we have projectTags which have project_id. Let's try to get it from there or fallback.
        // Ideally the parent should pass projectId. For now assuming projectTags has items or we need another way.
        const projectId = projectTags.length > 0 ? projectTags[0].project_id : (task as any).project_id;

        if (!projectId) {
          toast({ title: "Erro", description: "Não foi possível identificar o projeto.", variant: "destructive" });
          return;
        }

        const { data, error } = await supabase
          .from('project_tags')
          .insert({
            name: newTaskTag,
            color: '#' + Math.floor(Math.random() * 16777215).toString(16), // Random color for now
            project_id: projectId
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          await supabase.from('task_tags').insert({ task_id: task.id, tag_id: data.id });
        }
      }
      setNewTaskTag('');
      onUpdate();
      onTagsUpdate?.();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro ao criar etiqueta", description: e.message, variant: "destructive" });
    }
  };

};

const deleteTag = async (tagId: string) => {
  try {
    const { error } = await supabase
      .from('project_tags')
      .delete()
      .eq('id', tagId);

    if (error) throw error;

    onTagsUpdate?.();
    toast({
      title: "Etiqueta excluída",
      description: "A etiqueta foi removida do projeto",
    });
  } catch (error: any) {
    toast({
      title: "Erro ao excluir etiqueta",
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
    const { data: { user } } = await supabase.auth.getUser(); // Just to refresh if needed, but onUpdate should handle it
    onUpdate();

    toast({
      title: "Item adicionado!",
      description: "Item do checklist criado com sucesso.",
    });

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
  <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="mb-3">
    <Card
      className="group relative overflow-hidden bg-card hover:bg-card/90 border-l-0 border-r-0 border-b-0 border-t-0 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer rounded-lg border border-border/40"
      onClick={() => setShowDetails(true)}
    >
      {/* Priority indicator strip */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 ${getPriorityColor(task.priority)}`}
      />

      <CardHeader className="p-3 pb-0 space-y-2">

        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              {task.priority === 'high' && (
                <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold py-0 h-4 border-red-200 bg-red-50 text-red-700">
                  Urgente
                </Badge>
              )}
              {taskChecklistItems.length > 0 && (
                <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded">
                  <CheckSquare className="h-3 w-3" />
                  <span>
                    {completedCount}/{taskChecklistItems.length}
                  </span>
                </div>
              )}
            </div>
            <CardTitle className="text-sm font-medium leading-snug text-card-foreground group-hover:text-primary transition-colors line-clamp-2">
              {task.title}
            </CardTitle>
            {task.tags && task.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {task.tags.map(tag => (
                  <div key={tag.id} className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: `${tag.color}20`, color: tag.color, border: `1px solid ${tag.color}40` }}>
                    {tag.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-0.5 -mr-1">
            {task.assigned_to && (
              <Avatar className="h-6 w-6 border-2 border-background">
                <AvatarImage src={`https://avatar.vercel.sh/${task.assigned_to}`} />
                <AvatarFallback className="text-[9px]">
                  {projectMembers.find(m => m.user_id === task.assigned_to)?.full_name?.substring(0, 2).toUpperCase() || '??'}
                </AvatarFallback>
              </Avatar>
            )}
          </div>

          <div className="flex items-center gap-0.5 -mr-1">
            <div {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-secondary rounded opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-secondary rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(task.id, task.title); }}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicar
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={(e) => { e.stopPropagation(); onDelete(task.id, task.title); }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      {task.description && (
        <CardContent className="p-3 space-y-3">
          <p className="text-xs text-muted-foreground/70 line-clamp-2">
            {task.description}
          </p>
        </CardContent>
      )}
    </Card>

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
                      <div key={item.id} className="group/item flex items-center gap-3 p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-all">
                        <Checkbox
                          checked={item.completed}
                          onCheckedChange={(checked) => toggleChecklistItem(item.id, checked as boolean)}
                          className="w-5 h-5 rounded-md border-2 border-gray-500 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary"
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

              {/* Assignee Selection */}
              <div className="space-y-4 pt-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Responsável</h4>
                <div className="space-y-2">
                  <Select value={task.assigned_to || 'unassigned'} onValueChange={(val) => updateAssignee(val === 'unassigned' ? null : val)}>
                    <SelectTrigger className="w-full bg-white/5 border-white/10">
                      <SelectValue placeholder="Sem responsável" />
                    </SelectTrigger>
                    <SelectContent className="glass-morphism">
                      <SelectItem value="unassigned">Sem responsável</SelectItem>
                      {projectMembers.map(member => (
                        <SelectItem key={member.user_id} value={member.user_id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-[8px]">{member.full_name?.substring(0, 2) || member.email?.substring(0, 2)}</AvatarFallback>
                            </Avatar>
                            {member.full_name || member.email}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tags Selection */}
              <div className="space-y-4 pt-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Etiquetas</h4>
                <div className="flex flex-wrap gap-2">
                  {projectTags.map(tag => {
                    const isSelected = task.tags?.some(t => t.id === tag.id);
                    return (
                      <div key={tag.id} className="group/tag relative inline-flex">
                        <Badge
                          variant={isSelected ? "default" : "outline"}
                          className="cursor-pointer hover:opacity-80 transition-opacity pr-6"
                          style={isSelected ? { backgroundColor: tag.color, borderColor: tag.color } : { borderColor: tag.color, color: tag.color }}
                          onClick={() => toggleTag(tag.id)}
                        >
                          {tag.name}
                        </Badge>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteTag(tag.id); }}
                          className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/tag:opacity-100 hover:text-destructive transition-all"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}

                  <div className="flex items-center gap-2 w-full mt-2">
                    <Input
                      placeholder="Nova etiqueta..."
                      className="h-7 text-xs bg-white/5 border-white/10"
                      value={newTaskTag}
                      onChange={(e) => setNewTaskTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          createTag();
                        }
                      }}
                    />
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={createTag}>
                      <Plus className="h-4 w-4" />
                    </Button>
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