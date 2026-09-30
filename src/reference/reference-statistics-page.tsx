import { useEffect } from "react";
import type { CompetitionData } from "../types";
import baseStylesUrl from "./base-app.css?url";
import { BoxscoreStatisticsExplorer } from "./boxscore-statistics-explorer";
import statisticsStylesUrl from "./boxscore-statistics.css?url";
import { buildReferenceStatistics } from "./reference-data";
import { useUrlSearchParams } from "./use-url-search-params";

function useReferenceStyles() {
  useEffect(() => {
    const links = [baseStylesUrl, statisticsStylesUrl].map((href) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.dataset.referenceStyles = "true";
      document.head.appendChild(link);
      return link;
    });
    return () => {
      for (const link of links) link.remove();
    };
  }, []);
}

function Search() {
  const [params, setParams] = useUrlSearchParams();
  const query = params.get("q") ?? "";
  return (
    <search className="header-search">
      <form className="contextual-search" onSubmit={(event) => event.preventDefault()}>
        <label className="sr-only" htmlFor="reference-player-search">
          Buscar
        </label>
        <div className="search-composite">
          <input
            autoComplete="off"
            id="reference-player-search"
            onChange={(event) => {
              const next = new URLSearchParams(params);
              if (event.currentTarget.value) next.set("q", event.currentTarget.value);
              else next.delete("q");
              next.delete("page");
              setParams(next);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Escape") return;
              const next = new URLSearchParams(params);
              next.delete("q");
              next.delete("page");
              setParams(next);
            }}
            placeholder="Filtrar atletas"
            type="search"
            value={query}
          />
          <select aria-label="Escopo da busca" defaultValue="current">
            <option value="current">Página atual</option>
          </select>
          {query ? (
            <button
              aria-label="Limpar busca"
              className="search-clear"
              onClick={() => {
                const next = new URLSearchParams(params);
                next.delete("q");
                next.delete("page");
                setParams(next);
              }}
              type="button"
            >
              ×
            </button>
          ) : null}
        </div>
      </form>
    </search>
  );
}

function Header() {
  return (
    <header className="public-header">
      <div className="public-header-topline">
        <a className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">
            B
          </span>
          <span>Base do Basquete</span>
        </a>
        <Search />
        <a className="admin-link" href="/sobre-os-dados">
          Sobre os dados
        </a>
      </div>
      <nav className="public-nav" aria-label="Navegação da edição">
        <details className="context-quick-menu">
          <summary aria-label="Alterar edição">
            <span className="context-dot" aria-hidden="true" />
            <span className="context-summary-copy">
              <strong>Copa ES Ouro</strong>
              <small>2026 · Fixture FIBA · Masculino</small>
            </span>
          </summary>
          <div>
            <section>
              <strong>Edição publicada</strong>
              <a aria-current="page" href="/estatisticas?scope=all">
                2026 · Copa ES Ouro · Fixture FIBA · Masculino
              </a>
            </section>
          </div>
        </details>
        <span className="public-nav-divider" aria-hidden="true" />
        <a href="/">Visão geral</a>
        <a href="/classificacao">Classificação</a>
        <a href="/jogos">Jogos</a>
        <a className="active" href="/estatisticas?scope=all">
          Jogadores
        </a>
      </nav>
    </header>
  );
}

export function ReferenceStatisticsPage({ data }: { data: CompetitionData }) {
  useReferenceStyles();
  const [params] = useUrlSearchParams();
  const statistics = buildReferenceStatistics(data, params);
  return (
    <main className="public-shell">
      <a className="sr-only" href="#reference-statistics">
        Pular para o conteúdo principal
      </a>
      <Header />
      <div className="public-content" id="reference-statistics">
        <h1 className="sr-only">Estatísticas dos jogadores</h1>
        <BoxscoreStatisticsExplorer data={statistics} />
      </div>
    </main>
  );
}
