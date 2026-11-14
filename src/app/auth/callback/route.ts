import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeNextPath } from "@/lib/security/sanitize-next";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const safeNext = sanitizeNextPath(searchParams.get("next"), "/painel");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (safeNext === "/painel") {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const [{ data: ownerLojas }, { data: profLinks }] = await Promise.all([
            supabase
              .from("lojas")
              .select("id")
              .eq("owner_id", user.id)
              .limit(1),
            supabase
              .from("profissionais")
              .select("id")
              .eq("user_id", user.id)
              .eq("ativo", true)
              .limit(1),
          ]);
          const hasBusiness =
            (ownerLojas?.length ?? 0) > 0 || (profLinks?.length ?? 0) > 0;
          if (!hasBusiness) {
            return NextResponse.redirect(`${origin}/explorar`);
          }
        }
      }
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  return NextResponse.redirect(`${origin}/entrar?erro=oauth`);
}
