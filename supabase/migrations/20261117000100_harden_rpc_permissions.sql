-- ============================================================================
-- Hardening de permissões EXECUTE em funções SECURITY DEFINER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.aplicar_indicacao_loja(
  p_nova_loja_id UUID,
  p_codigo_indicacao TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_role TEXT := COALESCE(auth.role(), '');
  v_indicadora_id UUID;
BEGIN
  IF p_codigo_indicacao IS NULL OR length(trim(p_codigo_indicacao)) < 4 THEN
    RETURN false;
  END IF;

  IF v_role <> 'service_role' THEN
    IF v_uid IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.lojas WHERE id = p_nova_loja_id AND owner_id = v_uid
    ) THEN
      RAISE EXCEPTION 'Acesso negado para aplicar indicação nesta loja' USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT id INTO v_indicadora_id
  FROM public.lojas
  WHERE lower(codigo_indicacao) = lower(trim(p_codigo_indicacao))
    AND id <> p_nova_loja_id
  LIMIT 1;

  IF v_indicadora_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.lojas
  SET indicado_por_loja_id = v_indicadora_id
  WHERE id = p_nova_loja_id
    AND indicado_por_loja_id IS NULL;

  RETURN FOUND;
END;
$$;

-- 1. Funções exclusivas de service_role / triggers internos
REVOKE ALL ON FUNCTION public.conceder_bonus_indicacao(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.conceder_bonus_indicacao(UUID) TO service_role;

REVOKE ALL ON FUNCTION public.incrementar_dispositivo_acesso(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.incrementar_dispositivo_acesso(TEXT, TEXT, TEXT, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.handle_auth_user_sync() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_profissional_auto_link() FROM PUBLIC, anon, authenticated;

-- 2. RPCs que exigem usuário autenticado (bloqueadas para anon)
REVOKE ALL ON FUNCTION public.aplicar_indicacao_loja(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aplicar_indicacao_loja(UUID, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.criar_agendamento_online(UUID, UUID, UUID[], TIMESTAMPTZ, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.criar_agendamento_online(UUID, UUID, UUID[], TIMESTAMPTZ, TEXT, TEXT, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.cancelar_ou_remarcar(UUID, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancelar_ou_remarcar(UUID, TEXT, TIMESTAMPTZ) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.atualizar_meta_semanal(UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.atualizar_meta_semanal(UUID, INTEGER) TO authenticated, service_role;
