import type { BoxscoreMetric } from "./boxscore-metrics";

export type ReferenceMode = "total" | "per-game" | "per-30";
export type ReferenceScope = "regular" | "playoffs" | "all";

export type BoxscoreMetricCell =
  | { status: "available"; value: number }
  | { status: "unavailable"; value: null }
  | { status: "insufficient-sample"; value: null };

export interface BoxscoreStatisticsPlayerRow {
  playerId: number;
  playerName: string;
  playerSlug: string;
  registrationId: number;
  teamId: number;
  teamName: string;
  teamSlug: string;
  teamAbbreviation: string | null;
  jersey: string | null;
  metrics: Record<BoxscoreMetric, BoxscoreMetricCell>;
}

export interface BoxscoreStatisticsPageDto {
  kind: "boxscore-v2";
  competitionId: number;
  publicationId: number;
  per30MinimumSeconds: number;
  mode: ReferenceMode;
  scope: ReferenceScope;
  sort: BoxscoreMetric | "player" | "team";
  direction: "asc" | "desc";
  page: number;
  pageSize: 20;
  total: number;
  totalPages: number;
  rows: BoxscoreStatisticsPlayerRow[];
  compared: BoxscoreStatisticsPlayerRow[];
  leaders: Partial<Record<BoxscoreMetric, number[]>>;
  teams: Array<{ id: number; name: string; slug: string }>;
  playerOptions: Array<{ id: number; name: string; teamName: string }>;
  coverage: {
    regularGames: number;
    playoffGames: number;
    unclassifiedGames: number;
  };
}
