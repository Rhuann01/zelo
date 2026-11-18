"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatBrDataHora, notifyUserPrioritizingPush } from "@/lib/notifications/dispatch";
import {
  atualizarStatusAgendamentoSchema,
  encaixeManualSchema,
  pushSubscriptionSchema,
  reagendarPainelSchema,
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
  const admin = createAdminClient();

  const [{ data: prof }, { data: servicos }] = await Promise.all([
    admin
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
    .select("id, cliente_id, inicio, loja:lojas(nome)")
    .maybeSingle();

  if (error || !data) {
    return { error: "Sem permissão para atualizar este agendamento." };
  }

  if (status === "cancelado" && data.cliente_id) {
    try {
      const lojaObj = Array.isArray(data.loja) ? data.loja[0] : data.loja;
      const { data: dataBr, hora: horaBr } = formatBrDataHora(data.inicio);
      await notifyUserPrioritizingPush({
        userId: data.cliente_id,
        tipo: "cancelamento",
        lojaId: loja_id,
        agendamentoId: data.id,
        title: `Horário cancelado • ${lojaObj?.nome ?? "Zelo"}`,
        body: `Seu agendamento de ${dataBr} às ${horaBr} foi cancelado pelo estabelecimento.`,
        url: "/explorar",
      });
    } catch {
      // silencioso
    }
  }

  revalidatePath("/painel");
  revalidatePath("/painel/financeiro");
  revalidatePath("/explorar");
  return { ok: true };
}

export async function reagendarOuAdiarAgendamentoAction(raw: unknown) {
  const parsed = reagendarPainelSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos para reagendar." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { agendamento_id, loja_id, novo_inicio_iso, tipo, motivo } = parsed.data;
  const novoInicioMs = Date.parse(novo_inicio_iso);
  if (Number.isNaN(novoInicioMs) || novoInicioMs < Date.now() - 60_000) {
    return { error: "Escolha um horário futuro para reagendar ou adiar." };
  }

  const { data: atual, error: fetchErr } = await supabase
    .from("agendamentos")
    .select("id, inicio, fim, cliente_id, cliente_nome, status, loja:lojas(nome)")
    .eq("id", agendamento_id)
    .eq("loja_id", loja_id)
    .maybeSingle();

  if (fetchErr || !atual) {
    return { error: "Agendamento não encontrado ou sem permissão." };
  }

  const duracaoMs = Math.max(15 * 60_000, Date.parse(atual.fim) - Date.parse(atual.inicio));
  const novoFimIso = new Date(novoInicioMs + duracaoMs).toISOString();

  const { error: updateErr } = await supabase
    .from("agendamentos")
    .update({
      inicio: novo_inicio_iso,
      fim: novoFimIso,
      status: "confirmado",
      updated_at: new Date().toISOString(),
    })
    .eq("id", agendamento_id)
    .eq("loja_id", loja_id);

  if (updateErr) {
    if (updateErr.code === "23P01") {
      return {
        error:
          "Já existe outro agendamento nesse novo horário para este profissional. Escolha outro horário.",
      };
    }
    return { error: "Não foi possível atualizar o horário do agendamento." };
  }

  if (atual.cliente_id) {
    try {
      const lojaObj = Array.isArray(atual.loja) ? atual.loja[0] : atual.loja;
      const lojaNome = lojaObj?.nome ?? "Zelo";
      const antigo = formatBrDataHora(atual.inicio);
      const novo = formatBrDataHora(novo_inicio_iso);

      const titulo =
        tipo === "adiamento"
          ? `Seu horário foi adiado • ${lojaNome}`
          : `Horário reagendado • ${lojaNome}`;
      const motivoTxt = motivo?.trim() ? ` Motivo: ${motivo.trim()}.` : "";
      const body = `Seu atendimento de ${antigo.data} às ${antigo.hora} foi ajustado para ${novo.data} às ${novo.hora}.${motivoTxt}`;

      await notifyUserPrioritizingPush({
        userId: atual.cliente_id,
        tipo,
        lojaId: loja_id,
        agendamentoId: atual.id,
        title: titulo,
        body,
        url: "/explorar",
        acaoTipo: "confirmar_adiamento",
        acaoPayload: {
          agendamento_id: atual.id,
          loja_id,
          novo_inicio_iso,
        },
      });
    } catch {
      // silencioso
    }
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

  return { ok: true };
}

export async function selecionarLojaAtivaAction(lojaId: string) {
  const parsed = z.string().uuid().safeParse(lojaId);
  if (!parsed.success) return { ok: false };
  const cookieStore = await cookies();
  cookieStore.set("zelo_loja_id", parsed.data, {
    path: "/",
    maxAge: 2592000,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  return { ok: true };
}
