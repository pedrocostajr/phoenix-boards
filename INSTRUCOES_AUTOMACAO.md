# Automação de Deploy do Supabase (GitHub Actions)

Você pediu para automatizar o processo usando Git, e eu configurei isso para você! 🚀

Agora, toda vez que você enviar código para o branch `main` no GitHub, as Funções do Supabase serão atualizadas automaticamente.

## ⚠️ Passo Final Obrigatório (Segurança)

Por motivos de segurança, eu **não tenho acesso** às suas senhas do GitHub. Você precisa configurar duas "Secrets" no seu repositório para que a automação funcione:

1.  Acesse seu repositório no GitHub.
2.  Vá em **Settings** > **Secrets and variables** > **Actions**.
3.  Clique em **New repository secret** e adicione:

| Nome do Secret | Valor | Como conseguir |
| :--- | :--- | :--- |
| `SUPABASE_ACCESS_TOKEN` | Seu Token de Acesso Pessoal | Gere em: [Supabase Access Tokens](https://supabase.com/dashboard/account/tokens) |
| `SUPABASE_PROJECT_ID` | O ID do seu projeto | É a parte `neaxlhqzgaylvhdttqoe` da URL (ou veja em Project Settings) |

### Como Funciona

-   O arquivo de automação está em: `.github/workflows/deploy-supabase-functions.yaml`.
-   Assim que você adicionar os segredos acima, o próximo `git push` fará o deploy automático.

---

**Enquanto isso:** Se você quiser testar *agora* sem esperar o GitHub, use o comando manual que ensinei antes:

```bash
supabase functions deploy admin-list-users
```
