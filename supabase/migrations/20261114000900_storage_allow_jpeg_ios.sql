-- Permite image/jpeg nos buckets avatars e lojas-media como fallback para iOS Safari,
-- onde <canvas>.toBlob("image/webp", quality) faz fallback silencioso para PNG sem compressão.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/webp', 'image/jpeg']
WHERE id IN ('avatars', 'lojas-media');
