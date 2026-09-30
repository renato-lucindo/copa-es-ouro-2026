# Copa ES Ouro 2026

Site público independente com jogos, classificação, chaveamento e estatísticas dos jogadores da Copa ES Ouro 2026.

## Arquitetura

- React + TypeScript + Vite;
- Cloudflare Worker servindo a aplicação e os endpoints públicos;
- Supabase separado com um snapshot JSONB público e somente leitura;
- dados canônicos versionados em `src/data/competition.json`;
- nenhum PDF, autenticação ou painel administrativo.

O navegador nunca acessa o Supabase diretamente. O Worker lê o snapshot e oferece endpoints em `/api/public/*`. Sem configuração remota, o Worker utiliza a cópia canônica embutida.

## Desenvolvimento

```bash
npm install
npm run check
npm run dev
```

## Dados

Mudanças são feitas diretamente no arquivo canônico e revisadas por PR. Depois:

```bash
npm run data:check
npm run data:seed
```

O segundo comando atualiza `supabase/seed.sql`; ele não lê nem importa PDFs. Consulte `docs/AUDITORIA-DADOS.md` para decisões e limitações.

## Supabase

1. Criar um projeto separado.
2. Aplicar `supabase/migrations/20260930000000_public_competition_snapshot.sql`.
3. Aplicar `supabase/seed.sql`.
4. Configurar `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` somente nos secrets do Worker.

## Cloudflare

```bash
npm run build
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_PUBLISHABLE_KEY
npx wrangler deploy
```

O nome público padrão do Worker é `copa-es-ouro-2026`.
