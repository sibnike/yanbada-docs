# 04 — Vitrina: приоритеты для интеграции с TourHub

**Контекст:** владелец решил сначала доработать профили в Vitrina, затем вернуться в TourHub для live-подключения.

## P0 — блокирует live TourHub

### 1. Tourism profile UI + API
~~Поля уже в миграции `20260720110000`, но **нет в admin UI и не уходят в sync**~~

**2026-07-21:** расширенный профиль в admin UI + sync в hub:
- Юр. данные: ТОО/ИП, БИН/ИИН, юр. адрес, банк (только vitrina)
- Туризм: роль (оператор/агент/гид) + лицензия/сертификат
- Медиа: логотип светлый/тёмный, обложка, галерея, видео (YouTube/upload)
- О компании: about, языки, города работы, год основания, сотрудники
- hub.marketplaces: канал `tourhub`

**Файлы:** `20260721100000_company_profile_legal_extended.sql`, `company-profile-client.tsx`, `sync-to-hub.ts`

### 2. Категории при регистрации
~~`categories: ['tourism']` по умолчанию для тур-бизнеса~~
~~Обязательный picker `marketplace_themes` (минимум 1 из 5)~~

**✅ 2026-07-21:** `/register` — чекбокс «туристический бизнес» + picker themes; API валидирует slugs.

### 3. Расширить syncToHub
~~Проброс tourism-полей в `hub.company_cache`~~ **✅ 2026-07-21** — legal, tourism, media в sync; `bank_details` только vitrina.

### 4. Publish flow
~~Wizard: профиль → тип бизнеса → published → listing~~

**2026-07-26:** `/admin/t/{slug}/publish` + multi-market model:
- themes ≠ channel; TourHub **gated** (`hub.marketplace_sellers`)
- `pages.marketplace_slugs` + listing filter `marketplace=tourhub`
- Platform: `/admin/platform/marketplace-sellers` approve/reject
- См. `05-categories-mapping.md`, миграция `20260726180000_marketplace_sellers_channels.sql`

### 5. Проверить entitlements
`feature_hub: false` у free — **не** блокирует listing sync.  
Tourism register включает `feature_page_templates` для wizard/picker.

## P1 — улучшает маркет

- Публичный `GET` JSON одной страницы (pages + blocks + catalog_items) для TourHub detail view
- Preset tags: `tour_operator`, `city_tour`, `multiday`, …
- Membership в marketplace `tourism` (UI в vitrina или mega-hub)

## P2 — AI Content Builder

ТЗ: `vitrina/docs/TZ-AI-Content-Builder-Tourism.md`
- Пошаговый диалог вместо batch-анкеты
- Редактирование published page через AI → `PATCH blocks/{id}`
- Шаблоны: `guides.ts`, `transport.ts`, `activities.ts`, `events.ts` (часть уже создана)

## Не плодить третью таксономию

Использовать **`marketplace_themes`** как source of truth для сортировки в TourHub market.
TourHub добавит таблицу маппинга theme → UI category.

## E2E checklist (перед возвратом в TourHub)

- [x] Создан/обновлён профиль в admin vitrina (prod UI)
- [x] `marketplace_themes` заполнены (register + profile)
- [x] Publish wizard + seller access (TourHub gated)
- [x] `hub.company_cache` содержит новые поля (после sync)
- [ ] `hub.listing_cache` с `marketplace_slugs=['tourhub']` + seller approved (после migrate + seed)
- [ ] `curl …/api/market/listings` live показывает только tourhub-канальные listings

Полный статус: [../PROGRESS.md](../PROGRESS.md)

## Seed для регрессии

```bash
cd vitrina && node scripts/seed-tourhub-demo.mjs
```

Эталон: 3 demo-оператора → tenants + pages + hub sync.
