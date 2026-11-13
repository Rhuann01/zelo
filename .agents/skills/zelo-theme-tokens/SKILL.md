---
name: zelo-theme-tokens
description: Motor de temas white-label do Zelo (CSS Tokens dinâmicos para /nome-da-loja e customizador do lojista).
---

# Motor de Temas White-Label — Zelo

Esta skill é **exclusiva do projeto Zelo**. Define a arquitetura oficial de personalização das lojas sem duplicar componentes ou JSX: **1 único layout base** controlado inteiramente por **CSS Custom Properties**.

> **Regra de Performance (CONTEXTO.md):** Diferente da Landing Page (que usa GSAP), a tela pública da loja (`/nome-da-loja`) deve usar **apenas CSS Transitions leves** para carregar instantaneamente no 4G.

---

## 1. Estrutura Base (Regra de Especificidade CSS!)

**IMPORTANTE:** Aplique os tokens base em uma **classe** (`.store-view-base`), **nunca** por `#id`, para que classes de tema como `.theme-brutal` consigam sobrescrever `--store-border-w` e `--store-shadow` sem perder para especificidade de ID:

```css
.store-view-base {
  --store-accent: #F59E0B;
  --store-accent-ink: #111111;
  --store-radius: 12px;
  --store-border-w: 1px;
  --store-shadow: none;
  --store-card-shadow: none;
  transition: background-color 0.3s ease, color 0.3s ease;
}
```

---

## 2. Os 4 Temas Oficiais do Zelo

| Chave | Nome | Nicho Principal | Fundo | Superfície | Borda | Texto | Muted | Acento Default (Ink) | Extras |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `theme-urban` | **Urban Noir** | Barbearias | `#0F0F12` | `#18181D` | `#2C2C35` | `#F4F4F5` | `#A1A1AA` | `#F59E0B` (`#111111`) | `border-w: 1px`, sem sombra |
| `theme-glam` | **Clean Glam** | Manicures / Estética | `#FDF8F6` | `#FFFFFF` | `#EFE0DA` | `#2A1D1D` | `#7C6565` | `#BE185D` (`#FFFFFF`) | `border-w: 1px`, visual suave |
| `theme-brutal` | **Neo-Brutalist Pop** | Estúdios Jovens | `#FFFDF4` | `#FFFFFF` | `#000000` | `#000000` | `#27272A` | `#A3E635` (`#111111`) | `border-w: 2px`, `--store-shadow: 3px 3px 0px #000000`, `--store-card-shadow: 4px 4px 0px #000000` |
| `theme-slate` | **Minimalist Slate** | Neutro / Clínicas | `#FFFFFF` | `#F8FAFC` | `#CBD5E1` | `#0F172A` | `#64748B` | `#2563EB` (`#FFFFFF`) | `border-w: 1px`, limpo |

### Comportamento Tátil Exclusivo do `theme-brutal`
```css
.theme-brutal .t-accent-bg:hover,
.theme-brutal .t-slot:hover {
  transform: translate(-1px, -1px);
}
.theme-brutal .t-accent-bg:active,
.theme-brutal .t-slot:active {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0px #000000;
}
.theme-brutal .t-slot.active {
  border-color: #000000;
  box-shadow: 3px 3px 0px #000000;
}
.theme-brutal .t-tab-active {
  color: #000000;
  border-bottom: 3px solid #000000;
  font-weight: 800;
}
```

---

## 3. Tokens Derivados (Customização Livre pelo Lojista)

O lojista escolhe no banco/painel:
1. `tema`: `'urban' | 'glam' | 'brutal' | 'slate'`
2. `cor_primaria` (`--store-accent`) + `cor_texto_acento` (`--store-accent-ink`, calculado para contraste AA: `#111111` em cores claras como `#F59E0B`/`#A3E635` e `#FFFFFF` em cores escuras como `#10B981`/`#BE185D`/`#2563EB`).
3. `raio_borda` (`--store-radius`, intervalo `2px` a `24px`, padrão `12px`).

### Mapeamento Proporcional de Raios
- **Containers principais (`.t-surface`):** `border-radius: var(--store-radius);`
- **Cards internos de serviço (`.t-inner-card`):** `border-radius: calc(var(--store-radius) * 0.85);`
- **Botões CTA / Avatar (`.t-accent-bg`):** `border-radius: calc(var(--store-radius) * 0.78);`
- **Slots de horário / Profissionais (`.t-slot`):** `border-radius: calc(var(--store-radius) * 0.7);`

---

## 4. Diretrizes Mobile & UI da Tela da Loja

- **Zero Emojis (100% Lucide Icons):** Em toda a UI real do Zelo (client, painel e admin), use exclusivamente ícones vetoriais `lucide-react` — nunca emojis nativos.
- **Sem Excesso de Bordas:** Evite colocar borda em todo card e subcard por padrão. Use contraste sutil de superfície (`--store-surface`) + espaçamento limpo, deixando `--store-border-w: 2px` / contornos fortes apenas onde o tema pedir (ex.: `theme-brutal`) e em controles interativos.
- Abas (`Serviços`, `Equipe & Horários`, `Detalhes & Mapa`, `Meus Horários`) devem usar rolagem horizontal suave (`overflow-x-auto no-scrollbar whitespace-nowrap`) com `shrink-0`, nunca quebrando texto ou cortando palavras em telas de `360px`.
- Sempre manter contraste explícito para estados selecionados (`.t-slot.active` usa `--store-accent` com `--store-accent-ink`).
