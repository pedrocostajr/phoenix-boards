import { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  approved: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshApprovalStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [approved, setApproved] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let profileSubscription: any = null;

    const checkApprovalStatus = async (session: any) => {
      if (!session?.user) {
        console.log('🔍 checkApprovalStatus: Sem usuário na sessão');
        return false;
      }

      console.log('🔍 checkApprovalStatus: Verificando aprovação para', session.user.id);

      try {
        // Adicionar timeout de 10 segundos para evitar travamento
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout na verificação de aprovação')), 10000);
        });

        const queryPromise = supabase
          .from('profiles')
          .select('approved')
          .eq('user_id', session.user.id)
          .maybeSingle();

        const { data: profile, error } = await Promise.race([queryPromise, timeoutPromise]) as any;
        
        console.log('🔍 checkApprovalStatus: Resultado da query:', { profile, error });
        
        if (error) {
          console.error('❌ Erro na query de aprovação:', error);
          return false;
        }
        
        const isApproved = profile?.approved || false;
        console.log('🔍 checkApprovalStatus: Status final:', isApproved);
        return isApproved;
      } catch (error) {
        console.error('❌ Erro ao verificar aprovação (possivelmente timeout):', error);
        // Para o admin, sempre permitir acesso mesmo se houver erro
        if (session.user.email === 'contato@leadsign.com.br') {
          console.log('🔓 Admin detectado, permitindo acesso mesmo com erro');
          return true;
        }
        return false;
      }
    };

    const setupRealtimeSubscription = (userId: string) => {
      if (profileSubscription) {
        profileSubscription.unsubscribe();
      }

      profileSubscription = supabase
        .channel(`profile_changes_${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            console.log('🔔 Profile updated via realtime:', payload);
            setApproved(payload.new.approved || false);
          }
        )
        .subscribe();
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, session?.user?.email || 'no user');
        console.log('🔄 Session:', session ? 'exists' : 'null');
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setLoading(true);
          
          try {
            const isApproved = await checkApprovalStatus(session);
            console.log('🔄 Definindo approved como:', isApproved);
            setApproved(isApproved);
            setupRealtimeSubscription(session.user.id);
          } catch (error) {
            console.error('❌ Erro ao configurar sessão:', error);
            setApproved(false);
          } finally {
            setLoading(false);
          }
        } else {
          setApproved(false);
          if (profileSubscription) {
            profileSubscription.unsubscribe();
            profileSubscription = null;
          }
          setLoading(false);
        }
      }
    );

    // Check for existing session - only set initial state, auth listener will handle the rest
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setLoading(false);
      }
      // If session exists, the auth listener will handle it
    });

    return () => {
      subscription.unsubscribe();
      if (profileSubscription) {
        profileSubscription.unsubscribe();
      }
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        }
      }
    });

    if (error) {
      toast({
        title: "Erro no cadastro",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Cadastro realizado!",
        description: "Verifique seu email para ativar a conta.",
      });
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: "Erro no login",
        description: error.message,
        variant: "destructive",
      });
    }

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshApprovalStatus = async () => {
    if (!user?.id) return;
    
    try {
      console.log('🔄 Atualizando status de aprovação para:', user.id);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('approved')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('❌ Erro ao buscar perfil:', error);
        // Não faça throw do erro, apenas registre e mantenha o estado atual
        console.log('⚠️ Mantendo status atual de aprovação');
        return;
      }
      
      console.log('📋 Status atual do perfil:', profile);
      setApproved(profile?.approved || false);
      
      toast({
        title: "Status atualizado",
        description: profile?.approved ? "Sua conta foi aprovada!" : "Ainda aguardando aprovação",
        variant: profile?.approved ? "default" : "destructive",
      });
    } catch (error) {
      console.error('❌ Erro ao atualizar status de aprovação:', error);
      // Não altere o status de aprovação em caso de erro
      console.log('⚠️ Mantendo status atual devido ao erro');
      toast({
        title: "Erro ao verificar status",
        description: "Tente novamente em alguns instantes",
        variant: "destructive",
      });
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      approved,
      signUp,
      signIn,
      signOut,
      refreshApprovalStatus,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};