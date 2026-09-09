# Тематические сайты — как применить код

Репозиторий **yanbada-docs** не содержит vitrina / mega-hub / tourhub. Ниже — перенос drop-in файлов.

## 1. Миграции

```bash
cp docs/sites/sql/20260909000000_hub_sites.sql mega-hub/supabase/migrations/
cp docs/sites/sql/20260909120000_hub_site_builder.sql mega-hub/supabase/migrations/
# зеркало:
cp docs/sites/sql/20260909000000_hub_sites.sql vitrina/supabase/migrations/
cp docs/sites/sql/20260909120000_hub_site_builder.sql vitrina/supabase/migrations/
```

Prod push только из vitrina. Не MCP `apply_migration`.

## 2. mega-hub

Скопировать `docs/sites/code/mega-hub/` в корень hub:

- `types/site.ts`, `lib/sites/*`
- `app/api/sites/[slug]/route.ts`
- `app/api/sites/[slug]/assistant/route.ts`
- `app/api/admin/sites/**`
- `app/admin/sites/**`
- `components/sites/site-builder-client.tsx`

Конструктор: `http://localhost:3001/admin/sites/visit-kazakhstan/builder`

## 3. tourhub

Скопировать `docs/sites/code/tourhub/`:

- `app/s/**` (canvas + journal + CSS)
- `app/api/sites/[slug]/assistant/route.ts` (прокси / demo)
- `components/sites/site-canvas.tsx`, `assistant-dock.tsx`
- `lib/sites/*`

```
http://localhost:3002/s/visit-kazakhstan
http://localhost:3002/s/kendala-studio
```

## 4. Проверка ассистента

```bash
curl -s http://localhost:3002/api/sites/visit-kazakhstan/assistant \
  -H 'Content-Type: application/json' \
  -d '{"message":"есть что-то про Бурабай?"}'
```

Live: `TOURHUB_DATA_MODE=live` + `MEGA_HUB_API_URL` + `ANTHROPIC_API_KEY` на mega-hub.
