import fallbackData from "./data/competition.json";
import type { CompetitionData } from "./types";

export async function loadCompetition(): Promise<CompetitionData> {
  try {
    const response = await fetch("/api/public/competition", {
      headers: { accept: "application/json" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as CompetitionData;
  } catch {
    return fallbackData as CompetitionData;
  }
}
