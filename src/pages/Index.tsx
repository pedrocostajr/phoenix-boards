import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Zap, Kanban, Users, Settings, BarChart3, CheckCircle, Clock, Shield, Star, ArrowRight, TrendingUp, Lightbulb, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading, signOut, approved } = useAuth();

  console.log('🏠 Index page - User:', user?.email || 'not logged in', 'Loading:', loading, 'Approved:', approved);

  useEffect(() => {
    console.log('🏠 Index useEffect - User changed:', user?.email || 'no user');
    // Só redirecionar se não estiver carregando e houver usuário
    if (user && !loading) {
      console.log('🏠 Redirecting to dashboard...');
      navigate('/dashboard');
    }
  }, [user, navigate, loading]);

  if (loading) {
    console.log('🏠 Index - Still loading auth...');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Zap className="h-8 w-8 text-primary" />
              <h1 className="text-xl font-bold">Phoenix Board</h1>
            </div>
            <div className="flex items-center gap-4">
              {user && (
                <Button 
                  variant="destructive" 
                  onClick={signOut}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Logout ({user.email})
                </Button>
              )}
              <Button 
                variant="outline" 
                onClick={() => window.open('https://pay.kiwify.com.br/L9Sbnd2', '_blank')}
                className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 hover:bg-primary/20"
              >
                💎 Comprar
              </Button>
              <Button onClick={() => navigate('/auth')}>
                Entrar
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Zap className="h-16 w-16 text-primary animate-pulse" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Phoenix Board
            </h1>
          </div>
          <h2 className="text-3xl font-bold mb-4">
            🚀 Revolucione a Gestão dos Seus Projetos
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
            <strong>Pare de perder tempo</strong> com ferramentas complicadas! O Phoenix Board é a solução definitiva para 
            <span className="text-primary font-semibold"> organizar projetos</span>, 
            <span className="text-primary font-semibold"> aumentar produtividade</span> e 
            <span className="text-primary font-semibold"> entregar resultados excepcionais</span>.
          </p>
          
          {/* Benefícios rápidos */}
          <div className="flex flex-wrap justify-center gap-6 mb-8 text-sm">
            <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Setup em 5 minutos</span>
            </div>
            <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full">
              <Star className="h-5 w-5 text-yellow-500" />
              <span>Interface intuitiva</span>
            </div>
            <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full">
              <Shield className="h-5 w-5 text-blue-500" />
              <span>Controle total de acesso</span>
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <Button 
              size="lg" 
              className="text-lg px-8 py-4 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
              onClick={() => window.open('https://pay.kiwify.com.br/L9Sbnd2', '_blank')}
            >
              🔥 COMPRAR AGORA
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/auth')} className="text-lg px-8 py-4">
              Teste Grátis
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground mt-4">
            ⚡ <strong>Oferta limitada!</strong> Garante seu acesso hoje mesmo
          </p>
        </div>
      </section>

      {/* Problema e Solução */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 rounded-2xl mb-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-6 text-red-600 dark:text-red-400">
            😤 Cansado de Projetos Desorganizados?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-red-600 dark:text-red-400">❌ Problemas Comuns:</h3>
              <ul className="space-y-2 text-left">
                <li className="flex items-center gap-2"><X className="h-5 w-5 text-red-500" />Tarefas perdidas e esquecidas</li>
                <li className="flex items-center gap-2"><X className="h-5 w-5 text-red-500" />Equipe desalinhada</li>
                <li className="flex items-center gap-2"><X className="h-5 w-5 text-red-500" />Prazos perdidos</li>
                <li className="flex items-center gap-2"><X className="h-5 w-5 text-red-500" />Comunicação confusa</li>
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-green-600 dark:text-green-400">✅ Com Phoenix Board:</h3>
              <ul className="space-y-2 text-left">
                <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" />Visibilidade total das tarefas</li>
                <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" />Equipe sincronizada</li>
                <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" />Prazos sempre em dia</li>
                <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" />Comunicação clara</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-center mb-4">
          💎 Funcionalidades Premium que Transformam Resultados
        </h2>
        <p className="text-xl text-center text-muted-foreground mb-12">
          Cada recurso foi pensado para <strong>maximizar sua produtividade</strong>
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="text-center p-8 rounded-2xl bg-gradient-to-b from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-2 border-blue-200 dark:border-blue-800">
            <Kanban className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-3">🎯 Boards Kanban Inteligentes</h3>
            <p className="text-muted-foreground mb-4">
              Visualize o fluxo de trabalho e identifique gargalos instantaneamente
            </p>
            <div className="text-sm font-semibold text-blue-600">
              ⚡ +300% de produtividade
            </div>
          </div>
          
          <div className="text-center p-8 rounded-2xl bg-gradient-to-b from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 border-2 border-green-200 dark:border-green-800">
            <Users className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-3">🔐 Controle de Acesso Avançado</h3>
            <p className="text-muted-foreground mb-4">
              Defina quem pode ver, editar ou gerenciar cada projeto
            </p>
            <div className="text-sm font-semibold text-green-600">
              🛡️ Segurança total
            </div>
          </div>
          
          <div className="text-center p-8 rounded-2xl bg-gradient-to-b from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 border-2 border-purple-200 dark:border-purple-800">
            <TrendingUp className="h-16 w-16 text-purple-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-3">📊 Relatórios que Impressionam</h3>
            <p className="text-muted-foreground mb-4">
              Dados precisos para tomar decisões estratégicas certeiras
            </p>
            <div className="text-sm font-semibold text-purple-600">
              📈 ROI comprovado
            </div>
          </div>
        </div>
        
        {/* Benefícios adicionais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-6 rounded-xl bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="h-8 w-8 text-orange-500" />
              <h4 className="text-lg font-semibold">⏰ Economize 20+ Horas por Semana</h4>
            </div>
            <p className="text-muted-foreground">
              Automatize tarefas repetitivas e foque no que realmente importa para o seu negócio crescer.
            </p>
          </div>
          
          <div className="p-6 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
            <div className="flex items-center gap-3 mb-4">
              <Lightbulb className="h-8 w-8 text-emerald-500" />
              <h4 className="text-lg font-semibold">💡 Interface Revolucionária</h4>
            </div>
            <p className="text-muted-foreground">
              Tão simples que qualquer pessoa da equipe aprende em minutos. Zero curva de aprendizado!
            </p>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center bg-gradient-to-r from-primary/10 to-primary/5 p-12 rounded-3xl border-2 border-primary/20">
          <h2 className="text-3xl font-bold mb-4">
            🎯 Não Perca Mais Tempo com Ferramentas Complicadas!
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Junte-se aos <strong>milhares de profissionais</strong> que já revolucionaram 
            seus projetos com o Phoenix Board. <span className="text-primary font-semibold">Resultados garantidos!</span>
          </p>
          
          <div className="space-y-4">
            <Button 
              size="lg" 
              className="text-xl px-12 py-6 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-xl transform hover:scale-105 transition-all"
              onClick={() => window.open('https://pay.kiwify.com.br/L9Sbnd2', '_blank')}
            >
              🚀 GARANTIR MEU ACESSO AGORA
              <ArrowRight className="ml-2 h-6 w-6" />
            </Button>
            
            <div className="flex justify-center items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Shield className="h-4 w-4 text-green-500" />
                <span>Pagamento 100% Seguro</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Acesso Imediato</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            <span className="font-semibold">Phoenix Board</span>
            <span className="text-muted-foreground">- Gestão de Projetos</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
