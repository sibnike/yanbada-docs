# 07 — Куда смотреть (по задаче)

> Навигатор для агентов. Сначала [00-START-HERE.md](./00-START-HERE.md), статус — [../PROGRESS.md](../PROGRESS.md).

## Быстрый выбор

| Я хочу… | Читай | Код / команды |
|---------|-------|----------------|
| Понять экосистему | [YANBADA_ARCHITECTURE.md](../YANBADA_ARCHITECTURE.md) | — |
| Узнать что на prod и что дальше | [PROGRESS.md](../PROGRESS.md), [CHANGELOG.md](./CHANGELOG.md) | — |
| Запустить локально | [01-paths-and-ports.md](./01-paths-and-ports.md) | `vitrina`: Docker + `db:reset:local`, порты 3000/3001/3002 |
| Sync vitrina → hub | [02-ecosystem-data-flow.md](./02-ecosystem-data-flow.md) | `vitrina/lib/company-profile/sync-to-hub.ts`, `mega-hub/app/api/sync/company/route.ts` |
| Профиль компании | [04-vitrina-work-backlog.md](./04-vitrina-work-backlog.md) | `vitrina/components/admin/company-profile-client.tsx`, `app/api/admin/t/[tenantSlug]/company-profile/` |
| TourHub market/catalog | [03-tourhub-current-state.md](./03-tourhub-current-state.md) | `lib/market/`, `lib/catalog/live-mapper.ts`, `api/catalog/partners` |
| Категории / themes маркета | [05-categories-mapping.md](./05-categories-mapping.md) | `marketplace_themes` + channels (`marketplace_slugs`, sellers) |
| Маркеты / publish channels | [05-categories-mapping.md](./05-categories-mapping.md), [02-ecosystem-data-flow.md](./02-ecosystem-data-flow.md) | Sidebar «Маркеты» → `/publish`; каталог `PUBLISH_CHANNELS`; TourHub = первый gated |
| Кастомные домены B2C-маркетов | [08-multi-market-domains.md](./08-multi-market-domains.md) | отдельный Vercel на маркет; www.ota.kz; фаза 2+ — `TOURHUB_MARKET_SLUG` |
| **Витрина market (страницы проекта)** | [09-themed-sites.md](./09-themed-sites.md), [../sites/README.md](../sites/README.md) | та же насадка mega-hub, что market; Vitrina не трогать |
| **Владелец маркета, заявки, платные карточки** | [10-market-placement.md](./10-market-placement.md) | `hub.site_members`, `site_plans`, `site_placements`, `site_leads` |
| **Каракол: запустить и показать** | [../sites/KARAKOL.md](../sites/KARAKOL.md) | тенанты: `vitrina/scripts/seed-karakol-tenants.mjs`; витрина: `apps/market` (`npm run dev`); стенд `visit-karakol` |
| Миграции БД | см. ниже §Миграции | `*/supabase/migrations/` |
| **Резервное копирование (pg_dump, Storage)** | [BACKUP.md](../BACKUP.md), `vitrina/docs/backup.md` | `vitrina/.github/workflows/daily-backup.yml`, `scripts/backup-db.sh`, `scripts/backup-storage.mjs` |
| **Перенос Supabase (новый project ref)** | `vitrina/docs/supabase-migration.md` | `vitrina/supabase/migrations/`, `mega-hub/supabase/migrations/` |
| Деплой prod / домены Microp | `vitrina/docs/DOMAINS-MICROP-PROD.md`, `DEPLOY-PHASE1.md` | Vercel + Cloudflare + Supabase Auth |
| Auth cookie / субдомены / middleware latency | `vitrina/docs/DOMAINS-MICROP-PROD.md` §Security backlog, `ARCHITECTURE.md` §16a | `vitrina/middleware.ts`, `lib/supabase/auth-cookie.ts` |
| Serverless timeout AI match / Events | `mega-hub/docs/HUB_ARCHITECTURE.md` §Serverless limits | `maxDuration` на marketplace + participants; очередь — P2 backlog |
| Postgres pool / cold start / Supavisor | `YANBADA_ARCHITECTURE.md` §«Доступ к БД из Vercel Serverless» | Runtime = supabase-js HTTP; прямой SQL запрещён без `:6543` |
| Booking | `vitrina/docs/BOOKING-MODEL.md` | `vitrina/app/api/booking/`, admin booking routes |
| Pages / blocks builder | `vitrina/docs/ARCHITECTURE.md`, `TZ-Pages-Builder-Phase1.md` | `vitrina/lib/blocks/` |
| Промо-уголок хаба / страницы | этот файл §vitrina | `lib/promo/`, `components/admin/promo-story-editor.tsx`, `components/public/promo/`, `pages.promo` + `settings.hub_promo` |
| AI Content Builder | `vitrina/docs/TZ-AI-Content-Builder-Tourism.md` | `components/admin/content-builder-client.tsx`, `app/api/admin/t/[tenantSlug]/ai/cb/`, `lib/page-templates/categories/` |
| Заявки TourHub → inbox | [02-ecosystem-data-flow.md](./02-ecosystem-data-flow.md) | `tourhub/app/api/marketplace-request/`, `mega-hub/app/api/marketplace/request/` |
| Hub events / карта / QR | `mega-hub/ARCHITECTURE.md` | `mega-hub/app/e/`, `app/organizer/` |
| Стиль и git | [06-conventions-for-agents.md](./06-conventions-for-agents.md) | — |

---

## По проекту

### vitrina

| Тема | Документ | Ключевые пути |
|------|----------|---------------|
| Архитектура | `vitrina/docs/ARCHITECTURE.md` | `app/`, `lib/`, `components/admin/` |
| Промо-уголок (хаб + /p/*) | `lib/promo/parse-promo-story.ts` | admin: `promo-story-editor.tsx`; public: `components/public/promo/` |
| Roadmap фич | `vitrina/docs/ROADMAP-next.md` | — |
| Интеграция Touchin | `vitrina/docs/INTEGRATION-TOUCHIN-VITRINA.md` | embed, identify |
| Тест-репорты | `vitrina/docs/reports/V-*.md` | prod E2E фикстура `qa-sandbox` |
| Handoff | `vitrina/docs/HANDOFF.md` | — |
| **Backup / restore** | `vitrina/docs/backup.md` | `scripts/backup-db.sh`, `.github/workflows/daily-backup.yml` |
| **Supabase migration** | `vitrina/docs/supabase-migration.md` | restore artifact + `db:push:prod` |

**Admin URL:** `https://admin.microp.app/admin/t/{tenantSlug}/…`  
**Публичные страницы:** `https://vitrina.microp.app/p/{slug}`  
**Hub тенанта:** `https://{hub_subdomain}.microp.app`

**Канон видео промо:** шторка = постер + заголовок + Play; Play → cinema со звуком, без loop; конец → снова overlay. Автоплея нет. Видео: загрузка Cloudinary или HTTPS, формат сторис (до 60 с / 80 МБ); на выдаче `w_720,du_60,q_auto:eco`. YouTube — плеер только по Play.

### mega-hub

| Тема | Документ | Ключевые пути |
|------|----------|---------------|
| Архитектура | `mega-hub/ARCHITECTURE.md` | `app/api/sync/`, `app/e/` |
| Marketplace / AI match | `mega-hub/tasks/prompt_81_marketplace_request.md` | `app/api/marketplace/` |
| Company card | `mega-hub/tasks/prompt_39_hub_company_card_redesign.md` | `app/e/[slug]/company/` |

**Prod:** `https://hub.microp.app`

**Витрина market:** черновик `docs/sites/code/mega-hub/` — контент той же насадки; не менять vitrina. Рабочая версия того же контура крутится в `apps/market` (Next 15 + pg): там проверяются рендерер, API заявок и модерация до переноса в hub

**Размещение карточек:** владелец маркета (`hub.site_members`) настраивает страницу и тарифы; тенант просит карточку через `/s/{slug}/join`

### tourhub

| Тема | Документ | Ключевые пути |
|------|----------|---------------|
| Архитектура | `tourhub/docs/ARCHITECTURE.md` | полная карта переиспользования vitrina/hub |
| Demo UX эталон | `~/Projects/TourHub-recovered` | vanilla JS Ф0–Ф23, не копировать код |
| Live vs demo | [03-tourhub-current-state.md](./03-tourhub-current-state.md) | `TOURHUB_DATA_MODE`, `lib/market/live-mapper.ts` |

---

## Миграции

Один Supabase prod: **mega-vitrina** (`bfcfwaakxcqplamcswaq`).

| Репо | Папка | Push prod |
|------|-------|-----------|
| vitrina | `vitrina/supabase/migrations/` | `cd vitrina && CONFIRM_PROD_DB_PUSH=1 npm run db:push:prod` |
| mega-hub | `mega-hub/supabase/migrations/` | hub-специфичные; часто зеркало vitrina для `hub.*` |

После миграции: `npx supabase migration list --linked` — Local = Remote.

**Перенос на другой Supabase project:** `vitrina/docs/supabase-migration.md` (restore из artifact + env Vercel).

**Правило:** schema `public.*` и профили — vitrina; schema `hub.*` — mega-hub (sync через webhook, не прямой write из tourhub).

---

## Типовые действия

### «Нужно изменить поле профиля компании»

1. `vitrina/types/company-profile.ts`
2. Миграция `vitrina/supabase/migrations/` (+ зеркало `hub.company_cache` в mega-hub если поле публичное)
3. `lib/company-profile/normalize-profile-patch.ts`
4. `components/admin/company-profile-client.tsx`
5. `lib/company-profile/sync-to-hub.ts` + `mega-hub/app/api/sync/company/route.ts` (если sync в hub)
6. Обновить [PROGRESS.md](../PROGRESS.md) или [CHANGELOG.md](./CHANGELOG.md)

### «TourHub не показывает данные в live»

1. [02-ecosystem-data-flow.md](./02-ecosystem-data-flow.md) — write path прошёл?
2. Supabase: `hub.company_cache`, `hub.listing_cache` по `tenant_id`
3. `tourhub/lib/market/live-mapper.ts` — поле замаплено?
4. Env tourhub: `TOURHUB_DATA_MODE=live`, `MEGA_HUB_API_URL`
5. Seed: `vitrina/scripts/seed-tourhub-demo.mjs` (+ `seed-market-booking.mjs` для дат/мест)
6. Listing snapshot: `vitrina/lib/company-profile/listing-availability-snapshot.ts` → `hub.listing_cache.next_departure_date` / `available_slots`

### «Vercel build упал»

1. Локально `npm run build` в нужном репо
2. Частые причины: TS в UI, module-level `createClient()` без env (см. fix в sync routes mega-hub)
3. Не коммитить `.env.local`

### «Новая фича — куда писать код?»

| Фича | Репо |
|------|------|
| Admin, CRUD, publish, sync | **vitrina** |
| Cache, search, AI match, events | **mega-hub** |
| Публичный UI, read API, demo fallback | **tourhub** |
| **Витрина market (hub.sites)** | контент насадки mega-hub (как market); **vitrina не трогать** |

---

## После значимой сессии

1. [CHANGELOG.md](./CHANGELOG.md) — что сделано
2. [PROGRESS.md](../PROGRESS.md) — если сменился приоритет или prod-статус
3. Профильный backlog — [04-vitrina-work-backlog.md](./04-vitrina-work-backlog.md) при изменении P0/P1
