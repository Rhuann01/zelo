-- Adiciona imagem opcional e toggle de exibição por serviço
ALTER TABLE public.servicos
  ADD COLUMN IF NOT EXISTS imagem_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS exibir_imagem boolean NOT NULL DEFAULT false;
