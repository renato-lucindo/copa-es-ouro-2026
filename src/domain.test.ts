import { describe, expect, it } from "vitest";
import dataJson from "./data/competition.json";
import { aggregatePlayerStatistics, calculateStandings } from "./domain";
import type { CompetitionData } from "./types";

const data = dataJson as CompetitionData;

describe("dados canônicos da Copa ES Ouro 2026", () => {
  it("contém 15 jogos regulares, duas semifinais e uma final", () => {
    expect(data.games.filter((game) => game.stage === "regular")).toHaveLength(15);
    expect(data.games.filter((game) => game.stage === "semifinal")).toHaveLength(2);
    expect(data.games.filter((game) => game.stage === "final")).toHaveLength(1);
  });

  it("mantém cinco jogos regulares por equipe", () => {
    const regular = data.games.filter((game) => game.stage === "regular");
    for (const team of data.teams) {
      expect(
        regular.filter((game) => game.homeTeamId === team.id || game.awayTeamId === team.id),
        team.abbreviation,
      ).toHaveLength(5);
    }
  });

  it("calcula a classificação com a minitabela do empate triplo", () => {
    expect(calculateStandings(data).map((row) => row.id)).toEqual([
      "ivv",
      "ava",
      "cac",
      "sal",
      "san",
      "alc",
    ]);
  });

  it("inclui Jhonatan e fecha o placar de ALC x SAN", () => {
    const game = data.games.find((candidate) => candidate.id === "5205820");
    const row = game?.statistics.find(
      (candidate) => candidate.playerId === "alc-jhonatan-dos-santos",
    );
    expect(row).toMatchObject({
      jerseyNumber: "3",
      secondsPlayed: 1161,
      points: 4,
      twoPointMade: 2,
      twoPointAttempted: 5,
      offensiveRebounds: 1,
      defensiveRebounds: 5,
      assists: 1,
      steals: 1,
      plusMinus: 2,
    });
    expect(
      game?.statistics
        .filter((candidate) => candidate.teamId === "alc" && !candidate.didNotPlay)
        .reduce((sum, candidate) => sum + (candidate.points ?? 0), 0),
    ).toBe(56);
  });

  it("não usa camisa como identidade", () => {
    const alcThree = new Set(
      data.games.flatMap((game) =>
        game.statistics
          .filter((row) => row.teamId === "alc" && row.jerseyNumber === "3")
          .map((row) => row.playerId),
      ),
    );
    expect(alcThree.size).toBeGreaterThan(1);
    expect(alcThree).toContain("alc-jhonatan-dos-santos");

    const lucasJerseys = new Set(
      data.games.flatMap((game) =>
        game.statistics
          .filter((row) => row.playerId === "alc-lucas-pereira-gaspar")
          .map((row) => row.jerseyNumber),
      ),
    );
    expect(lucasJerseys.size).toBeGreaterThan(1);
  });

  it("não conta DNP como jogo disputado", () => {
    const totals = aggregatePlayerStatistics(data, "all", "total");
    const franco = totals.find((row) => row.playerId === "cac-franco-campos-junger");
    const played = data.games.filter((game) =>
      game.statistics.some((row) => row.playerId === franco?.playerId && row.didNotPlay === false),
    ).length;
    expect(franco?.metrics.games).toBe(played);
  });

  it("preserva aliases sem duplicar o atleta", () => {
    const wanderson = data.players.filter((player) =>
      [player.name, ...player.aliases].some((name) =>
        name.toLocaleLowerCase("pt-BR").includes("wanderson de jesus"),
      ),
    );
    expect(wanderson).toHaveLength(1);
  });

  it("reconcilia pontos, arremessos e períodos em todos os jogos", () => {
    for (const game of data.games) {
      expect(
        game.homePeriods.reduce((sum, value) => sum + value, 0),
        game.id,
      ).toBe(game.homeScore);
      expect(
        game.awayPeriods.reduce((sum, value) => sum + value, 0),
        game.id,
      ).toBe(game.awayScore);
      for (const row of game.statistics.filter((candidate) => !candidate.didNotPlay)) {
        expect(
          2 * (row.twoPointMade ?? 0) + 3 * (row.threePointMade ?? 0) + (row.freeThrowMade ?? 0),
          `${game.id}:${row.playerId}`,
        ).toBe(row.points);
      }
    }
  });
});
