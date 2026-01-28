import { useState, useEffect } from 'react';
import { X, Crown, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface TrialBannerProps {
  userCreatedAt: string;
}

export const TrialBanner = ({ userCreatedAt }: TrialBannerProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(0);

  useEffect(() => {
    const createdDate = new Date(userCreatedAt);
    const now = new Date();
    const daysSinceCreation = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    const remaining = Math.max(0, 7 - daysSinceCreation);
    
    setDaysRemaining(remaining);
    
    // Mostrar banner quando restam 3 dias ou menos, ou quando o trial expirou
    setIsVisible(remaining <= 3);
  }, [userCreatedAt]);

  const handlePurchase = () => {
    // Link da Kiwify - substitua pela URL real do produto
    window.open('https://kiwify.app/seu-produto', '_blank');
  };

  if (!isVisible) return null;

  const isExpired = daysRemaining === 0;

  return (
    <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 mb-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-orange-500/10" />
      <div className="relative p-4">
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 h-6 w-6 p-0"
          onClick={() => setIsVisible(false)}
        >
          <X className="h-4 w-4" />
        </Button>
        
        <div className="flex items-start gap-3 pr-8">
          <div className="flex-shrink-0">
            <Crown className="h-6 w-6 text-amber-600" />
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-2">
              {isExpired ? 'Seu período de teste expirou!' : `Restam ${daysRemaining} dias no seu trial`}
            </h3>
            
            <p className="text-sm text-gray-700 mb-4">
              {isExpired 
                ? 'Continue aproveitando todos os recursos do Phoenix Board com nossa assinatura premium.'
                : 'Não perca acesso aos recursos premium do Phoenix Board. Atualize sua conta agora!'
              }
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={handlePurchase} className="bg-amber-600 hover:bg-amber-700">
                <Crown className="h-4 w-4 mr-2" />
                Assinar Agora
              </Button>
              
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>Trial de 7 dias incluído</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};