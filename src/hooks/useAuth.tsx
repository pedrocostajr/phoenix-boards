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
  ensureProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [approved, setApproved] = useState(false);
  const { toast } = useToast();

  const ensureProfileInternal = async (userId: string) => {
    try {
      console.log('🔧 Executando Auto-Repair de Perfil via RPC...');
      const { data, error } = await supabase.rpc('ensure_own_profile');
      console.log('🔧 Resultado:', { data, error });

      if (error) throw error;
      return true;
    } catch (e: any) {
      console.error('❌ Falha no Auto-Repair:', e);
      // Fallback: Tenta insert direto se RPC falhar
      try {
        console.log('🔄 Tentando insert direto como fallback...');
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({ user_id: userId, full_name: 'Usuário (Recuperado)', role: 'client', approved: false })
          .select()
          .single();

        if (insertError && insertError.code !== '23505') { // Ignora erro de duplicidade
          throw insertError;
        }
        return true;
      } catch (finalErr) {
        console.error('❌ Falha final no repair:', finalErr);
        return false;
      }
    }
  };

  useEffect(() => {
    let profileSubscription: any = null;

    const checkApprovalStatus = async (session: any, retries = 1): Promise<boolean> => {
      if (!session?.user) return false;

      try {
        console.log(`🔍 Verificando status de aprovação para: ${session.user.id} (Email: ${session.user.email})`);

        // 1. Tenta buscar o perfil
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('approved, role')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (error) {
          console.error('❌ Erro na query de aprovação:', error);
          if (retries > 0) {
            console.log(`⚠️ Tentando novamente em 1s... (${retries} retries left)`);
            await new Promise(r => setTimeout(r, 1000));
            return checkApprovalStatus(session, retries - 1);
          }
          return false;
        }

        // 2. Se perfil não existe, tenta criar automaticamente
        if (!profile) {
          console.log('⚠️ Perfil não encontrado. Tentando criar automaticamente...');
          await ensureProfileInternal(session.user.id);
          // Tenta buscar de novo após criar
          const { data: newProfile } = await supabase
            .from('profiles')
            .select('approved')
            .eq('user_id', session.user.id)
            .maybeSingle();

          return newProfile?.approved || false;
        }

        console.log(`✅ Status de aprovação obtido: ${profile.approved}`);
        return profile.approved || false;

      } catch (error) {
        console.error('❌ Erro inesperado ao verificar aprovação:', error);
        // Fallback for known admin
        if (session.user.email === 'contato@leadsign.com.br') return true;
        return false;
      }
    };

    const ensureProfileInternal = async (userId: string) => {
      try {
        const { data, error } = await supabase.rpc('ensure_own_profile');
        console.log('🔧 Resultado do Auto-Repair de Perfil:', { data, error });
      } catch (e) {
        console.error('❌ Falha ao executar ensure_own_profile:', e);
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
            setApproved(payload.new.approved || false);
          }
        )
        .subscribe();
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Don't set loading=true on every auth change if we already have a user, to prevent flicker
          // But we do need to check approval
          if (event === 'INITIAL_SESSION') {
            setLoading(true);
          }

          try {
            const isApproved = await checkApprovalStatus(session);
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

    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setLoading(false);
      }
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
    console.log('🔵 useAuth: Tendo login para:', email);
    try {
      if (!supabase || !supabase.auth) {
        console.error('🔴 Supabase client não inicializado corretamente');
        throw new Error('Erro interno: Cliente Supabase inválido');
      }

      console.log('🔵 Chamando supabase.auth.signInWithPassword...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('🔵 Retorno do Supabase:', { data, error });

      if (error) {
        console.error('🔴 Erro retornado pelo Supabase:', error);
        toast({
          title: "Erro no login",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      return { error: null };
    } catch (err: any) {
      console.error('🔴 Exceção em signIn:', err);
      toast({
        title: "Erro de Exceção",
        description: err.message || "Ocorreu um erro crítico ao tentar logar.",
        variant: "destructive",
      });
      return { error: err };
    }
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
      signOut,
      refreshApprovalStatus,
      ensureProfile: async () => { if (user) await ensureProfileInternal(user.id); },
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