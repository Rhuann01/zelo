# Documentação do que já foi implementado — Zelo (`Barber/`)

> Registro consolidado da arquitetura, rotas, migrations, funcionalidades, camadas de segurança e testes atualmente implementados no repositório (até o commit `a04501e`).

---

## 1. Stack e Estrutura Geral

- **Framework:** Next.js `15.3.2` (App Router) + React `19.1.0` + TypeScript `5.8.3`
- **Estilização & Ícones:** Tailwind CSS `^4.1.6` + Lucide Icons (`lucide-react`) + CSS Tokens dinâmicos (white-label por loja)
- **Banco, Auth & Storage:** Supabase (`@supabase/ssr`, `@supabase/supabase-js`, PostgreSQL local/cloud com RLS, Triggers e RPCs `SECURITY DEFINER`)
- **Agenda do Painel:** Schedule-X (`@schedule-x/react`, `@schedule-x/calendar`, `temporal-polyfill`) isolado apenas nas rotas `/painel`
- **Mapas & Notificações:** Leaflet (`leaflet`) para mapa da loja + `web-push` (Web Push PWA) + Resend
- **Validação & Segurança:** Zod (`zod`), `server-only`, `node:crypto` (`scryptSync` + `timingSafeEqual`), rate limiting em memória
- **Testes:** Vitest `3.1.3` (`vitest run --no-file-parallelism`) contra Supabase local (`http://127.0.0.1:54321`)

---

## 2. Mapa de Rotas Implementadas (`src/app/`)

### 2.1. Páginas Públicas e do Cliente
| Rota | Arquivo | Função |
| :--- | :--- | :--- |
| `/` | `src/app/page.tsx` | Landing Page SaaS do Zelo (apresentação, benefícios, planos e CTA) |
| `/explorar` | `src/app/explorar/page.tsx` | Vitrine regional com busca, filtro por nicho/cidade, favoritos, "Meus Horários", perfil do cliente e paginação por cursor ("Carregar mais lojas") |
| `/[slug]` | `src/app/[slug]/page.tsx` | Loja pública white-label (serviços, equipe & horários ao vivo, detalhes & mapa Leaflet, drawer de agendamento em 4 passos) |
| `/entrar` | `src/app/entrar/page.tsx` | Login Google OAuth (e suporte a login rápido de desenvolvimento local) |
| `/auth/callback` | `src/app/auth/callback/route.ts` | Callback OAuth SSR com proteção contra Open Redirect |
| `/convite/[token]` | `src/app/convite/[token]/page.tsx` | Tela de aceite de convite único para entrar na equipe de uma loja |
| `/onboarding` | `src/app/onboarding/page.tsx` | Criação de loja em 4 passos (inclui limite de até 3 lojas por conta, mídia/banner, serviços e PIX) |
| `/termos` e `/privacidade` | `src/app/termos/page.tsx`, `src/app/privacidade/page.tsx` | Termos de Uso e Política de Privacidade (LGPD) |

### 2.2. Painel do Lojista e Equipe (`/painel`)
| Rota | Arquivo | Função |
| :--- | :--- | :--- |
| `/painel` | `src/app/painel/page.tsx` | Agenda diária/semanal com Schedule-X, encaixe manual (`cliente_id NULL`), troca rápida entre múltiplas lojas e resumo do dia |
| `/painel/gestao` | `src/app/painel/gestao/page.tsx` | Horários de funcionamento, dias especiais/feriados, cadastro/edição de serviços (com imagem) e gestão de equipe (convite por link único, remoção e saída voluntária) |
| `/painel/personalizar` | `src/app/painel/personalizar/page.tsx` | Customizador white-label com preview ao vivo (temas, Liquid Glass, Material You, Neo-Brutalist, modo escuro, logo/banner, nome da loja e PIX) |
| `/painel/financeiro` | `src/app/painel/financeiro/page.tsx` | Ganhos, repasses/comissões por profissional e histórico financeiro |
| `/painel/assinatura` | `src/app/painel/assinatura/page.tsx` | Plano Trial (14 dias grátis), assinatura Asaas e código de indicação (1 mês grátis) |
| `/painel/configuracoes` | `src/app/painel/configuracoes/page.tsx` | Perfil pessoal, preferências de notificação, chave PIX individual (quando habilitada), nome/pausa da loja, **Senha de Segurança da Conta** e **Zona de Perigo (Apagar Loja)** |

### 2.3. Super Admin e APIs
| Rota | Arquivo | Função |
| :--- | :--- | :--- |
| `/super-admin` | `src/app/super-admin/page.tsx` | Painel administrativo blindado (semáforo de lojas, funil 14 dias, radar de cidades, logs de auditoria) |
| `/super-admin/export` | `src/app/super-admin/export/route.ts` | Exportação `.CSV` auditada com rate limit |
| `/api/vitrine` | `src/app/api/vitrine/route.ts` | Paginação por cursor da vitrine regional (`limit` 1..60, rate limit 60/min por IP) |
| `/api/midia/buscar` | `src/app/api/midia/buscar/route.ts` | Busca de fotos gratuitas (Unsplash, Pixabay e Pexels) autenticada e com rate limit (30/min por usuário) |
| `/api/webhooks/asaas` | `src/app/api/webhooks/asaas/route.ts` | Webhook de pagamentos Asaas com `timingSafeEqual`, idempotência em `webhook_events`, limite de 64 KB e rate limit |
| `/api/dev-login` | `src/app/api/dev-login/route.ts` | Login de desenvolvimento restrito a `NODE_ENV === "development"` + `localhost`/`127.0.0.1` + rate limit |

---

## 3. Banco de Dados e Migrations (`supabase/migrations/`)

1. `20261113000100_init_zelo_core.sql` — Tabelas base (`perfis`, `lojas`, `profissionais`, `servicos`, `agendamentos`, `bloqueios_agenda`), trigger de criação de perfil no Google OAuth (`avatar_customizado`), RLS multi-tenant e trava anti-overbooking `EXCLUDE USING gist`.
2. `20261113000200_etapa2_gestao_seguranca.sql` — Regras de gestão da loja, equipe e proteção de `loja_id`.
3. `20261113000300_booking_rpcs.sql` — RPCs `SECURITY DEFINER` de agendamento público (`criar_agendamento_publico`, `get_horarios_ocupados`, `cancelar_ou_remarcar`).
4. `20261113000400_fix_booking_rpcs_ambiguous.sql` — Correção de ambiguidade de colunas nas RPCs de reserva.
5. `20261113000500_web_push_subscriptions.sql` — Tabela e políticas RLS para inscrições Web Push PWA.
6. `20261113000600_asaas_billing_super_admin.sql` — Assinaturas Asaas, `webhook_events`, códigos de indicação e `super_admin_audit_logs`.
7. `20261113000700_loja_coordenadas_mapa.sql` — Campos `latitude`, `longitude`, `endereco_texto` e `maps_url` na loja.
8. `20261113000800_profissionais_meta_semanal.sql` — Meta semanal de atendimentos por profissional.
9. `20261114000100_lojas_cep.sql` — Campo `cep` nas lojas.
10. `20261114000200_servicos_imagem.sql` — `imagem_url` e `exibir_imagem` nos serviços.
11. `20261114000300_loja_personalizacao_avancada.sql` — Campos visuais avançados (`estilo_card`, `estilo_barra`, etc.).
12. `20261114000400_loja_modo_escuro.sql` — Suporte a `modo_escuro` por loja/estilo.
13. `20261114000500_pix_por_profissional.sql` — `lojas.pix_modo` (`loja` vs `profissional`) e `profissionais.chave_pix`.
14. `20261114000600_convites_equipe_seguro.sql` — Tabela `convites_equipe` (token com hash SHA-256) e RPCs `aceitar_convite_equipe` e `sair_da_equipe`.
15. `20261114000700_fix_convites_equipe_pausada.sql` — Ajuste na validação de convite para lojas/perfis ativos.
16. `20261114000800_senha_seguranca_e_excluir_loja.sql` — `perfis.seguranca_pin_hash`, `REVOKE SELECT ON public.perfis FROM anon` e RPC `excluir_loja_segura(p_loja_id)`.

---

## 4. Principais Fluxos e Regras Implementadas

- **Multi-loja no mesmo login:** Usuários podem criar até **3 lojas** por conta no `/onboarding` e alternar entre elas pelo seletor no topo do `/painel` (persistido via cookie `zelo_loja_id`).
- **Convite de Equipe por Link Único:** O dono gera um link em `/painel/gestao` (armazenado como hash SHA-256 em `convites_equipe`). Ao abrir `/convite/[token]`, o profissional logado visualiza a loja e aceita usando os dados do próprio perfil; o profissional também pode sair voluntariamente ou ser removido pelo dono.
- **PIX Transparente (Pagamento na Loja):** Explicação clara de que o PIX exibido facilita apenas o pagamento/sinal direto na loja sem intermediação; o dono escolhe se usa apenas o PIX da loja ou se cada barbeiro cadastra sua própria chave PIX.
- **Temas White-Label & Mídia:** Suporte a temas (incluindo *Liquid Glass* Apple HIG, *Material You*, *Neo-Brutalist* e modo escuro), compressão WebP no navegador e buscador integrado de fotos livres (Unsplash, Pixabay e Pexels).
- **Agendamento Blindado:** Cálculo de vagas livres conforme horário de funcionamento, duração do serviço e bloqueios existentes; rodapé com blur no drawer e exibição completa de data/horário em "Meus Horários".

---

## 5. Segurança Implementada

- **Sessão & Cookies SSR:** Autenticação gerenciada por `@supabase/ssr` via cookies HTTP; Server Components e Server Actions validam `supabase.auth.getUser()` no servidor.
- **Isolamento Multi-Tenant (RLS):** Todas as tabelas de domínio filtram por `loja_id` e `owner_id`/`user_id`. A tabela `agendamentos` não permite `SELECT`/`UPDATE` público direto (acesso via RPCs `SECURITY DEFINER`).
- **Anti-Overbooking:** Constraint `EXCLUDE USING gist` impede dois agendamentos simultâneos para o mesmo profissional (erro `23P01` testado sob concorrência).
- **Exclusão Segura de Loja:** Exige criação prévia de Senha de Segurança (`scryptSync` + salt 16 bytes + `timingSafeEqual`), confirmação exata do `slug` da loja e validação de `owner_id` dentro da RPC `excluir_loja_segura`.
- **Rate Limiting & Hardening:** Implementado em `src/lib/security/rate-limit.ts` nas rotas `/api/vitrine`, `/api/midia/buscar`, `/api/webhooks/asaas` (com trava de 64 KB), `/api/dev-login` (restrito a `localhost` + `development`), `/super-admin/export` e nas Server Actions críticas de convite, PIN e exclusão.
- **Anti-Bot (Cloudflare Turnstile):** `src/lib/security/turnstile.ts` e `src/components/ui/turnstile-widget.tsx` integrados ao agendamento público (`criarAgendamentoAction` + `ReservaDrawer`).
- **Instalação PWA Inteligente:** `src/components/pwa-install-banner.tsx` com popup nativo (`beforeinstallprompt`) no Android e guia visual passo a passo no iPhone (`public/ios-install-1.png` e `public/ios-install-2.png`).

---

## 6. Testes Automatizados (`tests/`)

Para rodar as suítes locais:

```bash
npx tsc --noEmit
npm test          # 8 arquivos Vitest (32 testes)
npm run test:e2e  # Playwright E2E (10 testes: 360px mobile e 1440px desktop)
```

Arquivos de teste existentes:
- `tests/etapa1-rls.test.ts` — Isolamento RLS entre lojas e perfis
- `tests/etapa2-painel.test.ts` — Permissões do painel, serviços e equipe
- `tests/etapa3-4-booking.test.ts` — RPCs de reserva, disponibilidade e concorrência GiST (`23P01`)
- `tests/etapa5-agenda.test.ts` — Encaixe manual (`cliente_id NULL`), isolamento de barbeiro e Web Push RLS
- `tests/etapa6-asaas-superadmin.test.ts` — Webhook Asaas e guard do Super Admin
- `tests/convites-equipe-seguranca.test.ts` — Convites por link único, saída voluntária e blindagem
- `tests/seguranca-exclusao-paginacao.test.ts` — Hash `scrypt`, rate limit, cursor da vitrine e RPC `excluir_loja_segura`
- `tests/security-attacks.test.ts` — Testes defensivos contra acesso anônimo, webhook sem token e Open Redirect
- `tests/e2e/zelo-fluxos.spec.ts` — Playwright E2E (`360px` e `1440px`: Landing, `/explorar`, `/[slug]`, rotas legais e bloqueio de `/painel` e `/super-admin`) — **10/10 aprovados**
- `tests/k6-carga.js` — Teste de carga Grafana k6 até 1.000 VUs (**37.682 reqs**, `0.00%` falhas, `p(95) = 430.93ms`)
