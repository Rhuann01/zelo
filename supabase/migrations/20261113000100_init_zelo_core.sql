-- Zelo MVP — Etapa 1: Fundação Multi-Tenant, RLS, GiST, Auth Google & Storage
-- Seguindo PLANO_ENGENHARIA_E_NEGOCIO.md e supabase-postgres-best-practices

CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 1. PERFIS (1:1 com auth.users)
-- ============================================================================
CREATE TABLE public.perfis (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT,
  whatsapp TEXT,
  avatar_url TEXT,
  avatar_customizado BOOLEAN NOT NULL DEFAULT false,
  notificacoes_push BOOLEAN NOT NULL DEFAULT true,
  notificacoes_email BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "perfis_select_own"
  ON public.perfis FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id);

CREATE POLICY "perfis_update_own"
  ON public.perfis FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- ============================================================================
-- 2. LOJAS (Tenant raiz)
-- ============================================================================
CREATE TABLE public.lojas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.perfis(id) ON DELETE RESTRICT,
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$'),
  nome TEXT NOT NULL CHECK (char_length(trim(nome)) >= 2),
  nicho TEXT NOT NULL CHECK (nicho IN ('barbearia', 'manicure', 'salao', 'estetica', 'outro')),
  cidade TEXT NOT NULL DEFAULT '',
  bairro TEXT NOT NULL DEFAULT '',
  endereco_texto TEXT NOT NULL DEFAULT '',
  maps_url TEXT,
  whatsapp_loja TEXT NOT NULL DEFAULT '',
  chave_pix TEXT,
  sinal_centavos INTEGER NOT NULL DEFAULT 0 CHECK (sinal_centavos >= 0),
  tema TEXT NOT NULL DEFAULT 'urban' CHECK (tema IN ('urban', 'glam', 'brutal', 'slate')),
  cor_primaria TEXT NOT NULL DEFAULT '#F59E0B',
  raio_borda_px INTEGER NOT NULL DEFAULT 12 CHECK (raio_borda_px BETWEEN 2 AND 24),
  logo_url TEXT,
  capa_url TEXT,
  horarios_loja JSONB NOT NULL DEFAULT '{}'::jsonb,
  antecedencia_cancel_min INTEGER NOT NULL DEFAULT 120 CHECK (antecedencia_cancel_min >= 0),
  pausada BOOLEAN NOT NULL DEFAULT false,
  plano TEXT NOT NULL DEFAULT 'trial' CHECK (plano IN ('trial', 'solo', 'estudio')),
  trial_ate TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days'),
  assinatura_status TEXT NOT NULL DEFAULT 'trial' CHECK (assinatura_status IN ('trial', 'ativa', 'atrasada', 'cancelada')),
  codigo_indicacao TEXT UNIQUE DEFAULT encode(extensions.gen_random_bytes(5), 'hex'),
  indicado_por_loja_id UUID REFERENCES public.lojas(id) ON DELETE SET NULL,
  bonus_indicacao_pago BOOLEAN NOT NULL DEFAULT false,
  ultimo_acesso_painel_em TIMESTAMPTZ,
  primeiro_agendamento_em TIMESTAMPTZ,
  taxa_asaas_centavos INTEGER NOT NULL DEFAULT 199,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lojas_owner ON public.lojas (owner_id);
CREATE INDEX idx_lojas_vitrine ON public.lojas (cidade, bairro, nicho) WHERE pausada = false;

ALTER TABLE public.lojas ENABLE ROW LEVEL SECURITY;

-- Vitrine pública lê lojas não pausadas; dono sempre lê sua própria loja
CREATE POLICY "lojas_select_public_or_owner"
  ON public.lojas FOR SELECT
  TO anon, authenticated
  USING (pausada = false OR (SELECT auth.uid()) = owner_id);

CREATE POLICY "lojas_insert_owner"
  ON public.lojas FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = owner_id);

CREATE POLICY "lojas_update_owner"
  ON public.lojas FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = owner_id)
  WITH CHECK ((SELECT auth.uid()) = owner_id);

CREATE POLICY "lojas_delete_owner"
  ON public.lojas FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = owner_id);

-- ============================================================================
-- 3. FUNÇÕES AUXILIARES DE AUTORIZAÇÃO MULTI-TENANT
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_loja_owner(p_loja_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.lojas
    WHERE id = p_loja_id AND owner_id = (SELECT auth.uid())
  );
$$;

-- ============================================================================
-- 4. PROFISSIONAIS (Equipe + Dono "Também atendo clientes")
-- ============================================================================
CREATE TABLE public.profissionais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.perfis(id) ON DELETE SET NULL,
  ex_user_id_historico UUID,
  email_convite TEXT,
  nome TEXT NOT NULL CHECK (char_length(trim(nome)) >= 2),
  cargo TEXT NOT NULL DEFAULT 'Profissional',
  eh_dono BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  avatar_url TEXT,
  comissao_percentual NUMERIC(5,2) NOT NULL DEFAULT 50.00 CHECK (comissao_percentual BETWEEN 0 AND 100),
  horarios_trabalho JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_profissionais_loja_user_unique
  ON public.profissionais (loja_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX idx_profissionais_loja_ativo
  ON public.profissionais (loja_id)
  WHERE ativo = true;

ALTER TABLE public.profissionais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profissionais_select_public_or_member"
  ON public.profissionais FOR SELECT
  TO anon, authenticated
  USING (
    ativo = true
    OR public.is_loja_owner(loja_id)
    OR user_id = (SELECT auth.uid())
  );

CREATE POLICY "profissionais_insert_owner"
  ON public.profissionais FOR INSERT
  TO authenticated
  WITH CHECK (public.is_loja_owner(loja_id));

CREATE POLICY "profissionais_update_owner"
  ON public.profissionais FOR UPDATE
  TO authenticated
  USING (public.is_loja_owner(loja_id))
  WITH CHECK (public.is_loja_owner(loja_id));

CREATE POLICY "profissionais_delete_owner"
  ON public.profissionais FOR DELETE
  TO authenticated
  USING (public.is_loja_owner(loja_id));

CREATE OR REPLACE FUNCTION public.is_loja_membro_ativo(p_loja_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profissionais
    WHERE loja_id = p_loja_id
      AND user_id = (SELECT auth.uid())
      AND ativo = true
  );
$$;

-- ============================================================================
-- 5. SERVIÇOS
-- ============================================================================
CREATE TABLE public.servicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL CHECK (char_length(trim(nome)) >= 2),
  descricao TEXT NOT NULL DEFAULT '',
  duracao_min INTEGER NOT NULL CHECK (duracao_min >= 5 AND duracao_min <= 480),
  preco_centavos INTEGER NOT NULL CHECK (preco_centavos >= 0),
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_servicos_loja_ativo ON public.servicos (loja_id, ordem) WHERE ativo = true;

ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "servicos_select_public_or_owner"
  ON public.servicos FOR SELECT
  TO anon, authenticated
  USING (ativo = true OR public.is_loja_owner(loja_id));

CREATE POLICY "servicos_insert_owner"
  ON public.servicos FOR INSERT
  TO authenticated
  WITH CHECK (public.is_loja_owner(loja_id));

CREATE POLICY "servicos_update_owner"
  ON public.servicos FOR UPDATE
  TO authenticated
  USING (public.is_loja_owner(loja_id))
  WITH CHECK (public.is_loja_owner(loja_id));

CREATE POLICY "servicos_delete_owner"
  ON public.servicos FOR DELETE
  TO authenticated
  USING (public.is_loja_owner(loja_id));

-- ============================================================================
-- 6. AGENDAMENTOS (Zero SELECT público direto; trava GiST anti-double-booking)
-- ============================================================================
CREATE TABLE public.agendamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  profissional_id UUID NOT NULL REFERENCES public.profissionais(id) ON DELETE RESTRICT,
  cliente_id UUID REFERENCES public.perfis(id) ON DELETE SET NULL,
  origem TEXT NOT NULL DEFAULT 'online' CHECK (origem IN ('online', 'manual')),
  cliente_nome TEXT,
  cliente_whatsapp TEXT,
  beneficiario_nome TEXT,
  beneficiario_whatsapp TEXT,
  inicio TIMESTAMPTZ NOT NULL,
  fim TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmado'
    CHECK (status IN ('pendente', 'confirmado', 'concluido', 'cancelado', 'no_show')),
  total_centavos INTEGER NOT NULL DEFAULT 0 CHECK (total_centavos >= 0),
  desconto_centavos INTEGER NOT NULL DEFAULT 0 CHECK (desconto_centavos >= 0),
  sinal_centavos INTEGER NOT NULL DEFAULT 0 CHECK (sinal_centavos >= 0),
  comissao_percentual_aplicada NUMERIC(5,2),
  comissao_barbeiro_centavos INTEGER,
  lucro_loja_centavos INTEGER,
  token_remarcacao TEXT UNIQUE,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agendamentos_intervalo_valido CHECK (fim > inicio),
  CONSTRAINT agendamentos_origem_dados_check CHECK (
    (origem = 'manual' AND char_length(trim(coalesce(cliente_nome, ''))) >= 2)
    OR (origem = 'online' AND cliente_id IS NOT NULL)
  ),
  CONSTRAINT agendamentos_sem_sobreposicao_profissional
    EXCLUDE USING gist (
      profissional_id WITH =,
      tstzrange(inicio, fim, '[)') WITH &&
    )
    WHERE (status IN ('pendente', 'confirmado'))
    DEFERRABLE INITIALLY IMMEDIATE
);

CREATE INDEX idx_agendamentos_disponibilidade
  ON public.agendamentos (loja_id, profissional_id, inicio, fim)
  WHERE status IN ('pendente', 'confirmado');

CREATE INDEX idx_agendamentos_cliente
  ON public.agendamentos (cliente_id, inicio DESC)
  WHERE cliente_id IS NOT NULL;

ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

-- Anônimos NÃO possuem SELECT na tabela agendamentos (proteção LGPD contra scraping)
CREATE POLICY "agendamentos_select_scoped"
  ON public.agendamentos FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = cliente_id
    OR public.is_loja_owner(loja_id)
    OR EXISTS (
      SELECT 1 FROM public.profissionais p
      WHERE p.id = agendamentos.profissional_id
        AND p.user_id = (SELECT auth.uid())
        AND p.ativo = true
    )
  );

CREATE POLICY "agendamentos_insert_online_or_team"
  ON public.agendamentos FOR INSERT
  TO authenticated
  WITH CHECK (
    (origem = 'online' AND (SELECT auth.uid()) = cliente_id)
    OR public.is_loja_owner(loja_id)
    OR public.is_loja_membro_ativo(loja_id)
  );

CREATE POLICY "agendamentos_update_team"
  ON public.agendamentos FOR UPDATE
  TO authenticated
  USING (
    public.is_loja_owner(loja_id)
    OR EXISTS (
      SELECT 1 FROM public.profissionais p
      WHERE p.id = agendamentos.profissional_id
        AND p.user_id = (SELECT auth.uid())
        AND p.ativo = true
    )
  )
  WITH CHECK (
    public.is_loja_owner(loja_id)
    OR EXISTS (
      SELECT 1 FROM public.profissionais p
      WHERE p.id = agendamentos.profissional_id
        AND p.user_id = (SELECT auth.uid())
        AND p.ativo = true
    )
  );

-- ============================================================================
-- 7. AGENDAMENTO_SERVICOS, BLOQUEIOS & WEBHOOK_EVENTS
-- ============================================================================
CREATE TABLE public.agendamento_servicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  agendamento_id UUID NOT NULL REFERENCES public.agendamentos(id) ON DELETE CASCADE,
  servico_id UUID REFERENCES public.servicos(id) ON DELETE SET NULL,
  nome_snapshot TEXT NOT NULL,
  duracao_min_snapshot INTEGER NOT NULL,
  preco_centavos_snapshot INTEGER NOT NULL
);

CREATE INDEX idx_ag_servicos_agendamento ON public.agendamento_servicos (agendamento_id);

ALTER TABLE public.agendamento_servicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ag_servicos_select_scoped"
  ON public.agendamento_servicos FOR SELECT
  TO authenticated
  USING (
    public.is_loja_owner(loja_id)
    OR public.is_loja_membro_ativo(loja_id)
    OR EXISTS (
      SELECT 1 FROM public.agendamentos a
      WHERE a.id = agendamento_servicos.agendamento_id
        AND a.cliente_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "ag_servicos_insert_scoped"
  ON public.agendamento_servicos FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_loja_owner(loja_id)
    OR public.is_loja_membro_ativo(loja_id)
    OR EXISTS (
      SELECT 1 FROM public.agendamentos a
      WHERE a.id = agendamento_servicos.agendamento_id
        AND a.cliente_id = (SELECT auth.uid())
    )
  );

CREATE TABLE public.bloqueios_agenda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  profissional_id UUID REFERENCES public.profissionais(id) ON DELETE CASCADE,
  inicio TIMESTAMPTZ NOT NULL,
  fim TIMESTAMPTZ NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'folga' CHECK (tipo IN ('almoco', 'folga', 'feriado', 'dia_especial')),
  motivo TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bloqueios_intervalo_valido CHECK (fim > inicio)
);

CREATE INDEX idx_bloqueios_loja_periodo ON public.bloqueios_agenda (loja_id, inicio, fim);

ALTER TABLE public.bloqueios_agenda ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bloqueios_select_owner_or_member"
  ON public.bloqueios_agenda FOR SELECT
  TO authenticated
  USING (public.is_loja_owner(loja_id) OR public.is_loja_membro_ativo(loja_id));

CREATE POLICY "bloqueios_write_owner_or_member"
  ON public.bloqueios_agenda FOR ALL
  TO authenticated
  USING (public.is_loja_owner(loja_id) OR public.is_loja_membro_ativo(loja_id))
  WITH CHECK (public.is_loja_owner(loja_id) OR public.is_loja_membro_ativo(loja_id));

CREATE TABLE public.webhook_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
-- Sem políticas públicas: acessível apenas por service_role

-- ============================================================================
-- 8. TRIGGERS: AUTO-PERFIL GOOGLE (RESPEITANDO avatar_customizado) & AUTO-VÍNCULO
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_auth_user_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nome TEXT;
  v_avatar TEXT;
BEGIN
  v_nome := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'name'), ''),
    split_part(COALESCE(NEW.email, ''), '@', 1)
  );
  v_avatar := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'avatar_url'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'picture'), '')
  );

  INSERT INTO public.perfis (id, nome, email, avatar_url, avatar_customizado)
  VALUES (NEW.id, v_nome, NEW.email, v_avatar, false)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    nome = CASE
      WHEN char_length(trim(public.perfis.nome)) = 0 THEN EXCLUDED.nome
      ELSE public.perfis.nome
    END,
    avatar_url = CASE
      WHEN public.perfis.avatar_customizado = false AND EXCLUDED.avatar_url IS NOT NULL
        THEN EXCLUDED.avatar_url
      ELSE public.perfis.avatar_url
    END,
    updated_at = now();

  -- Auto-vínculo de funcionário convidado por email_convite
  IF NEW.email IS NOT NULL THEN
    UPDATE public.profissionais
    SET user_id = NEW.id, updated_at = now()
    WHERE lower(email_convite) = lower(NEW.email)
      AND user_id IS NULL
      AND ativo = true;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE OF raw_user_meta_data, email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_sync();

CREATE OR REPLACE FUNCTION public.handle_profissional_auto_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
BEGIN
  IF NEW.user_id IS NULL AND NEW.email_convite IS NOT NULL THEN
    SELECT id INTO v_uid
    FROM auth.users
    WHERE lower(email) = lower(NEW.email_convite)
    LIMIT 1;

    IF v_uid IS NOT NULL THEN
      NEW.user_id := v_uid;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profissional_before_write ON public.profissionais;
CREATE TRIGGER on_profissional_before_write
  BEFORE INSERT OR UPDATE OF email_convite ON public.profissionais
  FOR EACH ROW EXECUTE FUNCTION public.handle_profissional_auto_link();

-- ============================================================================
-- 9. STORAGE BUCKETS & RLS (avatars <= 45KB, lojas-media <= 100KB)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 46080, ARRAY['image/webp']),
  ('lojas-media', 'lojas-media', true, 102400, ARRAY['image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_owner_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

CREATE POLICY "avatars_owner_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

CREATE POLICY "avatars_owner_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

CREATE POLICY "lojas_media_public_read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'lojas-media');

CREATE POLICY "lojas_media_owner_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'lojas-media'
    AND public.is_loja_owner((storage.foldername(name))[1]::uuid)
  );

CREATE POLICY "lojas_media_owner_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'lojas-media'
    AND public.is_loja_owner((storage.foldername(name))[1]::uuid)
  )
  WITH CHECK (
    bucket_id = 'lojas-media'
    AND public.is_loja_owner((storage.foldername(name))[1]::uuid)
  );

CREATE POLICY "lojas_media_owner_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'lojas-media'
    AND public.is_loja_owner((storage.foldername(name))[1]::uuid)
  );
