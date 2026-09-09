# Тематические сайты — как применить код

Репозиторий **yanbada-docs** не содержит vitrina / mega-hub / tourhub (свой git, нет push из этого агента). Ниже — перенос drop-in файлов.

## 1. Миграция

```bash
cp docs/sites/sql/20260909000000_hub_sites.sql mega-hub/supabase/migrations/
cp docs/sites/sql/20260909000000_hub_sites.sql vitrina/supabase/migrations/
cd vitrina && CONFIRM_PROD_DB_PUSH=1 npm run db:push:prod   # только когда готовы к prod
```

Не применять через MCP `apply_migration`.

## 2. mega-hub

Скопировать дерево `docs/sites/code/mega-hub/` в корень mega-hub с теми же относительными путями:

- `types/site.ts`
- `lib/sites/parse-site.ts`
- `lib/sites/get-site.ts`
- `lib/sites/search-site-listings.ts`
- `app/api/sites/[slug]/route.ts`
- `app/api/admin/sites/route.ts`
- `app/api/admin/sites/[slug]/route.ts`
- `app/admin/sites/page.tsx`

`search-site-listings.ts` импортирует `listingMatchesSiteScope` из `@/types/site`.

Smoke:

```bash
curl -s http://localhost:3001/api/sites/visit-kazakhstan | jq '.site.slug, (.listings|length)'
```

Создать operator-сайт (подставить UUID тенанта):

```bash
curl -X POST http://localhost:3001/api/admin/sites \
  -H 'Content-Type: application/json' \
  -d '{
    "slug": "kendala-studio",
    "name": {"ru": "Kendala Studio"},
    "template": "operator",
    "tenant_ids": ["<tenant-uuid>"],
    "marketplace_slug": null,
    "settings": { "accent_color": "#C45C26" }
  }'
```

## 3. tourhub

Скопировать `docs/sites/code/tourhub/` в корень tourhub:

- `app/s/[slug]/page.tsx`
- `app/s/[slug]/sites.css`
- `components/sites/operator-site.tsx`
- `components/sites/destination-site.tsx`
- `lib/sites/*`

Demo без live-хаба: `TOURHUB_DATA_MODE=demo` → фикстура `lib/sites/demo-sites.json`.

```
http://localhost:3002/s/kendala-studio
http://localhost:3002/s/visit-kazakhstan
```

Live: `TOURHUB_DATA_MODE=live` + `MEGA_HUB_API_URL`.

## 4. Домены

Не использовать `{slug}.tourhub.kz` (занято vitrina). Prod path: `https://www.ota.kz/s/{slug}`.
