import { useEffect, useMemo, useState } from "react";
import { loadCompetition } from "./api";
import {
  aggregatePlayerStatistics,
  calculateStandings,
  defaultMetrics,
  formatMinutes,
  formatNumber,
  metricLabels,
} from "./domain";
import type {
  CompetitionData,
  Game,
  MetricKey,
  Player,
  StatisticsMode,
  StatisticsRow,
  StatisticsScope,
  Team,
} from "./types";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

const stageLabels = { regular: "Fase regular", semifinal: "Semifinal", final: "Final" } as const;
const scopeLabels = { regular: "Fase regular", playoffs: "Eliminatórias", all: "Todos" } as const;
const modeLabels = { total: "Totais", "per-game": "Por jogo", "per-30": "Por 30 min" } as const;

function teamMap(data: CompetitionData): Map<string, Team> {
  return new Map(data.teams.map((team) => [team.id, team]));
}

function playerMap(data: CompetitionData): Map<string, Player> {
  return new Map(data.players.map((player) => [player.id, player]));
}

function Logo() {
  return (
    <a className="brand" href="/" aria-label="Copa ES Ouro 2026 — página inicial">
      <span className="brand-mark" aria-hidden="true">
        ES
      </span>
      <span>
        <strong>Copa ES Ouro</strong>
        <small>Temporada 2026</small>
      </span>
    </a>
  );
}

function Layout({ children, path }: { children: React.ReactNode; path: string }) {
  const links = [
    ["/", "Visão geral"],
    ["/jogos", "Jogos"],
    ["/classificacao", "Classificação"],
    ["/estatisticas", "Jogadores"],
  ];
  return (
    <>
      <a className="skip-link" href="#conteudo">
        Ir para o conteúdo
      </a>
      <header className="site-header">
        <div className="shell header-inner">
          <Logo />
          <nav aria-label="Navegação principal">
            {links.map(([href, label]) => (
              <a
                aria-current={
                  href === "/" ? path === href : path.startsWith(href) ? "page" : undefined
                }
                href={href}
                key={href}
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <main id="conteudo">{children}</main>
      <footer className="site-footer">
        <div className="shell footer-inner">
          <p>
            <strong>Copa ES Ouro 2026</strong> · Dados derivados de 18 boxscores FIBA/Genius Sports.
          </p>
          <a href="/sobre-os-dados">Sobre os dados</a>
        </div>
      </footer>
    </>
  );
}

function Loading() {
  return (
    <div className="shell state-card" role="status">
      <span className="spinner" aria-hidden="true" />
      <p>Carregando a temporada…</p>
    </div>
  );
}

function TeamPill({ team }: { team: Team }) {
  return (
    <span className="team-pill">
      <span className="team-dot" style={{ background: team.color }} aria-hidden="true" />
      {team.abbreviation}
    </span>
  );
}

function Scoreboard({
  data,
  game,
  compact = false,
}: {
  data: CompetitionData;
  game: Game;
  compact?: boolean;
}) {
  const teams = teamMap(data);
  const home = teams.get(game.homeTeamId);
  const away = teams.get(game.awayTeamId);
  if (!home || !away) return null;
  return (
    <div className={compact ? "scoreboard compact" : "scoreboard"}>
      <div>
        <span className="team-code">{home.abbreviation}</span>
        <strong>{home.name}</strong>
      </div>
      <p>
        <span className="sr-only">
          {home.name} {game.homeScore}, {away.name} {game.awayScore}
        </span>
        <strong aria-hidden="true">{game.homeScore}</strong>
        <span aria-hidden="true">×</span>
        <strong aria-hidden="true">{game.awayScore}</strong>
      </p>
      <div>
        <span className="team-code">{away.abbreviation}</span>
        <strong>{away.name}</strong>
      </div>
    </div>
  );
}

function Overview({ data }: { data: CompetitionData }) {
  const standings = calculateStandings(data);
  const teams = teamMap(data);
  const champion = teams.get(data.championTeamId);
  const final = data.games.find((game) => game.stage === "final");
  return (
    <>
      <section className="hero">
        <div className="shell hero-grid">
          <div>
            <p className="eyebrow">Temporada encerrada</p>
            <h1>O campeonato inteiro, jogada por jogada.</h1>
            <p className="hero-copy">
              Resultados, classificação, chaveamento e estatísticas dos atletas da Copa ES Ouro 2026
              em uma base revisada e transparente.
            </p>
            <div className="hero-actions">
              <a className="button primary" href="/estatisticas">
                Explorar estatísticas
              </a>
              <a className="button secondary" href="/jogos">
                Ver todos os jogos
              </a>
            </div>
          </div>
          <aside className="champion-card" aria-label="Campeão da temporada">
            <span>Campeão 2026</span>
            <div className="trophy" aria-hidden="true">
              ★
            </div>
            <strong>{champion?.name}</strong>
            <small>5–0 na fase regular · campeão invicto</small>
          </aside>
        </div>
      </section>

      <section className="shell summary-grid" aria-label="Resumo do campeonato">
        <article>
          <span>Equipes</span>
          <strong>{data.teams.length}</strong>
          <small>cinco jogos regulares por equipe</small>
        </article>
        <article>
          <span>Jogos</span>
          <strong>{data.games.length}</strong>
          <small>15 regulares + 3 eliminatórios</small>
        </article>
        <article>
          <span>Atletas</span>
          <strong>{data.players.length}</strong>
          <small>identidade independente da camisa</small>
        </article>
      </section>

      <section className="shell home-grid section-space">
        <div>
          <div className="section-heading">
            <div>
              <p className="eyebrow">Classificação final da fase regular</p>
              <h2>Os seis colocados</h2>
            </div>
            <a href="/classificacao">Tabela completa</a>
          </div>
          <ol className="ranking-list">
            {standings.map((row) => (
              <li key={row.id}>
                <span className="rank">{row.position}</span>
                <TeamPill team={row} />
                <span className="ranking-name">{row.name}</span>
                <strong>{row.wins}V</strong>
                <span>{row.losses}D</span>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <div className="section-heading">
            <div>
              <p className="eyebrow">Decisão</p>
              <h2>A grande final</h2>
            </div>
          </div>
          {final ? (
            <a className="final-card" href={`/jogos/${final.id}`}>
              <span>{dateFormatter.format(new Date(final.scheduledAt))}</span>
              <Scoreboard data={data} game={final} />
              <small>Abrir boxscore completo →</small>
            </a>
          ) : null}
        </div>
      </section>
    </>
  );
}

function GamesPage({ data }: { data: CompetitionData }) {
  const [team, setTeam] = useState("all");
  const [stage, setStage] = useState("all");
  const teams = teamMap(data);
  const filtered = data.games.filter(
    (game) =>
      (team === "all" || game.homeTeamId === team || game.awayTeamId === team) &&
      (stage === "all" || game.stage === stage),
  );
  return (
    <div className="shell page-space">
      <header className="page-heading">
        <p className="eyebrow">Calendário completo</p>
        <h1>Jogos</h1>
        <p>Todos os 18 confrontos, da abertura à final.</p>
      </header>
      <fieldset className="filter-bar">
        <legend>Filtrar jogos</legend>
        <label>
          Equipe
          <select value={team} onChange={(event) => setTeam(event.target.value)}>
            <option value="all">Todas as equipes</option>
            {data.teams.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Fase
          <select value={stage} onChange={(event) => setStage(event.target.value)}>
            <option value="all">Todas as fases</option>
            <option value="regular">Fase regular</option>
            <option value="semifinal">Semifinais</option>
            <option value="final">Final</option>
          </select>
        </label>
        <span aria-live="polite">{filtered.length} jogos encontrados</span>
      </fieldset>
      <ol className="games-list">
        {filtered.map((game) => {
          const home = teams.get(game.homeTeamId);
          const away = teams.get(game.awayTeamId);
          return (
            <li key={game.id}>
              <a href={`/jogos/${game.id}`}>
                <div className="game-meta">
                  <span className={`stage-tag ${game.stage}`}>{stageLabels[game.stage]}</span>
                  <time dateTime={game.scheduledAt}>
                    {dateFormatter.format(new Date(game.scheduledAt))}
                  </time>
                </div>
                <div className="game-teams">
                  <span>{home?.name}</span>
                  <strong>{game.homeScore}</strong>
                  <span>{away?.name}</span>
                  <strong>{game.awayScore}</strong>
                </div>
                <span className="game-link">Boxscore →</span>
              </a>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function BoxscoreTable({
  data,
  game,
  teamId,
}: {
  data: CompetitionData;
  game: Game;
  teamId: string;
}) {
  const players = playerMap(data);
  const team = teamMap(data).get(teamId);
  const rows = game.statistics.filter((row) => row.teamId === teamId);
  const total = (key: "points" | "offensiveRebounds" | "defensiveRebounds" | "assists") =>
    rows.reduce((sum, row) => sum + (row[key] ?? 0), 0);
  return (
    <section className="boxscore-section" aria-labelledby={`team-${teamId}`}>
      <h2 id={`team-${teamId}`}>{team?.name}</h2>
      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: a região com rolagem horizontal precisa ser alcançável por teclado */}
      <section className="table-scroll" tabIndex={0} aria-label={`Boxscore de ${team?.name}`}>
        <table className="data-table boxscore-table">
          <thead>
            <tr>
              <th scope="col">Atleta</th>
              <th scope="col">MIN</th>
              <th scope="col">PTS</th>
              <th scope="col">2P</th>
              <th scope="col">3P</th>
              <th scope="col">LL</th>
              <th scope="col">REB</th>
              <th scope="col">AST</th>
              <th scope="col">BR</th>
              <th scope="col">TO</th>
              <th scope="col">ER</th>
              <th scope="col">FC</th>
              <th scope="col">+/-</th>
              <th scope="col">EF</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const player = players.get(row.playerId);
              const shot = (made: number | null, attempted: number | null) =>
                made === null || attempted === null ? "—" : `${made}/${attempted}`;
              return (
                <tr key={row.playerId} className={row.didNotPlay ? "dnp" : undefined}>
                  <th scope="row">
                    <span className="jersey">#{row.jerseyNumber}</span>
                    <a href={`/jogadores/${player?.slug}`}>{player?.name}</a>
                    {row.starter ? (
                      <span className="starter" title="Titular">
                        ●
                      </span>
                    ) : null}
                    {row.captain ? <span className="captain">C</span> : null}
                  </th>
                  {row.didNotPlay ? (
                    <td colSpan={13}>Não jogou</td>
                  ) : (
                    <>
                      <td>{formatMinutes(row.secondsPlayed)}</td>
                      <td>
                        <strong>{row.points}</strong>
                      </td>
                      <td>{shot(row.twoPointMade, row.twoPointAttempted)}</td>
                      <td>{shot(row.threePointMade, row.threePointAttempted)}</td>
                      <td>{shot(row.freeThrowMade, row.freeThrowAttempted)}</td>
                      <td>{(row.offensiveRebounds ?? 0) + (row.defensiveRebounds ?? 0)}</td>
                      <td>{row.assists ?? "—"}</td>
                      <td>{row.steals ?? "—"}</td>
                      <td>{row.blocks ?? "—"}</td>
                      <td>{row.turnovers ?? "—"}</td>
                      <td>{row.foulsCommitted ?? "—"}</td>
                      <td>{row.plusMinus ?? "—"}</td>
                      <td>{row.efficiency ?? "—"}</td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Totais dos atletas</th>
              <td>—</td>
              <td>{total("points")}</td>
              <td colSpan={3}>—</td>
              <td>{total("offensiveRebounds") + total("defensiveRebounds")}</td>
              <td>{total("assists")}</td>
              <td colSpan={6}>—</td>
            </tr>
          </tfoot>
        </table>
      </section>
    </section>
  );
}

function GamePage({ data, gameId }: { data: CompetitionData; gameId: string }) {
  const game = data.games.find((candidate) => candidate.id === gameId);
  const teams = teamMap(data);
  if (!game) return <NotFound />;
  const home = teams.get(game.homeTeamId);
  const away = teams.get(game.awayTeamId);
  const periods = game.homePeriods.map((homeScore, position) => ({
    key: `period-${position + 1}`,
    label: position < 4 ? `Q${position + 1}` : `PR${position - 3}`,
    homeScore,
    awayScore: game.awayPeriods[position],
  }));
  return (
    <div className="shell page-space game-page">
      <a className="back-link" href="/jogos">
        ← Todos os jogos
      </a>
      <header className="game-header">
        <h1 className="sr-only">
          {home?.name} contra {away?.name}
        </h1>
        <div className="game-meta">
          <span className={`stage-tag ${game.stage}`}>{stageLabels[game.stage]}</span>
          <time dateTime={game.scheduledAt}>
            {dateFormatter.format(new Date(game.scheduledAt))}
          </time>
          <span>{game.venue ?? "Local não informado"}</span>
        </div>
        <Scoreboard data={data} game={game} />
      </header>
      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: a região com rolagem horizontal precisa ser alcançável por teclado */}
      <section className="table-scroll periods" tabIndex={0} aria-label="Placar por período">
        <table>
          <thead>
            <tr>
              <th scope="col">Equipe</th>
              {periods.map((period) => (
                <th scope="col" key={period.key}>
                  {period.label}
                </th>
              ))}
              <th scope="col">Final</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">{home?.abbreviation}</th>
              {periods.map((period) => (
                <td key={period.key}>{period.homeScore}</td>
              ))}
              <td>
                <strong>{game.homeScore}</strong>
              </td>
            </tr>
            <tr>
              <th scope="row">{away?.abbreviation}</th>
              {periods.map((period) => (
                <td key={period.key}>{period.awayScore}</td>
              ))}
              <td>
                <strong>{game.awayScore}</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
      <BoxscoreTable data={data} game={game} teamId={game.homeTeamId} />
      <BoxscoreTable data={data} game={game} teamId={game.awayTeamId} />
      <details className="legend-card">
        <summary>Entenda as siglas</summary>
        <p>
          MIN: minutos; PTS: pontos; REB: rebotes; AST: assistências; BR: bolas recuperadas; TO:
          tocos; ER: erros; FC: faltas cometidas; EF: eficiência.
        </p>
      </details>
    </div>
  );
}

function StandingsPage({ data }: { data: CompetitionData }) {
  const rows = calculateStandings(data);
  const teams = teamMap(data);
  const semis = data.games.filter((game) => game.stage === "semifinal");
  const final = data.games.find((game) => game.stage === "final");
  return (
    <div className="shell page-space">
      <header className="page-heading">
        <p className="eyebrow">Fase regular e mata-mata</p>
        <h1>Classificação</h1>
        <p>A tabela regular permanece separada do resultado das eliminatórias.</p>
      </header>
      <section aria-labelledby="regular-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">15 jogos</p>
            <h2 id="regular-title">Fase regular</h2>
          </div>
        </div>
        {/* biome-ignore lint/a11y/noNoninteractiveTabindex: a região com rolagem horizontal precisa ser alcançável por teclado */}
        <section className="table-scroll" tabIndex={0} aria-label="Classificação da fase regular">
          <table className="data-table standings-table">
            <caption>Vitórias; minitabela entre empatados; saldo geral; pontos pró.</caption>
            <thead>
              <tr>
                <th scope="col">Pos.</th>
                <th scope="col">Equipe</th>
                <th scope="col">J</th>
                <th scope="col">V</th>
                <th scope="col">D</th>
                <th scope="col">PP</th>
                <th scope="col">PC</th>
                <th scope="col">SLD</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <th scope="row">{row.position}</th>
                  <td>
                    <TeamPill team={row} />
                    <strong>{row.name}</strong>
                  </td>
                  <td>{row.games}</td>
                  <td>{row.wins}</td>
                  <td>{row.losses}</td>
                  <td>{row.pointsFor}</td>
                  <td>{row.pointsAgainst}</td>
                  <td className={row.pointDifference >= 0 ? "positive" : "negative"}>
                    {row.pointDifference > 0 ? "+" : ""}
                    {row.pointDifference}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <details className="legend-card">
          <summary>Critério do empate triplo</summary>
          <p>
            AVA, CAC e SAL terminaram com três vitórias. A ordem foi definida por uma minitabela
            usando apenas os jogos entre as três equipes: vitórias, saldo e pontos feitos. Depois
            são considerados saldo geral e pontos gerais.
          </p>
        </details>
      </section>
      <section className="bracket-section" aria-labelledby="bracket-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Eliminatórias</p>
            <h2 id="bracket-title">Caminho até o título</h2>
          </div>
        </div>
        <div className="bracket">
          <div>
            <h3>Semifinais</h3>
            {semis.map((game) => (
              <a className="bracket-game" href={`/jogos/${game.id}`} key={game.id}>
                <span>
                  {teams.get(game.homeTeamId)?.abbreviation}
                  <strong>{game.homeScore}</strong>
                </span>
                <span>
                  {teams.get(game.awayTeamId)?.abbreviation}
                  <strong>{game.awayScore}</strong>
                </span>
              </a>
            ))}
          </div>
          <div className="bracket-arrow" aria-hidden="true">
            →
          </div>
          <div>
            <h3>Final</h3>
            {final ? (
              <a className="bracket-game final" href={`/jogos/${final.id}`}>
                <span>
                  {teams.get(final.homeTeamId)?.abbreviation}
                  <strong>{final.homeScore}</strong>
                </span>
                <span>
                  {teams.get(final.awayTeamId)?.abbreviation}
                  <strong>{final.awayScore}</strong>
                </span>
                <small>IVV campeão</small>
              </a>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function metricValue(row: StatisticsRow, metric: MetricKey): string {
  const value = row.metrics[metric];
  if (value === null) return "—";
  if (metric.endsWith("Percentage")) return `${formatNumber(value)}%`;
  return formatNumber(value);
}

function StatisticsPage({ data }: { data: CompetitionData }) {
  const [scope, setScope] = useState<StatisticsScope>("regular");
  const [mode, setMode] = useState<StatisticsMode>("total");
  const [selectedTeams, setSelectedTeams] = useState(
    () => new Set(data.teams.map((team) => team.id)),
  );
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<MetricKey>("points");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [compared, setCompared] = useState<string[]>([]);
  const [visibleMetrics, setVisibleMetrics] = useState<MetricKey[]>(defaultMetrics);
  const allRows = useMemo(() => aggregatePlayerStatistics(data, scope, mode), [data, scope, mode]);
  const normalizedQuery = query
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const rows = allRows
    .filter((row) => selectedTeams.has(row.teamId))
    .filter((row) =>
      `${row.playerName} ${row.teamName}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .includes(normalizedQuery),
    )
    .sort((left, right) => {
      const a = left.metrics[sort];
      const b = right.metrics[sort];
      if (a === null && b === null) return left.playerName.localeCompare(right.playerName, "pt-BR");
      if (a === null) return 1;
      if (b === null) return -1;
      return (
        (direction === "desc" ? b - a : a - b) ||
        left.playerName.localeCompare(right.playerName, "pt-BR")
      );
    });
  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const leaders = new Map<MetricKey, number>();
  for (const metric of visibleMetrics) {
    const values = rows
      .map((row) => row.metrics[metric])
      .filter((value): value is number => value !== null);
    if (values.length) leaders.set(metric, Math.max(...values));
  }
  const updateSort = (metric: MetricKey) => {
    if (sort === metric) setDirection((current) => (current === "desc" ? "asc" : "desc"));
    else {
      setSort(metric);
      setDirection("desc");
    }
  };
  const toggleTeam = (teamId: string) => {
    setSelectedTeams((current) => {
      const next = new Set(current);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
    setPage(1);
  };
  const toggleCompare = (playerId: string) =>
    setCompared((current) =>
      current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : current.length < 2
          ? [...current, playerId]
          : current,
    );
  const comparedRows = compared.flatMap((id) => allRows.find((row) => row.playerId === id) ?? []);
  return (
    <div className="shell page-space statistics-page">
      <header className="page-heading">
        <p className="eyebrow">Explorador completo</p>
        <h1>Estatísticas dos jogadores</h1>
        <p>
          Filtre equipes, fase e modo de cálculo. A camisa exibida é a usada no jogo; “var.” indica
          troca de número.
        </p>
      </header>
      <section className="statistics-controls" aria-label="Controles das estatísticas">
        <fieldset>
          <legend>Equipes</legend>
          <div className="selection-actions">
            <button
              type="button"
              onClick={() => setSelectedTeams(new Set(data.teams.map((team) => team.id)))}
            >
              Todas
            </button>
            <button type="button" onClick={() => setSelectedTeams(new Set())}>
              Nenhuma
            </button>
            <span aria-live="polite">
              {selectedTeams.size} de {data.teams.length}
            </span>
          </div>
          <div className="team-checkboxes">
            {data.teams.map((team) => (
              <label key={team.id}>
                <input
                  type="checkbox"
                  checked={selectedTeams.has(team.id)}
                  onChange={() => toggleTeam(team.id)}
                />
                <span className="team-dot" style={{ background: team.color }} aria-hidden="true" />
                {team.abbreviation}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Fase</legend>
          <div className="segmented">
            {(["regular", "playoffs", "all"] as StatisticsScope[]).map((value) => (
              <label key={value}>
                <input
                  type="radio"
                  name="scope"
                  checked={scope === value}
                  onChange={() => {
                    setScope(value);
                    setPage(1);
                  }}
                />
                <span>{scopeLabels[value]}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Exibição</legend>
          <div className="segmented">
            {(["total", "per-game", "per-30"] as StatisticsMode[]).map((value) => (
              <label key={value}>
                <input
                  type="radio"
                  name="mode"
                  checked={mode === value}
                  onChange={() => {
                    setMode(value);
                    setPage(1);
                  }}
                />
                <span>{modeLabels[value]}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="search-control">
          Buscar atleta ou equipe
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Ex.: Jhonatan ou ALC"
          />
        </label>
        <details className="column-picker">
          <summary>Escolher colunas</summary>
          <div>
            {(Object.keys(metricLabels) as MetricKey[]).map((metric) => (
              <label key={metric}>
                <input
                  type="checkbox"
                  checked={visibleMetrics.includes(metric)}
                  onChange={() =>
                    setVisibleMetrics((current) =>
                      current.includes(metric)
                        ? current.filter((item) => item !== metric)
                        : [...current, metric],
                    )
                  }
                />
                {metricLabels[metric]}
              </label>
            ))}
          </div>
        </details>
      </section>
      {comparedRows.length ? (
        <section className="compare-panel" aria-labelledby="compare-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Comparação</p>
              <h2 id="compare-title">Lado a lado</h2>
            </div>
            <button type="button" onClick={() => setCompared([])}>
              Limpar
            </button>
          </div>
          <div className="compare-grid">
            {comparedRows.map((row) => (
              <article key={row.playerId}>
                <span>
                  #{row.jersey} · {row.teamAbbreviation}
                </span>
                <strong>{row.playerName}</strong>
                <dl>
                  {["points", "rebounds", "assists", "efficiency"].map((metric) => (
                    <div key={metric}>
                      <dt>{metricLabels[metric as MetricKey]}</dt>
                      <dd>{metricValue(row, metric as MetricKey)}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>
        </section>
      ) : null}
      <div className="results-bar">
        <p aria-live="polite">
          <strong>{rows.length}</strong> atletas · {scopeLabels[scope]} · {modeLabels[mode]}
        </p>
        <span>Selecione até dois atletas para comparar.</span>
      </div>
      <section className="table-scroll" aria-label="Tabela de estatísticas dos jogadores">
        <table className="data-table statistics-table">
          <thead>
            <tr>
              <th scope="col" className="sticky-player">
                Atleta
              </th>
              <th scope="col">Comparar</th>
              {visibleMetrics.map((metric) => (
                <th
                  scope="col"
                  aria-sort={
                    sort === metric ? (direction === "desc" ? "descending" : "ascending") : "none"
                  }
                  key={metric}
                >
                  <button type="button" onClick={() => updateSort(metric)}>
                    {metricLabels[metric]}
                    {sort === metric ? (
                      <span aria-hidden="true"> {direction === "desc" ? "↓" : "↑"}</span>
                    ) : null}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr key={row.playerId}>
                <th scope="row" className="sticky-player">
                  <span className="jersey">#{row.jersey}</span>
                  <a href={`/jogadores/${row.playerSlug}`}>{row.playerName}</a>
                  <small>{row.teamAbbreviation}</small>
                </th>
                <td>
                  <input
                    aria-label={`Comparar ${row.playerName}`}
                    type="checkbox"
                    checked={compared.includes(row.playerId)}
                    disabled={!compared.includes(row.playerId) && compared.length >= 2}
                    onChange={() => toggleCompare(row.playerId)}
                  />
                </td>
                {visibleMetrics.map((metric) => {
                  const value = row.metrics[metric];
                  const leader =
                    value !== null &&
                    leaders.get(metric) === value &&
                    metric !== "games" &&
                    metric !== "minutes";
                  return (
                    <td className={leader ? "leader" : undefined} key={metric}>
                      {metricValue(row, metric)}
                      {leader ? <span className="leader-label">Líder</span> : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <nav className="pagination" aria-label="Paginação das estatísticas">
        <button
          type="button"
          disabled={safePage === 1}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
        >
          ← Anterior
        </button>
        <span>
          Página {safePage} de {totalPages}
        </span>
        <button
          type="button"
          disabled={safePage === totalPages}
          onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
        >
          Próxima →
        </button>
      </nav>
      {mode === "per-30" ? (
        <p className="method-note">
          Valores por 30 minutos exigem ao menos 10 minutos jogados no recorte. Amostras menores
          aparecem como indisponíveis.
        </p>
      ) : null}
    </div>
  );
}

function PlayerPage({ data, slug }: { data: CompetitionData; slug: string }) {
  const player = data.players.find((candidate) => candidate.slug === slug);
  if (!player) return <NotFound />;
  const team = teamMap(data).get(player.teamId);
  const totals = aggregatePlayerStatistics(data, "all", "total").find(
    (row) => row.playerId === player.id,
  );
  const logs = data.games
    .flatMap((game) => {
      const row = game.statistics.find((stat) => stat.playerId === player.id);
      return row ? [{ game, row }] : [];
    })
    .sort((left, right) => right.game.scheduledAt.localeCompare(left.game.scheduledAt));
  return (
    <div className="shell page-space player-page">
      <a className="back-link" href="/estatisticas">
        ← Estatísticas
      </a>
      <header className="player-hero">
        <div>
          <TeamPill team={team ?? data.teams[0]} />
          <h1>{player.name}</h1>
          <p>Os números de camisa aparecem por partida e podem variar ao longo da temporada.</p>
        </div>
        <div className="player-number">#{totals?.jersey ?? "—"}</div>
      </header>
      {totals ? (
        <section className="player-kpis" aria-label="Totais da temporada">
          {(["games", "points", "rebounds", "assists", "efficiency"] as MetricKey[]).map(
            (metric) => (
              <article key={metric}>
                <span>{metricLabels[metric]}</span>
                <strong>{metricValue(totals, metric)}</strong>
              </article>
            ),
          )}
        </section>
      ) : null}
      <section aria-labelledby="game-log-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Partida por partida</p>
            <h2 id="game-log-title">Histórico</h2>
          </div>
        </div>
        {/* biome-ignore lint/a11y/noNoninteractiveTabindex: a região com rolagem horizontal precisa ser alcançável por teclado */}
        <section className="table-scroll" tabIndex={0} aria-label={`Histórico de ${player.name}`}>
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Jogo</th>
                <th scope="col">Fase</th>
                <th scope="col">Camisa</th>
                <th scope="col">MIN</th>
                <th scope="col">PTS</th>
                <th scope="col">REB</th>
                <th scope="col">AST</th>
                <th scope="col">+/-</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(({ game, row }) => {
                const opponentId =
                  game.homeTeamId === player.teamId ? game.awayTeamId : game.homeTeamId;
                const opponent = teamMap(data).get(opponentId);
                return (
                  <tr key={game.id}>
                    <th scope="row">
                      <a href={`/jogos/${game.id}`}>vs. {opponent?.abbreviation}</a>
                      <small>{dateFormatter.format(new Date(game.scheduledAt))}</small>
                    </th>
                    <td>{stageLabels[game.stage]}</td>
                    <td>#{row.jerseyNumber}</td>
                    {row.didNotPlay ? (
                      <td colSpan={5}>Não jogou</td>
                    ) : (
                      <>
                        <td>{formatMinutes(row.secondsPlayed)}</td>
                        <td>{row.points}</td>
                        <td>{(row.offensiveRebounds ?? 0) + (row.defensiveRebounds ?? 0)}</td>
                        <td>{row.assists}</td>
                        <td>{row.plusMinus ?? "—"}</td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </section>
      {player.aliases.length ? (
        <details className="legend-card">
          <summary>Variações de nome revisadas</summary>
          <p>{player.aliases.join("; ")}</p>
        </details>
      ) : null}
    </div>
  );
}

function DataPage({ data }: { data: CompetitionData }) {
  return (
    <div className="shell page-space prose">
      <header className="page-heading">
        <p className="eyebrow">Transparência</p>
        <h1>Sobre os dados</h1>
      </header>
      <h2>Fonte</h2>
      <p>
        {data.generatedFrom}. Os PDFs originais não são publicados; o repositório contém somente os
        dados derivados e o relatório de auditoria.
      </p>
      <h2>Identidade dos atletas</h2>
      <p>
        Cada atleta possui um identificador estável. A camisa pertence à participação em uma
        partida, portanto um jogador pode trocar de número e um número pode ser reutilizado sem unir
        pessoas diferentes.
      </p>
      <h2>Cobertura</h2>
      <p>
        São 15 jogos da fase regular, duas semifinais e uma final. Campos ausentes na fonte anterior
        aparecem como “—”; nenhum valor desconhecido é convertido em zero.
      </p>
    </div>
  );
}

function NotFound() {
  return (
    <div className="shell state-card">
      <p className="eyebrow">Erro 404</p>
      <h1>Página não encontrada</h1>
      <a className="button primary" href="/">
        Voltar ao início
      </a>
    </div>
  );
}

function route(data: CompetitionData, path: string) {
  if (path === "/") return <Overview data={data} />;
  if (path === "/jogos") return <GamesPage data={data} />;
  if (path.startsWith("/jogos/"))
    return <GamePage data={data} gameId={decodeURIComponent(path.slice(7))} />;
  if (path === "/classificacao") return <StandingsPage data={data} />;
  if (path === "/estatisticas") return <StatisticsPage data={data} />;
  if (path.startsWith("/jogadores/"))
    return <PlayerPage data={data} slug={decodeURIComponent(path.slice(11))} />;
  if (path === "/sobre-os-dados") return <DataPage data={data} />;
  return <NotFound />;
}

export function App() {
  const [data, setData] = useState<CompetitionData | null>(null);
  const [failed, setFailed] = useState(false);
  const path = window.location.pathname.replace(/\/$/, "") || "/";
  useEffect(() => {
    loadCompetition()
      .then(setData)
      .catch(() => setFailed(true));
  }, []);
  if (failed)
    return (
      <Layout path={path}>
        <div className="shell state-card" role="alert">
          <h1>Não foi possível carregar os dados</h1>
          <p>Tente atualizar a página.</p>
        </div>
      </Layout>
    );
  return <Layout path={path}>{data ? route(data, path) : <Loading />}</Layout>;
}
