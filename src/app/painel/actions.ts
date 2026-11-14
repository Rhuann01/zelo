"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  atualizarStatusAgendamentoSchema,
  encaixeManualSchema,
  pushSubscriptionSchema,
} from "@/lib/schemas/painel-agenda";

export async function criarEncaixeManualAction(raw: unknown) {
  const parsed = encaixeManualSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos para encaixe." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const input = parsed.data;

  const [{ data: prof }, { data: servicos }] = await Promise.all([
    supabase
      .from("profissionais")
      .select("id, comissao_percentual")
      .eq("id", input.profissional_id)
      .eq("loja_id", input.loja_id)
      .eq("ativo", true)
      .maybeSingle(),
    supabase
      .from("servicos")
      .select("id, nome, duracao_min, preco_centavos")
      .eq("loja_id", input.loja_id)
      .eq("ativo", true)
      .in("id", input.servicos_ids),
  ]);

  if (!prof) return { error: "Profissional não encontrado ou inativo." };
  if (!servicos || servicos.length === 0) return { error: "Serviços inválidos." };

  const duracaoTotalMin = servicos.reduce((acc, s) => acc + s.duracao_min, 0);
  const totalCentavos = servicos.reduce((acc, s) => acc + s.preco_centavos, 0);
  const inicioMs = Date.parse(input.inicio_iso);
  if (Number.isNaN(inicioMs) || inicioMs < Date.now() - 60_000) {
    return { error: "Não é possível encaixar em um horário que já passou." };
  }
  const fimIso = new Date(inicioMs + duracaoTotalMin * 60_000).toISOString();

  const comissaoPct = Number(prof.comissao_percentual ?? 0);
  const comissaoCentavos = Math.round((totalCentavos * comissaoPct) / 100);
  const lucroCentavos = Math.max(0, totalCentavos - comissaoCentavos);

  const { data: agendamento, error: insertErr } = await supabase
    .from("agendamentos")
    .insert({
      loja_id: input.loja_id,
      profissional_id: input.profissional_id,
      cliente_id: null,
      origem: "manual",
      cliente_nome: input.cliente_nome,
      cliente_whatsapp: input.cliente_whatsapp || null,
      inicio: input.inicio_iso,
      fim: fimIso,
      status: "confirmado",
      total_centavos: totalCentavos,
      sinal_centavos: 0,
      comissao_percentual_aplicada: comissaoPct,
      comissao_barbeiro_centavos: comissaoCentavos,
      lucro_loja_centavos: lucroCentavos,
      observacoes: input.observacoes || null,
    })
    .select("id")
    .single();

  if (insertErr) {
    if (insertErr.code === "23P01") {
      return { error: "Já existe outro agendamento neste horário para o profissional." };
    }
    return { error: "Sem permissão ou erro ao gravar encaixe manual." };
  }

  await supabase.from("agendamento_servicos").insert(
    servicos.map((s) => ({
      loja_id: input.loja_id,
      agendamento_id: agendamento.id,
      servico_id: s.id,
      nome_snapshot: s.nome,
      duracao_min_snapshot: s.duracao_min,
      preco_centavos_snapshot: s.preco_centavos,
    }))
  );

  revalidatePath("/painel");
  return { ok: true, id: agendamento.id };
}

export async function atualizarStatusAgendamentoAction(raw: unknown) {
  const parsed = atualizarStatusAgendamentoSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Parâmetros inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { agendamento_id, loja_id, status } = parsed.data;
  const { data, error } = await supabase
    .from("agendamentos")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", agendamento_id)
    .eq("loja_id", loja_id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { error: "Sem permissão para atualizar este agendamento." };
  }

  revalidatePath("/painel");
  revalidatePath("/explorar");
  return { ok: true };
}

export async function savePushSubscriptionAction(raw: unknown) {
  const parsed = pushSubscriptionSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Assinatura Web Push inválida." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", parsed.data.endpoint);

  const { error } = await supabase.from("push_subscriptions").insert({
    user_id: user.id,
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.keys.p256dh,
    auth: parsed.data.keys.auth,
  });

  if (error) {
    return { error: "Não foi possível salvar assinatura Push." };
  }

  return { ok: true };
}
