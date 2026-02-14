# 🛑 PARE! Você está no lugar errado!

Você está tentando rodar o comando de deploy dentro do **Editor SQL** do Supabase. Isso não vai funcionar.

O comando `supabase functions deploy` é um comando de **TERMINAL** (prompt de comando), não de banco de dados.

## ✅ Como fazer do jeito certo:

1.  **Abra o Terminal** no seu computador (no VS Code, vá no menu `Terminal` > `New Terminal`).
2.  Certifique-se de estar na pasta do projeto.
3.  Copie e cole este comando no **Terminal**:

```bash
supabase functions deploy admin-list-users
```

Se o comando `supabase` não funcionar no seu terminal, você pode precisar usar `npx` (se tiver Node.js instalado):

```bash
npx supabase functions deploy admin-list-users
```

Depois que o comando rodar com sucesso, volte ao navegador e recarregue a página de Admin.
