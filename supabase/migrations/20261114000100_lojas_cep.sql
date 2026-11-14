-- Adiciona coluna cep na tabela lojas para preservar o CEP informado no Onboarding e em Personalizar Loja
ALTER TABLE public.lojas
  ADD COLUMN IF NOT EXISTS cep text NOT NULL DEFAULT '';
