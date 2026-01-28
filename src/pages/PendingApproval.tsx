import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, Clock, LogOut, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PendingApproval = () => {
  const { user, signOut, refreshApprovalStatus } = useAuth();
  const { toast } = useToast();

  const handleCheckApproval = async () => {
    try {
      await refreshApprovalStatus();
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
              <p className="mt-2">
                Aguarde a aprovação do administrador para acessar o sistema. 
                Você será notificado quando sua conta for aprovada.
              </p>
            </div>
            <div className="space-y-2">
              <Button onClick={handleCheckApproval} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Verificar Status de Aprovação
              </Button>
              <Button 
                variant="destructive" 
                onClick={async () => {
                  console.log('🔄 DEBUG: Forçando logout e limpeza de estado');
                  await signOut();
                  window.location.reload();
                }} 
                className="w-full"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair e Recarregar
              </Button>
              <Button variant="outline" onClick={signOut} className="w-full">
                <LogOut className="h-4 w-4 mr-2" />
                Apenas Sair
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PendingApproval;