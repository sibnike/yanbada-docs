# Changelog — Agent Context

Формат: `YYYY-MM-DD | проект | что сделано | что дальше`

---

## 2026-07-26

**vitrina + hub DB** | RLS perf indexes P0+P1 (`20260726170000`)
- P0: `hub.event_maps` / `event_polls` (`event_id`)
- P1: photo_bank partials; `page_blocks` / `catalog_items` active list; marketplace token InitPlan
- Prod: `CONFIRM_PROD_DB_PUSH=1 npm run db:push:prod`
- **Дальше:** смотреть Advisor unused_index / slow queries после роста трафика

**vitrina** | Page builder INP: title isolation + stable row callbacks
- `PageTitleSection` — локальный state заголовка; родитель читает через ref только на save
- `SortableBlockRow`: `onSelect/onDelete(id)` + `useCallback` — React.memo снова работает
- **Дальше:** при необходимости так же изолировать themes picker

**vitrina** | Lighthouse Insights (Speed Index / fonts)
- Root: Inter через `next/font` + `display:'swap'` (`lib/ui/app-font.ts`)
- Hub: один активный шрифт через dynamic import (`lib/hub/fonts/*`); admin preview без next/font
- Accepted: bfcache blocked (admin auth), unused JS ~20KiB, render-blocking ~140ms
- **Дальше:** перепрогнать Lighthouse на admin/hub после деплоя

**session close** | Инфра-заметки + backlog с комментариями в коде
- Сделано на prod: photo bank, builder perf, middleware API skip, hub `maxDuration=60`
- P2 в коде (JSDoc/comments): `auth-cookie.ts`, `middleware.ts` vanity `/p`, `heavy-api-duration.ts`, supabase `admin.ts`
- Инварианты в `PROGRESS.md`: HTTP-only Supabase, cookie SSO, no Edge getUser на `/api/*`
- **Не деплоим лишнее:** content-builder WIP / Microp lock / docx — вне этой сессии
- **Дальше:** продуктовые P0/P1; P2 infra — только по сигналу (timeout logs / XSS / scale)

**docs** | Инвариант: Serverless → Supabase только через HTTP
- Подтверждено: vitrina/mega-hub/tourhub не держат TCP к Postgres на Vercel
- Зафиксировано в `YANBADA_ARCHITECTURE.md`, `06-conventions-for-agents.md`, ARCHITECTURE hub/vitrina
- Supavisor `:6543` — только при будущем прямом SQL; сейчас не нужен
- **Дальше:** не добавлять `pg`/`DATABASE_URL` в Next API без явного решения

**mega-hub** | Serverless limits для AI match / Events
- `maxDuration = 60` на heavy marketplace + participants routes (`lib/vercel/heavy-api-duration.ts`)
- Docs: `HUB_ARCHITECTURE.md` §Serverless limits, `HUB_ROADMAP-next.md` tech debt
- **Оставлено на потом (P2):** job queue (QStash/Inngest) для dispatch; availability concurrency; async CSV invites
- **Дальше:** смотреть Vercel FUNCTION_INVOCATION_TIMEOUT — при появлении вводить очередь

**vitrina** | Auth middleware latency + security backlog зафиксирован
- Middleware: `/api/*` на admin host без Edge `getUser()` — auth только в handlers (`401` JSON)
- Docs: `ARCHITECTURE.md` §16a, `DOMAINS-MICROP-PROD.md` §Security backlog, `ROADMAP-next.md`
- **Оставлено на потом (P2):** cookie scope split (host-only admin + soft-SSO hub); `/p` tenant из Host на vanity
- **Дальше:** не трогать `.microp.app` cookie без отдельного эпика

---

## 2026-07-22

**vitrina + mega-hub + docs** | Prod-домены Microp (миграция с yanbada.com)
- Fallbacks и email defaults → `microp.app`; hub cookie/auth для `.microp.app`
- `vitrina/docs/DOMAINS-MICROP-PROD.md`, `docs/DOMAINS-MICROP.md`, обновлены ARCHITECTURE / DEPLOY / 07-where-to-look
- **Дальше:** push vitrina + hub, env на Vercel, DNS Cloudflare, Supabase Auth URLs, Resend domain

---

**vitrina** | MVP admin UI для диалогового AI Content Builder
- `components/admin/content-builder-client.tsx` — split-screen: чат слева, iframe preview справа, % готовности + chips недостающих блоков
- Routes: `/admin/t/[slug]/content-builder` (create), `/pages/[id]/content-builder` (continue/edit)
- `PageTemplatePicker` — при `feature_ai_content_builder_dialog` → «Собрать с AI», иначе старый questionnaire flow
- Entry: кнопки в page editor + иконка ✨ на published page в списке
- Phase 1 (templates + `content_keys`/`required_block_keys`) уже была в коде — без изменений
- **Дальше:** E2E на nomad-trails с включённым флагом, `tsc --noEmit` на локальной (не iCloud) копии

---

## 2026-07-21 (prod demo seed)

**vitrina + hub** | Demo tenants на prod
- `seed-tourhub-demo.mjs --prod` — SQL через linked Supabase CLI + hub webhooks
- 3 тенанта: nomad-trails, steppe-journeys, aquatour-burabay
- Fix: `VITRINA_WEBHOOK_SECRET` добавлен на Vercel prod (mega-hub + vitrina), hub redeploy
- TourHub live: 21 listing, demo sellers видны

---

## 2026-07-21 (merge + tourhub fix)

**mega-hub + vitrina** | Live E2E merged to prod
- hub PR #2, vitrina PR #3 → main, Vercel prod deploy
- **tourhub:** закрыт некорректный PR #1 (partial diff на legacy Netlify repo)
- Новый PR #2 — полный Next.js app (78 files, build ✅)
- **Дальше:** merge tourhub #2, Vercel env, prod seed

---

## 2026-07-21 (live E2E)

**tourhub** | Live market: mapper, seller profile, listings bridge
- `live-mapper.ts` — price, city, themes, `hubCompanyToMarketSeller`
- `/market/seller/[slug]` — live mode из `GET hub/api/marketplace/company/{slug}`
- Seller UI: about, cover, gallery url

**mega-hub** | Public company API + richer listing search
- `GET /api/marketplace/company/[tenantSlug]`
- `search-listing-cache` — price_from, marketplace_themes, company city

**vitrina** | Registration tourism + seed listing sync
- Register: `is_tourism_business`, обязательный `marketplace_themes` picker
- `seed-tourhub-demo.mjs` — extended hub sync + listing webhook
- **Дальше:** deploy vitrina + hub; seed с поднятым mega-hub; TourHub `TOURHUB_DATA_MODE=live`

---

## 2026-07-21 (docs repo)

**meta** | Git-репозиторий `sibnike/yanbada-docs`
- Корень: `~/Projects/Yanbada-superApp/` (docs + README + `.cursor/rules/yanbada*.mdc`)
- Соседи `vitrina/`, `mega-hub/`, `tourhub/` в `.gitignore`
- Правило `.cursor/rules/yanbada-docs.mdc`
- **Дальше:** после правок docs — commit/push в yanbada-docs

---

## 2026-07-21 (docs)

**meta** | Единый хаб документации для агентов
- `docs/PROGRESS.md` — статус prod и приоритеты
- `docs/agent-context/07-where-to-look.md` — навигатор по задачам
- `README.md` в корне superApp, обновлены 00-START-HERE, agent-context README, cursor rule
- **Дальше:** при каждой значимой сессии обновлять CHANGELOG + PROGRESS при смене статуса

---

## 2026-07-21

**vitrina** | Расширенный профиль компании (юр. данные, туризм, медиа, банк)
- Миграция `20260721100000_company_profile_legal_extended.sql`
- Admin UI `/admin/t/{slug}/profile` — все секции
- Sync tourism/public полей в `hub.company_cache`; bank_details только vitrina
- hub.marketplaces + канал `tourhub`
- **Дальше:** AI Content Builder UI; TourHub live-mapper под новые поля cache

**meta** | Cursor rule `.cursor/rules/yanbada-agent-context.mdc` — читать `docs/agent-context/` в начале сессии, писать CHANGELOG после значимой работы

**infra** | Локалка vitrina поднята: Docker + Supabase :54331, `db:reset:local`, bootstrap admin
- `.env.local` vitrina + mega-hub — локальные ключи и shared webhook secret
- **Дальше:** `npm run dev` в vitrina (:3000) и mega-hub (:3001) для E2E sync

**vitrina** | Восстановлен из git (`sibnike/vitrina`) в `Projects/Yanbada-superApp/vitrina`
- Локальные артефакты: `YANBADA_ARCHITECTURE.md`, `.vercel/`, `supabase/.temp/`, `next-env.d.ts`
- `MARKETPLACE-SEARCH-AND-REQUEST.md` не найден (не был в git)
- **Дальше:** `.env.local` заполняет владелец; для деплоя достаточно git → Vercel

**tourhub** | Catalog F11 + profiles F11.2 на demo-data
- `/catalog`, `/catalog/partner/[id]`, `/catalog/object/[id]`
- `lib/demo-data/scenarios.ts`, `objects.ts`
- `lib/catalog/*`, market object seller → object profile
- **Дальше:** live catalog из hub; enrichment listings

**docs** | Создана папка `docs/agent-context/` для cross-project контекста агентов

**Решение владельца** | Сначала Vitrina (профили + categories + sync), потом TourHub live integration

---

## 2026-07-20 (из предыдущих сессий)

**tourhub** | Market F21: listing sheet, calendar, seller profile, escrow checkout
**tourhub** | Live market: `TOURHUB_DATA_MODE`, listings-bridge, seed vitrina script restored
**tourhub** | `/api/marketplace-request` proxy на mega-hub (вариант A)
**vitrina** | TZ AI Content Builder tourism; шаблоны guides/transport/activities/events
**incident** | Исходники tourhub в iCloud пропали — восстановлено в Projects/

---

## Шаблон новой записи

```
## YYYY-MM-DD

**project** | краткое описание
- bullet changes
- **Дальше:** next step
```
