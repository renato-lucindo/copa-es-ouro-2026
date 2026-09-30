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
  await page.goto("/estatisticas?scope=all");
  await page.getByRole("searchbox", { name: "Buscar" }).fill("Jhonatan");
  const row = page.getByRole("row", { name: /Jhonatan Dos Santos/ });
  await expect(row).toContainText("#3");
  await expect(row).toContainText("ALC");

  await page.goto("/jogos/5205820");
  await expect(page.getByText("Jhonatan Dos Santos", { exact: true })).toBeVisible();
  await expect(page.locator(".scoreboard")).toContainText("56");
  await expect(page.locator(".scoreboard")).toContainText("62");
});

test("filtra equipes por checkbox e alterna o escopo", async ({ page }) => {
  await page.goto("/estatisticas?scope=all");
  await page.locator(".reference-filters > summary").click();
  await page.getByRole("button", { name: "Não selecionar nenhuma equipe" }).click();
  await expect(page.getByText(/0 atletas/)).toBeVisible();
  await page.getByLabel("Alcateia").check();
  await expect(page.getByText(/Por jogo · todos os jogos/)).toBeVisible();
  await page.getByText("Eliminatórias", { exact: true }).click();
  await expect(page.getByText(/Por jogo · eliminatórias/)).toBeVisible();
});

test("compara dois jogadores no modo e escopo atuais", async ({ page }) => {
  await page.goto("/estatisticas?scope=all");
  await page.getByRole("button", { name: "Comparar jogadores" }).click();
  const dialog = page.getByRole("dialog", { name: "Comparar jogadores" });
  const pickers = dialog.locator(".reference-player-picker");
  await pickers.nth(0).getByRole("searchbox").fill("Jhonatan");
  await pickers
    .nth(0)
    .getByRole("button", { name: /Jhonatan Dos Santos/ })
    .click();
  await pickers.nth(1).getByRole("searchbox").fill("Lucas Pereira Gaspar");
  await pickers
    .nth(1)
    .getByRole("button", { name: /Lucas Pereira Gaspar/ })
    .click();
  await expect(dialog.getByText("Comparação no modo e escopo atuais")).toBeVisible();
  await expect(dialog.getByText("Jhonatan Dos Santos", { exact: true }).first()).toBeVisible();
  await expect(dialog.getByText("Lucas Pereira Gaspar", { exact: true }).first()).toBeVisible();
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
  await page.goto("/estatisticas?scope=all");
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  });
  await expect(page.getByRole("searchbox", { name: "Buscar" })).toBeVisible();
  await page.locator(".reference-filters > summary").click();
  await expect(page.getByRole("button", { name: "Não selecionar nenhuma equipe" })).toBeVisible();
  await page.reload();
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.scrollTo(0, 0);
  });
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Pular para o conteúdo principal" })).toBeFocused();
});
