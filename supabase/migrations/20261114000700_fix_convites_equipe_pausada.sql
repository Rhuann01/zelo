-- Corrige nome da coluna pausada (em vez de suspensa) nas RPCs de convite de equipe

CREATE OR REPLACE FUNCTION public.obter_convite_equipe_preview(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash TEXT;
  v_convite RECORD;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 32 OR length(trim(p_token)) > 128 THEN
    RETURN jsonb_build_object('valido', false, 'motivo', 'invalid_token');
  END IF;

  v_hash := encode(sha256(convert_to(trim(p_token), 'UTF8')), 'hex');

  SELECT
    c.status,
    c.cargo,
    c.comissao_percentual,
    c.expires_at,
    l.nome AS loja_nome,
    l.slug AS loja_slug,
    l.logo_url AS loja_logo_url,
    l.cidade AS loja_cidade,
    l.bairro AS loja_bairro,
    l.pausada AS loja_pausada
  INTO v_convite
  FROM public.convites_equipe c
  JOIN public.lojas l ON l.id = c.loja_id
  WHERE c.token_hash = v_hash;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valido', false, 'motivo', 'not_found');
  END IF;

  IF v_convite.status = 'aceito' THEN
    RETURN jsonb_build_object(
      'valido', false,
      'motivo', 'already_used',
      'loja_nome', v_convite.loja_nome,
      'loja_slug', v_convite.loja_slug
    );
  END IF;

  IF v_convite.status = 'revogado' THEN
    RETURN jsonb_build_object('valido', false, 'motivo', 'revoked');
  END IF;

  IF v_convite.expires_at <= now() THEN
    RETURN jsonb_build_object('valido', false, 'motivo', 'expired');
  END IF;

  IF v_convite.loja_pausada THEN
    RETURN jsonb_build_object('valido', false, 'motivo', 'store_suspended');
  END IF;

  RETURN jsonb_build_object(
    'valido', true,
    'loja_nome', v_convite.loja_nome,
    'loja_slug', v_convite.loja_slug,
    'loja_logo_url', v_convite.loja_logo_url,
    'loja_cidade', v_convite.loja_cidade,
    'loja_bairro', v_convite.loja_bairro,
    'cargo', v_convite.cargo,
    'comissao_percentual', v_convite.comissao_percentual,
    'expires_at', v_convite.expires_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.aceitar_convite_equipe(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := (SELECT auth.uid());
  v_hash TEXT;
  v_convite RECORD;
  v_loja RECORD;
  v_perfil RECORD;
  v_ativos INTEGER := 0;
  v_limite INTEGER := 5;
  v_prof_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Você precisa estar logado para aceitar o convite.'
      USING ERRCODE = '42501';
  END IF;

  IF p_token IS NULL OR length(trim(p_token)) < 32 OR length(trim(p_token)) > 128 THEN
    RAISE EXCEPTION 'Link de convite inválido.';
  END IF;

  v_hash := encode(sha256(convert_to(trim(p_token), 'UTF8')), 'hex');

  SELECT *
  INTO v_convite
  FROM public.convites_equipe
  WHERE token_hash = v_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Convite não encontrado ou inválido.';
  END IF;

  IF v_convite.status <> 'pendente' THEN
    RAISE EXCEPTION 'Este convite já foi utilizado ou revogado.';
  END IF;

  IF v_convite.expires_at <= now() THEN
    RAISE EXCEPTION 'Este convite expirou. Peça um novo link ao proprietário.';
  END IF;

  SELECT id, owner_id, plano, pausada, nome, slug
  INTO v_loja
  FROM public.lojas
  WHERE id = v_convite.loja_id
  FOR UPDATE;

  IF NOT FOUND OR v_loja.pausada THEN
    RAISE EXCEPTION 'Esta loja não está disponível para novos membros.';
  END IF;

  IF v_loja.owner_id = v_uid THEN
    RAISE EXCEPTION 'Você já é o proprietário desta loja.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profissionais
    WHERE loja_id = v_convite.loja_id
      AND user_id = v_uid
      AND ativo = true
  ) THEN
    RAISE EXCEPTION 'Você já faz parte ativa da equipe desta loja.';
  END IF;

  SELECT count(*)::INTEGER
  INTO v_ativos
  FROM public.profissionais
  WHERE loja_id = v_convite.loja_id
    AND ativo = true;

  IF v_loja.plano = 'solo' THEN
    v_limite := 1;
  ELSE
    v_limite := 5;
  END IF;

  IF v_ativos >= v_limite THEN
    RAISE EXCEPTION 'A equipe atingiu o limite de profissionais ativos do plano atual.';
  END IF;

  SELECT nome, avatar_url
  INTO v_perfil
  FROM public.perfis
  WHERE id = v_uid;

  SELECT id
  INTO v_prof_id
  FROM public.profissionais
  WHERE loja_id = v_convite.loja_id
    AND (user_id = v_uid OR ex_user_id_historico = v_uid)
    AND eh_dono = false
  ORDER BY updated_at DESC
  LIMIT 1;

  IF v_prof_id IS NOT NULL THEN
    UPDATE public.profissionais
    SET user_id = v_uid,
        nome = COALESCE(NULLIF(trim(v_perfil.nome), ''), 'Profissional'),
        avatar_url = v_perfil.avatar_url,
        cargo = v_convite.cargo,
        comissao_percentual = v_convite.comissao_percentual,
        ativo = true,
        email_convite = NULL,
        updated_at = now()
    WHERE id = v_prof_id;
  ELSE
    INSERT INTO public.profissionais (
      loja_id,
      user_id,
      nome,
      cargo,
      eh_dono,
      ativo,
      avatar_url,
      comissao_percentual
    )
    VALUES (
      v_convite.loja_id,
      v_uid,
      COALESCE(NULLIF(trim(v_perfil.nome), ''), 'Profissional'),
      v_convite.cargo,
      false,
      true,
      v_perfil.avatar_url,
      v_convite.comissao_percentual
    )
    RETURNING id INTO v_prof_id;
  END IF;

  UPDATE public.convites_equipe
  SET status = 'aceito',
      aceito_por = v_uid,
      used_at = now()
  WHERE id = v_convite.id;

  RETURN jsonb_build_object(
    'ok', true,
    'profissional_id', v_prof_id,
    'loja_id', v_convite.loja_id,
    'loja_nome', v_loja.nome,
    'loja_slug', v_loja.slug
  );
END;
$$;
