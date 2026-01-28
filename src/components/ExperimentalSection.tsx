import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TestTube, 
  Zap, 
  Brain, 
  Sparkles, 
  BarChart3, 
  Calendar,
  Bell,
  Users
} from 'lucide-react';

export const ExperimentalSection = () => {
  const [activeFeatures, setActiveFeatures] = useState<string[]>([]);

  const experimentalFeatures = [
    {
      id: 'ai-suggestions',
      title: 'Sugestões com IA',
      description: 'Receba sugestões inteligentes para otimizar seus projetos',
      icon: Brain,
      status: 'beta',
      color: 'bg-purple-100 text-purple-700'
    },
    {
      id: 'advanced-analytics',
      title: 'Analytics Avançado',
      description: 'Relatórios detalhados sobre produtividade da equipe',
      icon: BarChart3,
      status: 'preview',
      color: 'bg-blue-100 text-blue-700'
    },
    {
      id: 'smart-scheduling',
      title: 'Agendamento Inteligente',
      description: 'IA que otimiza prazos baseado no histórico da equipe',
      icon: Calendar,
      status: 'experimental',
      color: 'bg-green-100 text-green-700'
    },
    {
      id: 'team-insights',
      title: 'Insights da Equipe',
      description: 'Análise comportamental para melhor gestão',
      icon: Users,
      status: 'beta',
      color: 'bg-orange-100 text-orange-700'
    }
  ];

  const toggleFeature = (featureId: string) => {
    setActiveFeatures(prev => 
      prev.includes(featureId) 
        ? prev.filter(id => id !== featureId)
        : [...prev, featureId]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'beta': return 'bg-yellow-500';
      case 'preview': return 'bg-blue-500';
      case 'experimental': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="border-2 border-dashed border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/10">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <TestTube className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle className="flex items-center gap-2">
              Recursos Experimentais
              <Sparkles className="h-4 w-4 text-amber-500" />
            </CardTitle>
            <CardDescription>
              Teste recursos em desenvolvimento e nos ajude a melhorar!
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {experimentalFeatures.map((feature) => {
            const IconComponent = feature.icon;
            const isActive = activeFeatures.includes(feature.id);
            
            return (
              <div
                key={feature.id}
                className={`p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                  isActive 
                    ? 'border-primary bg-primary/5 shadow-md' 
                    : 'border-border hover:border-primary/50 bg-card'
                }`}
                onClick={() => toggleFeature(feature.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg ${feature.color}`}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <Badge 
                    variant="secondary" 
                    className={`${getStatusColor(feature.status)} text-white text-xs`}
                  >
                    {feature.status}
                  </Badge>
                </div>
                
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {feature.description}
                </p>
                
                <Button 
                  variant={isActive ? "secondary" : "outline"}
                  size="sm"
                  className="w-full"
                >
                  {isActive ? 'Ativado' : 'Ativar Teste'}
                </Button>
              </div>
            );
          })}
        </div>
        
        {activeFeatures.length > 0 && (
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="h-4 w-4 text-amber-600" />
              <span className="font-medium text-amber-800">Recursos Ativados</span>
            </div>
            <p className="text-sm text-amber-700">
              Você está testando {activeFeatures.length} recurso(s) experimental(is). 
              Estes recursos podem ter bugs ou mudanças frequentes.
            </p>
          </div>
        )}
        
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground">
            💡 <strong>Feedback:</strong> Sua opinião é valiosa! Envie sugestões para contato@leadsign.com.br
          </p>
        </div>
      </CardContent>
    </Card>
  );
};