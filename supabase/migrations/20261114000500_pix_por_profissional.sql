-- Permite ao proprietário escolher entre PIX único da loja ou PIX próprio por profissional
ALTER TABLE public.lojas
  ADD COLUMN IF NOT EXISTS pix_modo TEXT NOT NULL DEFAULT 'loja'
  CHECK (pix_modo IN ('loja', 'profissional'));

ALTER TABLE public.profissionais
  ADD COLUMN IF NOT EXISTS chave_pix TEXT DEFAULT NULL;
