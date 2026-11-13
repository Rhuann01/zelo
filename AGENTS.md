# Diretrizes do Projeto Zelo

> Regras permanentes aplicadas a todo código, mockup, banco de dados e orquestração de subagentes deste workspace (`Barber/`).

## 1. Regras de Interface (UI)
- **Zero Emojis em Telas Reais:** Nunca use emojis nativos do sistema operacional em telas do produto (Landing Page, Loja Pública, Vitrine, Painel do Lojista ou Super Admin). Use exclusivamente ícones vetoriais **Lucide Icons** (`lucide-react`) com cor e espessura consistentes. *(Emojis são permitidos apenas nas mensagens de chat para facilitar a leitura).*
- **Contenção Visual (Sem Excesso de Bordas):** Não coloque bordas em todos os cards e subcards da interface. Priorize hierarquia visual por contraste suave de fundo (superfície vs. fundo base), respiro/espaçamento e tipografia. Reserve bordas marcadas apenas para inputs, botões de ação ou quando o tema exigir explicitamente (ex.: preset `Neo-Brutalist Pop`).
- **Motor Único de Temas:** Siga a skill `.agents/skills/zelo-theme-tokens/SKILL.md` (1 layout base + CSS Tokens). A tela pública da loja usa apenas CSS Transitions leves (zero GSAP no app do cliente).
- **Mobile-First Real:** Toda tela deve funcionar perfeitamente a partir de `360px` de largura, com área de toque confortável (`>= 44px` em botões críticos).

## 2. Arquitetura, Segurança e Testes
- **Decisões & Plano:** Consulte `CONTEXTO.md` e `PLANO_ENGENHARIA_E_NEGOCIO.md` antes de implementar cada etapa.
- **Testes 100% Locais:** Rode `Vitest`, `Playwright` e `Grafana k6` apenas contra `localhost` e Supabase local (`supabase start`) para nunca consumir cotas gratuitas da nuvem.
- **Multi-Tenant Estrito & Fotos Livres:**
  - Toda tabela de domínio usa `loja_id` + RLS ativo; nunca exponha `agendamentos` para `SELECT` ou `UPDATE` público direto (use RPCs `SECURITY DEFINER`).
  - Fotos de perfil (Dono, Funcionário e Cliente) vêm do Google no 1º login (`perfis.avatar_url`), mas todos têm liberdade de subir foto própria depois (`WebP <= 40 KB` no bucket `avatars/{uid}/avatar.webp` com `upsert: true` e trava `avatar_customizado = true` para o login Google nunca sobrescrever).

---

## 3. Protocolo Obrigatório de Uso dos Subagentes (Não Deixar Ociosos!)

O projeto conta com **3 subagentes especializados** (salvos em `.agents/agents/` e ativos na sessão atual). O agente principal **NÃO deve fazer tudo sozinho**: deve acionar os subagentes proativamente via `send_message` (se já estiverem ativos na conversa) ou `invoke_subagent` (em novas conversas) nos gatilhos abaixo:

### 3.1. Mapa do Time de Subagentes
1. **Security & QA Architect** (`.agents/agents/zelo-security-qa.md` | ID na sessão atual: `0b964866-41a0-43ce-9ad1-6d0f3e2658f5`)
   - **Foco:** Migrations SQL, políticas RLS (`loja_id`), Storage RLS (`avatars` e `lojas-media`), trava `EXCLUDE USING gist`, segurança de Server Actions/Webhooks (`Zod`, Turnstile, Rate Limit) e execução de testes (`Vitest`, `Playwright`, `Grafana k6`).
   - **Quando acionar obrigatoriamente:**
     - **Antes/Depois de criar qualquer migration SQL ou RPC:** para auditar brechas de RLS, constraints e índices.
     - **Ao criar Server Actions ou rotas de API/Webhook:** para validar schemas `Zod`, proteção `server-only` e idempotência.
     - **Ao final de CADA Etapa do Kanban (Etapas 1 a 7):** para escrever e rodar a bateria de testes daquela etapa (`Vitest` / `Playwright` / `k6`) e emitir o laudo de *Definition of Done (DoD)*.
2. **Infra & Performance Analyst** (`.agents/agents/zelo-infra-performance.md` | ID na sessão atual: `f5e605f6-791e-42ee-826f-e2ee483ee0b0`)
   - **Foco:** Economia de cota gratuita (Supabase 500MB DB / 1GB Storage, Resend 100/dia, Cloudflare Workers), compressão client-side WebP, cache `ISR` + `revalidateTag`, `EXPLAIN ANALYZE` (`<2ms`) e bundle size mobile (`<50ms`).
   - **Quando acionar obrigatoriamente:**
     - **Etapa 1 & 2 (Banco, Auth e Painel):** revisar o compressor WebP no navegador (`<= 40 KB` avatar / `<= 100 KB` capa) e o custo das queries/índices.
     - **Etapa 3 & 4 (Vitrine, `/[slug]` e Agendamento):** configurar `ISR` + `revalidateTag('loja-' + slug)` e auditar o peso do bundle mobile (garantir que o Schedule-X fique restrito ao `/painel` e nunca vaze para o bundle da loja pública `/[slug]`).
     - **Etapa 5 & 7 (Web Push, Resend e Deploy):** validar economia de e-mails Resend via Web Push PWA e configuração de build para Cloudflare Pages/Workers.
3. **Product Mentor & Growth Strategist** (`.agents/agents/zelo-product-mentor.md` | ID na sessão atual: `10c9b446-c6bb-4115-8544-c98a3c045ec8`)
   - **Foco:** Simplicidade de UX Mobile-First (`360px+`), revisão visual contra `AGENTS.md` (zero emojis, sem excesso de bordas), microcopy de alta conversão e inteligência do `/super-admin`.
   - **Quando acionar obrigatoriamente:**
     - **Ao concluir a UI de qualquer tela (Etapas 2, 3, 4, 6 e 7):** para fazer revisão fina de usabilidade mobile (uso com 1 mão só pelo barbeiro/cliente), checar se nenhum emoji nativo ou excesso de borda escapou e validar os textos/fluxos de ativação.

---

### 3.2. Checklist de Acionamento por Etapa do MVP (Kanban)
| Etapa do MVP | Quem o Agente Principal DEVE Acionar | Entregável do Subagente na Etapa |
| :--- | :--- | :--- |
| **Etapa 1: Fundação, Banco & Auth Google** | • `zelo-security-qa`<br>• `zelo-infra-performance` | • Auditar migrations, triggers de foto Google (`avatar_customizado`), RLS e rodar teste `Vitest` (Loja A vs Loja B + conflito `23P01`).<br>• Validar índices parciais `<2ms` e pipeline de upload WebP `<= 40 KB`. |
| **Etapa 2: Painel (`/painel`), Equipe & Customizador** | • `zelo-security-qa`<br>• `zelo-product-mentor` | • Testar permissões Dono vs. Funcionário e chave *"Também atendo clientes"*.<br>• Revisar UX mobile do painel e aplicação dos 4 temas (`zelo-theme-tokens`). |
| **Etapa 3: Loja Pública (`/[slug]`) & Vitrine (`/explorar`)** | • `zelo-infra-performance`<br>• `zelo-product-mentor` | • Garantir bundle `<50ms` (zero Schedule-X/GSAP na loja pública) + cache `ISR`.<br>• Auditar fluxo estilo Booksy, zero emojis e zero excesso de bordas. |
| **Etapa 4: Motor de Horários & Reserva Blindada** | • `zelo-security-qa` | • Auditar `RPC get_horarios_ocupados` e `RPC cancelar_ou_remarcar`, Turnstile, Rate Limit e rodar `Vitest` + `Playwright` do fluxo completo de agendamento. |
| **Etapa 5: Schedule-X no Painel + Web Push + E-mail** | • `zelo-infra-performance`<br>• `zelo-security-qa` | • Revisar integração do Schedule-X MIT no `/painel` e priorização Web Push sobre Resend.<br>• Testar encaixe manual no balcão (`cliente_id NULL`) e isolamento de agenda por barbeiro. |
| **Etapa 6: Assinatura Asaas, Indicação & Super Admin** | • `zelo-security-qa`<br>• `zelo-product-mentor` | • Auditar Webhook Asaas (`timingSafeEqual` + `webhook_events`) e blindagem de 4 camadas do `/super-admin`.<br>• Validar Semáforo de Lojas, Funil 14d, Radar de Cidades e Exportação `.CSV`/IA. |
| **Etapa 7: Landing Page Final, Legais & Bateria k6** | • **Todos os 3 Subagentes** | • `zelo-security-qa`: rodar `Playwright` E2E (`360px`/`1440px`) + `Grafana k6` (1.000 VUs).<br>• `zelo-infra-performance`: auditar Core Web Vitals e limites Free Tier.<br>• `zelo-product-mentor`: revisão final de conversão e checklist de lançamento. |
