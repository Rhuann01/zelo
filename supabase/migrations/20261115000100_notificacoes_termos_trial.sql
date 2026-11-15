-- Central de Notificações (in-app + Web Push), aceite explícito LGPD/Termos e alertas de Trial/Lembrete

ALTER TABLE public.perfis
  ADD COLUMN IF NOT EXISTS notificacoes_novo_agendamento BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS termos_aceitos_em TIMESTAMPTZ;

ALTER TABLE public.lojas
  ADD COLUMN IF NOT EXISTS termos_aceitos_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notificado_trial_3d BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notificado_trial_1d BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS notificado_lembrete_em TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  loja_id UUID REFERENCES public.lojas(id) ON DELETE CASCADE,
  agendamento_id UUID REFERENCES public.agendamentos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (
    tipo IN (
      'novo_agendamento',
      'reagendamento',
      'adiamento',
      'cancelamento',
      'lembrete',
      'trial_expirando',
      'sistema'
    )
  ),
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  url TEXT NOT NULL DEFAULT '/explorar',
  lida BOOLEAN NOT NULL DEFAULT false,
  acao_tipo TEXT,
  acao_status TEXT NOT NULL DEFAULT 'pendente' CHECK (
    acao_status IN ('pendente', 'confirmada', 'recusada', 'concluida')
  ),
  acao_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notificacoes_user_created
  ON public.notificacoes (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notificacoes_user_unread
  ON public.notificacoes (user_id, lida)
  WHERE lida = false;

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notificacoes_select_own" ON public.notificacoes;
CREATE POLICY "notificacoes_select_own"
  ON public.notificacoes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notificacoes_update_own" ON public.notificacoes;
CREATE POLICY "notificacoes_update_own"
  ON public.notificacoes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notificacoes_delete_own" ON public.notificacoes;
CREATE POLICY "notificacoes_delete_own"
  ON public.notificacoes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
