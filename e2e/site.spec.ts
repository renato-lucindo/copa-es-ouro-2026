import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("publica visão geral, classificação e chaveamento", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("campeonato inteiro");
  await expect(page.getByText("Instituto Viva Vida", { exact: true }).first()).toBeVisible();

  await page.goto("/classificacao");
  const rows = page.locator(".standings-table tbody tr");
  await expect(rows).toHaveCount(6);
  await expect(rows.nth(0)).toContainText("Instituto Viva Vida");
  await expect(rows.nth(1)).toContainText("AVABES");
  await expect(rows.nth(2)).toContainText("Clube Álvares Cabral");
  await expect(page.getByText("IVV campeão")).toBeVisible();
});

test("encontra Jhonatan e mantém a camisa no contexto do jogo", async ({ page }) => {
  await page.goto("/estatisticas");
  await page.getByRole("searchbox", { name: "Buscar atleta ou equipe" }).fill("Jhonatan");
  const row = page.getByRole("row", { name: /Jhonatan Dos Santos/ });
  await expect(row).toContainText("#3");
  await expect(row).toContainText("ALC");

  await page.goto("/jogos/5205820");
  await expect(page.getByText("Jhonatan Dos Santos", { exact: true })).toBeVisible();
  await expect(page.locator(".scoreboard")).toContainText("56");
  await expect(page.locator(".scoreboard")).toContainText("62");
});

test("filtra equipes por checkbox e alterna o escopo", async ({ page }) => {
  await page.goto("/estatisticas");
  await page.getByRole("button", { name: "Nenhuma" }).click();
  await expect(page.getByText(/0 atletas/)).toBeVisible();
  await page.getByLabel("ALC").check();
  await expect(page.getByText(/atletas · Fase regular/)).toBeVisible();
  await page.getByText("Eliminatórias", { exact: true }).click();
  await expect(page.getByText(/atletas · Eliminatórias/)).toBeVisible();
});

test("não apresenta violações automáticas críticas de acessibilidade", async ({ page }) => {
  for (const path of ["/", "/classificacao", "/estatisticas", "/jogos/5205820"]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, path).toEqual([]);
  }
});

test("mantém controles utilizáveis com reflow equivalente a 200%", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/estatisticas");
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  });
  await expect(page.getByRole("searchbox", { name: "Buscar atleta ou equipe" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Nenhuma" })).toBeVisible();
  await page.keyboard.press("Home");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Ir para o conteúdo" })).toBeFocused();
});
