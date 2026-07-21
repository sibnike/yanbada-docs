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
- `categories: ['tourism']` по умолчанию для тур-бизнеса
- Обязательный picker `marketplace_themes` (минимум 1 из 5)

### 3. Расширить syncToHub
~~Проброс tourism-полей в `hub.company_cache`~~ **✅ 2026-07-21** — legal, tourism, media в sync; `bank_details` только vitrina.

### 4. Publish flow
Wizard: профиль → тип бизнеса (page template) → published page с `catalog_items` → auto listing sync.

### 5. Проверить entitlements
`feature_hub: false` у free — может блокировать sync. Убедиться, что demo/production tenants sync'ятся.

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
- [ ] `marketplace_themes` заполнены
- [ ] Опубликована страница с catalog_items
- [x] `hub.company_cache` содержит новые поля (после sync)
- [ ] `hub.listing_cache` содержит listing
- [ ] `curl localhost:3002/api/market/listings` показывает карточку в live mode

Полный статус: [../PROGRESS.md](../PROGRESS.md)

## Seed для регрессии

```bash
cd vitrina && node scripts/seed-tourhub-demo.mjs
```

Эталон: 3 demo-оператора → tenants + pages + hub sync.
