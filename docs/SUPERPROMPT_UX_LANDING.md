# Superprompt — Redesign de UX/Design da Landing + Front (Meu-Lutador)

> Cole o bloco abaixo numa sessão do Claude Code **com as skills carregadas**
> (`ui-ux-pro-max`, `motion-improve`, `motion-fix`) e o **Magic MCP (21st.dev)**
> conectado. Skills instaladas só ativam em sessão nova — abra uma fresca.

---

```text
PAPEL
Você é um(a) Senior Product Designer + Front-end Engineer especialista em
landing pages que convertem e em micro-interações de alto nível. Capricho de
"big tech", mas sem poluição visual.

PROJETO (contexto real — não reinvente o que já existe)
"Octógono dos Sonhos / Meu Lutador": jogo web onde a pessoa monta um lutador de
MMA herdando cada atributo de feras REAIS do UFC e joga uma CARREIRA em escadinha
de 8 lutas (lutas 7 e 8 = co-main e main event, 5 rounds), com simulação narrada
round a round e juízes (sistema 10-9/10-8). Tema: octógono, vermelho-sangue +
dourado sobre preto. Mobile-first. Público BR (textos em PT-BR).

STACK (respeite à risca)
- Next.js 15 (App Router) + React 19, em /web.
- Tailwind CSS v4 — SEM tailwind.config.js; tokens em @theme dentro de
  web/app/globals.css (cores: --color-blood #e11d2a, --color-gold #f5b53f,
  --color-ink #0a0a0c, --color-mist #9aa0ad). Keyframes/animações já vivem nesse CSS.
- Framer Motion (motion) para animação.
- Componentes shadcn-style em web/components/ui/ (já existem
  background-gradient-animation.tsx e hover-button.tsx); helper cn em web/lib/utils.ts.
- Deploy: Cloudflare Pages como SITE ESTÁTICO (next.config.mjs tem output:"export").
  => NÃO use SSR, server actions, route handlers, next/image (use <img> ou unoptimized),
     nem next/font remoto. Tudo precisa exportar estático (npm run build gera web/out).
- Dados: a UI fala com RPCs do Supabase via PostgREST (web/lib/api.ts) usando a
  anon key e header Content-Profile: meu_lutador. NÃO altere a API/engine/backend.

ARQUIVOS-CHAVE
- web/app/page.tsx ............ orquestra os estágios: intro → build → fight → champion/gameover
- web/app/globals.css ......... tema (@theme) + keyframes (animate-first..fifth, impact-flash, shake, punch-in)
- web/app/layout.tsx .......... metadata/viewport
- web/components/ui.tsx ....... Button, StatBar, Spinner, cx
- web/components/ui/*.tsx ..... background-gradient-animation, hover-button
- web/components/SlotSheet.tsx  bottom-sheet do seletor (10 sorteados, 3 re-rolls)
- web/components/FightPlayback.tsx  playback animado da luta + cartões dos juízes
- web/lib/{api,types,engine}.ts  RPC client, tipos, motor (engine roda no client)

OBJETIVO
Elevar MASSIVAMENTE a UX e o design da LANDING (estágio intro) e do FRONT em geral,
deixando "viciante" e premium, porém limpo e rápido. Foco em conversão: levar a
pessoa a tocar "Começar carreira" e a continuar jogando.

USE AS SKILLS (obrigatório, nesta ordem)
1) ui-ux-pro-max: rode a auditoria de UX/visual e gere direção de design
   (paleta refinada partindo do vermelho/dourado/preto, escala tipográfica,
   hierarquia, espaçamento, estados, acessibilidade). Use os scripts de
   paletas/fontes/estilos da skill. Entregue 2 direções e escolha 1 (justifique).
2) Magic MCP (21st.dev): gere/refine componentes de UI premium e instale em
   web/components/ui/ (shadcn + Tailwind). Candidatos: hero com fundo animado de
   octógono/partículas sutis, "bento"/feature cards do "como funciona", botão
   magnético/shine, ticker/marquee de nomes de lutadores, badge de cinturão,
   sheet/drawer e toasts. Adapte TUDO para Tailwind v4 (sem config JS) e ao tema.
3) motion-improve: audite as animações atuais (transições de estágio, reveal do
   log, flash/shake/punch-in) e proponha melhorias (timing, easing, orquestração,
   stagger, spring). motion-fix: aplique correções/perf (evitar layout thrash,
   usar transform/opacity, will-change pontual, AnimatePresence correto).

ENTREGÁVEIS
A) Nova LANDING (estágio intro) com seções, mobile-first:
   - Hero: título + subtítulo + CTA primário ("Começar carreira") com fundo
     animado sutil (octógono/gradiente) e um "fight card" de teaser.
   - "Como funciona" em 3 passos (Monte → Lute a escadinha → Seja campeão), com
     ícones (lucide-react) e cards.
   - Teaser social: marquee/ticker com nomes reais (pode buscar via uma RPC
     existente OU usar uma lista estática curada — não invente endpoint novo).
   - Faixa de destaque dos diferenciais (8 lutas, juízes 10-9, narração com
     suspense, herde de feras reais).
   - CTA final + rodapé enxuto.
B) Polimento do FRONT (build/fight/result): hierarquia, espaçamentos, foco,
   estados de loading/empty/erro, toques de motion premium — sem poluir.
C) Acessibilidade: contraste AA, foco visível, aria onde fizer sentido, respeitar
   prefers-reduced-motion (já há guarda no globals.css — mantenha/expanda).
D) Design tokens consolidados no @theme; nada de cores hardcoded soltas.

REGRAS / NÃO QUEBRAR
- Não mexa em lib/api.ts (contrato), lib/engine.ts (motor), nem no backend/RPC.
- Mantenha o fluxo de estados de page.tsx funcionando (intro→build→fight→fim).
- Mantenha export estático: `cd web && npm run build` TEM que passar e gerar out/.
- Performance: First Load JS sob controle; animações 60fps; nada de bibliotecas
  pesadas sem necessidade. Imagens otimizadas/levezas (ou só CSS/SVG).
- PT-BR em toda a interface. Tom: empolgante, esportivo, direto.

PROCESSO
1. Leia os arquivos-chave acima antes de propor.
2. Rode ui-ux-pro-max (auditoria + direção) → apresente 2 direções, escolha 1.
3. Gere componentes via Magic MCP; adapte ao Tailwind v4 + tema; coloque em
   web/components/ui/.
4. Implemente a landing + polimento; aplique motion-improve/motion-fix.
5. VERIFIQUE: `cd web && npm run build` (deve exportar), confira em viewport
   mobile (360px) e desktop; cheque contraste e reduced-motion.
6. Commit + push na branch `claude/new-session-rfvvxx` (o Cloudflare Pages
   redeploya sozinho). Use mensagens de commit claras.

CRITÉRIOS DE ACEITE
- Landing nova, premium e limpa, mobile-first, claramente convidando ao CTA.
- Componentes do Magic MCP integrados e on-theme (vermelho/dourado/preto).
- Animações revisadas (motion) suaves e com propósito, respeitando reduced-motion.
- Build estático passa; nada do backend/engine alterado; fluxo do jogo intacto.
- Acessibilidade AA e performance saudável.

Comece lendo os arquivos-chave e rodando a skill ui-ux-pro-max. Quando tiver as 2
direções de design, me mostre antes de implementar.
```

---

## Notas de uso
- **Pré-requisito:** instale as skills (numa sessão sua, fora deste agente) e conecte o Magic MCP:
  - `npm i -g uipro-cli && uipro init --ai claude --global` (precisa de `python3`)
  - motion: `git clone --depth=1 https://github.com/motiondivision/motion.git /tmp/motion` e copie `/.agents/skills/improve` e `/fix` para `~/.claude/skills/` (motion-improve / motion-fix)
  - Magic MCP (21st.dev): adicione o servidor MCP `@21st-dev/magic` na config do Claude Code.
- **Abra uma sessão NOVA** depois de instalar — skills só carregam no início da sessão.
- Se alguma skill/MCP não estiver disponível, o agente deve aplicar os princípios na mão e avisar (não fingir uso).
