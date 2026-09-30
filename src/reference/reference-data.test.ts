import { describe, expect, it } from "vitest";
import dataJson from "../data/competition.json";
import type { CompetitionData } from "../types";
import { buildReferenceStatistics } from "./reference-data";

const data = dataJson as CompetitionData;

describe("adaptador da interface da PR #54", () => {
  it("expõe todos os atletas que participaram sem usar camisa como identidade", () => {
    const page = buildReferenceStatistics(data, new URLSearchParams("scope=all"));
    expect(page.total).toBe(98);
    expect(page.playerOptions.some((player) => player.name === "Jhonatan Dos Santos")).toBe(true);
    const lucas = page.rows
      .concat(
        buildReferenceStatistics(data, new URLSearchParams("scope=all&page=2")).rows,
        buildReferenceStatistics(data, new URLSearchParams("scope=all&page=3")).rows,
        buildReferenceStatistics(data, new URLSearchParams("scope=all&page=4")).rows,
        buildReferenceStatistics(data, new URLSearchParams("scope=all&page=5")).rows,
      )
      .find((row) => row.playerName === "Lucas Pereira Gaspar");
    expect(lucas?.jersey).toBe("var.");
  });

  it("mantém busca, checkbox de equipe e escopo na URL", () => {
    const jhonatan = buildReferenceStatistics(
      data,
      new URLSearchParams("scope=all&q=Jhonatan&team=alcateia"),
    );
    expect(jhonatan.total).toBe(1);
    expect(jhonatan.rows[0]).toMatchObject({
      playerName: "Jhonatan Dos Santos",
      jersey: "3",
      teamAbbreviation: "ALC",
    });
    expect(buildReferenceStatistics(data, new URLSearchParams("scope=all&team=")).total).toBe(0);
  });
});
