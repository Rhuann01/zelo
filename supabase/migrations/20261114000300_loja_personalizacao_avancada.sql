-- Expande temas white-label (Liquid Glass e Material Design 3) e adiciona
-- liberdade de layout da loja pública (estilo_card e estilo_barra).

DO $$
DECLARE
  v_conname text;
BEGIN
  SELECT c.conname INTO v_conname
  FROM pg_constraint c
  WHERE c.conrelid = 'public.lojas'::regclass
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) LIKE '%tema%'
  LIMIT 1;

  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.lojas DROP CONSTRAINT %I', v_conname);
  END IF;
END $$;

ALTER TABLE public.lojas
  ADD CONSTRAINT lojas_tema_check
  CHECK (tema IN ('urban', 'glam', 'brutal', 'slate', 'liquid_glass', 'material_you'));

ALTER TABLE public.lojas
  ADD COLUMN IF NOT EXISTS estilo_card TEXT NOT NULL DEFAULT 'preenchido'
    CHECK (estilo_card IN ('preenchido', 'vidro_borrado')),
  ADD COLUMN IF NOT EXISTS estilo_barra TEXT NOT NULL DEFAULT 'abas'
    CHECK (estilo_barra IN ('abas', 'dock_flutuante'));
