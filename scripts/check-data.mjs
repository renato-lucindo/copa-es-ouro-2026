import { readFile } from "node:fs/promises";

const data = JSON.parse(await readFile("src/data/competition.json", "utf8"));
const errors = [];
const regular = data.games.filter((game) => game.stage === "regular");
const playoffs = data.games.filter((game) => game.stage !== "regular");

if (data.games.length !== 18) errors.push(`Esperados 18 jogos; encontrados ${data.games.length}.`);
if (regular.length !== 15)
  errors.push(`Esperados 15 jogos regulares; encontrados ${regular.length}.`);
if (playoffs.length !== 3)
  errors.push(`Esperados 3 jogos eliminatórios; encontrados ${playoffs.length}.`);

for (const team of data.teams) {
  const games = regular.filter(
    (game) => game.homeTeamId === team.id || game.awayTeamId === team.id,
  );
  if (games.length !== 5)
    errors.push(`${team.abbreviation} possui ${games.length} jogos regulares.`);
}

for (const game of data.games) {
  const homePeriods = game.homePeriods.reduce((sum, value) => sum + value, 0);
  const awayPeriods = game.awayPeriods.reduce((sum, value) => sum + value, 0);
  if (homePeriods !== game.homeScore)
    errors.push(`${game.id}: períodos da equipe mandante não fecham.`);
  if (awayPeriods !== game.awayScore)
    errors.push(`${game.id}: períodos da equipe visitante não fecham.`);
  const keys = new Set();
  for (const row of game.statistics) {
    const key = `${row.teamId}:${row.playerId}`;
    if (keys.has(key)) errors.push(`${game.id}: participação duplicada ${key}.`);
    keys.add(key);
    if (row.didNotPlay) continue;
    const expected = 2 * row.twoPointMade + 3 * row.threePointMade + row.freeThrowMade;
    if (expected !== row.points) errors.push(`${game.id}: pontos não fecham para ${row.playerId}.`);
    if (row.twoPointMade > row.twoPointAttempted)
      errors.push(`${game.id}: 2P inválido para ${row.playerId}.`);
    if (row.threePointMade > row.threePointAttempted)
      errors.push(`${game.id}: 3P inválido para ${row.playerId}.`);
    if (row.freeThrowMade > row.freeThrowAttempted)
      errors.push(`${game.id}: LL inválido para ${row.playerId}.`);
  }
  for (const [teamId, expected] of [
    [game.homeTeamId, game.homeScore],
    [game.awayTeamId, game.awayScore],
  ]) {
    const total = game.statistics
      .filter((row) => row.teamId === teamId && !row.didNotPlay)
      .reduce((sum, row) => sum + row.points, 0);
    if (total !== expected)
      errors.push(`${game.id}: pontos de ${teamId} somam ${total}, placar ${expected}.`);
  }
}

const jhonatan = data.games
  .find((game) => game.id === "5205820")
  ?.statistics.find((row) => row.playerId === "alc-jhonatan-dos-santos");
if (jhonatan?.points !== 4 || jhonatan.jerseyNumber !== "3") {
  errors.push("A participação de Jhonatan Dos Santos não está correta.");
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    `Dados válidos: ${data.teams.length} equipes, ${data.players.length} atletas, ${data.games.length} jogos.`,
  );
}
