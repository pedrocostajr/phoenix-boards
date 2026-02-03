import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Zap, LogOut, Settings, Users, Trash2, MoreVertical, Copy, Share2, UserPlus, X, ShieldCheck, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TrialBanner } from '@/components/TrialBanner';

interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

interface ProjectMember {
  id: string;
  user_id: string;
  role: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
}

const Dashboard = () => {
  const { user, signOut, approved, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareEmail, setShareEmail] = useState('');
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isRenamingProject, setIsRenamingProject] = useState(false);
  const [renamingProjectId, setRenamingProjectId] = useState('');
  const [renamingProjectName, setRenamingProjectName] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    console.log('🔍 Dashboard useEffect:', { authLoading, user: user?.email, approved });

    if (!authLoading && !user) {
      console.log('🚪 Usuário não autenticado, redirecionando para /auth');
      navigate('/auth');
      return;
    }

    if (!authLoading && user && !approved && user.email !== 'contato@leadsign.com.br') {
      console.log('❌ Redirecionando para pending-approval:', { approved, email: user.email });
      navigate('/pending-approval');
      return;
    }
    if (!authLoading && user && (approved || user.email === 'contato@leadsign.com.br')) {
      console.log('✅ Usuário aprovado, carregando projetos:', { approved, email: user.email });
      fetchProjects();
      fetchUserProfile();
    }
  }, [user, approved, authLoading, navigate]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar projetos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    if (!user?.id) return;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setUserProfile(profile);
    } catch (error) {
      console.error('Erro ao carregar perfil do usuário:', error);
    }
  };

  const createProject = async () => {
    if (!user?.id) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para criar projetos.",
        variant: "destructive",
      });
      return;
    }

    const projectName = prompt('Nome do projeto:');
    if (!projectName) return;

    const projectDescription = prompt('Descrição do projeto (opcional):') || '';

    try {
      const { error } = await supabase
        .from('projects')
        .insert([{
          name: projectName,
          description: projectDescription,
          created_by: user.id
        }]);

      if (error) throw error;

      toast({
        title: "Projeto criado!",
        description: `O projeto "${projectName}" foi criado com sucesso.`,
      });

      fetchProjects();
    } catch (error: any) {
      toast({
        title: "Erro ao criar projeto",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const duplicateProject = async (projectId: string, projectName: string) => {
    if (!user?.id) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para duplicar projetos.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get original project
      const { data: originalProject, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;

      // Create new project
      const { data: newProject, error: newProjectError } = await supabase
        .from('projects')
        .insert([{
          name: `${originalProject.name} (Cópia)`,
          description: originalProject.description,
          created_by: user.id
        }])
        .select()
        .single();

      if (newProjectError) throw newProjectError;

      // Get all boards from original project
      const { data: originalBoards, error: boardsError } = await supabase
        .from('boards')
        .select('*')
        .eq('project_id', projectId);

      if (boardsError) throw boardsError;

      // Duplicate each board
      for (const board of originalBoards || []) {
        const { data: newBoard, error: newBoardError } = await supabase
          .from('boards')
          .insert([{
            name: board.name,
            project_id: newProject.id
          }])
          .select()
          .single();

        if (newBoardError) throw newBoardError;

        // Get columns from original board
        const { data: originalColumns, error: columnsError } = await supabase
          .from('board_columns')
          .select('*')
          .eq('board_id', board.id)
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
      }

      toast({
        title: "Projeto duplicado!",
        description: `O projeto "${originalProject.name}" foi duplicado com sucesso.`,
      });

      fetchProjects();
    } catch (error: any) {
      toast({
        title: "Erro ao duplicar projeto",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteProject = async (projectId: string, projectName: string) => {
    if (!confirm(`Tem certeza que deseja excluir o projeto "${projectName}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      toast({
        title: "Projeto excluído!",
        description: `O projeto "${projectName}" foi excluído com sucesso.`,
      });

      fetchProjects();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir projeto",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateProject = async () => {
    if (!renamingProjectId || !renamingProjectName.trim()) return;

    try {
      const { error } = await supabase
        .from('projects')
        .update({ name: renamingProjectName })
        .eq('id', renamingProjectId);

      if (error) throw error;

      toast({
        title: "Projeto renomeado!",
        description: "O nome do projeto foi atualizado com sucesso.",
      });

      setIsRenamingProject(false);
      setRenamingProjectId('');
      setRenamingProjectName('');
      fetchProjects();
    } catch (error: any) {
      toast({
        title: "Erro ao renomear projeto",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchProjectMembers = async (projectId: string) => {
    setLoadingMembers(true);
    try {
      const { data: members, error } = await supabase
        .from('project_members')
        .select('id, user_id, role')
        .eq('project_id', projectId);

      if (error) throw error;

      const memberIds = members?.map(m => m.user_id) || [];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', memberIds);

      if (profilesError) throw profilesError;

      const membersWithProfiles = members?.map(member => ({
        ...member,
        profiles: profiles?.find(p => p.user_id === member.user_id) || {
          full_name: 'Usuário não encontrado',
          avatar_url: null
        }
      })) || [];

      setProjectMembers(membersWithProfiles);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar membros",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingMembers(false);
    }
  };

  const shareProject = async () => {
    if (!shareEmail.trim() || !selectedProjectId) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('full_name', shareEmail)
        .maybeSingle();

      let userId = profile?.user_id;

      if (!userId) {
        toast({
          title: "Usuário não encontrado",
          description: "Digite o nome completo do usuário conforme cadastrado no sistema.",
          variant: "destructive",
        });
        return;
      }

      const { data: existingMember } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', selectedProjectId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existingMember) {
        toast({
          title: "Usuário já é membro",
          description: "Este usuário já tem acesso ao projeto.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('project_members')
        .insert([{
          project_id: selectedProjectId,
          user_id: userId,
          role: 'client'
        }]);

      if (error) throw error;

      toast({
        title: "Projeto compartilhado!",
        description: "Usuário adicionado ao projeto com sucesso.",
      });

      setShareEmail('');
      fetchProjectMembers(selectedProjectId);
    } catch (error: any) {
      toast({
        title: "Erro ao compartilhar projeto",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: "Membro removido!",
        description: "Usuário removido do projeto com sucesso.",
      });

      fetchProjectMembers(selectedProjectId);
    } catch (error: any) {
      toast({
        title: "Erro ao remover membro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openShareModal = (projectId: string) => {
    setSelectedProjectId(projectId);
    fetchProjectMembers(projectId);
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!approved && user?.email !== 'contato@leadsign.com.br') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/5 to-primary/5">
      <header className="bg-card border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Zap className="h-8 w-8 text-primary" />
              <h1 className="text-xl font-bold">Phoenix Board</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Olá, {user?.email}
              </span>
              {user?.email === 'contato@leadsign.com.br' && (
                <Button variant="outline" size="sm" onClick={() => navigate('/admin')}>
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Administração
                </Button>
              )}
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Configurações
              </Button>
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {userProfile?.created_at && (
          <TrialBanner userCreatedAt={userProfile.created_at} />
        )}

        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Meus Projetos</h2>
            <p className="text-muted-foreground mt-1">
              Gerencie seus projetos e boards de forma eficiente
            </p>
          </div>
          <Button onClick={createProject} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Projeto
          </Button>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-16">
            <Zap className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhum projeto ainda</h3>
            <p className="text-muted-foreground mb-6">
              Crie seu primeiro projeto para começar a organizar suas tarefas
            </p>
            <Button onClick={createProject} className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Primeiro Projeto
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card key={project.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      {project.name}
                    </CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <Dialog>
                          <DialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <div className="flex items-center w-full" onClick={() => openShareModal(project.id)}>
                                <Share2 className="h-4 w-4 mr-2" />
                                Compartilhar Projeto
                              </div>
                            </DropdownMenuItem>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle>Compartilhar Projeto</DialogTitle>
                              <DialogDescription>
                                Adicione usuários para colaborar neste projeto.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="email">Nome do usuário</Label>
                                <div className="flex space-x-2">
                                  <Input
                                    id="email"
                                    placeholder="Digite o nome completo"
                                    value={shareEmail}
                                    onChange={(e) => setShareEmail(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && shareProject()}
                                  />
                                  <Button onClick={shareProject} size="sm">
                                    <UserPlus className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label>Membros do projeto</Label>
                                {loadingMembers ? (
                                  <div className="text-sm text-muted-foreground">Carregando...</div>
                                ) : projectMembers.length === 0 ? (
                                  <div className="text-sm text-muted-foreground">Nenhum membro adicional</div>
                                ) : (
                                  <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {projectMembers.map((member) => (
                                      <div key={member.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                                        <div className="flex items-center space-x-2">
                                          <div className="h-6 w-6 bg-primary rounded-full flex items-center justify-center text-xs text-primary-foreground">
                                            {member.profiles.full_name.charAt(0).toUpperCase()}
                                          </div>
                                          <span className="text-sm">{member.profiles.full_name}</span>
                                          <span className="text-xs text-muted-foreground px-2 py-1 bg-background rounded">
                                            {member.role}
                                          </span>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => removeMember(member.id)}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <DropdownMenuItem
                          onClick={() => duplicateProject(project.id, project.name)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicar Projeto
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setRenamingProjectId(project.id);
                            setRenamingProjectName(project.name);
                            setIsRenamingProject(true);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Renomear Projeto
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => deleteProject(project.id, project.name)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir Projeto
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardDescription>
                    {project.description || 'Sem descrição'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Criado em {new Date(project.created_at).toLocaleDateString('pt-BR')}
                  </p>
                  <Button
                    className="w-full mt-4"
                    variant="outline"
                    onClick={() => navigate(`/project/${project.id}`)}
                  >
                    Abrir Projeto
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isRenamingProject} onOpenChange={setIsRenamingProject}>
          <DialogContent className="glass-morphism border-white/20">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight">Renomear Projeto</DialogTitle>
              <DialogDescription className="text-foreground/60">
                Digite o novo nome para o projeto
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="renameProjectName" className="font-bold text-sm tracking-wider uppercase ml-1">Novo Nome</Label>
                <Input
                  id="renameProjectName"
                  value={renamingProjectName}
                  onChange={(e) => setRenamingProjectName(e.target.value)}
                  placeholder="Ex: Marketing 2024"
                  className="bg-white/5 border-white/10 h-12 rounded-xl focus:border-primary/50"
                  onKeyPress={(e) => e.key === 'Enter' && updateProject()}
                />
              </div>
              <Button onClick={updateProject} className="w-full h-12 bg-primary font-bold text-lg rounded-xl shadow-xl shadow-primary/10 transition-all active:scale-95">
                Salvar Alterações
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Dashboard;