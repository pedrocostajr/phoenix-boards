import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, CheckCircle, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const processPayment = async () => {
      const paymentId = searchParams.get('payment_id');
      const externalReference = searchParams.get('external_reference');

      if (paymentId && externalReference) {
        try {
          await supabase.functions.invoke('process-payment', {
            body: { payment_id: paymentId, external_reference: externalReference }
          });

          toast({
            title: "Pagamento confirmado!",
            description: "Sua assinatura foi ativada com sucesso.",
          });
        } catch (error) {
          console.error('Error processing payment:', error);
        }
      }
    };

    processPayment();
  }, [searchParams, toast]);

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
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-green-600">Pagamento Aprovado!</CardTitle>
            <CardDescription>
              Parabéns! Sua assinatura do Phoenix Board foi ativada com sucesso.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>✅ Assinatura Premium ativada</p>
              <p>✅ Acesso completo liberado</p>
              <p>✅ Próxima cobrança em 30 dias</p>
            </div>
            <div className="space-y-2">
              <Button onClick={() => navigate('/dashboard')} className="w-full">
                <ArrowRight className="h-4 w-4 mr-2" />
                Acessar Dashboard
              </Button>
              <Button variant="outline" onClick={() => navigate('/')} className="w-full">
                Voltar ao Início
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentSuccess;