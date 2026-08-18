# 🚀 Publicar o Saldo com banco e login (Neon + Render)

Versão simplificada: **um único serviço** (o Render serve o site E a API juntos) + **um banco** (Neon). Tudo grátis.

Resultado final: um endereço tipo `https://saldo.onrender.com` com **login** e **dados salvos na nuvem** (não somem ao limpar o cache, e sincronizam entre celular e computador).

Passos: GitHub (1x) → Neon (banco) → Render (site+API).

---

## 1. Colocar o código no GitHub

Você precisa do projeto (a pasta `saldo/` descompactada do zip mais recente). Escolha o jeito que preferir:

**Mais fácil (sem terminal) — GitHub Desktop:**
1. Baixe o **GitHub Desktop** em desktop.github.com e faça login.
2. **File → Add local repository** → aponte para a pasta `saldo/`. Ele vai oferecer "create a repository" → confirme.
3. Clique em **Commit** (embaixo) e depois em **Publish repository** (escolha *Private*).

**Com terminal (`gh`):**
```bash
cd saldo
git init && git add . && git commit -m "Saldo"
git branch -M main
gh auth login
gh repo create saldo --private --source=. --push
```

---

## 2. Banco no Neon

1. Entre em **neon.tech** (dá pra logar com o GitHub) → **Create project** → nome `saldo`.
2. Copie a **connection string** — escolha a opção **"Direct connection"** (sem `-pooler` no endereço) e garanta que termina com `?sslmode=require`. Exemplo:
   ```
   postgresql://user:senha@ep-xxxx.sa-east-1.aws.neon.tech/neondb?sslmode=require
   ```
3. Guarde essa string (é o `DATABASE_URL`).

---

## 3. Site + API no Render

1. Entre em **render.com** com o GitHub.
2. **New +** → **Blueprint** → selecione o repositório `saldo`. Ele lê o `render.yaml` e configura o serviço.
3. Preencha a variável pedida:
   - **DATABASE_URL** → cole a string do Neon (passo 2).
   - (Os segredos de login são gerados automaticamente.)
4. **Apply / Create** e aguarde. No primeiro deploy, ele cria as tabelas no banco sozinho.
5. Ficou verde? Abra a URL do serviço (ex.: `https://saldo.onrender.com`). Deve aparecer a tela de **login/criar conta**.

> **Plano free:** o serviço "dorme" após ~15 min parado e leva ~30-50s pra acordar na primeira visita. Normal.

---

## 4. Usar 🎉

1. Abra a URL do Render → **Criar conta**.
2. Faça login no celular e no computador com a **mesma conta** → os dados aparecem nos dois. ✅
3. Agora os dados vivem no banco (Neon): limpar o cache do navegador **não apaga** nada.

---

## Multi-login (várias pessoas)

Já está pronto: cada pessoa que criar uma conta tem os próprios dados, isolados. É só compartilhar o link — cada um se cadastra com o próprio e-mail e senha.

## Atualizar o app depois

Qualquer mudança: um `git push` (ou "Push" no GitHub Desktop) → o Render publica sozinho.

## Trazer seus dados da versão do navegador

Se você já lançou coisas na versão simples (Netlify), me avise: eu preparo a migração dos dados pra dentro da versão com banco, pra você não recomeçar do zero.
