# Yanbada — Архитектура экосистемы (мастер-документ)

> Рабочее имя продуктов: **Vitrina** + **Exhibitor Hub**.
> Два независимых приложения, один Supabase, один Auth, один пользователь.
> Для компании — единый продукт Yanbada.

---

## 1. Обзор экосистемы

### Принцип разделения ответственности

| VITRINA (`admin.yanbada.com`) | EXHIBITOR HUB (`hub.yanbada.com`) |
|---|---|
| Профиль компании | Мероприятия (Events) |
| Микросайты и страницы | Каталог участников |
| Товары и услуги | Карта выставки со стендами |
| Формы и заявки (inbox) | Участие (Participations) |
| Тарифы (Free/Pro/Business) | QR-коды стендов |
| Регистрация тенантов | Аналитика выставки |
| Аналитика страниц | Аналитика участника по событиям |
| Кабинет тенанта | Кабинет организатора и участника |

### Золотое правило

Exhibitor Hub **никогда** не хранит данные компании. Он знает только:
- `tenant_id` — ключ для чтения данных из Vitrina
- `event_participations` — факт участия в событии
- `event_stands` — стенд компании на конкретном событии
- Аналитику просмотров и сканирований
- `company_cache` — денормализованный снэпшот, наполняемый только через webhook от Vitrina

### Пользовательский путь (единый кабинет)

```
Компания заходит на admin.yanbada.com (Vitrina)
│
├─ Профиль компании       → категории, теги, контакты, соцсети
├─ Мои страницы           → конструктор страниц
├─ Inbox (заявки)         → submissions
├─ Аналитика              → просмотры, источники, конверсия
├─ Тарифы                 → Free/Pro/Business
└─ Мои выставки      ──► hub.yanbada.com (бесшовно через shared cookie)
                            │
                            ├─ Участие в событиях
                            ├─ Мой стенд
                            ├─ Статистика по каждой выставке
                            └─ Сравнение событий
```

Бесшовность обеспечивается общим Supabase Auth и cookie на домене `.yanbada.com`.

---

## 2. Инфраструктура

### Домены

| Домен | Приложение | Назначение |
|---|---|---|
| `admin.yanbada.com` | Vitrina | Кабинет тенанта, регистрация, тарифы, супер-админка |
| `vitrina.yanbada.com` | Vitrina | Публичные страницы `/p/{slug}` и хабы `/h/{slug}` |
| `{slug}.yanbada.com` | Vitrina | Поддомен тенанта (rewrite на `/h/{slug}`) |
| `hub.yanbada.com` | Exhibitor Hub | Кабинет организатора и компании |
| `{event}.yanbada.com` | Hub | Поддомен мероприятия (опционально) |
| `digitalbridge.kz/exhibitor/*` | Hub | White-label через `event.settings.custom_domain` |

### Общий Supabase

Один Supabase-проект, два логических слоя через PostgreSQL-схемы:

```
Supabase project: bfcfwaakxcqplamcswaq
│
├─ Schema: public  (Vitrina)
│   tenants, tenant_admins, platform_admins, tenant_entitlements, tariff_plans
│   pages, page_blocks, page_views, submissions (+ source_*, marketplace_*)
│   catalog_*, tenant_staff, staff_roles, hub_nodes, icon_library
│   company_profiles, industry_categories, marketplace_themes
│   booking_* (configs, schedules, resources, bookings, …)
│   tenant_clients, ticket/verification (V-28/V-29)
│
└─ Schema: hub  (Exhibitor Hub)
    events, event_participations, event_stands, event_maps, event_analytics, track_events
    company_cache, listing_cache  (read-only снэпшоты из Vitrina)
    marketplace_requests, marketplace_request_targets
    marketplaces, marketplace_members, search_presets
```

**Миграции:** единая история в `vitrina/supabase/migrations/` — **68 файлов** на prod
(зеркало hub-миграций дублируется в `mega-hub/supabase/migrations/`). Prod push только из vitrina:
`CONFIRM_PROD_DB_PUSH=1 npm run db:push:prod`. Hub-DDL через MCP `apply_migration` **запрещён**
(auto-timestamp → orphan в `schema_migrations`).

#### Доступ к БД из Vercel Serverless (инвариант)

Все три приложения (**vitrina**, **mega-hub**, **tourhub**) на prod **не** открывают
прямое TCP к Postgres (`:5432`). Runtime использует только:

- `@supabase/supabase-js` / `@supabase/ssr` → **PostgREST + Auth HTTP** (`NEXT_PUBLIC_SUPABASE_URL`)
- TourHub live → HTTP к mega-hub / vitrina API (своего Supabase-клиента в app-коде нет)

Поэтому классический риск «каждый cold start = новый `pg` Pool → исчерпание соединений»
**сейчас не применим**. Пулер Supavisor (`:6543`) нужен только если появится **прямой SQL**
(drizzle / prisma / `pg` / `postgres.js`).

| Делать | Не делать |
|--------|-----------|
| `createClient(SUPABASE_URL, KEY)` в serverless | `DATABASE_URL` → `:5432` из Vercel Functions |
| При прямом SQL — только Supavisor **transaction** mode `:6543` | Persistent `pg.Pool` без pooler |
| Локальные скрипты: Docker `psql` / CLI | Тащить `pg` в Next.js API «на всякий случай» |

Зафиксировано: 2026-07-26. См. также `agent-context/06-conventions-for-agents.md`.

### Общая Auth

```
Supabase Auth
├─ Magic-link через Resend (домен yanbada.com)
├─ Cookie: sb-{ref}-auth-token на домене .yanbada.com  (shared)
└─ Оба приложения читают одну сессию без редиректов
```

ENV для shared cookie (обязательно):
```
NEXT_PUBLIC_AUTH_COOKIE_DOMAIN=.yanbada.com
```

### SECURITY DEFINER функции (общие)

В схеме `public`, доступны обоим приложениям:

- `public.is_tenant_admin(tid uuid)` — RLS-хелпер
- `public.is_platform_admin()` — проверка супер-админа
- `public.current_user_tenants()` — список tenant_id

Без этих функций RLS уходит в бесконечную рекурсию когда политика hub ссылается на tenant_admins.

### Синхронизация Vitrina → Hub (Push с кэшем)

```
Vitrina: тенант обновляет company_profile / публикует page
    ↓
POST /api/internal/sync-to-hub          → hub.company_cache   (HMAC, 3 retry)
POST /api/internal/sync-listing-to-hub  → hub.listing_cache   (HMAC, 3 retry)
    ↓
Hub читает каталог и маркетплейс из кэша — быстро и независимо
```

Payload company/listing включает поля маркетплейса: `city`, `marketplace_themes`, `price_from`,
`price_currency` (с V-30 / H-M4a). Hub не дёргает Vitrina в рантайме.

ENV в обоих приложениях:
```
VITRINA_WEBHOOK_SECRET=<shared HMAC>
```

Vitrina:
```
HUB_WEBHOOK_URL=https://hub.yanbada.com/api/sync/company
HUB_MARKETPLACE_RESPONSE_URL=https://hub.yanbada.com   # webhook accept/decline (V-32)
VITRINA_SUBMISSIONS_INGEST_SECRET=<shared HMAC>         # входящий ingest от Hub/Touchin
```

### Email (Resend, домен yanbada.com)

- Verified domain в Resend: `yanbada.com`
- Vitrina: `noreply@yanbada.com` — magic-link, signup confirmation, tariff changes
- Hub: `hub@yanbada.com` — приглашения участников на выставки
- Supabase Auth SMTP → smtp.resend.com (для magic-link при логине)

### Репозитории

| Проект | Репо | Деплой |
|---|---|---|
| Vitrina | `github.com/sibnike/vitrina` | Vercel, `admin.yanbada.com` |
| Exhibitor Hub | `github.com/sibnike/hub` | Vercel, `hub.yanbada.com` |

Локально:
```
~/Documents/Yanbada-superApp/
├── vitrina/
└── mega-hub/
```

---

## 3. Что в каком репо

### Vitrina держит

- Auth, tenant_admins, platform_admins
- Profile компании, company_profiles, industry_categories, `marketplace_themes`
- Pages + blocks + submissions (+ booking overlay, source/marketplace attribution)
- Catalog, opciones, staff (PIN), staff_roles
- Booking engine (V-17…V-29): schedules, resources, configs, guest `/g/`, client `/c/`
- Hub_nodes (внутренний — плиточная витрина продукта, не путать с Exhibitor Hub)
- Icon library
- Регистрация тенантов, signup_requests, тарифы, tariff_change_requests
- Page analytics (track + дашборд)
- Webhook отправитель (sync company + listing to Hub)
- **Ingest endpoint** `POST /api/integrations/submissions` (Hub/Touchin/marketplace → inbox)
- **Marketplace response** (accept/decline → webhook в Hub, V-32)

### Hub держит

- Events, participations, stands, maps, visitor guide
- Track events (детальные), event_analytics (агрегаты)
- Company_cache, listing_cache (read-only из webhook)
- **Marketplace:** поиск (M1/M2), запросы (M3a/M4d), мульти-маркетплейс `/m/[slug]`,
  membership, guided-поиск, «Мои запросы»
- Карта-редактор, QR-генератор, тепловая карта
- Embed/white-label, виджет-скрипт
- Webhook получатель (sync company/listing + marketplace response from Vitrina)

### Hub НЕ держит

- Никаких таблиц в схеме `public`
- Никакой записи в чужие таблицы
- Никаких данных компании кроме кэша

---

## 4. Поток end-to-end

```
1. Компания регистрируется в Vitrina
   admin.yanbada.com/register → email → magic-link → кабинет
   tenant создан со status='trial', plan='free', limit_pages=1

2. Заполняет профиль
   /admin/t/{slug}/profile → категории, теги, контакты, описание
   webhook → hub.company_cache обновляется

3. Создаёт страницу
   /admin/t/{slug}/pages/new → блоки form/info/catalog → публикация
   страница доступна на vitrina.yanbada.com/p/{slug}

4. Организатор создаёт выставку в Hub
   hub.yanbada.com/organizer/events/new
   загружает CSV участников, генерируется access_code, рассылка email

5. Компания подключается к выставке
   получает email с кодом → hub.yanbada.com/exhibitor/events/join
   participation подтверждается, стенд закрепляется

6. Организатор расставляет стенды на карте
   /organizer/events/{slug}/map → SVG + drag-and-drop

7. Публикация события
   /e/{slug}/catalog — каталог участников с поиском и фильтрами
   /e/{slug}/map — интерактивная карта со стендами

8. Посетитель находит компанию
   через каталог, карту или сканирование QR на стенде

9. Открывается карточка компании в контексте выставки
   /e/{slug}/company/{tenantSlug} — шапка + Vitrina iframe + действия

10. Аналитика собирается
    каждый шаг трекается в hub.track_events
    Vitrina также видит просмотры с ref=qr|catalog|hub в page_views

11. Компания смотрит свою аналитику
    /exhibitor/events/{slug} — статистика по этому событию
    /exhibitor/analytics — сравнение выставок
```

---

## 5. Текущий статус прода

**БД:** общий Supabase, **68 миграций** в `vitrina/supabase/migrations/` (Local = Remote на prod).
Hub-файлы зеркалируются в `mega-hub/supabase/migrations/`.

### Vitrina (admin.yanbada.com) — **V-1…V-32**

**Shipped:** фазы 1–2.5, Entitlements, i18n+AI, Staff, Icon Library, Hub nodes, V-1…V-16,
**V-17…V-29** (booking core → operations → schedule windows → cancellation → flexible duration →
series → subperiods → presets → payment disclosure → client cabinet → ticket designer → QR verification),
**V-30** (справочник `marketplace_themes`, sync payload company/listing),
**V-31** (ingest marketplace-заявок: `source_type='marketplace'`, `requester_tenant_id`),
**V-32** (accept/decline в inbox + webhook ответа в Hub).

Ключевые prod-E2E: booking V-20…V-26 через `qa-sandbox`, ticket V-28/V-29, marketplace response V-32.
Touchin guest identify (V-16) — live с 2026-06-18.

### Exhibitor Hub (hub.yanbada.com) — **H-0…H-10 + Marketplace H-M1…H-M4d**

**Выставки (shipped):** H-0…H-10 — полный поток организатор / участник / посетитель: события,
каталог, карта, QR, аналитика, embed/white-label, visitor guide с регистрацией и бонусами,
дизайн-система (43 SVG, темы события, `/branding`).

**Маркетплейс (shipped на prod):**

| Фаза | Содержание |
|------|------------|
| **H-M1** | AI-поиск тенантов (`company_cache` + FTS) |
| **H-M2** | AI-поиск услуг/pages (`listing_cache` + sync listing) |
| **H-M3a** | Запрос внешнего заявителя → ingest в Vitrina inbox |
| **H-M4a** | Мульти-маркетплейс (`hub.marketplaces`, `/m/[slug]`) |
| **H-M4b** | Membership (доступ по заявке тенанта) |
| **H-M4c** | Guided-поиск (presets + AI + корзина + мульти-бронь) |
| **H-M4d** | Запрос v2 (бюджет, multi-target, «Мои запросы», обратный канал) |

Vitrina-сторона потока 3a закрыта в **V-31/V-32** (ingest + response).

### Кросс-функциональное

- Shared auth cookie на `.yanbada.com` — работает
- Webhook Vitrina → Hub (company + listing sync) — работает
- Ingest Hub → Vitrina (`/api/integrations/submissions`) — работает
- Response Vitrina → Hub (`/api/marketplace/response`) — работает (V-32 / H-M4d)
- Email через Resend на yanbada.com — работает
- SECURITY DEFINER функции RLS — настроены
- Cross-schema запросы через ручной JOIN (`joinTenants`) — работает
- Touchin ↔ Vitrina guest identify — работает

---

## 6. Маркетплейс (общая архитектура)

Второй продуктовый слой поверх Vitrina + Hub. **Два репозитория**, один Supabase:
механики поиска и UI — **mega-hub**; inbox поставщика и ответ тенанта — **vitrina**.

### Разделение ответственности

| Слой | Репо | Роль |
|------|------|------|
| Кэш и поиск | Hub | `company_cache`, `listing_cache`, FTS, AI-парсинг запроса |
| Запрос и matching | Hub | `marketplace_requests`, targets, guided-флоу, «Мои запросы» |
| Inbox поставщика | Vitrina | `submissions` с marketplace-атрибуцией |
| Ответ поставщика | Vitrina → Hub | accept/decline + webhook |
| Справочник тем | Vitrina (`public.marketplace_themes`) | Hub читает read-only |

### Мульти-маркетплейс (H-M4a)

- `hub.marketplaces` — изолированные витрины (`/m/tourism`, …), сид `tourism` на prod.
- Тенант помечает темы в профиле Vitrina → sync в `company_cache.marketplace_themes` /
  `listing_cache.marketplace_themes`.
- Platform admin: `/admin/platform/marketplace-themes` (Vitrina), `/admin/marketplace/[slug]/…` (Hub).

### Тематические сайты (`hub.sites`)

Дополнительный слой: страницы проектов в mega-hub **читают** cache тенантов.
Код Vitrina не меняется. Не путать с Tenant Hub `/h/*` и B2B `/m/*`.

Канон: `docs/agent-context/09-themed-sites.md`.

### Membership (H-M4b)

- `hub.marketplace_members` — заявка тенанта на доступ к закрытому маркетплейсу.
- Статусы: pending → approved / rejected / suspended.
- Гейт на `/m/[slug]`: без membership — «доступ по заявке»; после approve — guided-поиск.

### Guided-поиск (H-M4c)

- `hub.search_presets` + RPC `hub.search_marketplace_listings` (тема + город + FTS).
- Флоу: пресет → город → свободный текст → AI-уточнения → выдача → корзина.
- Availability batch через Vitrina `/api/booking/availability`.
- Мульти-бронь: `POST …/search/book` → ingest в Vitrina с marketplace metadata.

### Запрос + обратный канал (H-M3a / H-M4d + V-31/V-32)

**Прямой поток (3a, shipped):**
```
Заказчик (Hub) → POST /api/marketplace/request
    → Hub создаёт targets
    → POST Vitrina /api/integrations/submissions (HMAC)
    → submission в inbox поставщика (source_type=marketplace)
Поставщик (Vitrina inbox) → accept / decline
    → POST Hub /api/marketplace/response (HMAC)
    → Hub обновляет target, заказчик видит в «Мои запросы»
```

**Не shipped:** поток **3b** — встраивание исполнителя в `booking_resources` /
`booking_assignments` заказчика (отдельная будущая фаза).

Документация: `vitrina/docs/MARKETPLACE-VISION-FIT.md`, `mega-hub/docs/HUB_ROADMAP-next.md`,
`mega-hub/docs/TZ-Marketplace-*.md`, `vitrina/docs/TZ-Marketplace-*.md`.

---

## 7. Кросс-проектные контракты

### Vitrina → Hub: sync company / listing

| Endpoint (Hub) | Триггер (Vitrina) | Payload (ключевое) |
|----------------|-------------------|---------------------|
| `POST /api/sync/company` | save company profile | tenant_id, name, city, categories, `marketplace_themes`, … |
| `POST /api/sync/listing` | publish/unpublish page | tenant_id, page_id, title, `marketplace_themes`, `price_from`, … |

Подпись: HMAC-SHA256, заголовок `x-vitrina-signature`, секрет `VITRINA_WEBHOOK_SECRET`.
Retry: 3× exponential backoff.

### Hub / Touchin → Vitrina: ingest submission

`POST /api/integrations/submissions` (Vitrina)

Подпись: HMAC, секрет `VITRINA_SUBMISSIONS_INGEST_SECRET` (отдельный от sync secret).

**Marketplace-атрибуция (V-31):**

```json
{
  "source": "marketplace",
  "source_type": "marketplace",
  "external_id": "<hub target id или dedup key>",
  "tenant_slug": "<slug поставщика>",
  "requester_tenant_id": "<uuid заказчика>",
  "marketplace_request_target_id": "<uuid hub.marketplace_request_targets>",
  "title": "...",
  "fields": [{ "key": "...", "label": "...", "value": "..." }],
  "metadata": { "budget": "...", "marketplace_slug": "tourism" }
}
```

Vitrina сохраняет: `submissions.source_type='marketplace'`, `requester_tenant_id`,
`marketplace_request_target_id`, `marketplace_response_status='pending'`.

Idempotency: по `external_id` + tenant (duplicate → 200 с тем же `submission_id`).

### Vitrina → Hub: marketplace response webhook (V-32)

`POST /api/marketplace/response` (Hub)

Подпись: тот же `VITRINA_WEBHOOK_SECRET`, заголовок `x-vitrina-signature`.

```json
{
  "marketplace_request_target_id": "<uuid>",
  "response_status": "accepted" | "declined",
  "response_message": "...",
  "vitrina_submission_id": "<uuid>"
}
```

Retry 3× backoff из Vitrina; при неудаче webhook статус в Vitrina сохранён (best-effort).

ENV Vitrina: `HUB_MARKETPLACE_RESPONSE_URL=https://hub.yanbada.com`

### Hub → Vitrina: availability (read-only, без webhook)

`GET/POST /api/booking/availability` — Hub запрашивает слоты при matching и guided-брони.
Hub **не пишет** в booking-таблицы напрямую; бронь создаётся через ingest или публичный submit.

---

## 8. Дальше

### Vitrina (см. `vitrina/docs/ROADMAP-next.md`)

**Ближайшее:**
- Партнёрский маркетплейс — Фаза 1 (B2B задачи и отклики) и Фаза 3 (Hub-реселл pages)
- Поток **3b** — после отдельного ТЗ (не в текущей работе)

**Booking / прочее (не shipped):**
- Межброневой конфликт ресурса (один staff на две брони)
- Seat map, категории людей в цене (adult/child)
- Фаза 3 — ручная доступность каталога (отдельно от booking V-17)
- Guest magic-link login на `/g/`, WhatsApp-канал (org. зависимость)
- Платежи / escrow — после юридической ясности по KZ

### Hub (см. `mega-hub/docs/HUB_ROADMAP-next.md`)

**Ближайшее:**
- **H-11** — запросы и назначение встреч (кнопка «Встреча» сейчас заглушка)
- Marketplace: поток 3b, платежи/escrow — после базового M4

**Дальше по выставкам:**
- H-12 Networking, H-13 программа, H-14 PWA, H-15 погашение бонусов,
  H-16 гид по городу, H-17 post-event, H-18 CSV-импорт билетов

---

## 9. Правила экосистемы

- Vitrina — источник правды для данных компании. Hub только читает кэш.
- Hub никогда не пишет в схему `public`.
- Маркетплейс-заявки в inbox — только через ingest; ответ — только из Vitrina + webhook.
- Prod-миграции — только `CONFIRM_PROD_DB_PUSH=1 npm run db:push:prod` из vitrina;
  hub-DDL через MCP `apply_migration` **запрещён** (orphan timestamps).
- Все RLS-политики через SECURITY DEFINER хелперы (разрыв рекурсии).
- Cross-schema запросы — ручной JOIN, не PostgREST embed.
- SVG санитизация — `sanitize-html` (не `isomorphic-dompurify` из-за ESM на Vercel).
- Платные функции проверять и в UI, и на сервере.
- Иконки Hub — SVG из `/components/icons/`; Vitrina — Lucide. Эмодзи в UI запрещены.
- Email — только с домена `yanbada.com` (Resend verified).
- Документы в `docs/`, задачи агенту в `tasks/prompt_NN.md` (vitrina — V-*, hub — H-*).
- Каждая фаза должна работать без полного развёртывания инфры — только нужные env.
- Booking-фазы с `/api/submit` — минимум один HTTP E2E на prod после деплоя.

---

## 10. Чек-лист продакшен-настроек

Когда что-то ломается в проде, проверять в первую очередь:

- [ ] `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN=.yanbada.com` в обоих Vercel-проектах
- [ ] `VITRINA_WEBHOOK_SECRET` одинаковый в обоих проектах (sync + marketplace response)
- [ ] `VITRINA_SUBMISSIONS_INGEST_SECRET` в Vitrina (и в Hub env для исходящего ingest)
- [ ] `HUB_WEBHOOK_URL=https://hub.yanbada.com/api/sync/company` в Vitrina
- [ ] `HUB_MARKETPLACE_RESPONSE_URL=https://hub.yanbada.com` в Vitrina
- [ ] `RESEND_API_KEY` и `RESEND_FROM_EMAIL` (на yanbada.com) в обоих
- [ ] Supabase Auth SMTP настроен (host: smtp.resend.com, username: resend)
- [ ] Resend Domain — `yanbada.com` со статусом Verified
- [ ] Кастомные домены прописаны в Vercel → Domains для обоих проектов
- [ ] SECURITY DEFINER функции созданы в `public` (`is_tenant_admin`, `is_platform_admin`)
- [ ] RLS политики на `hub.*` через эти функции (не прямой SELECT из tenant_admins)
- [ ] Все **68** миграций применены: `npx supabase migration list --linked` из vitrina (Local = Remote)
