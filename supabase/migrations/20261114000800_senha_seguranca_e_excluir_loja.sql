-- Zelo: Senha de Segurança do Dono & Exclusão Segura de Loja

ALTER TABLE public.perfis
  ADD COLUMN IF NOT EXISTS seguranca_pin_hash TEXT;

-- Garante que anon nunca leia seguranca_pin_hash
REVOKE SELECT ON public.perfis FROM anon;

CREATE OR REPLACE FUNCTION public.excluir_loja_segura(p_loja_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := (SELECT auth.uid());
  v_loja RECORD;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sessão expirada. Faça login novamente.'
      USING ERRCODE = '42501';
  END IF;

  SELECT id, owner_id, slug, nome
  INTO v_loja
  FROM public.lojas
  WHERE id = p_loja_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Loja não encontrada.';
  END IF;

  IF v_loja.owner_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Apenas o proprietário pode apagar esta loja.'
      USING ERRCODE = '42501';
  END IF;

  -- Remove dependências em ordem segura (agendamentos têm ON DELETE RESTRICT em profissionais)
  DELETE FROM public.agendamentos
  WHERE loja_id = p_loja_id;

  DELETE FROM public.bloqueios_agenda
  WHERE loja_id = p_loja_id;

  DELETE FROM public.convites_equipe
  WHERE loja_id = p_loja_id;

  DELETE FROM public.servicos
  WHERE loja_id = p_loja_id;

  DELETE FROM public.profissionais
  WHERE loja_id = p_loja_id;

  DELETE FROM public.lojas
  WHERE id = p_loja_id;

  RETURN jsonb_build_object(
    'deleted', true,
    'slug', v_loja.slug,
    'nome', v_loja.nome
  );
END;
$$;

REVOKE ALL ON FUNCTION public.excluir_loja_segura(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.excluir_loja_segura(UUID) TO authenticated;
