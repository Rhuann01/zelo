-- ============================================================================
-- Etapa 6: Assinatura Asaas, Programa de Indicação & Auditoria Super Admin
-- ============================================================================

ALTER TABLE public.lojas
  ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS asaas_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS assinatura_atualizada_em TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_lojas_asaas_subscription
  ON public.lojas (asaas_subscription_id)
  WHERE asaas_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lojas_asaas_customer
  ON public.lojas (asaas_customer_id)
  WHERE asaas_customer_id IS NOT NULL;

-- Tabela de auditoria das ações do fundador no /super-admin
CREATE TABLE IF NOT EXISTS public.super_admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_uid UUID NOT NULL,
  acao TEXT NOT NULL,
  alvo_loja_id UUID REFERENCES public.lojas(id) ON DELETE SET NULL,
  detalhes JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_super_admin_audit_created
  ON public.super_admin_audit_logs (created_at DESC);

ALTER TABLE public.super_admin_audit_logs ENABLE ROW LEVEL SECURITY;
-- Sem políticas públicas: acessível estritamente via service_role

-- RPC para vincular código de indicação a uma nova loja (sem auto-indicação)
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
  v_indicadora_id UUID;
BEGIN
  IF p_codigo_indicacao IS NULL OR length(trim(p_codigo_indicacao)) < 4 THEN
    RETURN false;
  END IF;

  IF v_uid IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.lojas WHERE id = p_nova_loja_id AND owner_id = v_uid
  ) THEN
    RAISE EXCEPTION 'Acesso negado para aplicar indicação nesta loja';
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

REVOKE ALL ON FUNCTION public.aplicar_indicacao_loja(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aplicar_indicacao_loja(UUID, TEXT) TO authenticated, service_role;

-- RPC idempotente chamada no 1º pagamento confirmado no Asaas para dar +30 dias à loja indicadora
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

REVOKE ALL ON FUNCTION public.conceder_bonus_indicacao(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.conceder_bonus_indicacao(UUID) TO service_role;
