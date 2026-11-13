-- Fix ambiguous PL/pgSQL OUT parameter column references in booking RPCs

CREATE OR REPLACE FUNCTION public.criar_agendamento_online(
  p_loja_id UUID,
  p_profissional_id UUID,
  p_servicos_ids UUID[],
  p_inicio TIMESTAMPTZ,
  p_beneficiario_nome TEXT DEFAULT NULL,
  p_beneficiario_whatsapp TEXT DEFAULT NULL,
  p_observacoes TEXT DEFAULT NULL
)
RETURNS TABLE (
  agendamento_id UUID,
  inicio TIMESTAMPTZ,
  fim TIMESTAMPTZ,
  total_centavos INTEGER,
  sinal_centavos INTEGER,
  token_remarcacao TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_loja RECORD;
  v_prof RECORD;
  v_duracao_total INTEGER := 0;
  v_total_centavos INTEGER := 0;
  v_count_servicos INTEGER := 0;
  v_fim TIMESTAMPTZ;
  v_comissao_pct NUMERIC(5,2);
  v_comissao_centavos INTEGER;
  v_lucro_centavos INTEGER;
  v_ag_id UUID;
  v_token TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTENTICACAO_OBRIGATORIA' USING ERRCODE = '42501';
  END IF;

  IF p_servicos_ids IS NULL OR array_length(p_servicos_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'SERVICOS_OBRIGATORIOS' USING ERRCODE = '22023';
  END IF;

  IF p_inicio <= now() - interval '5 minutes' THEN
    RAISE EXCEPTION 'HORARIO_NO_PASSADO' USING ERRCODE = '22023';
  END IF;

  SELECT l.id, l.pausada, l.sinal_centavos
  INTO v_loja
  FROM public.lojas l
  WHERE l.id = p_loja_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LOJA_NAO_ENCONTRADA' USING ERRCODE = 'P0002';
  END IF;

  IF v_loja.pausada THEN
    RAISE EXCEPTION 'LOJA_PAUSADA' USING ERRCODE = '42501';
  END IF;

  SELECT p.id, p.comissao_percentual
  INTO v_prof
  FROM public.profissionais p
  WHERE p.id = p_profissional_id
    AND p.loja_id = p_loja_id
    AND p.ativo = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROFISSIONAL_INDISPONIVEL' USING ERRCODE = 'P0002';
  END IF;

  SELECT
    COUNT(*)::INTEGER,
    COALESCE(SUM(s.duracao_min), 0)::INTEGER,
    COALESCE(SUM(s.preco_centavos), 0)::INTEGER
  INTO v_count_servicos, v_duracao_total, v_total_centavos
  FROM public.servicos s
  WHERE s.loja_id = p_loja_id
    AND s.ativo = true
    AND s.id = ANY(p_servicos_ids);

  IF v_count_servicos = 0 OR v_duracao_total <= 0 THEN
    RAISE EXCEPTION 'SERVICOS_INVALIDOS' USING ERRCODE = '22023';
  END IF;

  v_fim := p_inicio + make_interval(mins => v_duracao_total);

  IF EXISTS (
    SELECT 1
    FROM public.bloqueios_agenda b
    WHERE b.loja_id = p_loja_id
      AND (b.profissional_id IS NULL OR b.profissional_id = p_profissional_id)
      AND tstzrange(b.inicio, b.fim, '[)') && tstzrange(p_inicio, v_fim, '[)')
  ) THEN
    RAISE EXCEPTION 'HORARIO_BLOQUEADO' USING ERRCODE = '23P01';
  END IF;

  v_comissao_pct := COALESCE(v_prof.comissao_percentual, 0);
  v_comissao_centavos := ROUND((v_total_centavos * v_comissao_pct) / 100.0)::INTEGER;
  v_lucro_centavos := GREATEST(0, v_total_centavos - v_comissao_centavos);
  v_token := replace(gen_random_uuid()::TEXT, '-', '');

  INSERT INTO public.agendamentos (
    loja_id,
    profissional_id,
    cliente_id,
    origem,
    beneficiario_nome,
    beneficiario_whatsapp,
    inicio,
    fim,
    status,
    total_centavos,
    sinal_centavos,
    comissao_percentual_aplicada,
    comissao_barbeiro_centavos,
    lucro_loja_centavos,
    token_remarcacao,
    observacoes
  )
  VALUES (
    p_loja_id,
    p_profissional_id,
    v_uid,
    'online',
    NULLIF(trim(COALESCE(p_beneficiario_nome, '')), ''),
    NULLIF(trim(COALESCE(p_beneficiario_whatsapp, '')), ''),
    p_inicio,
    v_fim,
    'confirmado',
    v_total_centavos,
    LEAST(v_loja.sinal_centavos, v_total_centavos),
    v_comissao_pct,
    v_comissao_centavos,
    v_lucro_centavos,
    v_token,
    NULLIF(trim(COALESCE(p_observacoes, '')), '')
  )
  RETURNING agendamentos.id INTO v_ag_id;

  INSERT INTO public.agendamento_servicos (
    loja_id,
    agendamento_id,
    servico_id,
    nome_snapshot,
    duracao_min_snapshot,
    preco_centavos_snapshot
  )
  SELECT
    p_loja_id,
    v_ag_id,
    s.id,
    s.nome,
    s.duracao_min,
    s.preco_centavos
  FROM public.servicos s
  WHERE s.loja_id = p_loja_id
    AND s.ativo = true
    AND s.id = ANY(p_servicos_ids);

  RETURN QUERY
  SELECT
    v_ag_id,
    p_inicio,
    v_fim,
    v_total_centavos,
    LEAST(v_loja.sinal_centavos, v_total_centavos)::INTEGER,
    v_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancelar_ou_remarcar(
  p_agendamento_id UUID,
  p_acao TEXT,
  p_novo_inicio TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  status TEXT,
  inicio TIMESTAMPTZ,
  fim TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_ag RECORD;
  v_loja RECORD;
  v_is_staff BOOLEAN;
  v_duracao INTERVAL;
  v_novo_fim TIMESTAMPTZ;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTENTICACAO_OBRIGATORIA' USING ERRCODE = '42501';
  END IF;

  IF p_acao IS NULL OR p_acao NOT IN ('cancelar', 'remarcar') THEN
    RAISE EXCEPTION 'ACAO_INVALIDA' USING ERRCODE = '22023';
  END IF;

  SELECT a.*
  INTO v_ag
  FROM public.agendamentos a
  WHERE a.id = p_agendamento_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'AGENDAMENTO_NAO_ENCONTRADO' USING ERRCODE = 'P0002';
  END IF;

  v_is_staff := public.is_loja_owner(v_ag.loja_id)
    OR EXISTS (
      SELECT 1 FROM public.profissionais p
      WHERE p.id = v_ag.profissional_id
        AND p.user_id = v_uid
        AND p.ativo = true
    );

  IF NOT v_is_staff AND v_ag.cliente_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'SEM_PERMISSAO' USING ERRCODE = '42501';
  END IF;

  IF v_ag.status NOT IN ('pendente', 'confirmado') THEN
    RAISE EXCEPTION 'AGENDAMENTO_NAO_EDITAVEL' USING ERRCODE = '22023';
  END IF;

  SELECT l.antecedencia_cancel_min
  INTO v_loja
  FROM public.lojas l
  WHERE l.id = v_ag.loja_id;

  IF NOT v_is_staff
     AND v_loja.antecedencia_cancel_min > 0
     AND v_ag.inicio < now() + make_interval(mins => v_loja.antecedencia_cancel_min) THEN
    RAISE EXCEPTION 'ANTECEDENCIA_MINIMA_EXCEDIDA' USING ERRCODE = '42501';
  END IF;

  IF p_acao = 'cancelar' THEN
    UPDATE public.agendamentos a
    SET status = 'cancelado', updated_at = now()
    WHERE a.id = p_agendamento_id
    RETURNING a.id, a.status, a.inicio, a.fim
    INTO id, status, inicio, fim;

    RETURN NEXT;
    RETURN;
  END IF;

  IF p_novo_inicio IS NULL OR p_novo_inicio <= now() - interval '5 minutes' THEN
    RAISE EXCEPTION 'NOVO_HORARIO_INVALIDO' USING ERRCODE = '22023';
  END IF;

  v_duracao := v_ag.fim - v_ag.inicio;
  v_novo_fim := p_novo_inicio + v_duracao;

  IF EXISTS (
    SELECT 1
    FROM public.bloqueios_agenda b
    WHERE b.loja_id = v_ag.loja_id
      AND (b.profissional_id IS NULL OR b.profissional_id = v_ag.profissional_id)
      AND tstzrange(b.inicio, b.fim, '[)') && tstzrange(p_novo_inicio, v_novo_fim, '[)')
  ) THEN
    RAISE EXCEPTION 'HORARIO_BLOQUEADO' USING ERRCODE = '23P01';
  END IF;

  UPDATE public.agendamentos a
  SET inicio = p_novo_inicio, fim = v_novo_fim, updated_at = now()
  WHERE a.id = p_agendamento_id
  RETURNING a.id, a.status, a.inicio, a.fim
  INTO id, status, inicio, fim;

  RETURN NEXT;
END;
$$;
