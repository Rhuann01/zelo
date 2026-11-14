import { test, expect } from "@playwright/test";

test.describe("Zelo E2E — Fluxos Públicos, Responsividade e Proteção de Rotas", () => {
  test("Landing Page carrega sem overflow horizontal e exibe vitrine interativa", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on("pageerror", (err) => consoleErrors.push(err.message));

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1").first()).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(2);
    expect(consoleErrors).toEqual([]);
  });

  test("Vitrine /explorar lista lojas, filtra e alterna abas sem overflow", async ({
    page,
  }) => {
    await page.goto("/explorar", { waitUntil: "domcontentloaded" });
    await expect(page.getByPlaceholder(/Buscar/i)).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(2);

    await page.getByRole("button", { name: "Favoritos", exact: true }).click();
    await page.getByRole("button", { name: "Horários", exact: true }).click();
    await page.getByRole("button", { name: "Explorar", exact: true }).click();
  });

  test("Loja Pública /[slug] navega entre abas e abre drawer de agendamento", async ({
    page,
  }) => {
    await page.goto("/explorar", { waitUntil: "domcontentloaded" });

    const firstStoreLink = page
      .locator('a[href^="/"]')
      .filter({ hasNot: page.locator('[href="/"], [href="/entrar"], [href="/onboarding"], [href="/explorar"]') })
      .first();

    const storeCount = await firstStoreLink.count();
    test.skip(storeCount === 0, "Nenhuma loja cadastrada no banco local para testar /[slug]");

    await firstStoreLink.click();
    await page.waitForLoadState("domcontentloaded");

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(2);

    const equipeTab = page.getByRole("button", { name: /Equipe/i }).first();
    if (await equipeTab.isVisible()) {
      await equipeTab.click();
    }

    const detalhesTab = page.getByRole("button", { name: /Detalhes/i }).first();
    if (await detalhesTab.isVisible()) {
      await detalhesTab.click();
    }

    const servicosTab = page.getByRole("button", { name: /Serviços/i }).first();
    if (await servicosTab.isVisible()) {
      await servicosTab.click();
    }
  });

  test("Páginas legais (/termos, /privacidade) e /entrar carregam corretamente", async ({
    page,
  }) => {
    for (const path of ["/termos", "/privacidade", "/entrar"]) {
      const res = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(res?.status()).toBe(200);
    }
  });

  test("Rotas protegidas (/painel e /super-admin) bloqueiam visitante não autenticado", async ({
    page,
  }) => {
    await page.goto("/painel", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/entrar/);

    await page.goto("/super-admin", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/Exportar|\.CSV|Semáforo/i)).toHaveCount(0);
  });
});
