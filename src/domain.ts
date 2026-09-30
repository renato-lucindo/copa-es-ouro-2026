import type {
  CompetitionData,
  Game,
  MetricKey,
  PlayerGameStatistics,
  StandingRow,
  StatisticsMode,
  StatisticsRow,
  StatisticsScope,
  Team,
} from "./types";

export const metricLabels: Record<MetricKey, string> = {
  games: "J",
  minutes: "MIN",
  points: "PTS",
  rebounds: "REB",
  offensiveRebounds: "RO",
  defensiveRebounds: "RD",
  assists: "AST",
  steals: "BR",
  blocks: "TO",
  turnovers: "ER",
  foulsCommitted: "FC",
  foulsReceived: "FR",
  efficiency: "EF",
  plusMinus: "+/-",
  fieldGoalPercentage: "FG%",
  threePointPercentage: "3P%",
  freeThrowPercentage: "LL%",
};

export const defaultMetrics: MetricKey[] = [
  "games",
  "minutes",
  "points",
  "rebounds",
  "assists",
  "steals",
  "blocks",
  "efficiency",
  "fieldGoalPercentage",
  "threePointPercentage",
  "freeThrowPercentage",
  "plusMinus",
];

const zeroStanding = (team: Team): Omit<StandingRow, "position"> => ({
  ...team,
  games: 0,
  wins: 0,
  losses: 0,
  pointsFor: 0,
  pointsAgainst: 0,
  pointDifference: 0,
  miniWins: 0,
  miniPointDifference: 0,
});

export function calculateStandings(data: CompetitionData): StandingRow[] {
  const regularGames = data.games.filter((game) => game.stage === "regular");
  const base = new Map(data.teams.map((team) => [team.id, zeroStanding(team)]));

  for (const game of regularGames) {
    const home = base.get(game.homeTeamId);
    const away = base.get(game.awayTeamId);
    if (!home || !away) continue;
    home.games += 1;
    away.games += 1;
    home.pointsFor += game.homeScore;
    home.pointsAgainst += game.awayScore;
    away.pointsFor += game.awayScore;
    away.pointsAgainst += game.homeScore;
    if (game.homeScore > game.awayScore) {
      home.wins += 1;
      away.losses += 1;
    } else {
      away.wins += 1;
      home.losses += 1;
    }
  }

  for (const row of base.values()) row.pointDifference = row.pointsFor - row.pointsAgainst;
  const groups = new Map<number, Array<Omit<StandingRow, "position">>>();
  for (const row of base.values()) groups.set(row.wins, [...(groups.get(row.wins) ?? []), row]);
  const orderedWins = [...groups.keys()].sort((left, right) => right - left);
  const result: Array<Omit<StandingRow, "position">> = [];

  for (const wins of orderedWins) {
    const group = groups.get(wins) ?? [];
    const ids = new Set(group.map((row) => row.id));
    const mini = new Map(group.map((row) => [row.id, { wins: 0, for: 0, against: 0 }]));
    if (group.length > 1) {
      for (const game of regularGames) {
        if (!ids.has(game.homeTeamId) || !ids.has(game.awayTeamId)) continue;
        const home = mini.get(game.homeTeamId);
        const away = mini.get(game.awayTeamId);
        if (!home || !away) continue;
        home.for += game.homeScore;
        home.against += game.awayScore;
        away.for += game.awayScore;
        away.against += game.homeScore;
        if (game.homeScore > game.awayScore) home.wins += 1;
        else away.wins += 1;
      }
    }
    for (const row of group) {
      const record = mini.get(row.id);
      row.miniWins = record?.wins ?? 0;
      row.miniPointDifference = record ? record.for - record.against : 0;
    }
    result.push(
      ...group.sort(
        (left, right) =>
          right.miniWins - left.miniWins ||
          right.miniPointDifference - left.miniPointDifference ||
          right.pointDifference - left.pointDifference ||
          right.pointsFor - left.pointsFor ||
          left.name.localeCompare(right.name, "pt-BR"),
      ),
    );
  }

  return result.map((row, index) => ({ ...row, position: index + 1 }));
}

export function gamesForScope(games: Game[], scope: StatisticsScope): Game[] {
  if (scope === "regular") return games.filter((game) => game.stage === "regular");
  if (scope === "playoffs") return games.filter((game) => game.stage !== "regular");
  return games;
}

const total = (rows: PlayerGameStatistics[], key: keyof PlayerGameStatistics): number | null => {
  const values = rows.map((row) => row[key]);
  return values.some((value) => typeof value !== "number")
    ? null
    : (values as number[]).reduce((sum, value) => sum + value, 0);
};

const knownTotal = (
  rows: PlayerGameStatistics[],
  key: keyof PlayerGameStatistics,
): number | null => {
  const values = rows
    .map((row) => row[key])
    .filter((value): value is number => typeof value === "number");
  return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
};

const percent = (made: number | null, attempted: number | null): number | null =>
  made === null || attempted === null || attempted === 0 ? null : (made / attempted) * 100;

const scale = (
  value: number | null,
  mode: StatisticsMode,
  games: number,
  secondsPlayed: number,
): number | null => {
  if (value === null) return null;
  if (mode === "total") return value;
  if (mode === "per-game") return games ? value / games : null;
  return secondsPlayed >= 600 ? (value * 1800) / secondsPlayed : null;
};

export function aggregatePlayerStatistics(
  data: CompetitionData,
  scope: StatisticsScope,
  mode: StatisticsMode,
): StatisticsRow[] {
  const games = gamesForScope(data.games, scope);
  const appearances = new Map<string, PlayerGameStatistics[]>();
  for (const game of games) {
    for (const row of game.statistics) {
      if (row.didNotPlay) continue;
      appearances.set(row.playerId, [...(appearances.get(row.playerId) ?? []), row]);
    }
  }
  const playerById = new Map(data.players.map((player) => [player.id, player]));
  const teamById = new Map(data.teams.map((team) => [team.id, team]));

  return [...appearances].flatMap(([playerId, rows]): StatisticsRow[] => {
    const player = playerById.get(playerId);
    const team = player ? teamById.get(player.teamId) : null;
    if (!player || !team) return [];
    const secondsPlayed = knownTotal(rows, "secondsPlayed") ?? 0;
    const gamesPlayed = rows.length;
    const twoMade = total(rows, "twoPointMade");
    const twoAttempted = total(rows, "twoPointAttempted");
    const threeMade = total(rows, "threePointMade");
    const threeAttempted = total(rows, "threePointAttempted");
    const freeMade = total(rows, "freeThrowMade");
    const freeAttempted = total(rows, "freeThrowAttempted");
    const offensive = total(rows, "offensiveRebounds");
    const defensive = total(rows, "defensiveRebounds");
    const jerseyNumbers = [...new Set(rows.map((row) => row.jerseyNumber))];
    const plusMinus = knownTotal(rows, "plusMinus");
    return [
      {
        playerId,
        playerSlug: player.slug,
        playerName: player.name,
        teamId: team.id,
        teamName: team.name,
        teamAbbreviation: team.abbreviation,
        jersey: jerseyNumbers.length === 1 ? jerseyNumbers[0] : "var.",
        secondsPlayed,
        metrics: {
          games: gamesPlayed,
          minutes:
            mode === "total"
              ? secondsPlayed / 60
              : mode === "per-game"
                ? secondsPlayed / 60 / gamesPlayed
                : 30,
          points: scale(total(rows, "points"), mode, gamesPlayed, secondsPlayed),
          rebounds: scale(
            offensive === null || defensive === null ? null : offensive + defensive,
            mode,
            gamesPlayed,
            secondsPlayed,
          ),
          offensiveRebounds: scale(offensive, mode, gamesPlayed, secondsPlayed),
          defensiveRebounds: scale(defensive, mode, gamesPlayed, secondsPlayed),
          assists: scale(total(rows, "assists"), mode, gamesPlayed, secondsPlayed),
          steals: scale(total(rows, "steals"), mode, gamesPlayed, secondsPlayed),
          blocks: scale(total(rows, "blocks"), mode, gamesPlayed, secondsPlayed),
          turnovers: scale(total(rows, "turnovers"), mode, gamesPlayed, secondsPlayed),
          foulsCommitted: scale(total(rows, "foulsCommitted"), mode, gamesPlayed, secondsPlayed),
          foulsReceived: scale(total(rows, "foulsReceived"), mode, gamesPlayed, secondsPlayed),
          efficiency: scale(total(rows, "efficiency"), mode, gamesPlayed, secondsPlayed),
          plusMinus:
            mode === "total" ? plusMinus : plusMinus === null ? null : plusMinus / gamesPlayed,
          fieldGoalPercentage: percent(
            twoMade === null || threeMade === null ? null : twoMade + threeMade,
            twoAttempted === null || threeAttempted === null ? null : twoAttempted + threeAttempted,
          ),
          threePointPercentage: percent(threeMade, threeAttempted),
          freeThrowPercentage: percent(freeMade, freeAttempted),
        },
      },
    ];
  });
}

export function formatNumber(value: number | null, digits = 1): string {
  if (value === null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatMinutes(seconds: number | null): string {
  if (seconds === null) return "—";
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}
