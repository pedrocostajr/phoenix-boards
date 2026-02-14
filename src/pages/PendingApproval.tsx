import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, Clock, LogOut, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PendingApproval = () => {
  const { user, signOut, refreshApprovalStatus, approved } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (approved) {
      toast({
        title: "Conta Aprovada!",
        description: "Redirecionando para o painel...",
        variant: "default",
      });
      // Pequeno delay para garantir que o toast apareça
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    }
  }, [approved, navigate, toast]);

  const handleCheckApproval = async () => {
    try {
      await refreshApprovalStatus();

      // A navegação acontecerá automaticamente pelo useEffect se 'approved' mudar para true
      // Mas podemos forçar uma verificação visual também
      toast({
        title: "Status verificado",
        description: "Status de aprovação atualizado.",
      });
    } catch (error) {
      toast({
        title: "Erro ao verificar status",
        description: "Tente novamente em alguns segundos.",
        variant: "destructive",
      });
    }
  };

  const [debugInfo, setDebugInfo] = useState<string>('');

  const checkDirectly = async () => {
    if (!user) return;

    // Tenta ler o perfil
    const { data, error } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();

    let debugMsg = JSON.stringify({ data, error }, null, 2);

    // Se perfil não existe ou erro, tenta auto-repair
    if (!data || error) {
      debugMsg += "\n\n⚠️ Perfil não encontrado ou erro. Tentando auto-repair...";
      try {
        const { data: repairData, error: repairError } = await supabase.rpc('ensure_own_profile');
        debugMsg += "\n🔧 Repair Result: " + JSON.stringify({ repairData, repairError }, null, 2);

        // Se reparou, tenta ler de novo
        if (!repairError) {
          const { data: newData } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
          debugMsg += "\n✅ Novo Perfil: " + JSON.stringify(newData, null, 2);
          if (newData?.approved) {
            window.location.reload();
            return;
          }
        }
      } catch (e) {
        debugMsg += "\n❌ Repair Failed: " + String(e);
      }
    }

    setDebugInfo(debugMsg);

    if (data?.approved) {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/5 to-primary/5 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <Card className="text-center">
          <CardHeader>
            <div className="flex items-center justify-center gap-2 mb-4">
              <Zap className="h-8 w-8 text-primary" />
              <h1 className="text-xl font-bold">Phoenix Board</h1>
            </div>
            <div className="flex items-center justify-center mb-4">
              <Clock className="h-16 w-16 text-muted-foreground" />
            </div>
            <CardTitle>Conta Pendente de Aprovação</CardTitle>
            <CardDescription>
              Seu cadastro foi realizado com sucesso, mas ainda precisa ser aprovado pelo administrador.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p><strong>Email:</strong> {user?.email}</p>
              <p className="text-xs text-muted-foreground mt-1">ID: {user?.id}</p>
              <p className="mt-2">
                Aguarde a aprovação do administrador.
              </p>
            </div>

            {/* DEBUG AREA */}
            <div className="bg-slate-950 p-3 rounded text-xs text-left text-green-400 font-mono overflow-auto max-h-48 border border-green-900 mt-4 mb-4">
              <p className="font-bold border-b border-green-900 mb-2 pb-1">AREA DE DEBUG (Envie print se persistir)</p>
              <p>Auth Loaded: {String(!!user)}</p>
              <p>App Approved State: {String(approved)}</p>
              <p>User ID: {user?.id}</p>
              <p>Email: {user?.email}</p>
              <br />
              {debugInfo ? (
                <>
                  <p className="font-bold">Resultado da Verificação Direta:</p>
                  <pre>{debugInfo}</pre>
                </>
              ) : (
                <p className="text-gray-500">Clique em "Verificar Status" para carregar dados do banco...</p>
              )}
            </div>

            <div className="space-y-2">
              <Button onClick={() => { handleCheckApproval(); checkDirectly(); }} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Verificar Status (Com Debug)
              </Button>

              <Button
                variant="secondary"
                onClick={async () => {
                  const { error } = await supabase.rpc('ensure_own_profile');
                  if (error) {
                    toast({ title: "Erro no reparo", description: error.message, variant: "destructive" });
                  } else {
                    toast({ title: "Perfil reparado", description: "Tente verificar o status agora." });
                    checkDirectly();
                  }
                }}
                className="w-full bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-600 border border-yellow-500/50"
              >
                <Zap className="h-4 w-4 mr-2" />
                Reparar Perfil (Tentativa Manual)
              </Button>

              <Button
                variant="destructive"
                onClick={async () => {
                  console.log('🔄 DEBUG: Forçando logout e limpeza de estado');
                  await signOut();
                  window.location.href = '/';
                }}
                className="w-full"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair e Recarregar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PendingApproval;