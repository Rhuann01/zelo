import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ authenticated: false, items: [], unreadCount: 0 });
  }

  const { data: items, error } = await supabase
    .from("notificacoes")
    .select(
      "id, tipo, titulo, mensagem, url, lida, acao_tipo, acao_status, acao_payload, agendamento_id, loja_id, created_at"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) {
    return NextResponse.json({ authenticated: true, items: [], unreadCount: 0 });
  }

  const list = items ?? [];
  const unreadCount = list.filter((n) => !n.lida).length;

  return NextResponse.json({
    authenticated: true,
    items: list,
    unreadCount,
  });
}

const patchSchema = z.object({
  id: z.string().uuid().optional(),
  marcarTodas: z.boolean().optional(),
  acaoStatus: z.enum(["confirmada", "recusada", "concluida"]).optional(),
});

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  if (parsed.data.marcarTodas) {
    await supabase
      .from("notificacoes")
      .update({ lida: true })
      .eq("user_id", user.id)
      .eq("lida", false);
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.id) {
    const updateData: { lida: boolean; acao_status?: string } = { lida: true };
    if (parsed.data.acaoStatus) {
      updateData.acao_status = parsed.data.acaoStatus;
    }

    await supabase
      .from("notificacoes")
      .update(updateData)
      .eq("id", parsed.data.id)
      .eq("user_id", user.id);

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Parâmetros ausentes." }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    await supabase.from("notificacoes").delete().eq("id", id).eq("user_id", user.id);
  } else {
    await supabase.from("notificacoes").delete().eq("user_id", user.id).eq("lida", true);
  }

  return NextResponse.json({ ok: true });
}
