import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Zap } from 'lucide-react';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Create a local client for authentication to bypass potential context/singleton issues
  const localSupabase = createClient(
    "https://neaxlhqzgaylvhdttqoe.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lYXhsaHF6Z2F5bHZoZHR0cW9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MjczOTQsImV4cCI6MjA4NTMwMzM5NH0.cUJIyG7bCoUxl1r1dU69pKFoiumEA9TZBiMyKWDQdAU"
  );

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("🟢 Botão de entrar clicado (Local Client Strategy)");
    toast({ title: "Conectando...", description: "Iniciando login seguro..." });
    setIsLoading(true);

    try {
      // Use local client to avoid singleton state issues
      const { data, error } = await localSupabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("🔴 Login failed:", error);
        toast({
          title: "Erro no Login",
          description: error.message,
          variant: "destructive"
        });
        setIsLoading(false);
      } else {
        console.log("✅ Login successful (Local Client), forcing hard redirect...");
        toast({ title: "Sucesso!", description: "Entrando no sistema..." });

        // Force hard reload to ensure fresh state for the main app
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 500);
      }
    } catch (e: any) {
      console.error("Critical error in handleSignIn:", e);
      toast({
        title: "Erro Crítico",
        description: e.message || "Falha desconhecida",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Use local client for consistency
    const { error } = await localSupabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    });

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Verifique seu email", description: "Link de confirmação enviado." });
    }
    setIsLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        title: "Email necessário",
        description: "Por favor, digite seu email antes de solicitar a redefinição de senha.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast({
        title: "Email enviado!",
        description: "Verifique sua caixa de entrada para instruções de redefinição de senha.",
      });

    } catch (error: any) {
      toast({
        title: "Erro ao enviar email",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-background to-secondary/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Zap className="h-8 w-8 text-primary" />
            <CardTitle className="text-2xl">Phoenix Board</CardTitle>
          </div>
          <CardDescription>
            Gestão de Projetos Inteligente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Entrando...' : 'Entrar'}
                </Button>
                {isLoading && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
                    onClick={() => setIsLoading(false)}
                  >
                    Cancelar / Tentar Novamente
                  </Button>
                )}
                <div className="text-center">
                  <Button
                    type="button"
                    variant="link"
                    onClick={handleForgotPassword}
                    disabled={isLoading}
                    className="text-sm"
                  >
                    Esqueci minha senha
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome Completo</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Seu nome completo"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Crie uma senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Cadastrando...' : 'Cadastrar'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          <div className="mt-4 text-center">
            <a href="/debug-auth" className="text-xs text-muted-foreground hover:text-primary">
              Problemas com login? Diagnóstico
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;