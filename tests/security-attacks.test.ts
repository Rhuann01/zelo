import { describe, expect, it } from "vitest";
import { sanitizeCsvCell, sanitizeNextPath } from "@/lib/security/sanitize-next";
import { criarAgendamentoSchema } from "@/lib/schemas/agendamento";

const BASE_URL = "http://localhost:3001";

describe("Segurança — Testes Defensivos Contra Ataques Conhecidos", () => {
  it("bloqueia vetores de Open Redirect no parâmetro next", () => {
    const payloads = [
      "//evil.com",
      "/\\evil.com",
      "https://evil.com/phishing",
      "http://evil.com",
      "javascript:alert(1)",
      "//evil.com/%2f..",
      "/painel\nSet-Cookie: a=b",
      "  //evil.com  ",
    ];
    for (const p of payloads) {
      expect(sanitizeNextPath(p, "/painel")).toBe("/painel");
    }

    expect(sanitizeNextPath("/explorar", "/painel")).toBe("/explorar");
    expect(sanitizeNextPath("/onboarding", "/painel")).toBe("/onboarding");
    expect(sanitizeNextPath("/barbearia-teste?tab=servicos", "/painel")).toBe(
      "/barbearia-teste?tab=servicos"
    );
  });

  it("neutraliza CSV Formula Injection (DDE / Excel / LibreOffice)", () => {
    expect(sanitizeCsvCell("=cmd|'/C calc'!A0")).toBe(`"'=cmd|'/C calc'!A0"`);
    expect(sanitizeCsvCell("+SUM(A1:A2)")).toBe(`"'+SUM(A1:A2)"`);
    expect(sanitizeCsvCell("-1+1")).toBe(`"'-1+1"`);
    expect(sanitizeCsvCell("@SUM(1+1)")).toBe(`"'@SUM(1+1)"`);
    expect(sanitizeCsvCell("\t=1")).toBe(`"'\t=1"`);
    expect(sanitizeCsvCell("Belo Horizonte")).toBe(`"Belo Horizonte"`);
  });

  it("bloqueia Mass Assignment e telefones falsos/repetidos no agendamento", () => {
    const basePayload = {
      loja_id: "11111111-1111-4111-8111-111111111111",
      profissional_id: "22222222-2222-4222-8222-222222222222",
      servicos_ids: ["33333333-3333-4333-8333-333333333333"],
      inicio_iso: "2026-11-20T14:00:00-03:00",
    };

    // Telefones falsos ou vazios devem falhar
    for (const badPhone of [
      "",
      "44444444",
      "11999999999",
      "00912345678",
      "11812345678", // 11 dígitos sem 9º dígito
      "11912345678".replace("912345678", "123456789"),
    ]) {
      const res = criarAgendamentoSchema.safeParse({
        ...basePayload,
        whatsapp_cliente: badPhone,
      });
      expect(res.success).toBe(false);
    }

    // Mass Assignment (.strict()) deve rejeitar campos extras como total_centavos ou status
    const massAssign = criarAgendamentoSchema.safeParse({
      ...basePayload,
      whatsapp_cliente: "(11) 98765-4321",
      total_centavos: 0,
      status: "concluido",
    });
    expect(massAssign.success).toBe(false);

    // Payload limpo e válido deve passar
    const valid = criarAgendamentoSchema.safeParse({
      ...basePayload,
      whatsapp_cliente: "(11) 99142-8374",
    });
    expect(valid.success).toBe(true);
  });

  it("bloqueia acesso anônimo ao /super-admin, webhook Asaas sem token e Open Redirect HTTP", async () => {
    const adminRes = await fetch(`${BASE_URL}/super-admin`, { redirect: "manual" });
    const adminHtml = await adminRes.text();
    expect(adminHtml).toContain("Acesso Restrito");
    expect(adminHtml).not.toContain("Exportar .CSV");

    const exportRes = await fetch(`${BASE_URL}/super-admin/export`, {
      redirect: "manual",
    });
    expect([307, 401, 403]).toContain(exportRes.status);

    const webhookRes = await fetch(`${BASE_URL}/api/webhooks/asaas`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "asaas-access-token": "token-falso-atacante",
      },
      body: JSON.stringify({ event: "PAYMENT_CONFIRMED" }),
    });
    expect([401, 403, 500]).toContain(webhookRes.status);

    const callbackRes = await fetch(`${BASE_URL}/auth/callback?next=//evil.com`, {
      redirect: "manual",
    });
    const loc = callbackRes.headers.get("location") ?? "";
    expect(loc).not.toContain("evil.com");
  });
});
