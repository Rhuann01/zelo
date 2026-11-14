-- Adiciona opção de Modo Escuro por loja (aplicável a temas compatíveis; ignorado para Clean Glam e Urban Noir)
ALTER TABLE public.lojas
  ADD COLUMN IF NOT EXISTS modo_escuro BOOLEAN NOT NULL DEFAULT FALSE;
