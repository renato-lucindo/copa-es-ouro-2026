import fallbackData from "./data/competition.json";
import { aggregatePlayerStatistics, calculateStandings } from "./domain";
import type { CompetitionData, StatisticsMode, StatisticsScope } from "./types";

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  COMPETITION_SLUG: string;
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
}

const canonical = fallbackData as CompetitionData;

function json(data: unknown, status = 200, source = "canonical"): Response {
  return Response.json(data, {
    status,
    headers: {
      "cache-control": "public, max-age=300, s-maxage=1800",
      "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
      "x-content-type-options": "nosniff",
      "x-data-source": source,
    },
  });
}

function isCompetitionData(value: unknown): value is CompetitionData {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CompetitionData>;
  return (
    candidate.schemaVersion === 1 &&
    candidate.slug === "copa-es-ouro-2026" &&
    Array.isArray(candidate.teams) &&
    Array.isArray(candidate.players) &&
    Array.isArray(candidate.games)
  );
}

async function loadSnapshot(env: Env): Promise<{ data: CompetitionData; source: string }> {
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
    return { data: canonical, source: "canonical" };
  }
  const endpoint = new URL("/rest/v1/competition_publications", env.SUPABASE_URL);
  endpoint.searchParams.set("slug", `eq.${env.COMPETITION_SLUG}`);
  endpoint.searchParams.set("select", "snapshot");
  endpoint.searchParams.set("limit", "1");
  try {
    const init: RequestInit & { cf?: { cacheEverything: boolean; cacheTtl: number } } = {
      headers: {
        apikey: env.SUPABASE_PUBLISHABLE_KEY,
        authorization: `Bearer ${env.SUPABASE_PUBLISHABLE_KEY}`,
      },
      cf: { cacheEverything: true, cacheTtl: 300 },
    };
    const response = await fetch(endpoint, init);
    if (!response.ok) return { data: canonical, source: "canonical-fallback" };
    const rows = (await response.json()) as Array<{ snapshot?: unknown }>;
    const snapshot = rows[0]?.snapshot;
    return isCompetitionData(snapshot)
      ? { data: snapshot, source: "supabase" }
      : { data: canonical, source: "canonical-fallback" };
  } catch {
    return { data: canonical, source: "canonical-fallback" };
  }
}

function statisticsScope(value: string | null): StatisticsScope {
  return value === "playoffs" || value === "all" ? value : "regular";
}

function statisticsMode(value: string | null): StatisticsMode {
  return value === "per-game" || value === "per-30" ? value : "total";
}

async function publicApi(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return json({ error: "Método não permitido" }, 405);
  }
  const url = new URL(request.url);
  const { data, source } = await loadSnapshot(env);
  const segments = url.pathname.split("/").filter(Boolean).slice(2);
  if (segments.length === 1 && segments[0] === "competition") return json(data, 200, source);
  if (segments.length === 1 && segments[0] === "games") {
    return json(
      data.games.map(({ statistics: _statistics, ...game }) => game),
      200,
      source,
    );
  }
  if (segments[0] === "games" && segments[1]) {
    const game = data.games.find((candidate) => candidate.id === segments[1]);
    return game ? json(game, 200, source) : json({ error: "Jogo não encontrado" }, 404, source);
  }
  if (segments.length === 1 && segments[0] === "standings") {
    return json(calculateStandings(data), 200, source);
  }
  if (segments.length === 1 && segments[0] === "statistics") {
    return json(
      aggregatePlayerStatistics(
        data,
        statisticsScope(url.searchParams.get("scope")),
        statisticsMode(url.searchParams.get("mode")),
      ),
      200,
      source,
    );
  }
  if (segments[0] === "players" && segments[1]) {
    const player = data.players.find((candidate) => candidate.slug === segments[1]);
    if (!player) return json({ error: "Jogador não encontrado" }, 404, source);
    const games = data.games.flatMap((game) => {
      const statistics = game.statistics.find((row) => row.playerId === player.id);
      return statistics ? [{ game: { ...game, statistics: undefined }, statistics }] : [];
    });
    return json({ player, games }, 200, source);
  }
  return json({ error: "Endpoint não encontrado" }, 404, source);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/public/")) return publicApi(request, env);
    return env.ASSETS.fetch(request);
  },
};
