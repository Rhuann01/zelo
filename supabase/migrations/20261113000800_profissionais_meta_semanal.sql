-- Meta pessoal semanal configurável por profissional (padrão R$ 1.500,00 = 150000 centavos)
ALTER TABLE public.profissionais
  ADD COLUMN IF NOT EXISTS meta_semanal_centavos INTEGER NOT NULL DEFAULT 150000
  CHECK (meta_semanal_centavos >= 0 AND meta_semanal_centavos <= 100000000);

-- RPC segura para o próprio profissional (ou dono) atualizar apenas sua meta semanal
CREATE OR REPLACE FUNCTION public.atualizar_meta_semanal(
  p_loja_id UUID,
  p_meta_centavos INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_updated_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária.';
  END IF;

  IF p_meta_centavos IS NULL OR p_meta_centavos < 0 OR p_meta_centavos > 100000000 THEN
    RAISE EXCEPTION 'Meta semanal inválida.';
  END IF;

  UPDATE public.profissionais
  SET meta_semanal_centavos = p_meta_centavos
  WHERE loja_id = p_loja_id
    AND user_id = v_uid
    AND ativo = true
  RETURNING id INTO v_updated_id;

  IF v_updated_id IS NULL THEN
    RAISE EXCEPTION 'Profissional não encontrado nesta loja.';
  END IF;

  RETURN p_meta_centavos;
END;
$$;

REVOKE ALL ON FUNCTION public.atualizar_meta_semanal(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.atualizar_meta_semanal(UUID, INTEGER) TO authenticated;
