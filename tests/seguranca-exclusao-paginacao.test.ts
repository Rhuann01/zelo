import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  hashSecurityPassword,
  verifySecurityPassword,
} from "@/lib/security/pin-hash";
import { checkRateLimit } from "@/lib/security/rate-limit";
import {
  decodeVitrineCursor,
  encodeVitrineCursor,
} from "@/lib/public/get-loja-publica";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function createUserClient(email: string, name: string) {
  const password = "ZeloTestPassword123!";
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (error || !created.user) throw new Error(error?.message ?? "createUser failed");

  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signErr } = await client.auth.signInWithPassword({ email, password });
  if (signErr) throw new Error(signErr.message);

  return { client, userId: created.user.id };
}

describe("Segurança: Senha de Segurança, Rate Limit, Paginação e Exclusão de Loja", () => {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  let ownerClient: SupabaseClient;
  let ownerId: string;
  let intruderClient: SupabaseClient;
  let intruderId: string;
  let lojaId: string;

  beforeAll(async () => {
    const o = await createUserClient(`owner-del-${suffix}@zelo.local`, "Dono Teste");
    ownerClient = o.client;
    ownerId = o.userId;

    const i = await createUserClient(`intruder-del-${suffix}@zelo.local`, "Invasor Teste");
    intruderClient = i.client;
    intruderId = i.userId;

    const { data: loja, error } = await ownerClient
      .from("lojas")
      .insert({
        owner_id: ownerId,
        nome: `Barbearia Exclusão ${suffix}`,
        slug: `exclusao-${suffix}`,
        nicho: "barbearia",
        cidade: "Caxias",
        bairro: "Centro",
      })
      .select("id")
      .single();

    if (error || !loja) throw new Error(error?.message ?? "Falha ao criar loja de teste");
    lojaId = loja.id;

    await ownerClient.from("servicos").insert({
      loja_id: lojaId,
      nome: "Corte Teste",
      duracao_min: 30,
      preco_centavos: 4000,
    });
  });

  afterAll(async () => {
    if (lojaId) {
      await admin.from("lojas").delete().eq("id", lojaId);
    }
    if (ownerId) await admin.auth.admin.deleteUser(ownerId);
    if (intruderId) await admin.auth.admin.deleteUser(intruderId);
  });

  it("gera e valida hash scrypt da senha de segurança com timingSafeEqual", () => {
    const hash = hashSecurityPassword("MinhaSenha@2026");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(verifySecurityPassword("MinhaSenha@2026", hash)).toBe(true);
    expect(verifySecurityPassword("SenhaErrada", hash)).toBe(false);
    expect(verifySecurityPassword("MinhaSenha@2026", null)).toBe(false);
    expect(verifySecurityPassword("MinhaSenha@2026", "formato-invalido")).toBe(false);
  });

  it("aplica rate limit por chave e bloqueia após exceder o limite", () => {
    const key = `test:rl:${suffix}`;
    const r1 = checkRateLimit(key, 3, 60_000);
    const r2 = checkRateLimit(key, 3, 60_000);
    const r3 = checkRateLimit(key, 3, 60_000);
    const r4 = checkRateLimit(key, 3, 60_000);

    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);
    expect(r2.allowed).toBe(true);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
    expect(r4.allowed).toBe(false);
    expect(r4.retryAfterSec).toBeGreaterThanOrEqual(1);
  });

  it("codifica e decodifica cursor da vitrine rejeitando payloads malformados", () => {
    const uuid = "123e4567-e89b-12d3-a456-426614174000";
    const iso = "2026-11-14T04:00:00.000Z";
    const cursor = encodeVitrineCursor(iso, uuid);
    const decoded = decodeVitrineCursor(cursor);

    expect(decoded).toEqual({ createdAt: iso, id: uuid });
    expect(decodeVitrineCursor("not-valid")).toBeNull();
    expect(
      decodeVitrineCursor(Buffer.from("2026-11-14T04:00:00Z|sql-injection", "utf8").toString("base64url"))
    ).toBeNull();
    expect(
      decodeVitrineCursor(Buffer.from(`not-a-date|${uuid}`, "utf8").toString("base64url"))
    ).toBeNull();
  });

  it("bloqueia exclusão da loja por usuário que não é o proprietário (RPC excluir_loja_segura)", async () => {
    const { error } = await intruderClient.rpc("excluir_loja_segura", {
      p_loja_id: lojaId,
    });

    expect(error).not.toBeNull();
    expect(error?.code).toBe("42501");

    const { data: aindaExiste } = await admin
      .from("lojas")
      .select("id")
      .eq("id", lojaId)
      .maybeSingle();
    expect(aindaExiste?.id).toBe(lojaId);
  });

  it("permite ao proprietário excluir a loja de forma segura via RPC excluir_loja_segura", async () => {
    const { error } = await ownerClient.rpc("excluir_loja_segura", {
      p_loja_id: lojaId,
    });
    expect(error).toBeNull();

    const { data: lojaRemovida } = await admin
      .from("lojas")
      .select("id")
      .eq("id", lojaId)
      .maybeSingle();
    expect(lojaRemovida).toBeNull();
  });
});
