# Auditoria dos dados — Copa ES Ouro 2026

Data da revisão: 30/09/2026.

## Cobertura

- 18 partidas: 15 da fase regular, duas semifinais e uma final.
- Seis equipes, cada uma com cinco jogos na fase regular.
- Placar final e placar por período reconciliados nas 18 partidas.
- Fórmula de pontos, tentativas e convertidos validada para todas as participações publicadas.
- Números desconhecidos permanecem `null` e aparecem como `—`; não foram convertidos em zero.

## Decisões registradas

1. **Jhonatan Dos Santos** — a linha do atleta estava ausente em ALC × SAN. A inclusão oficial (19:21, 4 pontos) altera a soma do ALC de 52 para 56 e reconcilia o placar do PDF, 56–62.
2. **Camisas** — removidas da identidade do atleta. ALC #3 e #34, entre outras, foram usados por pessoas diferentes; diversos atletas também mudaram de número.
3. **Aliases** — variações de acento, abreviação ou nome completo são vínculos explícitos. Nome e equipe são revisados; camisa nunca decide a associação.
4. **Homônimos aparentes** — Daniel Garcia Cassiano e Daniel da Fonseca Garcia permanecem jogadores distintos; Vitor Gabriel Borges Santos e Daniel dos Santos também permanecem distintos, embora tenham usado o mesmo número em momentos diferentes.
5. **Anexo com nome incorreto** — o arquivo recebido como `IVV vs SAL 13 maio (3)` contém SAN × IVV de 8 de julho. O conjunto canônico usa o PDF verdadeiro de IVV × SAL de 13 de maio e o PDF SAN × IVV posteriormente fornecido.
6. **ALC × SAN** — a partida foi reconciliada diretamente com o PDF: minutos, mais/menos, eficiência e faltas recebidas foram corrigidos, além da inclusão de Jhonatan e dos registros `NJ`.

## Limites honestos

O pacote estático anterior não armazenava faltas recebidas em 14 jogos regulares. Esses campos permanecem indisponíveis nesses jogos e, portanto, não geram totais ou médias fabricados. Os três jogos eliminatórios e ALC × SAN possuem cobertura integral desses campos.

Os PDFs não fazem parte do repositório. O arquivo canônico versionado em `src/data/competition.json`, os testes e este relatório formam a evidência pública reproduzível.
