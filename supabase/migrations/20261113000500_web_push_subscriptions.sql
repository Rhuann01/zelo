-- Zelo MVP — Etapa 5: Tabela de Assinaturas Web Push (PWA) com RLS estrito por usuário

CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_push_subscriptions_user ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_sub_select_own"
  ON public.push_subscriptions FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "push_sub_insert_own"
  ON public.push_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "push_sub_delete_own"
  ON public.push_subscriptions FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
