import type {
  CompetitionData,
  PlayerGameStatistics,
  StatisticsMode,
  StatisticsScope,
} from "../types";
import {
  BOXSCORE_METRICS,
  BOXSCORE_METRIC_KEYS,
  type BoxscoreMetric,
  isBoxscoreMetric,
} from "./boxscore-metrics";
import type {
  BoxscoreMetricCell,
  BoxscoreStatisticsPageDto,
  BoxscoreStatisticsPlayerRow,
  ReferenceMode,
  ReferenceScope,
} from "./reference-types";

const minimumPer30Seconds = 600;

function rounded(value: number): number {
  return Math.round(value * 10) / 10;
}

function available(value: number | null): BoxscoreMetricCell {
  return value === null
    ? { status: "unavailable", value: null }
    : { status: "available", value: rounded(value) };
}

function strictTotal(rows: PlayerGameStatistics[], key: keyof PlayerGameStatistics): number | null {
  const values = rows.map((row) => row[key]);
  return values.some((value) => typeof value !== "number")
    ? null
    : (values as number[]).reduce((sum, value) => sum + value, 0);
}

function knownTotal(rows: PlayerGameStatistics[], key: keyof PlayerGameStatistics): number | null {
  const values = rows
    .map((row) => row[key])
    .filter((value): value is number => typeof value === "number");
  return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
}

function percentage(made: number | null, attempted: number | null): number | null {
  return made === null || attempted === null || attempted === 0 ? null : (made / attempted) * 100;
}

function scaled(
  value: number | null,
  games: number,
  seconds: number | null,
  mode: ReferenceMode,
): BoxscoreMetricCell {
  if (value === null) return { status: "unavailable", value: null };
  if (mode === "total") return available(value);
  if (mode === "per-game") return games ? available(value / games) : available(null);
  if (seconds === null || seconds < minimumPer30Seconds) {
    return { status: "insufficient-sample", value: null };
  }
  return available((value * 1800) / seconds);
}

function normalized(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

function scopeGames(data: CompetitionData, scope: ReferenceScope) {
  if (scope === "regular") return data.games.filter((game) => game.stage === "regular");
  if (scope === "playoffs") return data.games.filter((game) => game.stage !== "regular");
  return data.games;
}

function buildRows(
  data: CompetitionData,
  scope: ReferenceScope,
  mode: ReferenceMode,
): BoxscoreStatisticsPlayerRow[] {
  const appearances = new Map<string, PlayerGameStatistics[]>();
  for (const game of scopeGames(data, scope)) {
    for (const row of game.statistics) {
      if (row.didNotPlay) continue;
      appearances.set(row.playerId, [...(appearances.get(row.playerId) ?? []), row]);
    }
  }
  const playerIds = new Map(data.players.map((player, index) => [player.id, index + 1]));
  const teamIds = new Map(data.teams.map((team, index) => [team.id, index + 1]));
  const players = new Map(data.players.map((player) => [player.id, player]));
  const teams = new Map(data.teams.map((team) => [team.id, team]));

  return [...appearances].flatMap(([playerId, rows]) => {
    const player = players.get(playerId);
    const team = player ? teams.get(player.teamId) : undefined;
    const numericPlayerId = playerIds.get(playerId);
    const numericTeamId = team ? teamIds.get(team.id) : undefined;
    if (!player || !team || !numericPlayerId || !numericTeamId) return [];

    const games = rows.length;
    const seconds = knownTotal(rows, "secondsPlayed");
    const twoMade = strictTotal(rows, "twoPointMade");
    const twoAttempted = strictTotal(rows, "twoPointAttempted");
    const threeMade = strictTotal(rows, "threePointMade");
    const threeAttempted = strictTotal(rows, "threePointAttempted");
    const freeMade = strictTotal(rows, "freeThrowMade");
    const freeAttempted = strictTotal(rows, "freeThrowAttempted");
    const offensive = strictTotal(rows, "offensiveRebounds");
    const defensive = strictTotal(rows, "defensiveRebounds");
    const fieldMade = twoMade === null || threeMade === null ? null : twoMade + threeMade;
    const fieldAttempted =
      twoAttempted === null || threeAttempted === null ? null : twoAttempted + threeAttempted;
    const jerseys = [...new Set(rows.map((row) => row.jerseyNumber).filter(Boolean))];
    const plusMinus = knownTotal(rows, "plusMinus");
    const metrics: Record<BoxscoreMetric, BoxscoreMetricCell> = {
      games: available(games),
      minutes:
        mode === "total"
          ? available(seconds === null ? null : seconds / 60)
          : available(seconds === null || !games ? null : seconds / 60 / games),
      points: scaled(strictTotal(rows, "points"), games, seconds, mode),
      rebounds: scaled(
        offensive === null || defensive === null ? null : offensive + defensive,
        games,
        seconds,
        mode,
      ),
      offensiveRebounds: scaled(offensive, games, seconds, mode),
      defensiveRebounds: scaled(defensive, games, seconds, mode),
      assists: scaled(strictTotal(rows, "assists"), games, seconds, mode),
      turnovers: scaled(strictTotal(rows, "turnovers"), games, seconds, mode),
      blocks: scaled(strictTotal(rows, "blocks"), games, seconds, mode),
      steals: scaled(strictTotal(rows, "steals"), games, seconds, mode),
      foulsCommitted: scaled(strictTotal(rows, "foulsCommitted"), games, seconds, mode),
      foulsReceived: scaled(strictTotal(rows, "foulsReceived"), games, seconds, mode),
      fieldGoalsMade: scaled(fieldMade, games, seconds, mode),
      fieldGoalsAttempted: scaled(fieldAttempted, games, seconds, mode),
      threePointersMade: scaled(threeMade, games, seconds, mode),
      threePointersAttempted: scaled(threeAttempted, games, seconds, mode),
      freeThrowsMade: scaled(freeMade, games, seconds, mode),
      freeThrowsAttempted: scaled(freeAttempted, games, seconds, mode),
      efficiency: scaled(strictTotal(rows, "efficiency"), games, seconds, mode),
      plusMinus:
        mode === "total"
          ? available(plusMinus)
          : available(plusMinus === null || !games ? null : plusMinus / games),
      fieldGoalPercentage: available(percentage(fieldMade, fieldAttempted)),
      threePointPercentage: available(percentage(threeMade, threeAttempted)),
      freeThrowPercentage: available(percentage(freeMade, freeAttempted)),
    };

    return [
      {
        playerId: numericPlayerId,
        playerName: player.name,
        playerSlug: player.slug,
        registrationId: numericPlayerId,
        teamId: numericTeamId,
        teamName: team.name,
        teamSlug: team.slug,
        teamAbbreviation: team.abbreviation,
        jersey: jerseys.length === 1 ? jerseys[0] : jerseys.length ? "var." : null,
        metrics,
      },
    ];
  });
}

function parseMode(params: URLSearchParams): ReferenceMode {
  const mode = params.get("mode");
  return mode === "total" || mode === "per-30" ? mode : "per-game";
}

function parseScope(params: URLSearchParams): ReferenceScope {
  const scope = params.get("scope");
  return scope === "regular" || scope === "playoffs" ? scope : "all";
}

function matches(value: number, operator: string, target: number): boolean {
  if (operator === ">=") return value >= target;
  if (operator === "<=") return value <= target;
  if (operator === ">") return value > target;
  if (operator === "<") return value < target;
  return value === target;
}

function compareNullable(
  left: number | string | null,
  right: number | string | null,
  direction: "asc" | "desc",
): number {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  const result =
    typeof left === "string" && typeof right === "string"
      ? left.localeCompare(right, "pt-BR", { sensitivity: "base" })
      : Number(left) - Number(right);
  return direction === "asc" ? result : -result;
}

export function buildReferenceStatistics(
  data: CompetitionData,
  params: URLSearchParams,
): BoxscoreStatisticsPageDto {
  const mode = parseMode(params);
  const scope = parseScope(params);
  const requestedSort = params.get("sort") ?? "points";
  const sort: BoxscoreMetric | "player" | "team" =
    requestedSort === "player" || requestedSort === "team" || isBoxscoreMetric(requestedSort)
      ? requestedSort
      : "points";
  const direction = params.get("dir") === "asc" ? "asc" : "desc";
  const search = normalized((params.get("q") ?? "").trim());
  const teamFilter = params.has("team") ? new Set(params.getAll("team").filter(Boolean)) : null;
  const filters = (params.get("filters") ?? "")
    .split(";")
    .slice(0, 5)
    .flatMap((serialized) => {
      const [metric, operator, rawTarget] = serialized.split(":");
      const target = Number(rawTarget);
      return metric && isBoxscoreMetric(metric) && Number.isFinite(target)
        ? [{ metric, operator, target }]
        : [];
    });
  const allRows = buildRows(data, scope, mode);
  const filtered = allRows.filter(
    (row) =>
      (!search || normalized(`${row.playerName} ${row.teamName}`).includes(search)) &&
      (teamFilter === null || teamFilter.has(row.teamSlug)) &&
      filters.every(({ metric, operator, target }) => {
        const cell = row.metrics[metric];
        return cell.status === "available" && matches(cell.value, operator, target);
      }),
  );
  const sortValue = (row: BoxscoreStatisticsPlayerRow): number | string | null => {
    if (sort === "player") return row.playerName;
    if (sort === "team") return row.teamName;
    const cell = row.metrics[sort];
    return cell.status === "available" ? cell.value : null;
  };
  const sorted = [...filtered].sort(
    (left, right) =>
      compareNullable(sortValue(left), sortValue(right), direction) ||
      left.playerName.localeCompare(right.playerName, "pt-BR"),
  );
  const leaders: Partial<Record<BoxscoreMetric, number[]>> = {};
  for (const metric of BOXSCORE_METRIC_KEYS) {
    const rows = filtered.filter((row) => row.metrics[metric].status === "available");
    if (!rows.length) continue;
    const values = rows.map((row) => (row.metrics[metric] as { value: number }).value);
    const leading = Math[BOXSCORE_METRICS[metric].lowerIsBetter ? "min" : "max"](...values);
    leaders[metric] = rows
      .filter((row) => (row.metrics[metric] as { value: number }).value === leading)
      .map((row) => row.playerId);
  }
  const requestedPage = Number(params.get("page"));
  const totalPages = Math.max(1, Math.ceil(sorted.length / 20));
  const page = Math.min(
    Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1,
    totalPages,
  );
  const comparedIds = [...new Set((params.get("compare") ?? "").split(","))]
    .map(Number)
    .filter((value) => Number.isSafeInteger(value) && value > 0)
    .slice(0, 2);

  return {
    kind: "boxscore-v2",
    competitionId: 1,
    publicationId: 1,
    per30MinimumSeconds: minimumPer30Seconds,
    mode,
    scope,
    sort,
    direction,
    page,
    pageSize: 20,
    total: sorted.length,
    totalPages,
    rows: sorted.slice((page - 1) * 20, page * 20),
    compared: comparedIds.flatMap((id) => allRows.find((row) => row.playerId === id) ?? []),
    leaders,
    teams: data.teams
      .map((team, index) => ({ id: index + 1, name: team.name, slug: team.slug }))
      .sort((left, right) => left.name.localeCompare(right.name, "pt-BR")),
    playerOptions: allRows
      .map((row) => ({ id: row.playerId, name: row.playerName, teamName: row.teamName }))
      .sort((left, right) => left.name.localeCompare(right.name, "pt-BR")),
    coverage: {
      regularGames: data.games.filter((game) => game.stage === "regular").length,
      playoffGames: data.games.filter((game) => game.stage !== "regular").length,
      unclassifiedGames: 0,
    },
  };
}

export function referenceScope(params: URLSearchParams): StatisticsScope {
  return parseScope(params);
}

export function referenceMode(params: URLSearchParams): StatisticsMode {
  return parseMode(params);
}
