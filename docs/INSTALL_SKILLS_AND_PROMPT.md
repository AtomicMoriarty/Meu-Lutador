# Instalar as skills + Magic MCP e mandar o Claude Code fazer por você

Guia em 2 partes: **(1)** passo a passo manual de instalação · **(2)** um prompt
pronto pra colar no seu **Claude Code local** que executa o que dá pra automatizar.

> ⚠️ Importante: **skills só são carregadas quando a sessão começa**. Depois de
> instalar qualquer skill, **feche e abra uma sessão nova** do Claude Code antes de
> usá-la. O Claude Code roda no terminal (CLI), no app desktop, no VS Code/JetBrains
> ou em claude.ai/code.

---

## Parte 1 — Passo a passo de instalação (manual)

Pré-requisitos: `git`, `node`/`npm` e `python3` instalados. Confira:
```bash
git --version && node -v && npm -v && python3 --version
```

### 1) ui-ux-pro-max
Escolha **uma** opção.

**Opção A — Marketplace do Claude Code (mais simples):** dentro do Claude Code, digite:
```
/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill
/plugin install ui-ux-pro-max@ui-ux-pro-max-skill
```

**Opção B — CLI npm:**
```bash
npm install -g uipro-cli
cd /caminho/do/seu/repo/Meu-Lutador
uipro init --ai claude            # instala em .claude/skills/ do projeto
# OU global (vale em qualquer projeto):
uipro init --ai claude --global   # instala em ~/.claude/skills/
```

### 2) motion-improve e motion-fix (cópia manual)
Essas duas não têm instalador — são skills embutidas no repo da Motion:
```bash
git clone --depth=1 https://github.com/motiondivision/motion.git /tmp/motion
mkdir -p ~/.claude/skills
cp -r /tmp/motion/.agents/skills/improve ~/.claude/skills/motion-improve
cp -r /tmp/motion/.agents/skills/fix     ~/.claude/skills/motion-fix
```

### 3) Magic MCP (21st.dev) — gerador de componentes
1. Pegue uma API key em **https://21st.dev/magic/console**.
2. Adicione o servidor MCP ao Claude Code (escopo do usuário):
```bash
claude mcp add magic --scope user -- npx -y @21st-dev/magic@latest API_KEY="SUA_API_KEY"
```
3. Confira: `claude mcp list` (deve aparecer `magic`).
   - No app desktop/IDE, dá pra adicionar pelo painel de **MCP / Connectors** com o
     mesmo comando `npx -y @21st-dev/magic@latest API_KEY=...`.
   - Doc oficial: https://21st.dev/magic (use se a sintaxe mudar).

### 4) Reinicie e verifique
- **Abra uma sessão nova.**
- Rode `/help` ou veja a lista de skills; `ui-ux-pro-max`, `motion-improve` e
  `motion-fix` devem aparecer, e o comando do Magic (ex.: `/ui`) deve responder.

---

## Parte 2 — Prompt pra colar no seu Claude Code (ele instala o que dá)

> Cole no Claude Code **no diretório do repositório**. Ele vai instalar o `uipro` e
> copiar as skills da Motion (vai pedir sua permissão pra escrever em `~/.claude/`).
> O **Magic MCP** precisa de API key e altera a config do Claude — por isso o passo 3
> acima é manual; o prompt só verifica se já está conectado.

```text
Você vai preparar meu ambiente do Claude Code para um redesign de UX. Faça,
explicando cada passo e PEDINDO confirmação antes de escrever em ~/.claude/:

1) Cheque os pré-requisitos: `git --version`, `node -v`, `npm -v`, `python3 --version`.
   Se faltar algo, me avise e pare.

2) Instale a skill ui-ux-pro-max via CLI:
   - `npm install -g uipro-cli`
   - na raiz deste repositório, rode `uipro init --ai claude --global`
   - se o npm global falhar por permissão, me mostre o erro e sugira alternativa
     (npx ou sudo), sem forçar.

3) Instale as skills motion-improve e motion-fix copiando do repo oficial:
   - `git clone --depth=1 https://github.com/motiondivision/motion.git /tmp/motion`
   - `mkdir -p ~/.claude/skills`
   - `cp -r /tmp/motion/.agents/skills/improve ~/.claude/skills/motion-improve`
   - `cp -r /tmp/motion/.agents/skills/fix ~/.claude/skills/motion-fix`
   (peça minha aprovação antes de copiar para ~/.claude/skills, pois é o diretório
    que controla o comportamento do agente.)

4) Magic MCP (21st.dev): rode `claude mcp list` e me diga se "magic" já está
   conectado. Se NÃO estiver, NÃO tente configurar sozinho — me passe o comando
   exato para eu rodar com minha API key:
   `claude mcp add magic --scope user -- npx -y @21st-dev/magic@latest API_KEY="MINHA_KEY"`
   e o link https://21st.dev/magic/console para gerar a key.

5) No fim, liste o que foi instalado com sucesso e me lembre que preciso ABRIR UMA
   SESSÃO NOVA para as skills carregarem. Depois disso, o próximo passo é colar o
   superprompt de redesign que está em docs/SUPERPROMPT_UX_LANDING.md.

Não altere nenhum código do app (web/, src/, db/) neste processo — é só setup de
ambiente.
```

---

## Ordem recomendada
1. Rode a **Parte 2** (ou faça a **Parte 1** na mão) para instalar.
2. Configure o **Magic MCP** com sua API key (passo 3 da Parte 1).
3. **Abra uma sessão nova** do Claude Code.
4. Cole o **superprompt** de `docs/SUPERPROMPT_UX_LANDING.md` para fazer o redesign.

> Observação honesta: em ambientes gerenciados (como o Claude Code na web) a cópia de
> skills de terceiros para `~/.claude/skills` pode ser **bloqueada por segurança**.
> No seu Claude Code local você consegue aprovar a ação normalmente.
