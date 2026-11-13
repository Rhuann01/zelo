import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createLojaSchema, slugifyNome } from "@/lib/schemas/loja";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

describe("Etapa 1 — Fundação, RLS Multi-Tenant, Auth Google & GiST", () => {
  let admin: SupabaseClient;
  let anon: SupabaseClient;
  let clientA: SupabaseClient;
  let clientB: SupabaseClient;
  let userAId = "";
  let userBId = "";
  let lojaAId = "";
  let lojaBId = "";
  let profAId = "";

  const runSuffix = Date.now().toString(36);
  const emailA = `dono-a-${runSuffix}@zelo.local`;
  const emailB = `dono-b-${runSuffix}@zelo.local`;
  const password = "ZeloTestPassword123!";

  beforeAll(async () => {
    admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    anon = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const resA = await admin.auth.admin.createUser({
      email: emailA,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: "Leon Don",
        avatar_url: "https://lh3.googleusercontent.com/a/google-avatar-a",
      },
    });
    expect(resA.error).toBeNull();
    userAId = resA.data.user!.id;

    const resB = await admin.auth.admin.createUser({
      email: emailB,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: "Ana Bela",
        avatar_url: "https://lh3.googleusercontent.com/a/google-avatar-b",
      },
    });
    expect(resB.error).toBeNull();
    userBId = resB.data.user!.id;

    clientA = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    clientB = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const signA = await clientA.auth.signInWithPassword({ email: emailA, password });
    expect(signA.error).toBeNull();
    const signB = await clientB.auth.signInWithPassword({ email: emailB, password });
    expect(signB.error).toBeNull();
  });

  afterAll(async () => {
    if (lojaAId) await admin.from("lojas").delete().eq("id", lojaAId);
    if (lojaBId) await admin.from("lojas").delete().eq("id", lojaBId);
    if (userAId) await admin.auth.admin.deleteUser(userAId);
    if (userBId) await admin.auth.admin.deleteUser(userBId);
  });

  it("valida schema Zod estrito e slugifyNome", () => {
    expect(slugifyNome("Barbearia Don León & Cia")).toBe("barbearia-don-leon-cia");

    const ok = createLojaSchema.safeParse({
      nome: "Barbearia Don Leon",
      slug: "barbearia-don-leon",
      nicho: "barbearia",
      cidade: "Belo Horizonte",
      bairro: "Savassi",
      whatsapp_loja: "31999998888",
      tema: "urban",
      servicos: [{ nome: "Corte Degradê", duracao_min: 35, preco_centavos: 4500 }],
    });
    expect(ok.success).toBe(true);

    const extraKeyRejected = createLojaSchema.safeParse({
      nome: "Teste",
      slug: "teste-slug",
      nicho: "barbearia",
      cidade: "BH",
      bairro: "Centro",
      whatsapp_loja: "31999998888",
      servicos: [{ nome: "Corte", duracao_min: 30, preco_centavos: 4000 }],
      hackerField: true,
    });
    expect(extraKeyRejected.success).toBe(false);
  });

  it("sincroniza perfil no 1º login Google e protege avatar_customizado = true contra sobrescrita", async () => {
    const { data: perfilInicial, error } = await clientA
      .from("perfis")
      .select("nome, avatar_url, avatar_customizado")
      .eq("id", userAId)
      .single();

    expect(error).toBeNull();
    expect(perfilInicial?.nome).toBe("Leon Don");
    expect(perfilInicial?.avatar_url).toBe("https://lh3.googleusercontent.com/a/google-avatar-a");
    expect(perfilInicial?.avatar_customizado).toBe(false);

    const customAvatar = "http://127.0.0.1:54321/storage/v1/object/public/avatars/custom.webp";
    const { error: upErr } = await clientA
      .from("perfis")
      .update({ avatar_url: customAvatar, avatar_customizado: true })
      .eq("id", userAId);
    expect(upErr).toBeNull();

    // Simula novo login Google atualizando raw_user_meta_data
    await admin.auth.admin.updateUserById(userAId, {
      user_metadata: {
        full_name: "Leon Don",
        avatar_url: "https://lh3.googleusercontent.com/a/novo-avatar-google",
      },
    });

    const { data: perfilPosLogin } = await clientA
      .from("perfis")
      .select("avatar_url, avatar_customizado")
      .eq("id", userAId)
      .single();

    expect(perfilPosLogin?.avatar_customizado).toBe(true);
    expect(perfilPosLogin?.avatar_url).toBe(customAvatar);
  });

  it("garante isolamento estrito Multi-Tenant (Loja A não lê nem altera Loja B)", async () => {
    const { data: lojaA, error: errA } = await clientA
      .from("lojas")
      .insert({
        owner_id: userAId,
        nome: "Loja A",
        slug: `loja-a-${runSuffix}`,
        nicho: "barbearia",
        cidade: "BH",
        bairro: "Savassi",
        whatsapp_loja: "31988887777",
      })
      .select("id")
      .single();
    expect(errA).toBeNull();
    lojaAId = lojaA!.id;

    const { data: profA, error: errProfA } = await clientA
      .from("profissionais")
      .insert({
        loja_id: lojaAId,
        user_id: userAId,
        nome: "Leon",
        eh_dono: true,
        comissao_percentual: 100,
      })
      .select("id")
      .single();
    expect(errProfA).toBeNull();
    profAId = profA!.id;

    const { data: lojaB, error: errB } = await clientB
      .from("lojas")
      .insert({
        owner_id: userBId,
        nome: "Loja B",
        slug: `loja-b-${runSuffix}`,
        nicho: "manicure",
        cidade: "BH",
        bairro: "Buritis",
        whatsapp_loja: "31977776666",
      })
      .select("id")
      .single();
    expect(errB).toBeNull();
    lojaBId = lojaB!.id;

    // Loja A tenta inserir serviço na Loja B -> deve falhar por RLS (42501)
    const { error: crossInsertErr } = await clientA.from("servicos").insert({
      loja_id: lojaBId,
      nome: "Serviço Invasor",
      duracao_min: 30,
      preco_centavos: 5000,
    });
    expect(crossInsertErr).not.toBeNull();
    expect(crossInsertErr?.code).toBe("42501");

    // Loja A tenta atualizar nome da Loja B -> 0 linhas atualizadas
    const { data: crossUpdateData } = await clientA
      .from("lojas")
      .update({ nome: "Hackeada" })
      .eq("id", lojaBId)
      .select("id");
    expect(crossUpdateData ?? []).toHaveLength(0);
  });

  it("bloqueia SELECT público anônimo em agendamentos e impede double-booking com SQLSTATE 23P01", async () => {
    const inicio = "2026-11-20T14:00:00Z";
    const fim = "2026-11-20T14:35:00Z";

    // Dispara 2 reservas idênticas simultaneamente para o mesmo profissional
    const [r1, r2] = await Promise.all([
      clientA.from("agendamentos").insert({
        loja_id: lojaAId,
        profissional_id: profAId,
        origem: "manual",
        cliente_nome: "Cliente 1",
        inicio,
        fim,
        status: "confirmado",
      }),
      clientA.from("agendamentos").insert({
        loja_id: lojaAId,
        profissional_id: profAId,
        origem: "manual",
        cliente_nome: "Cliente 2",
        inicio,
        fim,
        status: "confirmado",
      }),
    ]);

    const errors = [r1.error, r2.error].filter(Boolean);
    const successes = [r1.error, r2.error].filter((e) => e === null);

    expect(successes).toHaveLength(1);
    expect(errors).toHaveLength(1);
    expect(["23P01", "40P01"]).toContain(errors[0]?.code);

    // Nova tentativa sobreposta após confirmação -> obrigatoriamente SQLSTATE 23P01 (EXCLUDE USING gist)
    const { error: seqOverlapErr } = await clientA.from("agendamentos").insert({
      loja_id: lojaAId,
      profissional_id: profAId,
      origem: "manual",
      cliente_nome: "Cliente 3",
      inicio,
      fim,
      status: "confirmado",
    });
    expect(seqOverlapErr?.code).toBe("23P01");

    // Anônimo tenta ler agendamentos -> bloqueado pela RLS (0 linhas)
    const { data: anonRead } = await anon.from("agendamentos").select("id, cliente_nome");
    expect(anonRead ?? []).toHaveLength(0);
  });
});
