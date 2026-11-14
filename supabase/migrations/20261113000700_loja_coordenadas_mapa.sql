-- Adiciona coordenadas geográficas opcionais na loja para exibição e abertura de mapa real
ALTER TABLE public.lojas
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
