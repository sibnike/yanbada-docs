# Тематические сайты — как применить код

Всё в **mega-hub** (`sibnike/hub`). TourHub не копировать.

## 1. Миграции

```bash
cp docs/sites/sql/20260909000000_hub_sites.sql mega-hub/supabase/migrations/
cp docs/sites/sql/20260909120000_hub_site_builder.sql mega-hub/supabase/migrations/
cp docs/sites/sql/20260909000000_hub_sites.sql vitrina/supabase/migrations/
cp docs/sites/sql/20260909120000_hub_site_builder.sql vitrina/supabase/migrations/
```

Prod push только из vitrina.

## 2. mega-hub

Скопировать `docs/sites/code/mega-hub/` в корень репо.

В `middleware.ts` **до** rewrite на `/m/` вставить `rewritePublicSite` из `lib/sites/rewrite-public-site.ts`.

## 3. Проверка

```
http://localhost:3001/admin/sites/visit-kazakhstan/builder
http://localhost:3001/s/visit-kazakhstan
http://localhost:3001/s/kendala-studio   # demo payload, если нет строки в БД

curl -s http://localhost:3001/api/sites/visit-kazakhstan/assistant \
  -H 'Content-Type: application/json' \
  -d '{"message":"есть что-то про озёра?"}'
```

Нужен `ANTHROPIC_API_KEY` для live-ответов ассистента; без ключа demo-страница всё равно открывается.
