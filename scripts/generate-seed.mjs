import { readFile, writeFile } from "node:fs/promises";

const snapshot = JSON.parse(await readFile("src/data/competition.json", "utf8"));
const serialized = JSON.stringify(snapshot).replaceAll("$snapshot$", "$ snapshot $");
const sql = `-- Gerado por npm run data:seed. Não contém PDFs nem segredos.
insert into public.competition_publications (slug, snapshot, published_at)
values ('copa-es-ouro-2026', $snapshot$${serialized}$snapshot$::jsonb, now())
on conflict (slug) do update
set snapshot = excluded.snapshot,
    published_at = excluded.published_at;
`;

await writeFile("supabase/seed.sql", sql, "utf8");
console.log("supabase/seed.sql atualizado.");
