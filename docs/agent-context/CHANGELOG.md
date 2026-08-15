# Changelog — Agent Context

Формат: `YYYY-MM-DD | проект | что сделано | что дальше`

---

## 2026-08-15

**vitrina** | Промо-уголок хаба и страниц
- Модель `PromoStory`: `pages.promo` (миграция `20260815140000`) + `tenants.settings.hub_promo`
- Админка: общий `promo-story-editor` в Hub → Настройки и в редакторе страницы
- Публичный UI: левый уголок с логотипом, выезд sheet, cinema на Play; скрыто в embed
- Автооткрытие: хаб-корень 1 раз за сессию, страница 1 раз на pageId
- **Prod:** merge [vitrina#30](https://github.com/sibnike/vitrina/pull/30) (`e42eaf8`) + миграция `20260815140000` на mega-vitrina; Vercel Production Ready
- Auto-open: прямой заход — шторка; `hub_back` — только уголок; ключ seen = locale + хеш медиа; даты кампании `starts_at`/`ends_at`; постер Cloudinary `so_0` + mute-превью
- **Дальше:** деплой этого пакета на prod; smoke page-small-tour (нет чёрного экрана, нет звука до Play)

## 2026-08-12

**vitrina + docs** | Daily backup: merge #29 + первый успешный run
- Merged [PR #29](https://github.com/sibnike/vitrina/pull/29) → `main` (`817dd9e`, pg_dump 17, Node 24, `[skip vercel]`)
- Secrets: Session pooler `SUPABASE_DB_URL` + API keys
- Успех: [run 31562692700](https://github.com/sibnike/vitrina/actions/runs/31562692700); дальше cron 02:00 UTC
- Док: обновлён [github-actions-backup-fix.md](../github-actions-backup-fix.md) — эталон как в vitrina + доп. рекомендации (sudo gpg, без npm ci, secrets, skip vercel)
- **Дальше:** сменить DB password (светился в чате) + обновить secret; Cloudinary backup; квартальный restore-тест

## 2026-08-03

**vitrina + docs** | Daily backup — parity с tour-hub (PR #29)
- Скрипты: `backup-db.sh`, `backup-storage.mjs`, `restore-storage.mjs`; workflow 02:00 UTC, artifact 30 дней
- Доки: `vitrina/docs/backup.md`, `vitrina/docs/supabase-migration.md`; обновлены `docs/BACKUP.md`, `07-where-to-look.md`, `PROGRESS.md`
- Workflow fix: только `@supabase/supabase-js` (без `npm ci` — lockfile drift)
- **Дальше:** secrets в GitHub → merge #29 → Run workflow → проверить artifact

## 2026-07-28

**tourhub + docs** | Домен prod: tourhub.kz → www.ota.kz
- UI footer/menu: `www.ota.kz`, `info@ota.kz`; `metadataBase` + redirects legacy доменов в `vercel.json`
- Docs: PROGRESS, 08-multi-market-domains, README ecosystem
- **Дальше:** deploy tourhub; smoke `curl www.ota.kz/api/market/listings`; проверить DNS/email (см. чеклист владельца)

## 2026-07-27

**vitrina + tourhub** | Admin/UI: отступ стрелки select + сворачиваемая география на pages
- Vitrina: `components/ui/select.tsx`, global `select { padding-inline-end }`, блок «География услуги» сворачивается после save (**merged #26**)
- TourHub: `.catalog-select` padding + custom chevron (PR #19 merged)
- **Дальше:** smoke admin pages geography после deploy vitrina (см. PROGRESS E2E)

**tourhub + vitrina** | Pages: география услуги (страна/города) → listing_cache
- Admin page builder: выбор страны, «вся страна» или несколько городов (справочник, не ввод)
- Sync → hub.listing_cache.service_*; TourHub card/filter по page city, не company HQ
- Migration prod ✅; hub #13, vitrina #24/#25/#26, tourhub #18 merged
- **Дальше:** smoke kendala tour-2 фильтр «Астана» на prod market

**tourhub** | Market P0: seats UX, checkout, no demo flash
- Карточка: exclusive-day + calculator → «2–10 чел.» + «Дата доступна», без «1 из 1»
- Checkout: cleanup таймеров, fallback «Продолжить», валюта в offer (USD/$)
- Live load: старт с `[]`, demo только после `mode=demo` из API
- Резерв: exclusive-day списывает 1 слот дня, не qty людей
- **Дальше:** prod deploy + smoke kendala tour-1

**tourhub + vitrina** | Market sheet: кнопка «Подробнее» → embed страницы Vitrina (info-only)
- TourHub: `MarketListingDetailSheet` + iframe `embed=1&embedView=info&lang=…` (без формы/калькулятора)
- Vitrina: query `embedView=info` — только info + social blocks в embed
- Live listings: `vitrinaTenantSlug` + `vitrinaPageSlug` из listing_cache; env `NEXT_PUBLIC_VITRINA_URL`
- **Дальше:** deploy vitrina + tourhub; smoke kendala tour-1 на prod

**docs + tourhub** | План multi-market: отдельный Vercel-проект на маркет
- Решение: tourhub.kz на том же репо tourhub (домен в Vercel ✅); multi-tenant middleware не делаем
- Зафиксировано: [08-multi-market-domains.md](./08-multi-market-domains.md) — фазы 1–4
- Фаза 1: env live + smoke `/api/market/listings`; slug `tourhub` в коде OK
- Фаза 2+: `TOURHUB_MARKET_SLUG`, новый hub.marketplaces + sellers, клон Vercel
- Фаза 3: platform admin «Маркеты» в vitrina, PUBLISH_CHANNELS из БД
- **Дальше:** smoke tourhub.kz; при 2-м маркете — фаза 2 из 08

**tourhub + vitrina** | Market sheet: qty + валюта + group total «от»
- Qty больше не зажимается `seatsLeft=1` (exclusive day) → можно 2…max_people
- `formatMoney` по `priceCurrency` (USD → `$`, не всегда `₸`)
- `price_from` для `group_price` = пакетный total на min_people (не per-person)
- PR: tourhub #13, vitrina #20/#21; re-sync: tour-1 `price_from=1960 USD`
- Prod проверено: qty 2…10, tier 4 → 2546 $, карточка «от 1862 $»
- **Дальше:** если нужно «от 1750» — `min_people=1` в калькуляторе (сейчас min=2 → 1960)

**vitrina + hub + tourhub** | Market: цена калькулятора по числу людей
- Sync `calculator_pricing` (tiers/min/max) в `listing_cache`
- Sheet: qty от min_people, total по тирам (не unit×qty); карточка «от»
- Form/catalog по-прежнему линейно

**tourhub** | Fix crash на live slots без times
- `market-listing-sheet`: `times?.length`; date-only slots без выбора времени
- Заглушки `/cabinets`, `/gov-demo` (меню больше не 404)

**vitrina + hub + tourhub** | Listing: описание и фото только из Info
- `short_text` = `info.body` (не весь текст страницы)
- `cover_image_url` / `images` из `info.images` → market card cover
- **Дальше:** prod migration + re-sync published listings

**vitrina** | Admin: настройки бронирования «не сохранялись»
- GET booking configs: `Cache-Control: no-store` (раньше max-age=30 откатывал UI после save)
- Editor применяет config из POST/PUT; Save All сохраняет dirty booking
- **Дальше:** проверить hard reload на kendala tour-2 form booking

## 2026-07-26

**vitrina** | Market listing: цена и даты как на публичной странице
- `price_from`: form (`pricing`) + calculator (`page_blocks`) приоритетнее catalog stub
- availability snapshot: booking на `calculator` + `form` blocks (не только form/catalog)
- Пример SoT: `/p/tour-1?tenant=kendala-travel` (цена калькулятора + дата из booking, напр. 10 авг.)
- **Дальше:** deploy + re-sync published listings (kendala tour-1 и demo)

**vitrina + hub + tourhub** | Market: 3 уровня скидки (%)
- Page/listing: `market_discount_tiers {public,silver,gold}` — на витрине минимальная (public)
- Silver: platform `/admin/platform/marketplace-buyers`
- Gold: тенант `/admin/t/{slug}/market-partners` → `marketplace_partner_links`
- Hub: `POST /api/marketplace/resolve-partner-tier`
- **Дальше:** prod migration + seed скидок; checkout с buyer session

**vitrina + hub + tourhub** | Market: даты и места из booking
- Snapshot в `listing_cache`: `market_booking_mode`, `next_departure_date`, `seats_*`, `available_slots`
- Sync при publish listing + re-sync после создания брони
- TourHub: nearest date на карточке; календарь фильтрует программы на выбранный день
- Seed: `scripts/seed-market-booking.mjs` (3 demo)
- Prod: migration + seed + live API с датами/местами (borovoe/kok-tobe/boat)
- **Дальше:** booking на smoke-almaty-day; seats обновляются после реальной брони

**tourhub** | Richer live mapper (catalog + market seller)
- Partners list/detail: company_cache + services из listings; cover/logo/gallery/website
- Скрыты fake metrics в live; shared `hub-company-parse`
- **Дальше:** sights live; page JSON для reviews/roomTypes (P2)

**tourhub** | Catalog partners live из hub
- `GET /api/catalog/partners` → search-listings `marketplace=tourhub`, unique tenants
- `/catalog/partner/[slug]` → company_cache; sights остаются demo
- **Дальше:** ✅ richer mapper (см. выше)

**vitrina** | Publish = выставление готовых pages на канал
- Wizard не создаёт новые услуги: выбор page из «Страниц» → marketplace_slugs + publish
- Бронирование/контент остаются в Microp; маркет только канал видимости
- **Дальше:** smoke smoke-tourhub: page → attach TourHub → live count+1

**vitrina** | UI «Маркеты» — мульти-канал с первого экрана
- Sidebar: «Маркеты» (было «В TourHub»)
- Wizard: выбор канала из `PUBLISH_CHANNELS`; TourHub — первый enabled
- API status/request-access принимают `marketplace`
- **Дальше:** добавлять каналы в `market-channels.ts` + строку в `hub.marketplaces`

**prod E2E** | Publish flow + TourHub live listings
- Hub prod build fixed (`marketplace` on search filter) — hub #6/#7
- Seed → `hub.microp.app`; listing_cache.marketplace_slugs=`tourhub` для 3 demo
- TourHub `MEGA_HUB_API_URL=https://hub.microp.app` + redeploy
- Live: `GET tourhub.yanbada.com/api/market/listings` → **count: 3**
- **Дальше:** ручной smoke wizard (pending/reject/approve); multi-market picker — out of scope

**vitrina + hub** | Publish flow: multi-market + TourHub gated access
- Модель: themes ≠ profile↔market ≠ page↔market; `access_policy` open|gated
- Schema: `hub.marketplace_sellers`, `pages/listing_cache.marketplace_slugs`, tourhub=gated
- Wizard `/admin/t/{slug}/publish`; platform approve `/admin/platform/marketplace-sellers`
- TourHub live filter `marketplace=tourhub` + approved sellers
- Docs: `05-categories-mapping.md`, `02-ecosystem-data-flow.md`
- **Дальше:** ✅ prod seed + live listings (см. блок выше)

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
