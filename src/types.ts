export type GameStage = "regular" | "semifinal" | "final";
export type StatisticsScope = "regular" | "playoffs" | "all";
export type StatisticsMode = "total" | "per-game" | "per-30";

export interface Team {
  id: string;
  slug: string;
  name: string;
  abbreviation: string;
  color: string;
}

export interface Player {
  id: string;
  slug: string;
  name: string;
  teamId: string;
  aliases: string[];
}

export interface PlayerGameStatistics {
  playerId: string;
  teamId: string;
  jerseyNumber: string;
  starter: boolean;
  captain: boolean;
  didNotPlay: boolean;
  secondsPlayed: number | null;
  twoPointMade: number | null;
  twoPointAttempted: number | null;
  threePointMade: number | null;
  threePointAttempted: number | null;
  freeThrowMade: number | null;
  freeThrowAttempted: number | null;
  offensiveRebounds: number | null;
  defensiveRebounds: number | null;
  assists: number | null;
  turnovers: number | null;
  steals: number | null;
  blocks: number | null;
  foulsCommitted: number | null;
  foulsReceived: number | null;
  plusMinus: number | null;
  efficiency: number | null;
  points: number | null;
}

export interface Game {
  id: string;
  gameNumber: string;
  stage: GameStage;
  scheduledAt: string;
  venue: string | null;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  homePeriods: number[];
  awayPeriods: number[];
  statistics: PlayerGameStatistics[];
}

export interface CompetitionData {
  schemaVersion: number;
  slug: string;
  name: string;
  status: "completed";
  timezone: string;
  championTeamId: string;
  runnerUpTeamId: string;
  generatedFrom: string;
  teams: Team[];
  players: Player[];
  games: Game[];
}

export interface StandingRow extends Team {
  position: number;
  games: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDifference: number;
  miniWins: number;
  miniPointDifference: number;
}

export type MetricKey =
  | "games"
  | "minutes"
  | "points"
  | "rebounds"
  | "offensiveRebounds"
  | "defensiveRebounds"
  | "assists"
  | "steals"
  | "blocks"
  | "turnovers"
  | "foulsCommitted"
  | "foulsReceived"
  | "efficiency"
  | "plusMinus"
  | "fieldGoalPercentage"
  | "threePointPercentage"
  | "freeThrowPercentage";

export interface StatisticsRow {
  playerId: string;
  playerSlug: string;
  playerName: string;
  teamId: string;
  teamName: string;
  teamAbbreviation: string;
  jersey: string;
  secondsPlayed: number;
  metrics: Record<MetricKey, number | null>;
}
