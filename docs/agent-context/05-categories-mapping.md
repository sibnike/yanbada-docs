# 05 — Категории и маппинг

## Три слоя таксономии (не путать!)

### 1. Vitrina `industry_categories`
Отрасль компании: `tourism`, `food`, `retail`, …
→ фильтр «кто ты в экономике», матчинг заявок

### 2. Vitrina `marketplace_themes` ⭐ рекомендуется как source of truth для маркета
Привязаны к hub marketplace `tourism`:

| slug | RU (типично) |
|------|--------------|
| `transport` | Транспорт |
| `accommodation` | Размещение |
| `tourism` | Туры / программы |
| `guides` | Гиды |
| `food` | Питание |

Хранится: `company_profiles.marketplace_themes[]`, `pages.marketplace_themes[]`

### 3. TourHub demo categories (catalog UI)
Из `scenarios.js` / `TOURHUB_CATEGORIES`:

`accommodation`, `performer`, `transport`, `catering`, `rental`, `events`, `gov`, `staff`, `education`

### 4. TourHub market categories (demo)
`tour_program`, `cultural`, `festival`, `food`, `activity`, `transport`

## Live mapper (TourHub)

`lib/market/live-mapper.ts` — `HUB_CATEGORY_TO_MARKET` маппит hub themes/categories → market UI keys.

При добавлении themes в Vitrina — **обновить mapper** в TourHub, не создавать параллельный справочник.

## Object types (sights catalog)

TourHub demo: `monument`, `national_park`, `museum`, `theatre`
→ `lib/demo-data/objects.ts`, не из Vitrina (пока)

## Page templates (Vitrina)

`lib/page-templates/categories/`:
`tours`, `hotels`, `restaurants`, `rental`, `services`, `guides`, `transport`, `activities`, `events`

Связь template ↔ marketplace_theme — задавать при онбординге, документировать в vitrina.

## Рекомендация агентам

При работе в **Vitrina**: менять `marketplace_themes`, не invent TourHub-specific keys.

При работе в **TourHub**: читать themes из hub, маппить через `live-mapper.ts`.

При работе в **mega-hub**: marketplace `tourism` уже seeded, themes = `ARRAY['transport','accommodation','tourism','guides','food']`.
