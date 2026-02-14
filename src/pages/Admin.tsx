import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Zap, LogOut, Settings, Check, X, Users, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AddUserForm } from '@/components/AddUserForm';

interface AdminUser {
  id: string; // auth.users id
  email: string;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  created_at: string;
  profile: {
    full_name: string;
    role: string;
    approved: boolean;
    avatar_url: string | null;
  } | null;
}

const Admin = () => {
  const { user: currentUser, signOut } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAccess();
    fetchUsers();
  }, []);

  const checkAdminAccess = async () => {
    if (!currentUser?.email || currentUser.email !== 'contato@leadsign.com.br') {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para acessar esta área.",
        variant: "destructive",
      });
      navigate('/dashboard');
      return;
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('admin-list-users');

      if (error) throw error;

      console.log('Admin users list:', data.users);
      setUsers(data.users || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      console.log('⚠️ Fallback: Fetching from profiles table directly');

      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profileError) {
        toast({
          title: "Erro ao carregar usuários",
          description: profileError.message,
          variant: "destructive",
        });
      } else {
        // Map profiles to AdminUser structure
        const mappedUsers: AdminUser[] = profiles.map((p: any) => ({
          id: p.user_id,
          email: 'Email oculto (Erro na função)',
          email_confirmed_at: null,
          last_sign_in_at: null,
          created_at: p.created_at,
          profile: p
        }));
        setUsers(mappedUsers);

        toast({
          title: "Modo de compatibilidade",
          description: "Não foi possível carregar emails. Mostrando dados básicos.",
          variant: "default",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const approveUser = async (userId: string) => {
    try {
      console.log('🔄 Aprovando usuário (Tentativa via RPC)...');

      // Tenta chamar a função SQL direta (mais robusta que Edge Function)
      const { data, error } = await supabase.rpc('approve_user_secure', {
        target_user_id: userId
      });

      if (error) {
        // Se a função não existir (RPC error), tenta o método antigo
        console.warn('⚠️ RPC falhou (função pode não existir), tentando Edge Function ou direto:', error);
        throw new Error('RPC falhou');
      }

      // Verifica se a função retornou erro de permissão ou sucesso
      if (data && data.success === false) {
        throw new Error(data.error || 'Erro desconhecido na aprovação');
      }

      console.log('✅ Usuário aprovado e email confirmado via RPC!');

      toast({
        title: "Usuário aprovado!",
        description: "Conta liberada e email confirmado automaticamente.",
        variant: "default",
      });

      fetchUsers();
    } catch (rpcError: any) {
      console.log('🔄 Fallback: Tentando Edge Function...');
      try {
        const { error: edgeError } = await supabase.functions.invoke('admin-approve-user', {
          body: { userId }
        });

        if (edgeError) {
          console.warn('⚠️ Edge function falhou, tentando método direto:', edgeError);
          throw edgeError;
        }
        console.log('✅ Usuário aprovado via Edge Function!');
        toast({ title: "Usuário aprovado!", description: "Conta liberada.", variant: "default" });
        fetchUsers();

      } catch (edgeError) {
        console.log('🔄 Fallback: Aprovando apenas via banco de dados...');

        try {
          const { error: dbError } = await supabase
            .from('profiles')
            .update({ approved: true })
            .eq('user_id', userId);

          if (dbError) throw dbError;

          toast({
            title: "Aprovado (Modo Compatibilidade)",
            description: "Usuário aprovado, mas o email PODE não ter sido confirmado automaticamente. Verifique se a Edge Function foi implantada.",
            variant: "secondary",
          });

          fetchUsers();
        } catch (finalError: any) {
          console.error('❌ Erro fatal na aprovação:', finalError);
          toast({
            title: "Erro ao aprovar usuário",
            description: finalError.message || "Tente novamente mais tarde.",
            variant: "destructive",
          });
        }
      }
    }
  };

  const rejectUser = async (userId: string) => {
    try {
      console.log('🔄 Removendo aprovação do usuário:', userId);

      const { error } = await supabase
        .from('profiles')
        .update({ approved: false })
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Erro ao reprovar usuário:', error);
        throw error;
      }

      console.log('✅ Aprovação removida com sucesso');

      toast({
        title: "Aprovação removida!",
        description: "A aprovação do usuário foi removida.",
      });

      fetchUsers();
    } catch (error: any) {
      console.error('❌ Erro na reprovação:', error);
      toast({
        title: "Erro ao remover aprovação",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Tem certeza que deseja EXCLUIR PERMANENTEMENTE o usuário "${userName}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      console.log('🔄 Excluindo usuário (Via RPC)...');

      // Tenta via RPC primeiro
      const { data, error: rpcError } = await supabase.rpc('delete_user_secure', {
        target_user_id: userId
      });

      if (rpcError) {
        console.warn('⚠️ RPC falhou, tentando Edge Function:', rpcError);
        throw new Error('RPC falhou');
      }

      if (data && data.success === false) {
        throw new Error(data.error || 'Erro permissão');
      }

      console.log('✅ Usuário excluído com sucesso (RPC)');
      toast({
        title: "Usuário excluído!",
        description: "O usuário foi excluído permanentemente do sistema.",
      });

      fetchUsers();
    } catch (error: any) {
      console.log('🔄 Tentando via Edge Function...');

      try {
        const { error: edgeError } = await supabase.functions.invoke('admin-delete-user', {
          body: { userId }
        });

        if (edgeError) throw edgeError;

        toast({
          title: "Usuário excluído!",
          description: "Usuário removido via Edge Function.",
        });
        fetchUsers();

      } catch (edgeError) {
        console.log('🔄 Fallback: Excluindo apenas perfil do banco de dados...');
        // Mantém o fluxo original aqui para o catch final

        try {
          const { error: dbError } = await supabase
            .from('profiles')
            .delete()
            .eq('user_id', userId);

          if (dbError) throw dbError;

          toast({
            title: "Excluído (Modo Compatibilidade)",
            description: "Perfil excluído. O login pode ainda existir na tabela Auth se a função falhou, mas o usuário não conseguirá acessar o sistema corretamente.",
            variant: "secondary",
          });

          fetchUsers();
        } catch (finalError: any) {
          console.error('❌ Erro fatal na exclusão:', finalError);
          toast({
            title: "Erro ao excluir usuário",
            description: finalError.message || "Tente novamente mais tarde.",
            variant: "destructive",
          });
        }
      }
    }
  }
};

if (loading) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
    </div>
  );
}

return (
  <div className="min-h-screen bg-gradient-to-br from-background via-secondary/5 to-primary/5">
    {/* Header */}
    <header className="bg-card border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <Zap className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-bold">Phoenix Board - Administração</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Admin: {currentUser?.email}
            </span>
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
              <Users className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
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

    {/* Main Content */}
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Gerenciamento de Usuários</h2>
        <p className="text-muted-foreground mt-1">
          Aprove ou rejeite usuários cadastrados no sistema
        </p>
      </div>

      {/* Add User Form */}
      <AddUserForm onUserAdded={fetchUsers} />

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuários</CardTitle>
          <CardDescription>
            Usuários cadastrados no sistema. Aprove ou reprove conforme necessário.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Status Email</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Data de Cadastro</TableHead>
                <TableHead>Último Login</TableHead>
                <TableHead>Status Aprov.</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{user.profile?.full_name || 'Sem nome'}</span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.email_confirmed_at ? 'outline' : 'secondary'}>
                      {user.email_confirmed_at ? (
                        <span className="flex items-center text-green-600 gap-1">
                          <Check className="h-3 w-3" /> Verificado
                        </span>
                      ) : (
                        <span className="text-yellow-600">Pendente</span>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.profile?.role === 'admin' ? 'default' : 'secondary'}>
                      {user.profile?.role === 'admin' ? 'Admin' : 'Cliente'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <div className="text-xs">
                      {user.last_sign_in_at
                        ? new Date(user.last_sign_in_at).toLocaleString('pt-BR')
                        : 'Nunca logou'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.profile?.approved ? 'default' : 'destructive'}>
                      {user.profile?.approved ? 'Aprovado' : 'Pendente'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {!user.profile?.approved ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => approveUser(user.id)}
                            className="h-8"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteUser(user.id, user.profile?.full_name || user.email)}
                            className="h-8"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Excluir
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => rejectUser(user.id)}
                            className="h-8"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reprovar
                          </Button>
                          {user.id !== currentUser?.id && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteUser(user.id, user.profile?.full_name || user.email)}
                              className="h-8"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Excluir
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {users.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum usuário encontrado</h3>
              <p className="text-muted-foreground">
                Ainda não há usuários cadastrados no sistema.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  </div>
);
  };

export default Admin;