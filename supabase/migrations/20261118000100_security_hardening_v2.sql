-- ============================================================================
-- Hardening v2: Proteção de Colunas Sensíveis, Triggers de Faturamento/Cotas
-- e Blindagem de Senha de Segurança / Exclusão de Loja
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

  PERFORM set_config('app.internal_rpc', 'true', true);

  UPDATE public.lojas
  SET indicado_por_loja_id = v_indicadora_id
  WHERE id = p_nova_loja_id
    AND indicado_por_loja_id IS NULL;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.aplicar_indicacao_loja(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aplicar_indicacao_loja(UUID, TEXT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.conceder_bonus_indicacao(
  p_loja_indicada_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_indicadora_id UUID;
BEGIN
  PERFORM set_config('app.internal_rpc', 'true', true);

  UPDATE public.lojas
  SET bonus_indicacao_pago = true
  WHERE id = p_loja_indicada_id
    AND indicado_por_loja_id IS NOT NULL
    AND bonus_indicacao_pago = false
  RETURNING indicado_por_loja_id INTO v_indicadora_id;

  IF v_indicadora_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.lojas
  SET trial_ate = GREATEST(COALESCE(trial_ate, now()), now()) + interval '30 days'
  WHERE id = v_indicadora_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.conceder_bonus_indicacao(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.conceder_bonus_indicacao(UUID) TO service_role;

REVOKE ALL ON FUNCTION public.excluir_loja_segura(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.excluir_loja_segura(UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.protect_lojas_billing_and_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT := COALESCE(auth.role(), '');
  v_is_privileged BOOLEAN;
  v_count INTEGER;
BEGIN
  v_is_privileged :=
    (v_role = 'service_role')
    OR (current_setting('app.internal_rpc', true) = 'true')
    OR (auth.uid() IS NULL AND v_role NOT IN ('anon', 'authenticated'));

  IF NOT v_is_privileged THEN
    IF TG_OP = 'INSERT' THEN
      SELECT count(*)::INTEGER INTO v_count
      FROM public.lojas
      WHERE owner_id = NEW.owner_id;

      IF v_count >= 3 THEN
        RAISE EXCEPTION 'Limite máximo de 3 lojas por conta atingido.'
          USING ERRCODE = '42501';
      END IF;

      NEW.plano := 'trial';
      NEW.assinatura_status := 'trial';
      NEW.trial_ate := now() + interval '14 days';
      NEW.is_cortesia := false;
      NEW.bonus_indicacao_pago := false;
      NEW.indicado_por_loja_id := NULL;
      NEW.asaas_customer_id := NULL;
      NEW.asaas_subscription_id := NULL;
      NEW.assinatura_atualizada_em := NULL;
      NEW.taxa_asaas_centavos := 199;
      NEW.notificado_trial_3d := false;
      NEW.notificado_trial_1d := false;
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.owner_id IS DISTINCT FROM OLD.owner_id
        OR NEW.plano IS DISTINCT FROM OLD.plano
        OR NEW.assinatura_status IS DISTINCT FROM OLD.assinatura_status
        OR NEW.trial_ate IS DISTINCT FROM OLD.trial_ate
        OR NEW.is_cortesia IS DISTINCT FROM OLD.is_cortesia
        OR NEW.bonus_indicacao_pago IS DISTINCT FROM OLD.bonus_indicacao_pago
        OR NEW.indicado_por_loja_id IS DISTINCT FROM OLD.indicado_por_loja_id
        OR NEW.codigo_indicacao IS DISTINCT FROM OLD.codigo_indicacao
        OR NEW.taxa_asaas_centavos IS DISTINCT FROM OLD.taxa_asaas_centavos
        OR NEW.asaas_customer_id IS DISTINCT FROM OLD.asaas_customer_id
        OR NEW.asaas_subscription_id IS DISTINCT FROM OLD.asaas_subscription_id
        OR NEW.assinatura_atualizada_em IS DISTINCT FROM OLD.assinatura_atualizada_em
        OR NEW.notificado_trial_3d IS DISTINCT FROM OLD.notificado_trial_3d
        OR NEW.notificado_trial_1d IS DISTINCT FROM OLD.notificado_trial_1d
      THEN
        RAISE EXCEPTION 'Alteração direta de campos de assinatura ou sistema não permitida.'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_lojas_billing_and_limits() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE TRIGGER trg_protect_lojas_billing_and_limits
  BEFORE INSERT OR UPDATE ON public.lojas
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_lojas_billing_and_limits();

CREATE OR REPLACE FUNCTION public.enforce_profissionais_plan_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plano TEXT;
  v_limite INTEGER;
  v_ativos INTEGER;
BEGIN
  IF NEW.ativo = true AND (TG_OP = 'INSERT' OR OLD.ativo = false) THEN
    SELECT plano INTO v_plano
    FROM public.lojas
    WHERE id = NEW.loja_id;

    v_limite := CASE WHEN v_plano = 'solo' THEN 1 ELSE 5 END;

    SELECT count(*)::INTEGER INTO v_ativos
    FROM public.profissionais
    WHERE loja_id = NEW.loja_id
      AND ativo = true
      AND id IS DISTINCT FROM NEW.id;

    IF v_ativos >= v_limite THEN
      RAISE EXCEPTION 'Limite de profissionais ativos do plano atual atingido.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_profissionais_plan_limit() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE TRIGGER trg_enforce_profissionais_plan_limit
  BEFORE INSERT OR UPDATE OF ativo ON public.profissionais
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profissionais_plan_limit();

REVOKE ALL ON TABLE public.perfis FROM anon, authenticated;

GRANT SELECT (
  id, nome, email, whatsapp, avatar_url, avatar_customizado,
  notificacoes_push, notificacoes_email, notificacoes_novo_agendamento,
  termos_aceitos_em, created_at, updated_at
) ON public.perfis TO authenticated;

GRANT UPDATE (
  nome, whatsapp, avatar_url, avatar_customizado,
  notificacoes_push, notificacoes_email, notificacoes_novo_agendamento,
  termos_aceitos_em, updated_at
) ON public.perfis TO authenticated;

REVOKE ALL ON TABLE public.lojas FROM anon, authenticated;

GRANT SELECT (
  id, slug, nome, nicho, cidade, bairro, endereco_texto, maps_url,
  latitude, longitude, whatsapp_loja, sinal_centavos, tema, cor_primaria,
  raio_borda_px, estilo_card, estilo_barra, modo_escuro, logo_url, capa_url,
  horarios_loja, pausada, descricao_publica, links_publicos,
  antecedencia_cancel_min, created_at, updated_at
) ON public.lojas TO anon;

GRANT INSERT ON public.lojas TO authenticated;

GRANT SELECT (
  id, owner_id, slug, nome, nicho, cidade, bairro, endereco_texto, cep,
  maps_url, latitude, longitude, whatsapp_loja, sinal_centavos, tema,
  cor_primaria, raio_borda_px, estilo_card, estilo_barra, modo_escuro,
  logo_url, capa_url, horarios_loja, pausada, descricao_publica,
  links_publicos, antecedencia_cancel_min, termos_aceitos_em,
  created_at, updated_at
) ON public.lojas TO authenticated;

GRANT UPDATE (
  slug, nome, nicho, cidade, bairro, endereco_texto, cep, maps_url,
  latitude, longitude, whatsapp_loja, chave_pix, pix_modo, sinal_centavos,
  tema, cor_primaria, raio_borda_px, estilo_card, estilo_barra,
  modo_escuro, logo_url, capa_url, horarios_loja, antecedencia_cancel_min,
  pausada, descricao_publica, links_publicos, termos_aceitos_em, updated_at
) ON public.lojas TO authenticated;

REVOKE SELECT ON public.profissionais FROM authenticated;

GRANT SELECT (
  id, loja_id, user_id, nome, cargo, eh_dono, ativo, avatar_url,
  horarios_trabalho, created_at, updated_at
) ON public.profissionais TO authenticated;
