# 💈 Micro SaaS de Barbearias & Manicures — Planejamento Executivo

> **Status:** Em planejamento  
> **Objetivo:** Criar um Micro SaaS com custo inicial R$ 0,00 para gerar renda recorrente com barbearias e manicures locais.

---

## 🎯 1. A Proposta de Valor (O "Anti-Booksy")

O Booksy e o AppBarber cobram caro (~R$ 100/mês) e forçam o cliente a baixar um aplicativo de 50MB no celular onde os concorrentes aparecem do lado.

### Nosso Modelo Híbrido:
1. **Link Direto Exclusivo (`app.com/nome-da-loja`):**
   * Usado na **Bio do Instagram** e no **WhatsApp**.
   * 100% focado no lojista: zero concorrentes, sem distrações.
   * Abre no navegador do celular em **menos de 1 segundo**, sem precisar baixar nada na Play Store/App Store.
2. **Vitrine Regional de Descoberta (Página Inicial `app.com`):**
   * Para quem pesquisa no Google: *"Barbearias e manicures perto de mim"*.
   * Funciona como um guia local que atrai novos clientes para os lojistas cadastrados.

---

## 🎨 2. Estilos Visuais Personalizáveis (Temas do Lojista)

Ao criar a loja, o dono escolhe a identidade visual com 1 clique:

* 💈 **Urban Noir (Barbearias Masculinas):** Dark mode, preto fosco, cinza grafite e detalhes em dourado/âmbar. Tipografia forte e sensação premium.
* 💅 **Clean Glam (Manicures / Esmalterias):** Tons de nude, off-white, rosé suave e toques champagne. Tipografia fina e visual arejado.
* ⚡ **Neo-Brutalist Pop (Jovem / Tatuagem / Cortes Criativos):** Bordas pretas sólidas, sombras duras, cores vivas e botões táteis chamativos.
* 🪨 **Minimalist Slate (Curinga Neutro):** Tons neutros de cinza estilo Apple/Notion. Elegante e profissional.

---

## 💰 3. Modelo de Negócio & Precificação

| Plano | Preço Sugerido | Público-Alvo | Comparativo com Booksy |
| :--- | :--- | :--- | :--- |
| **Degustação** | **Grátis (14 dias)** | Sem cartão para quebrar a desconfiança inicial | Booksy só dá 7 dias |
| **Plano Solo** | **R$ 29,90 a R$ 34,90 / mês** | Barbeiro ou manicure autônoma (1 profissional) | Booksy cobra R$ 99,99 |
| **Plano Estúdio** | **R$ 69,90 / mês** | Salão com equipe (até 5 profissionais) | Booksy passa de R$ 180 |

> **Meta Rápida para Caixa:**  
> Com apenas **10 clientes locais** pagando R$ 34,90 = **R$ 349,00/mês recorrente** no seu bolso, sem nenhum custo fixo de servidor.

---

## 📱 4. Escopo do MVP (O que lançar no Dia 1)

Para você conseguir vender para os comércios do seu bairro, o sistema só precisa de 3 partes:

### A. Página Pública do Cliente (Mobile First / PWA)
1. **Cabeçalho:** Foto/Logo da barbearia, endereço e botão do WhatsApp.
2. **Seleção de Serviços:** Lista com foto, nome, tempo de duração e preço (R$).
3. **Seleção de Profissional:** (Se tiver mais de um atendente).
4. **Calendário Horizontal:** Escolha do dia e horários livres calculados automaticamente.
5. **Confirmação:** Digita apenas **Nome + WhatsApp**.

### B. Painel do Dono do Negócio (Admin)
* **Agenda do Dia:** Visão rápida de quem vem e que horas.
* **Bloqueio Rápido:** Botão para travar um horário na hora caso apareça alguém da rua ou ele precise sair.
* **Gestão de Serviços:** Cadastrar serviços, preços e tempo em minutos.
* **Horários de Trabalho:** Configurar dias de folga e horário de almoço.

### C. Redução de "Furos" (O que faz o dono te pagar)
* **Confirmação em 1 Clique:** Botão que abre o WhatsApp com a mensagem pronta de confirmação já preenchida.
* **Opção de Sinal via PIX:** O lojista pode colocar a chave PIX dele para exigir R$ 10 de sinal antes de confirmar o horário de quem costuma faltar.

---

## ☁️ 5. Arquitetura Técnica Custo R$ 0,00

* **Frontend & API:** Next.js (ou React com Vite) hospedado na **Vercel** ou **Cloudflare Pages** (*100% grátis*).
* **Banco de Dados & Autenticação:** **Supabase** (PostgreSQL gratuito com até 500 MB e Auth embutido).
* **Multi-tenant Seguro:** Todas as lojas ficam no mesmo banco, separadas pela coluna `loja_id` com Row-Level Security (RLS).
* **Custo inicial:** **R$ 0,00**. Só vira despesa quando você tiver dezenas de lojas pagando.

---

## 🤝 6. Estratégia de Migração & Primeiras Vendas

1. **Presets Prontos:** Ao cadastrar uma manicure, o app já vem com *"Esmaltação em gel, Cuticulagem, Banho de gel"* pré-configurados.
2. **Importação Rápida:** Importador de lista de clientes via CSV/Excel.
3. **Seu Argumento de Venda Presencial:**
   > *"Oi, reparei que você gasta um tempão respondendo se tem horário livre no WhatsApp. Montei um link pro seu Instagram onde seu cliente marca em 30 segundos e não fura mais. Me manda sua tabela de preços no WhatsApp que eu deixo pronto pra você testar 14 dias de graça agora."*
