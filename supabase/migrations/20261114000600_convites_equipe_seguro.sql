-- Zelo: Sistema Blindado de Convites por Link Único e Saída Voluntária da Equipe

CREATE TABLE IF NOT EXISTS public.convites_equipe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  criado_por UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  cargo TEXT NOT NULL DEFAULT 'Barbeiro' CHECK (char_length(trim(cargo)) BETWEEN 2 AND 40),
  comissao_percentual INTEGER NOT NULL DEFAULT 50 CHECK (comissao_percentual BETWEEN 0 AND 100),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aceito', 'revogado')),
  aceito_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_convites_equipe_loja_status
  ON public.convites_equipe (loja_id, status, expires_at DESC);

ALTER TABLE public.convites_equipe ENABLE ROW LEVEL SECURITY;

-- Apenas o proprietário da loja pode listar, criar ou revogar convites diretamente
CREATE POLICY "convites_equipe_select_owner"
  ON public.convites_equipe FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.lojas l
      WHERE l.id = convites_equipe.loja_id
        AND l.owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "convites_equipe_insert_owner"
  ON public.convites_equipe FOR INSERT
  TO authenticated
  WITH CHECK (
    criado_por = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.lojas l
      WHERE l.id = convites_equipe.loja_id
        AND l.owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "convites_equipe_update_owner"
  ON public.convites_equipe FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.lojas l
      WHERE l.id = convites_equipe.loja_id
        AND l.owner_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lojas l
      WHERE l.id = convites_equipe.loja_id
        AND l.owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "convites_equipe_delete_owner"
  ON public.convites_equipe FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.lojas l
      WHERE l.id = convites_equipe.loja_id
        AND l.owner_id = (SELECT auth.uid())
    )
  );

-- Preview seguro do convite a partir do token secreto (anônimo ou autenticado)
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

REVOKE ALL ON FUNCTION public.obter_convite_equipe_preview(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.obter_convite_equipe_preview(TEXT) TO anon, authenticated;

-- Aceite blindado de convite: puxa nome e avatar diretamente do perfil autenticado (auth.uid())
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

  -- Se houver registro antigo deste usuário na loja (desligado anteriormente), reativa com os dados atuais do perfil
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

REVOKE ALL ON FUNCTION public.aceitar_convite_equipe(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aceitar_convite_equipe(TEXT) TO authenticated;

-- Saída voluntária do profissional da equipe (preserva histórico, transfere ou cancela futuros e revoga acesso)
CREATE OR REPLACE FUNCTION public.sair_da_equipe(p_loja_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := (SELECT auth.uid());
  v_prof RECORD;
  v_destino_id UUID;
  v_afetados INTEGER := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sessão expirada. Faça login novamente.'
      USING ERRCODE = '42501';
  END IF;

  SELECT id, loja_id, eh_dono, ativo
  INTO v_prof
  FROM public.profissionais
  WHERE loja_id = p_loja_id
    AND user_id = v_uid
    AND ativo = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Você não faz parte ativa da equipe desta loja.'
      USING ERRCODE = '42501';
  END IF;

  IF v_prof.eh_dono THEN
    RAISE EXCEPTION 'O proprietário não pode sair da própria loja. Use a chave Também atendo clientes.';
  END IF;

  SELECT id
  INTO v_destino_id
  FROM public.profissionais
  WHERE loja_id = p_loja_id
    AND eh_dono = true
    AND ativo = true
    AND id <> v_prof.id
  LIMIT 1;

  IF v_destino_id IS NOT NULL THEN
    UPDATE public.agendamentos
    SET profissional_id = v_destino_id,
        updated_at = now()
    WHERE profissional_id = v_prof.id
      AND inicio > now()
      AND status IN ('pendente', 'confirmado');

    GET DIAGNOSTICS v_afetados = ROW_COUNT;
  ELSE
    UPDATE public.agendamentos
    SET status = 'cancelado',
        observacoes = trim(coalesce(observacoes, '') || ' [Cancelado por saída do profissional]'),
        updated_at = now()
    WHERE profissional_id = v_prof.id
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
  WHERE id = v_prof.id;

  RETURN jsonb_build_object(
    'saiu', true,
    'agendamentos_afetados', v_afetados,
    'transferido', v_destino_id IS NOT NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.sair_da_equipe(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sair_da_equipe(UUID) TO authenticated;
