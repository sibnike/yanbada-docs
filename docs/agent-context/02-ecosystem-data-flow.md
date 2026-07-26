# 02 — Поток данных

## Write path (Vitrina)

```
Tenant admin
  → company_profiles (categories, marketplace_themes, …)
  → заявка seller на gated-канал (TourHub) → hub.marketplace_sellers
  → pages + page_blocks + catalog_items
  → pages.marketplace_slugs (только если seller approved на gated)
  → publish page
       ↓
  syncToHub() / sync-listing-to-hub
       ↓ HMAC webhook
  mega-hub POST /api/sync/company  → hub.company_cache
  mega-hub POST /api/sync/listing  → hub.listing_cache (+ marketplace_slugs)
```

Wizard: `/admin/t/{slug}/publish` — доступ → профиль → услуга → контент → publish на TourHub.

## Read path (TourHub live)

```
TourHub GET /api/market/listings
  → POST mega-hub /api/marketplace/search-listings  { marketplace: "tourhub", … }
  → listing_cache WHERE tourhub = ANY(marketplace_slugs)
    AND tenant IN marketplace_sellers(tourhub, approved)
  → lib/market/live-mapper.ts → MarketListing UI
```

Свой `/p/*` не требует marketplace_slugs.

**Catalog `/catalog`** — пока **demo-data** (`lib/demo-data/scenarios.ts`, `objects.ts`), не hub.

## Заявки (TourHub → Vitrina inbox)

```
TourHub POST /api/marketplace-request
  → mega-hub POST /api/marketplace/request
  → AI parse + matchRequestTenants (FTS по hub.*_cache)
  → hub.marketplace_requests + targets
  → vitrina POST /api/integrations/submissions (HMAC)
  → submission в inbox тенанта + Telegram
```

Партнёр отвечает: `POST /api/admin/submissions/{id}/marketplace-response` → webhook в hub.

## Что в hub cache vs что только в vitrina

| Поле | company_cache | listing_cache | Примечание |
|------|---------------|---------------|------------|
| name, city, short_description | ✅ | — | |
| categories, tags, marketplace_themes | ✅ | themes на page | |
| logo, logo_dark, cover, gallery, video | ✅ | — | с 2026-07-21 |
| legal_name, legal_entity_type, registration_number | ✅ | — | публичные юр. поля |
| about, languages, license, tourism_business_role | ✅ | — | sync в hub |
| founding_year, employee_count, coverage_cities | ✅ | — | |
| **bank_details** | ❌ | — | **только** `company_profiles` в vitrina |
| price_from | — | ✅ | |
| seats, wholesale price, slots | — | ❌ | placeholder в live-mapper |

TourHub `live-mapper.ts` может ещё не отображать все sync'd поля — см. [PROGRESS.md](../PROGRESS.md).

## Seed для локальной разработки

```bash
cd vitrina
node scripts/seed-tourhub-demo.mjs
```

Создаёт demo-операторов + вызывает `POST {mega-hub}/api/sync/company` для каждого.
Без этого `hub.company_cache` пуст → матчинг заявок не находит тенантов.

## Критический контур (Definition of Done для Vitrina)

> Профиль сохранён → sync прошёл → listing опубликован → видно в TourHub live

Проверка:
```bash
curl -s http://localhost:3002/api/market/listings | jq '.count'
```
