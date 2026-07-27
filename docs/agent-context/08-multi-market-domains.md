# 08 — Маркеты: отдельные проекты и кастомные домены

> **Решение:** 2026-07-27  
> **Статус:** фаза 1 (TourHub / tourhub.kz) — в prod; фазы 2–4 — когда появятся следующие маркеты.

## Контекст

«Маркет» — запись в `hub.marketplaces` + публичный B2C-фронт (приложение **tourhub** или его клон).
Данные и seller-flow общие через **vitrina** (write) и **mega-hub** (cache, search).

| slug | UI | Prod (сейчас) |
|------|-----|---------------|
| `tourhub` | tourhub (Next.js) | tourhub.yanbada.com, **tourhub.kz** |
| `tourism` | mega-hub `/m/tourism` | B2B guided-search (другой продукт) |

**Не путать:** `tourism` (B2B в mega-hub) и `tourhub` (B2C в отдельном репо).

---

## Принятое решение (2026-07-27)

**Один маркет = один Vercel-проект** (форк/клон `tourhub`), свой домен.

Multi-tenant middleware в одном TourHub **не делаем**, пока маркетов мало.
Когда дойдём до 2+ B2C-маркетов — добавим env `TOURHUB_MARKET_SLUG` и platform admin «Маркеты».

### Почему не multi-tenant сразу

- TourHub **не привязан к hostname** — live-данные идут server-side в mega-hub по env.
- Кастомный домен на mega-hub (`hub.marketplaces.custom_domain`) ведёт на `/m/{slug}` (B2B UI), **не** на `/market` TourHub.
- Отдельный Vercel-проект проще: свой брендинг, DNS, деплой без риска для соседних маркетов.

---

## Фаза 1 — TourHub на tourhub.kz ✅ (сейчас)

| Шаг | Статус | Детали |
|-----|--------|--------|
| Vercel-проект tourhub | ✅ | github.com/sibnike/tourhub |
| Домен tourhub.kz в Vercel | ✅ | привязан владельцем |
| Env Production | проверить | см. ниже |
| Slug канала в коде | `tourhub` | захардкожен в `listings-bridge.ts` — **OK для одного маркета** |
| Platform admin «Маркеты» | отложено | не блокирует prod |

**Обязательные env (Vercel Production):**

```
TOURHUB_DATA_MODE=live
MEGA_HUB_API_URL=https://hub.microp.app
```

**Smoke после деплоя:**

```bash
curl -s https://tourhub.kz/api/market/listings | jq '.count, .dataMode'
# ожидаем: count >= 3, dataMode: "live"
```

**Опционально (справочно в БД, на работу app не влияет):**

```sql
UPDATE hub.marketplaces
SET custom_domain = 'tourhub.kz'
WHERE slug = 'tourhub';
```

---

## Фаза 2 — второй B2C-маркет (когда понадобится)

### 2.1 Инфра (vitrina + hub)

1. Миграция / SQL: новая строка в `hub.marketplaces`:
   - `slug` (например `visit-almaty`)
   - `name`, `description` (i18n jsonb)
   - `access_policy` (`gated` | `open`)
   - `theme_slugs` из `public.marketplace_themes`
   - `custom_domain` (справочно)
2. Platform admin: approve sellers → `hub.marketplace_sellers`
3. Тенанты: publish wizard → `pages.marketplace_slugs` включает новый slug
4. Seed / re-sync listings для канала

### 2.2 Новый Vercel-проект

1. Клон репо `tourhub` (или новый Vercel project → тот же git)
2. Свой домен в Vercel + DNS (CNAME → Vercel)
3. Env:
   ```
   TOURHUB_DATA_MODE=live
   MEGA_HUB_API_URL=https://hub.microp.app
   TOURHUB_MARKET_SLUG=visit-almaty   # после фазы 3
   ```
4. Брендинг в коде проекта (footer, metadata, logo) под партнёра

### 2.3 Код tourhub (минимальный diff)

| Файл | Изменение |
|------|-----------|
| `lib/env/market-slug.ts` | `process.env.TOURHUB_MARKET_SLUG ?? 'tourhub'` |
| `lib/marketplace/listings-bridge.ts` | `marketplace: getMarketSlug()` |
| `lib/marketplace/hub-bridge.ts` | metadata `marketplace_slug` если hub начнёт принимать |
| `.env.example` | документировать `TOURHUB_MARKET_SLUG` |

**Не трогаем:** middleware по Host, multi-tenant routing — не нужны при отдельных проектах.

---

## Фаза 3 — Platform admin «Маркеты» (vitrina)

Когда маркетов > 1 или нужен UI вместо SQL.

**Маршрут:** `/admin/platform/markets`

**CRUD поля** (`hub.marketplaces`):

| Поле | Назначение |
|------|------------|
| `slug` | ключ канала (`tourhub`, …) |
| `name`, `description` | i18n |
| `access_policy` | `open` \| `gated` |
| `subdomain` | `*.microp.app` (для B2B mega-hub) |
| `custom_domain` | справочно + чеклист DNS |
| `settings.frontend_app` | `tourhub` \| `hub_b2b` — куда вешать домен |
| `is_active` | вкл/выкл |

**API:** `GET/PATCH /api/admin/platform/markets`, `[slug]`

**Замена хардкода:** `PUBLISH_CHANNELS` в `vitrina/lib/marketplace/market-channels.ts` → читать из `hub.marketplaces WHERE is_active`.

**UI чеклист при сохранении домена:**

1. DNS: CNAME → `cname.vercel-dns.com`
2. Домен в Vercel (проект **tourhub**, не mega-hub)
3. Env `TOURHUB_MARKET_SLUG` = slug маркета

---

## Фаза 4 — не делаем без явного запроса

| Идея | Почему отложено |
|------|-----------------|
| Один TourHub + middleware по Host | сложнее ops; отдельные проекты проще |
| `tourhub.kz` → mega-hub rewrite | покажет B2B `/m/tourhub`, не `/market` |
| Общий брендинг из `hub.marketplaces.settings` в TourHub | нужен только при many markets в одном репо |

---

## Схема (текущая и целевая)

```
                    ┌─────────────────────────────────┐
                    │  Vitrina (admin.microp.app)      │
                    │  profiles · pages · publish      │
                    │  hub.marketplace_sellers         │
                    └──────────────┬──────────────────┘
                                   │ webhook sync
                                   ▼
                    ┌─────────────────────────────────┐
                    │  mega-hub (hub.microp.app)       │
                    │  company_cache · listing_cache     │
                    │  search-listings · marketplace     │
                    └──────────────┬──────────────────┘
                                   │ HTTP API (MEGA_HUB_API_URL)
           ┌───────────────────────┼───────────────────────┐
           ▼                       ▼                       ▼
   tourhub Vercel #1        tourhub Vercel #2        mega-hub /m/*
   tourhub.kz               (будущий домен)         tourism B2B
   slug=tourhub              slug=visit-almaty
   env: MARKET_SLUG          env: MARKET_SLUG
   (пока hardcode)           (фаза 2)
```

---

## Связанные документы

| Документ | Содержание |
|----------|------------|
| [05-categories-mapping.md](./05-categories-mapping.md) | themes vs sellers vs marketplace_slugs |
| [02-ecosystem-data-flow.md](./02-ecosystem-data-flow.md) | write/read path TourHub live |
| [mega-hub/docs/MARKETPLACE_DOMAINS.md](../../mega-hub/docs/MARKETPLACE_DOMAINS.md) | домены для B2B `/m/*` (не TourHub B2C) |
| [03-tourhub-current-state.md](./03-tourhub-current-state.md) | экраны и live vs demo |

## Definition of Done — новый B2C-маркет

- [ ] `hub.marketplaces` — строка с slug
- [ ] Sellers approved на slug
- [ ] Listings с `marketplace_slugs` содержат slug + published
- [ ] Vercel-проект + домен + env live
- [ ] `TOURHUB_MARKET_SLUG` (после фазы 2 кода)
- [ ] `curl https://{domain}/api/market/listings` → count > 0, dataMode live
