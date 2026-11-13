import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  servicoSchema,
  customizacaoLojaSchema,
  conviteProfissionalSchema,
} from "../src/lib/schemas/painel";

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

const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function createSignedInClient(email: string, password: string, name: string): Promise<{
  client: SupabaseClient;
  userId: string;
}> {
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (createErr || !created.user) {
    throw new Error(`Failed creating test user ${email}: ${createErr?.message}`);
  }

  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signInErr } = await client.auth.signInWithPassword({ email, password });
  if (signInErr) {
    throw new Error(`Failed signing in ${email}: ${signInErr.message}`);
  }
  return { client, userId: created.user.id };
}

describe("Etapa 2: Painel Gestão, Permissões Dono vs Equipe, Desligamento Seguro & Zod", () => {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const ownerEmail = `owner.e2.${suffix}@zelo.local`;
  const staffEmail = `staff.e2.${suffix}@zelo.local`;
  const substituteEmail = `sub.e2.${suffix}@zelo.local`;
  const password = "ZeloTestPassword123!";

  let ownerClient: SupabaseClient;
  let ownerId: string;
  let staffClient: SupabaseClient;
  let staffUserId: string;
  let substituteUserId: string;

  let lojaId: string;
  let ownerProfId: string;
  let staffProfId: string;
  let subProfId: string;
  let servicoId: string;

  beforeAll(async () => {
    const owner = await createSignedInClient(ownerEmail, password, "Dono Etapa 2");
    ownerClient = owner.client;
    ownerId = owner.userId;

    const { data: loja, error: lojaErr } = await admin
      .from("lojas")
      .insert({
        owner_id: ownerId,
        nome: `Barbearia Etapa 2 ${suffix}`,
        slug: `barbearia-e2-${suffix}`,
        nicho: "barbearia",
        tema: "urban",
        cor_primaria: "#0D9488",
        raio_borda_px: 12,
        whatsapp_loja: "11999990000",
        cidade: "São Paulo",
        bairro: "Centro",
        plano: "estudio",
        assinatura_status: "trial",
      })
      .select("id")
      .single();
    if (lojaErr || !loja) throw new Error(`Failed creating loja: ${lojaErr?.message}`);
    lojaId = loja.id;

    const { data: ownerProf, error: ownerProfErr } = await admin
      .from("profissionais")
      .insert({
        loja_id: lojaId,
        user_id: ownerId,
        nome: "Dono Etapa 2",
        cargo: "Dono",
        eh_dono: true,
        ativo: true,
        comissao_percentual: 100,
      })
      .select("id")
      .single();
    if (ownerProfErr || !ownerProf) throw new Error(`Failed creating ownerProf: ${ownerProfErr?.message}`);
    ownerProfId = ownerProf.id;

    const { data: servico, error: servErr } = await admin
      .from("servicos")
      .insert({
        loja_id: lojaId,
        nome: "Corte Clássico",
        descricao: "Tesoura e máquina",
        duracao_min: 30,
        preco_centavos: 4500,
        ativo: true,
      })
      .select("id")
      .single();
    if (servErr || !servico) throw new Error(`Failed creating servico: ${servErr?.message}`);
    servicoId = servico.id;

    // Convite pendente para funcionário antes dele criar conta (testa auto-link no trigger)
    const { data: invitedStaff, error: inviteErr } = await admin
      .from("profissionais")
      .insert({
        loja_id: lojaId,
        nome: "Barbeiro Convidado",
        email_convite: staffEmail,
        cargo: "Barbeiro",
        eh_dono: false,
        ativo: true,
        comissao_percentual: 45,
      })
      .select("id")
      .single();
    if (inviteErr || !invitedStaff) throw new Error(`Failed inviting staff: ${inviteErr?.message}`);
    staffProfId = invitedStaff.id;

    // Substituto ativo para receber agendamentos no desligamento
    const sub = await createSignedInClient(substituteEmail, password, "Barbeiro Substituto");
    substituteUserId = sub.userId;
    const { data: subProf, error: subErr } = await admin
      .from("profissionais")
      .insert({
        loja_id: lojaId,
        user_id: substituteUserId,
        nome: "Barbeiro Substituto",
        cargo: "Barbeiro",
        eh_dono: false,
        ativo: true,
        comissao_percentual: 50,
      })
      .select("id")
      .single();
    if (subErr || !subProf) throw new Error(`Failed creating subProf: ${subErr?.message}`);
    subProfId = subProf.id;

    // Agora cria a conta do funcionário convidado -> trigger deve vincular user_id
    const staff = await createSignedInClient(staffEmail, password, "Barbeiro Convidado");
    staffClient = staff.client;
    staffUserId = staff.userId;
  });

  afterAll(async () => {
    if (lojaId) {
      await admin.from("agendamentos").delete().eq("loja_id", lojaId);
      await admin.from("servicos").delete().eq("loja_id", lojaId);
      await admin.from("profissionais").delete().eq("loja_id", lojaId);
      await admin.from("lojas").delete().eq("id", lojaId);
    }
    for (const uid of [ownerId, staffUserId, substituteUserId]) {
      if (uid) await admin.auth.admin.deleteUser(uid);
    }
  });

  it("1. Bloqueia email_convite e comissao_percentual para anon, permitindo apenas colunas públicas", async () => {
    const { data: publicCols, error: publicErr } = await anonClient
      .from("profissionais")
      .select("id, loja_id, nome, cargo, eh_dono, ativo, avatar_url")
      .eq("loja_id", lojaId);

    expect(publicErr).toBeNull();
    expect(publicCols && publicCols.length).toBeGreaterThanOrEqual(2);

    const { error: emailLeakErr } = await anonClient
      .from("profissionais")
      .select("id, email_convite")
      .eq("loja_id", lojaId);
    expect(emailLeakErr).not.toBeNull();

    const { error: comissaoLeakErr } = await anonClient
      .from("profissionais")
      .select("id, comissao_percentual")
      .eq("loja_id", lojaId);
    expect(comissaoLeakErr).not.toBeNull();
  });

  it("2. Auto-vincula funcionário convidado por email_convite e bloqueia alterações de Dono", async () => {
    const { data: linkedProf, error: linkedErr } = await admin
      .from("profissionais")
      .select("user_id, email_convite")
      .eq("id", staffProfId)
      .single();

    expect(linkedErr).toBeNull();
    expect(linkedProf?.user_id).toBe(staffUserId);

    // Funcionário consegue ler loja e serviços
    const { data: staffReadServicos, error: readErr } = await staffClient
      .from("servicos")
      .select("id, nome")
      .eq("loja_id", lojaId);
    expect(readErr).toBeNull();
    expect(staffReadServicos?.some((s) => s.id === servicoId)).toBe(true);

    // Funcionário NÃO consegue inserir serviço
    const { error: insertServErr } = await staffClient.from("servicos").insert({
      loja_id: lojaId,
      nome: "Serviço Não Autorizado",
      duracao_min: 30,
      preco_centavos: 3000,
    });
    expect(insertServErr).not.toBeNull();

    // Funcionário NÃO consegue alterar tema da loja (RLS filtra 0 linhas)
    const { data: updatedLoja } = await staffClient
      .from("lojas")
      .update({ tema: "brutal" })
      .eq("id", lojaId)
      .select("id");
    expect(updatedLoja ?? []).toHaveLength(0);

    // Funcionário NÃO consegue chamar desligar_profissional (42501)
    const { error: rpcErr } = await staffClient.rpc("desligar_profissional", {
      p_profissional_id: subProfId,
      p_transferir_para_id: null,
    });
    expect(rpcErr).not.toBeNull();

    // Anônimo NÃO consegue chamar desligar_profissional (REVOKE EXECUTE FROM anon)
    const { error: anonRpcErr } = await anonClient.rpc("desligar_profissional", {
      p_profissional_id: subProfId,
      p_transferir_para_id: null,
    });
    expect(anonRpcErr).not.toBeNull();
  });

  it("3. Dono alterna 'Também atendo clientes' (ativo=false) sem perder vínculo nem deletar", async () => {
    const { error: toggleOffErr } = await ownerClient
      .from("profissionais")
      .update({ ativo: false })
      .eq("id", ownerProfId);
    expect(toggleOffErr).toBeNull();

    const { data: afterOff } = await ownerClient
      .from("profissionais")
      .select("id, ativo, eh_dono")
      .eq("id", ownerProfId)
      .single();
    expect(afterOff?.ativo).toBe(false);
    expect(afterOff?.eh_dono).toBe(true);

    const { error: toggleOnErr } = await ownerClient
      .from("profissionais")
      .update({ ativo: true })
      .eq("id", ownerProfId);
    expect(toggleOnErr).toBeNull();
  });

  it("4. RPC desligar_profissional preserva ex_user_id_historico, zera user_id e transfere agendamentos futuros", async () => {
    const startFuture = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const endFuture = new Date(startFuture.getTime() + 30 * 60 * 1000);

    const { data: appt, error: apptErr } = await admin
      .from("agendamentos")
      .insert({
        loja_id: lojaId,
        profissional_id: staffProfId,
        origem: "manual",
        cliente_nome: "Cliente Transferido",
        inicio: startFuture.toISOString(),
        fim: endFuture.toISOString(),
        status: "confirmado",
      })
      .select("id")
      .single();
    expect(apptErr).toBeNull();

    const { error: rpcErr } = await ownerClient.rpc("desligar_profissional", {
      p_profissional_id: staffProfId,
      p_transferir_para_id: subProfId,
    });
    expect(rpcErr).toBeNull();

    const { data: offboarded } = await admin
      .from("profissionais")
      .select("ativo, user_id, ex_user_id_historico")
      .eq("id", staffProfId)
      .single();

    expect(offboarded?.ativo).toBe(false);
    expect(offboarded?.user_id).toBeNull();
    expect(offboarded?.ex_user_id_historico).toBe(staffUserId);

    const { data: transferredAppt } = await admin
      .from("agendamentos")
      .select("profissional_id, status")
      .eq("id", appt!.id)
      .single();

    expect(transferredAppt?.profissional_id).toBe(subProfId);
    expect(transferredAppt?.status).toBe("confirmado");
  });

  it("5. Schemas Zod .strict() rejeitam campos extras e entradas inválidas", () => {
    const validServ = servicoSchema.safeParse({
      loja_id: "11111111-1111-4111-8111-111111111111",
      nome: "Barba Completa",
      descricao: "Toalha quente",
      duracao_min: 30,
      preco_centavos: 3500,
      ativo: true,
    });
    expect(validServ.success).toBe(true);

    const extraFieldServ = servicoSchema.safeParse({
      loja_id: "11111111-1111-4111-8111-111111111111",
      nome: "Barba Completa",
      duracao_min: 30,
      preco_centavos: 3500,
      evil_admin_flag: true,
    });
    expect(extraFieldServ.success).toBe(false);

    const invalidTema = customizacaoLojaSchema.safeParse({
      loja_id: "11111111-1111-4111-8111-111111111111",
      tema: "tema_inventado",
      cor_primaria: "#0D9488",
      raio_borda_px: 12,
    });
    expect(invalidTema.success).toBe(false);

    const invalidHex = customizacaoLojaSchema.safeParse({
      loja_id: "11111111-1111-4111-8111-111111111111",
      tema: "urban",
      cor_primaria: "red",
      raio_borda_px: 12,
    });
    expect(invalidHex.success).toBe(false);

    const invalidInvite = conviteProfissionalSchema.safeParse({
      loja_id: "11111111-1111-4111-8111-111111111111",
      nome: "João",
      email_convite: "email-invalido",
      cargo: "Barbeiro",
      comissao_percentual: 50,
      eh_dono: true,
    });
    expect(invalidInvite.success).toBe(false);
  });
});
