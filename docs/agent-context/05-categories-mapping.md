# 05 — Категории, каналы и маппинг

## Не путать: themes ≠ доступ к маркету ≠ видимость page

| Слой | Что | Где |
|------|-----|-----|
| **Themes** | Таксономия услуги (`transport`, `guides`…) | `company_profiles` / `pages.marketplace_themes` → cache |
| **Profile ↔ market** | Компания-seller на канале + статус заявки | `hub.marketplace_sellers` |
| **Page ↔ market** | Услуга (page) выставлена на канал | `pages.marketplace_slugs` → `listing_cache.marketplace_slugs` |
| **access_policy** | `open` \| `gated` на `hub.marketplaces` | TourHub = **gated** |

**Нельзя** публиковаться «во все маркеты». Gated (TourHub): заявка → ревью профиля → `approved` → только тогда page может получить slug канала.

Выдача TourHub: `seller approved` **и** `tourhub ∈ marketplace_slugs` **и** page published.

B2B `hub.marketplace_members` (buyer `/m/*`) — **другой** контур, не seller TourHub.

## Скидки маркета (TourHub)

На page: `market_discount_tiers = { public, silver, gold }` — **проценты**, `public ≤ silver ≤ gold`.

| Тир | Кто | Скидка |
|-----|-----|--------|
| **Public** | все на витрине | минимальная % (показывается сначала) |
| **Silver** | platform admin → `marketplace_members.partner_tier=silver` | средняя |
| **Gold** | продавец добавляет партнёра → `hub.marketplace_partner_links` | максимальная |

Цена юнита: `price_from * (1 - pct/100)`. Resolve: gold link > silver member > public.

## Таксономия

### 1. Vitrina `industry_categories`
Отрасль: `tourism`, `food`, `retail`, …

### 2. Vitrina `marketplace_themes`
| slug | RU |
|------|-----|
| `transport` | Транспорт |
| `accommodation` | Размещение |
| `tourism` | Туры / программы |
| `guides` | Гиды |
| `food` | Питание |

### 3–4. TourHub demo UI categories
См. `tourhub` demo-data / live-mapper — не invent параллельный справочник в Vitrina.

## Page templates → themes

`lib/page-templates/template-marketplace-themes.ts`: tours/activities/events/services → `tourism`; hotels → `accommodation`; restaurants → `food`; guides → `guides`; transport → `transport`; rental → `tourism`.

## Рекомендация агентам

- Themes — фильтры внутри канала; **не** дают вход на TourHub.
- Менять visibility на канал только через `marketplace_slugs` + seller status.
- TourHub read всегда с `marketplace=tourhub`.
