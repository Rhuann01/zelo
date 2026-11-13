-- Zelo MVP — Etapa 2: Restrição de colunas públicas em profissionais e RPC de Desligamento Seguro

-- 1. Impede que anônimos leiam email_convite, user_id ou comissao_percentual via PostgREST
REVOKE SELECT ON public.profissionais FROM anon;
GRANT SELECT (id, loja_id, nome, cargo, eh_dono, ativo, avatar_url)
  ON public.profissionais TO anon;

-- 2. RPC de Desligamento Seguro de Profissional (Etapa 2 + Teste de Estresse QA)
-- Move user_id -> ex_user_id_historico, revoga acesso imediato (ativo = false, user_id = NULL)
-- e transfere ou cancela agendamentos futuros na mesma transação.
CREATE OR REPLACE FUNCTION public.desligar_profissional(
  p_profissional_id UUID,
  p_transferir_para_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prof RECORD;
  v_afetados INTEGER := 0;
  v_destino_valido BOOLEAN := false;
BEGIN
  SELECT p.id, p.loja_id, p.user_id, p.eh_dono, l.owner_id
  INTO v_prof
  FROM public.profissionais p
  JOIN public.lojas l ON l.id = p.loja_id
  WHERE p.id = p_profissional_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profissional não encontrado.';
  END IF;

  IF (SELECT auth.uid()) IS NULL OR v_prof.owner_id IS DISTINCT FROM (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Apenas o proprietário da loja pode desligar membros da equipe.'
      USING ERRCODE = '42501';
  END IF;

  IF v_prof.eh_dono THEN
    RAISE EXCEPTION 'O proprietário não pode ser desligado por esta ação; use a chave Também atendo clientes.';
  END IF;

  IF p_transferir_para_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.profissionais
      WHERE id = p_transferir_para_id
        AND loja_id = v_prof.loja_id
        AND id <> p_profissional_id
        AND ativo = true
    ) INTO v_destino_valido;

    IF NOT v_destino_valido THEN
      RAISE EXCEPTION 'Profissional de destino inválido ou inativo nesta loja.';
    END IF;

    UPDATE public.agendamentos
    SET profissional_id = p_transferir_para_id,
        updated_at = now()
    WHERE profissional_id = p_profissional_id
      AND inicio > now()
      AND status IN ('pendente', 'confirmado');

    GET DIAGNOSTICS v_afetados = ROW_COUNT;
  ELSE
    UPDATE public.agendamentos
    SET status = 'cancelado',
        observacoes = trim(coalesce(observacoes, '') || ' [Cancelado por desligamento do profissional]'),
        updated_at = now()
    WHERE profissional_id = p_profissional_id
      AND inicio > now()
      AND status IN ('pendente', 'confirmado');

    GET DIAGNOSTICS v_afetados = ROW_COUNT;
  END IF;

  UPDATE public.profissionais
  SET ex_user_id_historico = COALESCE(user_id, ex_user_id_historico),
      user_id = NULL,
      email_convite = NULL,
      ativo = false,
      updated_at = now()
  WHERE id = p_profissional_id;

  RETURN jsonb_build_object(
    'desligado', true,
    'agendamentos_afetados', v_afetados,
    'transferido', v_destino_valido
  );
END;
$$;

REVOKE ALL ON FUNCTION public.desligar_profissional(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.desligar_profissional(UUID, UUID) TO authenticated;
