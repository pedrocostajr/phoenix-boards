import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const addUserSchema = z.object({
  full_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  role: z.enum(['client', 'admin'], {
    required_error: 'Selecione uma função',
  }),
});

type AddUserFormData = z.infer<typeof addUserSchema>;

interface AddUserFormProps {
  onUserAdded: () => void;
}

export const AddUserForm = ({ onUserAdded }: AddUserFormProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<AddUserFormData>({
    resolver: zodResolver(addUserSchema),
    defaultValues: {
      full_name: '',
      email: '',
      role: 'client',
    },
  });

  const onSubmit = async (data: AddUserFormData) => {
    setLoading(true);
    
    try {
      console.log('🔄 Iniciando criação de usuário:', data);
      console.log('🔍 Auth state:', await supabase.auth.getUser());
      
      const { data: result, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          full_name: data.full_name,
          email: data.email,
          role: data.role,
        },
      });

      console.log('📋 Resposta da edge function:', { result, error });

      if (error) {
        console.error('❌ Erro na edge function:', error);
        console.error('❌ Detalhes do erro:', JSON.stringify(error, null, 2));
        
        // Extrair mensagem de erro mais útil
        let errorMessage = 'Erro ao chamar a função de criação de usuário';
        if (error.message) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }
        
        throw new Error(errorMessage);
      }

      if (!result || !result.success) {
        console.error('❌ Resposta inválida da edge function:', result);
        throw new Error('Resposta inválida da função de criação de usuário');
      }

      console.log('✅ Usuário criado com sucesso:', result);

      // Verificar se é um usuário novo ou existente
      const isNewUser = !result.message || !result.message.includes('existe');
      
      toast({
        title: isNewUser ? "Usuário criado!" : "Usuário já existe",
        description: isNewUser 
          ? `${data.full_name} foi adicionado e aprovado no sistema. Senha temporária: temp123456`
          : `${data.full_name} já estava no sistema e foi atualizado.`,
      });

      form.reset();
      onUserAdded();
    } catch (error: any) {
      console.error('❌ Erro ao criar usuário:', error);
      toast({
        title: "Erro ao criar usuário",
        description: error.message || 'Erro interno do servidor',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Adicionar Usuário
        </CardTitle>
        <CardDescription>
          Crie uma nova conta de usuário no sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl>
                      <Input placeholder="João Silva" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="joao@exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Função</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a função" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="client">Cliente</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <Button type="submit" disabled={loading} className="w-full md:w-auto">
              {loading ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};