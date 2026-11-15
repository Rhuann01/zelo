"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatBrDataHora, notifyUserPrioritizingPush } from "@/lib/notifications/dispatch";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/security/rate-limit";
import { verifyTurnstileToken } from "@/lib/security/turnstile";
import {
  calcularSlotsDisponiveis,
  type HorariosLojaConfig,
  type SlotDisponivel,
} from "@/lib/booking/disponibilidade";
import {
  cancelarOuRemarcarSchema,
  criarAgendamentoSchema,
  horariosDisponiveisQuerySchema,
} from "@/lib/schemas/agendamento";

export async function getSlotsDisponiveisAction(raw: unknown): Promise<{
  error?: string;
  slots?: SlotDisponivel[];
}> {
  const parsed = horariosDisponiveisQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Parâmetros inválidos." };
  }

  const { loja_id, profissional_id, data, duracao_total_min } = parsed.data;
  const supabase = await createClient();

  const { data: loja } = await supabase
    .from("lojas")
    .select("horarios_loja, pausada")
    .eq("id", loja_id)
    .maybeSingle();

  if (!loja) return { error: "Estabelecimento não encontrado." };
  if (loja.pausada) return { slots: [] };

  const inicioDia = `${data}T00:00:00-03:00`;
  const fimDia = `${data}T23:59:59-03:00`;

  const { data: ocupados, error } = await supabase.rpc("get_horarios_ocupados", {
    p_loja_id: loja_id,
    p_profissional_id: profissional_id,
    p_data_inicio: inicioDia,
    p_data_fim: fimDia,
  });

  if (error) {
    return { error: "Não foi possível consultar a disponibilidade." };
  }

  const slots = calcularSlotsDisponiveis({
    dataYmd: data,
    horariosLoja: (loja.horarios_loja ?? {}) as HorariosLojaConfig,
    duracaoTotalMin: duracao_total_min,
    ocupados: (ocupados ?? []).map((o: { inicio: string; fim: string }) => ({
      inicio: o.inicio,
      fim: o.fim,
    })),
    passoMin: 15,
    nowMs: Date.now(),
    antecedenciaMin: 15,
  });

  return { slots };
}

export async function criarAgendamentoAction(raw: unknown): Promise<{
  error?: string;
  ok?: boolean;
  agendamento?: {
    agendamento_id: string;
    inicio: string;
    fim: string;
    total_centavos: number;
    sinal_centavos: number;
    token_remarcacao: string;
  };
}> {
  const parsed = criarAgendamentoSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados do agendamento inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Faça login com o Google para confirmar seu horário." };
  }

  const input = parsed.data;
  const reqHeaders = await headers();
  const clientIp = getClientIpFromHeaders(reqHeaders);
  const rl = checkRateLimit(`booking:create:${user.id}:${clientIp}`, 15, 5 * 60_000);
  if (!rl.allowed) {
    return { error: "Muitas tentativas de agendamento. Aguarde alguns minutos." };
  }

  const turnstile = await verifyTurnstileToken(input.turnstile_token, clientIp);
  if (!turnstile.ok) {
    return { error: turnstile.error ?? "Verificação anti-robô falhou." };
  }

  const inicioMs = Date.parse(input.inicio_iso);
  if (Number.isNaN(inicioMs) || inicioMs <= Date.now()) {
    return { error: "Escolha um horário futuro para agendar." };
  }

  const admin = createAdminClient();
  const { data: lojaBilling } = await admin
    .from("lojas")
    .select("nome, owner_id, assinatura_status, trial_ate")
    .eq("id", input.loja_id)
    .maybeSingle();

  if (lojaBilling) {
    const trialExpirado =
      lojaBilling.assinatura_status === "trial" &&
      Date.parse(lojaBilling.trial_ate) < Date.now();
    if (
      trialExpirado ||
      lojaBilling.assinatura_status === "atrasada" ||
      lojaBilling.assinatura_status === "cancelada"
    ) {
      return {
        error: "Este estabelecimento está com a agenda online temporariamente indisponível.",
      };
    }
  }

  // Salva WhatsApp no perfil do cliente se informado no 1º agendamento
  if (input.whatsapp_cliente && input.whatsapp_cliente.trim().length >= 10) {
    await supabase
      .from("perfis")
      .update({
        whatsapp: input.whatsapp_cliente.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
  }

  const { data, error } = await supabase.rpc("criar_agendamento_online", {
    p_loja_id: input.loja_id,
    p_profissional_id: input.profissional_id,
    p_servicos_ids: input.servicos_ids,
    p_inicio: input.inicio_iso,
    p_beneficiario_nome: input.beneficiario_nome ?? null,
    p_beneficiario_whatsapp: input.beneficiario_whatsapp ?? null,
    p_observacoes: input.observacoes ?? null,
  });

  if (error) {
    if (error.code === "23P01" || error.message.includes("HORARIO_BLOQUEADO")) {
      return {
        error: "Esse horário acabou de ser reservado ou bloqueado. Escolha outro horário.",
      };
    }
    if (error.message.includes("LOJA_PAUSADA")) {
      return { error: "Este estabelecimento está temporariamente pausado." };
    }
    if (error.message.includes("HORARIO_NO_PASSADO")) {
      return { error: "Escolha um horário futuro para agendar." };
    }
    return { error: "Não foi possível concluir o agendamento. Tente novamente." };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return { error: "Falha ao registrar o agendamento." };
  }

  try {
    const [{ data: prof }, { data: srvs }, { data: perfilCli }] = await Promise.all([
      admin
        .from("profissionais")
        .select("user_id")
        .eq("id", input.profissional_id)
        .maybeSingle(),
      admin
        .from("servicos")
        .select("nome")
        .in("id", input.servicos_ids),
      admin
        .from("perfis")
        .select("nome")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

    const { data: dataBr, hora: horaBr } = formatBrDataHora(row.inicio);
    const servicosTexto = (srvs ?? []).map((s) => s.nome).join(" + ") || "Atendimento";
    const clienteNome =
      input.beneficiario_nome?.trim() || perfilCli?.nome?.trim() || "Cliente";
    const lojaNome = lojaBilling?.nome ?? "Zelo";

    const destinatarios = new Set<string>();
    if (prof?.user_id) destinatarios.add(prof.user_id);
    if (lojaBilling?.owner_id) destinatarios.add(lojaBilling.owner_id);

    await Promise.all([
      ...Array.from(destinatarios).map((destId) =>
        notifyUserPrioritizingPush({
          userId: destId,
          tipo: "novo_agendamento",
          lojaId: input.loja_id,
          agendamentoId: row.agendamento_id,
          title: `Novo agendamento • ${lojaNome}`,
          body: `${clienteNome} marcou ${servicosTexto} em ${dataBr} às ${horaBr}.`,
          url: "/painel",
        })
      ),
      notifyUserPrioritizingPush({
        userId: user.id,
        tipo: "sistema",
        lojaId: input.loja_id,
        agendamentoId: row.agendamento_id,
        title: `Horário confirmado • ${lojaNome}`,
        body: `Seu atendimento (${servicosTexto}) está marcado para ${dataBr} às ${horaBr}.`,
        url: "/explorar",
      }),
    ]);
  } catch {
    // Falha de push/notificação não cancela reserva confirmada
  }

  revalidatePath("/painel");
  revalidatePath("/explorar");
  return { ok: true, agendamento: row };
}

export async function cancelarOuRemarcarAction(raw: unknown): Promise<{
  error?: string;
  ok?: boolean;
}> {
  const parsed = cancelarOuRemarcarSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { agendamento_id, acao, novo_inicio_iso } = parsed.data;
  if (acao === "remarcar" && novo_inicio_iso) {
    const novoMs = Date.parse(novo_inicio_iso);
    if (Number.isNaN(novoMs) || novoMs <= Date.now()) {
      return { error: "Escolha um horário futuro para remarcar." };
    }
  }
  const { error } = await supabase.rpc("cancelar_ou_remarcar", {
    p_agendamento_id: agendamento_id,
    p_acao: acao,
    p_novo_inicio: novo_inicio_iso ?? null,
  });

  if (error) {
    if (error.message.includes("ANTECEDENCIA_MINIMA_EXCEDIDA")) {
      return {
        error: "Prazo mínimo de antecedência expirado. Entre em contato pelo WhatsApp da loja.",
      };
    }
    if (error.code === "23P01" || error.message.includes("HORARIO_BLOQUEADO")) {
      return { error: "O novo horário escolhido já está ocupado." };
    }
    return { error: "Não foi possível atualizar o agendamento." };
  }

  try {
    const admin = createAdminClient();
    const { data: ag } = await admin
      .from("agendamentos")
      .select("id, loja_id, cliente_nome, inicio, loja:lojas(nome, owner_id), profissional:profissionais(user_id)")
      .eq("id", agendamento_id)
      .maybeSingle();

    if (ag) {
      const lojaObj = Array.isArray(ag.loja) ? ag.loja[0] : ag.loja;
      const profObj = Array.isArray(ag.profissional) ? ag.profissional[0] : ag.profissional;
      const { data: dataBr, hora: horaBr } = formatBrDataHora(ag.inicio);
      const destinatarios = new Set<string>();
      if (profObj?.user_id) destinatarios.add(profObj.user_id);
      if (lojaObj?.owner_id) destinatarios.add(lojaObj.owner_id);

      await Promise.all(
        Array.from(destinatarios).map((destId) =>
          notifyUserPrioritizingPush({
            userId: destId,
            tipo: acao === "cancelar" ? "cancelamento" : "reagendamento",
            lojaId: ag.loja_id,
            agendamentoId: ag.id,
            title:
              acao === "cancelar"
                ? `Horário cancelado • ${lojaObj?.nome ?? "Zelo"}`
                : `Horário remarcado • ${lojaObj?.nome ?? "Zelo"}`,
            body:
              acao === "cancelar"
                ? `${ag.cliente_nome} cancelou o horário de ${dataBr} às ${horaBr}.`
                : `${ag.cliente_nome} remarcou o atendimento para ${dataBr} às ${horaBr}.`,
            url: "/painel",
          })
        )
      );
    }
  } catch {
    // silencioso
  }

  revalidatePath("/painel");
  revalidatePath("/explorar");
  return { ok: true };
}
