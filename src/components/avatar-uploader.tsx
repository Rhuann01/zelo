"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AVATAR_COMPRESS_CONFIG, compressImageToWebP } from "@/lib/image/compress-webp";
import { showToast } from "@/components/zelo-toast";

interface AvatarUploaderProps {
  userId: string;
  initialUrl: string | null;
  isCustom: boolean;
  displayName: string;
}

export function AvatarUploader({
  userId,
  initialUrl,
  isCustom,
  displayName,
}: AvatarUploaderProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(initialUrl);
  const [custom, setCustom] = useState(isCustom);
  const [loading, setLoading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const webpBlob = await compressImageToWebP(file, AVATAR_COMPRESS_CONFIG);
      const supabase = createClient();
      const path = `${userId}/avatar.webp`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, webpBlob, {
          contentType: "image/webp",
          upsert: true,
          cacheControl: "31536000",
        });

      if (uploadError) throw uploadError;

      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const bustedUrl = `${pub.publicUrl}?v=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("perfis")
        .update({ avatar_url: bustedUrl, avatar_customizado: true })
        .eq("id", userId);

      if (updateError) throw updateError;

      setAvatarUrl(bustedUrl);
      setCustom(true);
      router.refresh();
      showToast(`Foto salva (${Math.round(webpBlob.size / 1024)} KB WebP)`, "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erro ao enviar foto.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveAvatar() {
    setLoading(true);
    try {
      const supabase = createClient();
      await supabase.storage.from("avatars").remove([`${userId}/avatar.webp`]).catch(() => null);

      const { error } = await supabase
        .from("perfis")
        .update({ avatar_url: null, avatar_customizado: true })
        .eq("id", userId);

      if (error) throw error;
      setAvatarUrl(null);
      setCustom(true);
      router.refresh();
      showToast("Foto de perfil removida.", "success");
    } catch {
      showToast("Não foi possível remover a foto.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleRestoreGoogle() {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const googlePic =
        (user?.user_metadata?.avatar_url as string | undefined) ||
        (user?.user_metadata?.picture as string | undefined) ||
        null;

      const { error } = await supabase
        .from("perfis")
        .update({ avatar_url: googlePic, avatar_customizado: false })
        .eq("id", userId);

      if (error) throw error;
      setAvatarUrl(googlePic);
      setCustom(false);
      router.refresh();
      showToast("Foto do Google restaurada.", "success");
    } catch {
      showToast("Não foi possível restaurar a foto do Google.", "error");
    } finally {
      setLoading(false);
    }
  }

  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "Z";

  return (
    <div className="flex items-center gap-3.5">
      <div className="relative shrink-0">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="h-16 w-16 rounded-2xl object-cover bg-[var(--zelo-soft)]"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--zelo-btn-bg)] text-lg font-bold text-[var(--zelo-btn-ink)]">
            {initials}
          </div>
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          aria-label="Alterar foto de perfil"
          className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--zelo-btn-bg)] text-[var(--zelo-btn-ink)] ring-2 ring-[var(--zelo-card)] shadow-sm"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      <div className="min-w-0 space-y-1.5">
        <p className="truncate text-base font-bold">{displayName}</p>
        {avatarUrl || custom ? (
          <div className="flex flex-wrap items-center gap-3">
            {avatarUrl && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                disabled={loading}
                className="inline-flex items-center gap-1 text-xs font-medium text-red-500 transition-colors hover:text-red-600 disabled:opacity-60"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remover foto
              </button>
            )}
            {custom && (
              <button
                type="button"
                onClick={handleRestoreGoogle}
                disabled={loading}
                className="inline-flex items-center gap-1 text-xs font-medium text-[var(--zelo-muted)] transition-colors hover:text-[var(--zelo-ink)] disabled:opacity-60"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Restaurar Google
              </button>
            )}
          </div>
        ) : (
          <p className="text-xs text-[var(--zelo-muted)]">
            Toque na câmera para adicionar uma foto
          </p>
        )}
      </div>
    </div>
  );
}
