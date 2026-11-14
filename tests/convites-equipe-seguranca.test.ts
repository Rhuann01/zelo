import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

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

async function createUserClient(email: string, name: string, avatarUrl?: string) {
  const password = "ZeloTestPassword123!";
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name, avatar_url: avatarUrl },
  });
  if (error || !created.user) throw new Error(error?.message ?? "createUser failed");

  if (avatarUrl) {
    await admin.from("perfis").update({ nome: name, avatar_url: avatarUrl }).eq("id", created.user.id);
  }

  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signErr } = await client.auth.signInWithPassword({ email, password });
  if (signErr) throw new Error(signErr.message);

  return { client, userId: created.user.id };
}

function sha256Hex(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

describe("Convites de Equipe por Link Único & Saída Voluntária", () => {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  let ownerClient: SupabaseClient;
  let ownerId: string;
  let barberClient: SupabaseClient;
  let barberId: string;
  let intruderClient: SupabaseClient;
  let intruderId: string;
  let lojaEstudioId: string;
  let lojaSoloId: string;

  beforeAll(async () => {
    const owner = await createUserClient(`owner.conv.${suffix}@zelo.local`, "Dono Convite");
    ownerClient = owner.client;
    ownerId = owner.userId;

    const barber = await createUserClient(
      `barber.conv.${suffix}@zelo.local`,
      "Barbeiro Perfil Real",
      "https://example.com/avatar-barber.webp"
    );
    barberClient = barber.client;
    barberId = barber.userId;

    const intruder = await createUserClient(`intruder.conv.${suffix}@zelo.local`, "Intruso");
    intruderClient = intruder.client;
    intruderId = intruder.userId;

    const { data: lojaE, error: errE } = await admin
      .from("lojas")
      .insert({
        owner_id: ownerId,
        nome: `Estudio Conv ${suffix}`,
        slug: `estudio-conv-${suffix}`,
        nicho: "barbearia",
        cidade: "SP",
        bairro: "Centro",
        whatsapp_loja: "11999991111",
        plano: "estudio",
      })
      .select("id")
      .single();
    if (errE || !lojaE) throw new Error(errE?.message);
    lojaEstudioId = lojaE.id;

    await admin.from("profissionais").insert({
      loja_id: lojaEstudioId,
      user_id: ownerId,
      nome: "Dono Convite",
      cargo: "Proprietário",
      eh_dono: true,
      ativo: true,
      comissao_percentual: 100,
    });

    const { data: lojaS, error: errS } = await admin
      .from("lojas")
      .insert({
        owner_id: ownerId,
        nome: `Solo Conv ${suffix}`,
        slug: `solo-conv-${suffix}`,
        nicho: "barbearia",
        cidade: "SP",
        bairro: "Centro",
        whatsapp_loja: "11999992222",
        plano: "solo",
      })
      .select("id")
      .single();
    if (errS || !lojaS) throw new Error(errS?.message);
    lojaSoloId = lojaS.id;

    await admin.from("profissionais").insert({
      loja_id: lojaSoloId,
      user_id: ownerId,
      nome: "Dono Solo",
      cargo: "Proprietário",
      eh_dono: true,
      ativo: true,
      comissao_percentual: 100,
    });
  });

  afterAll(async () => {
    for (const lid of [lojaEstudioId, lojaSoloId]) {
      if (lid) {
        await admin.from("convites_equipe").delete().eq("loja_id", lid);
        await admin.from("agendamentos").delete().eq("loja_id", lid);
        await admin.from("profissionais").delete().eq("loja_id", lid);
        await admin.from("lojas").delete().eq("id", lid);
      }
    }
    for (const uid of [ownerId, barberId, intruderId]) {
      if (uid) await admin.auth.admin.deleteUser(uid);
    }
  });

  it("1. Aceite válido puxa nome e avatar_url do perfil e bloqueia replay do mesmo token", async () => {
    const token = crypto.randomBytes(32).toString("base64url");
    const { error: insErr } = await ownerClient.from("convites_equipe").insert({
      loja_id: lojaEstudioId,
      criado_por: ownerId,
      token_hash: sha256Hex(token),
      cargo: "Barbeiro Sênior",
      comissao_percentual: 45,
    });
    expect(insErr).toBeNull();

    const { data: acceptData, error: acceptErr } = await barberClient.rpc("aceitar_convite_equipe", {
      p_token: token,
    });
    expect(acceptErr).toBeNull();
    expect(acceptData?.ok).toBe(true);

    const { data: prof } = await admin
      .from("profissionais")
      .select("nome, avatar_url, eh_dono, cargo, comissao_percentual, ativo")
      .eq("id", acceptData.profissional_id)
      .single();
    expect(prof).toEqual({
      nome: "Barbeiro Perfil Real",
      avatar_url: "https://example.com/avatar-barber.webp",
      eh_dono: false,
      cargo: "Barbeiro Sênior",
      comissao_percentual: 45,
      ativo: true,
    });

    const { error: replayErr } = await intruderClient.rpc("aceitar_convite_equipe", {
      p_token: token,
    });
    expect(replayErr).not.toBeNull();
  });

  it("2. Token revogado não pode ser aceito", async () => {
    const token = crypto.randomBytes(32).toString("base64url");
    const { data: conv } = await ownerClient
      .from("convites_equipe")
      .insert({
        loja_id: lojaEstudioId,
        criado_por: ownerId,
        token_hash: sha256Hex(token),
        cargo: "Barbeiro",
        comissao_percentual: 50,
      })
      .select("id")
      .single();

    await ownerClient.from("convites_equipe").update({ status: "revogado" }).eq("id", conv!.id);

    const { error: revErr } = await intruderClient.rpc("aceitar_convite_equipe", {
      p_token: token,
    });
    expect(revErr).not.toBeNull();
  });

  it("3. Ataque RLS: não-dono não consegue ler, inserir ou revogar convites_equipe", async () => {
    const { data: readLeak } = await intruderClient
      .from("convites_equipe")
      .select("id, token_hash")
      .eq("loja_id", lojaEstudioId);
    expect(readLeak).toEqual([]);

    const { error: insLeak } = await intruderClient.from("convites_equipe").insert({
      loja_id: lojaEstudioId,
      criado_por: intruderId,
      token_hash: sha256Hex(crypto.randomBytes(32).toString("base64url")),
      cargo: "Hacker",
      comissao_percentual: 99,
    });
    expect(insLeak).not.toBeNull();

    const { data: updLeak } = await intruderClient
      .from("convites_equipe")
      .update({ status: "revogado" })
      .eq("loja_id", lojaEstudioId)
      .select("id");
    expect(updLeak ?? []).toEqual([]);
  });

  it("4. Ataques de saída/desligamento: dono não sai via sair_da_equipe, comum não desliga colega, comum sai preservando histórico", async () => {
    const { error: ownerLeaveErr } = await ownerClient.rpc("sair_da_equipe", {
      p_loja_id: lojaEstudioId,
    });
    expect(ownerLeaveErr).not.toBeNull();

    const { data: ownerProf } = await admin
      .from("profissionais")
      .select("id")
      .eq("loja_id", lojaEstudioId)
      .eq("eh_dono", true)
      .single();
    const { error: fireErr } = await barberClient.rpc("desligar_profissional", {
      p_profissional_id: ownerProf!.id,
      p_transferir_para_id: null,
    });
    expect(fireErr).not.toBeNull();
    expect(fireErr?.code).toBe("42501");

    const { data: leaveData, error: leaveErr } = await barberClient.rpc("sair_da_equipe", {
      p_loja_id: lojaEstudioId,
    });
    expect(leaveErr).toBeNull();
    expect(leaveData?.saiu).toBe(true);

    const { data: afterLeave } = await admin
      .from("profissionais")
      .select("ativo, user_id, ex_user_id_historico")
      .eq("loja_id", lojaEstudioId)
      .eq("ex_user_id_historico", barberId)
      .single();
    expect(afterLeave).toEqual({
      ativo: false,
      user_id: null,
      ex_user_id_historico: barberId,
    });
  });

  it("5. Limite do plano solo (1 ativo) bloqueia aceite de segundo profissional", async () => {
    const token = crypto.randomBytes(32).toString("base64url");
    await ownerClient.from("convites_equipe").insert({
      loja_id: lojaSoloId,
      criado_por: ownerId,
      token_hash: sha256Hex(token),
      cargo: "Barbeiro",
      comissao_percentual: 50,
    });

    const { error: limitErr } = await intruderClient.rpc("aceitar_convite_equipe", {
      p_token: token,
    });
    expect(limitErr).not.toBeNull();
  });
});
