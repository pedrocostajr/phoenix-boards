import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, XCircle, RefreshCw, AlertTriangle } from 'lucide-react';

const DebugAuth = () => {
    const [logs, setLogs] = useState<string[]>([]);
    const [sessionInfo, setSessionInfo] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const addLog = (msg: string) => {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
    };

    const runDiagnostics = async () => {
        setLoading(true);
        setLogs([]);
        addLog("🚀 Iniciando diagnóstico...");

        try {
            // 1. Check Internet
            addLog("📡 Verificando conexão com internet...");
            if (!navigator.onLine) {
                throw new Error("Sem conexão com a internet.");
            }
            addLog("✅ Conexão OK.");

            // 2. Check Session
            addLog("🔑 Verificando sessão local (supabase.auth.getSession)...");
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError) {
                addLog(`❌ Erro ao obter sessão: ${sessionError.message}`);
            } else if (session) {
                addLog(`✅ Sessão encontrada para: ${session.user.email} (${session.user.id})`);
                setSessionInfo(session);
            } else {
                addLog("⚠️ Nenhuma sessão ativa encontrada (Usuário não logado).");
                setSessionInfo(null);
            }

            // 3. Test Database Connection (Public/Anon check)
            addLog("🗄️ Testando leitura pública (profiles)...");
            const { data: profiles, error: dbError } = await supabase
                .from('profiles')
                .select('count')
                .limit(1)
                .maybeSingle();

            if (dbError) {
                addLog(`❌ Erro de conexão com banco: ${dbError.message} (Code: ${dbError.code})`);
            } else {
                addLog("✅ Conexão com banco OK (Queries básicas funcionam).");
            }

            // 4. Test RPC (only if logged in usually, but let's try)
            addLog("🛠️ Testando RPC 'ensure_own_profile'...");
            try {
                const { data: rpcData, error: rpcError } = await supabase.rpc('ensure_own_profile');
                if (rpcError) {
                    addLog(`❌ Erro no RPC: ${rpcError.message}`);
                } else {
                    addLog(`✅ RPC executado com sucesso. Retorno: ${JSON.stringify(rpcData)}`);
                }
            } catch (e: any) {
                addLog(`❌ Exceção ao chamar RPC: ${e.message}`);
            }

        } catch (error: any) {
            addLog(`🔥 ERRO CRÍTICO NO DIAGNÓSTICO: ${error.message}`);
        } finally {
            setLoading(false);
            addLog("🏁 Diagnóstico finalizado.");
        }
    };

    const forceLogout = async () => {
        addLog("🚪 Forçando logout...");
        await supabase.auth.signOut();
        setSessionInfo(null);
        addLog("✅ Logout realizado. Sessão limpa.");
        window.location.reload();
    };

    useEffect(() => {
        runDiagnostics();
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 p-8 font-mono text-sm session-debug">
            <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="text-yellow-500" />
                        Diagnóstico de Autenticação
                    </CardTitle>
                    <CardDescription>
                        Use esta página para identificar problemas de login, conexão ou sessão.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">

                    <div className="flex gap-4">
                        <Button onClick={runDiagnostics} disabled={loading} className="gap-2">
                            <RefreshCw className={loading ? "animate-spin" : ""} />
                            Rodar Diagnóstico
                        </Button>
                        <Button variant="destructive" onClick={forceLogout}>
                            Forçar Logout / Limpar Cache
                        </Button>
                        <Button variant="outline" onClick={() => window.location.href = '/auth'}>
                            Voltar para Login
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Status da Sessão</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {sessionInfo ? (
                                    <div className="space-y-2">
                                        <Alert className="bg-green-50 border-green-200">
                                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                                            <AlertTitle className="text-green-800">Autenticado</AlertTitle>
                                            <AlertDescription className="text-green-700">
                                                Email: {sessionInfo.user.email}<br />
                                                ID: {sessionInfo.user.id}<br />
                                                Role: {sessionInfo.user.role}
                                            </AlertDescription>
                                        </Alert>
                                        <div className="text-xs text-muted-foreground break-all">
                                            Token (Last 20 chars): ...{sessionInfo.access_token?.slice(-20)}
                                        </div>
                                    </div>
                                ) : (
                                    <Alert variant="destructive">
                                        <XCircle className="h-4 w-4" />
                                        <AlertTitle>Não Autenticado</AlertTitle>
                                        <AlertDescription>
                                            O navegador não possui uma sessão válida armazenada.
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="h-[400px] flex flex-col">
                            <CardHeader>
                                <CardTitle className="text-base">Logs de Diagnóstico</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 overflow-hidden p-0">
                                <ScrollArea className="h-full w-full p-4 bg-black text-green-400 rounded-md">
                                    {logs.map((log, index) => (
                                        <div key={index} className="mb-1 font-mono text-xs">
                                            {log}
                                        </div>
                                    ))}
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>

                </CardContent>
            </Card>
        </div>
    );
};

export default DebugAuth;
