-- Cortesia separada de MRR pago + contagem agregada de dispositivos mais usados

ALTER TABLE public.lojas
  ADD COLUMN IF NOT EXISTS is_cortesia BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.dispositivos_acesso (
  chave TEXT PRIMARY KEY,
  sistema TEXT NOT NULL,
  navegador TEXT NOT NULL,
  tipo TEXT NOT NULL,
  acessos INTEGER NOT NULL DEFAULT 1,
  ultimo_acesso_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dispositivos_acesso ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.incrementar_dispositivo_acesso(
  p_chave TEXT,
  p_sistema TEXT,
  p_navegador TEXT,
  p_tipo TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.dispositivos_acesso (chave, sistema, navegador, tipo, acessos, ultimo_acesso_em)
  VALUES (p_chave, p_sistema, p_navegador, p_tipo, 1, now())
  ON CONFLICT (chave) DO UPDATE
  SET
    acessos = public.dispositivos_acesso.acessos + 1,
    ultimo_acesso_em = now();
END;
$$;
