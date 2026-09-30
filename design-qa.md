# Design QA — estatísticas dos jogadores

## Referências

- Fonte visual: `https://pr-54-base-do-basquete-preview.renato-lucindo-jr.workers.dev/2026/copa-es-ouro/fixture-fiba/masculino/jogadores?scope=all`
- Implementação verificada: `http://127.0.0.1:5173/estatisticas?scope=all`
- Código-fonte de referência: `Base do Basquete/app/components/boxscore-statistics-explorer.tsx`, `Base do Basquete/app/components/boxscore-statistics.css` e `Base do Basquete/app/app.css`
- Capturas da fonte e da implementação foram comparadas no mesmo passe visual, com o mesmo estado, dimensões e densidade de pixels.

## Estados e viewports comparados

| Estado | Viewport | DPR | Resultado |
| --- | ---: | ---: | --- |
| `scope=all`, por jogo | 1440 × 1000 | 1 | Aprovado |
| `scope=all`, por jogo | 390 × 844 | 1 | Aprovado |

Também foram exercitados os modos total e por 30 minutos, os escopos fase regular/eliminatórias/todos, a busca, os checkboxes de equipes, ordenação, paginação e comparação de atletas.

## Comparação final

- **Tipografia e cores:** usam diretamente as folhas de estilo da referência; hierarquia, pesos, escala, azul de ação, superfícies brancas e divisores coincidem.
- **Layout e espaçamento:** cabeçalho, navegação contextual, título, filtros, tabela, barra de comparação e paginação preservam a estrutura e os espaçamentos da PR-54.
- **Responsividade:** no celular, a primeira coluna permanece fixa em 170 px e as métricas rolam horizontalmente, sem sobreposição ou corte dos controles.
- **Estados e interação:** filtros são refletidos na URL, checkboxes são controles nativos, foco é visível e toda a jornada crítica funciona por teclado.
- **Acessibilidade:** página possui `h1` programático, link de salto, rótulos, semântica de tabela e diálogo, reflow em 200% e auditoria axe sem violações.
- **Imagens e ícones:** a tela não depende de imagens de conteúdo; os ícones existentes vêm do mesmo componente de referência.

## Histórico de correções

1. **P1 — linguagem visual divergente:** a primeira versão independente usava um tema escuro e componentes próprios, incompatíveis com a PR-54. Correção: transplante direto do explorador e das folhas de estilo da referência.
2. **P2 — coluna de atleta larga no celular:** uma regra global antiga forçava 290 px e escondia métricas úteis. Correção: regras legadas foram limitadas a `.statistics-page`; a tabela copiada voltou a usar 170 px no breakpoint móvel.
3. **P2 — ausência de título de nível 1:** a referência visual não expunha um `h1`. Correção: inclusão de `h1` somente para leitores de tela, sem alteração visual.

## Diferenças deliberadas

- O conteúdo usa os 18 jogos canônicos e 98 atletas com participação, portanto contagens, nomes e valores diferem da fixture parcial da PR-54.
- “Administração” foi substituído por “Sobre os dados”, porque este projeto público não possui autenticação nem painel administrativo.
- O widget externo Sienna não foi incluído; acessibilidade é atendida no código da página.

## Resultado

**Aprovado.** Nenhuma divergência visual ou funcional bloqueante permaneceu nos viewports testados.
