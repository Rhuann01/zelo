-- Adiciona descrição pública e links sociais configuráveis pelo dono na vitrine da loja
ALTER TABLE public.lojas
  ADD COLUMN IF NOT EXISTS descricao_publica TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS links_publicos JSONB NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'lojas_descricao_publica_len_chk'
  ) THEN
    ALTER TABLE public.lojas
      ADD CONSTRAINT lojas_descricao_publica_len_chk
      CHECK (char_length(descricao_publica) <= 450);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'lojas_links_publicos_arr_chk'
  ) THEN
    ALTER TABLE public.lojas
      ADD CONSTRAINT lojas_links_publicos_arr_chk
      CHECK (jsonb_typeof(links_publicos) = 'array');
  END IF;
END $$;
