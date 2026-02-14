# Automação de Deploy do Supabase (GitHub Actions)

Você não encontrou as configurações? Sem problemas, aqui estão os **LINKS DIRETOS** para você clicar:

## 1. Onde colocar os segredos no GitHub
Clique neste link para ir direto para a página certa do seu repositório:
👉 [Adicionar Secrets no GitHub](https://github.com/pedrocostajr/phoenix-boards/settings/secrets/actions)

Nesta página, clique no botão verde **"New repository secret"** e adicione dois itens:

### Secret 1: `SUPABASE_PROJECT_ID`
*   **Name**: `SUPABASE_PROJECT_ID`
*   **Secret**: `neaxlhqzgaylvhdttqoe` (Já peguei o ID correto do seu código)

### Secret 2: `SUPABASE_ACCESS_TOKEN`
*   **Name**: `SUPABASE_ACCESS_TOKEN`
*   **Secret**: Você precisa gerar isso no Supabase.
    1.  Clique aqui: [Gerar Token no Supabase](https://supabase.com/dashboard/account/tokens)
    2.  Clique em "Generate new token".
    3.  Dê um nome (ex: "GitHub Deploy").
    4.  Copie o código longo que aparecer e cole no GitHub.

---

### Pronto!
Assim que você adicionar esses dois segredos no link acima:
1.  O próximo `git push` fará o deploy automático.
2.  Como você já fez o push, você pode ir na aba "Actions" do GitHub e reenviar o último workflow, ou fazer um novo commit vazio apenas para disparar:
    `git commit --allow-empty -m "Trigger deployment" && git push`
