import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const DebugLoginV2 = () => {
    const [status, setStatus] = useState('Inicializando...');
    const [logs, setLogs] = useState<string[]>([]);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [client, setClient] = useState<any>(null);

    const log = (msg: string) => {
        const entry = `[${new Date().toLocaleTimeString()}] ${msg}`;
        setLogs(prev => [...prev, entry]);
        console.log(entry);
    };

    useEffect(() => {
        // Initialize independent client
        try {
            const SUPABASE_URL = "https://neaxlhqzgaylvhdttqoe.supabase.co";
            const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lYXhsaHF6Z2F5bHZoZHR0cW9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MjczOTQsImV4cCI6MjA4NTMwMzM5NH0.cUJIyG7bCoUxl1r1dU69pKFoiumEA9TZBiMyKWDQdAU";

            const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
            setClient(supabase);
            setStatus('Cliente Supabase Pronto ✅');
            log('Cliente inicializado.');

            supabase.auth.getSession().then(({ data }) => {
                if (data?.session) {
                    log(`Sessão Recuperada: ${data.session.user.email}`);
                    setStatus('LOGADO (Sessão Existente) 🟢');
                } else {
                    log('Nenhuma sessão ativa encontrada.');
                }
            });

        } catch (e: any) {
            setStatus('ERRO FATAL NA INICIALIZAÇÃO 🔴');
            log(`Erro: ${e.message}`);
        }
    }, []);

    const handleLogin = async () => {
        if (!client) return;
        setStatus('Tentando login...');
        log(`Tentando logar: ${email}`);

        try {
            const { data, error } = await client.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                setStatus('FALHA NO LOGIN 🔴');
                log(`Erro Supabase: ${error.message}`);
                alert(`Erro: ${error.message}`);
            } else {
                setStatus('LOGIN COM SUCESSO 🟢');
                log(`Sucesso! User ID: ${data.user.id}`);
                log(`Token: ${data.session.access_token.substring(0, 20)}...`);
                alert('LOGIN REALIZADO COM SUCESSO!');
            }
        } catch (e: any) {
            setStatus('ERRO DE EXECUÇÃO 🔴');
            log(`Exceção: ${e.message}`);
        }
    };

    return (
        <div style={{ padding: '2rem', fontFamily: 'monospace', backgroundColor: '#111', color: '#0f0', minHeight: '100vh' }}>
            <h1>🛡️ Debug Login V2 (React Route)</h1>

            <div style={{ border: '1px solid #333', padding: '1rem', marginBottom: '1rem', background: '#000' }}>
                <h3>1. Status</h3>
                <p style={{ fontWeight: 'bold' }}>{status}</p>
            </div>

            <div style={{ border: '1px solid #333', padding: '1rem', marginBottom: '1rem', background: '#000' }}>
                <h3>2. Login Manual</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px' }}>
                    <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="Email"
                        style={{ padding: '10px', background: '#222', border: '1px solid #444', color: 'white' }}
                    />
                    <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Senha"
                        style={{ padding: '10px', background: '#222', border: '1px solid #444', color: 'white' }}
                    />
                    <button
                        onClick={handleLogin}
                        style={{ padding: '10px', background: '#0f0', color: 'black', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                    >
                        Testar Login
                    </button>
                    <button
                        onClick={() => window.location.href = '/dashboard'}
                        style={{ padding: '10px', background: '#f0f', color: 'white', fontWeight: 'bold', border: 'none', cursor: 'pointer', marginTop: '10px' }}
                    >
                        Ir para Dashboard (Se Logado)
                    </button>
                </div>
            </div>

            <div style={{ border: '1px solid #333', padding: '1rem', background: '#000' }}>
                <h3>3. Logs</h3>
                <pre style={{ whiteSpace: 'pre-wrap', color: '#aaa' }}>
                    {logs.join('\n')}
                </pre>
            </div>
        </div>
    );
};

export default DebugLoginV2;
