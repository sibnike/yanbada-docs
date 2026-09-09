# Progress — Yanbada SuperApp

> **Обновлено:** 2026-09-09  
> Журнал сессий (детальнее): [agent-context/CHANGELOG.md](./agent-context/CHANGELOG.md)

## Текущая фаза

**Live E2E + demo tenants на prod** ✅. **AI Content Builder UI** — MVP admin-экран в vitrina (чат + preview), backend был готов ранее.

---

## На prod ✅

| Что | Проект | Примечание |
|-----|--------|------------|
| Расширенный профиль компании (legal, tourism, media, bank) | vitrina | PR #2 merged, admin `/admin/t/{slug}/profile` |
| Sync новых полей в `hub.company_cache` | vitrina + mega-hub | PR hub #1 merged; `bank_details` **не** sync |
| Миграция `20260721100000_company_profile_legal_extended` | vitrina + mega-hub | Local = Remote на prod Supabase |
| Booking, inbox, marketplace ingest, Touchin embed | vitrina | см. `vitrina/docs/reports/` |
| Market F21 + catalog F11 (demo) | tourhub | `TOURHUB_DATA_MODE=demo` по умолчанию |
| Live market listings API | tourhub + mega-hub | ✅ prod count≥3; seats/dates snapshot в работе (PR) |
| Publish flow gated TourHub | vitrina + hub + tourhub | ✅ PR vitrina#5 hub#5/#7 tourhub#4; sellers approved |
| Pages: география услуги (страна/города) → listing_cache | vitrina + hub + tourhub | PR vitrina#24 hub#13 tourhub#18; migration prod ✅ |
| Market P0: seats UX, checkout timers, no demo flash | tourhub | PR #17 merged |
| Market sheet «Подробнее» → embed Vitrina (info-only) | tourhub + vitrina | iframe `embedView=info` |
| Admin select chevron padding + collapsible page geography | vitrina + tourhub | PR vitrina#26 tourhub#19 merged |
| Промо-уголок хаба и `/p/*` | vitrina | PR [#30](https://github.com/sibnike/vitrina/pull/30) + миграция `pages.promo` prod ✅ |

---

## В работе / следующее

| Приоритет | Задача | Проект | Док |
|-----------|--------|--------|-----|
| **P0** | TourHub `live-mapper` + seller profile из `company_cache` | tourhub + mega-hub | ✅ merged PR #2 |
| **P1** | Registration: tourism + `marketplace_themes` | vitrina | ✅ merged PR #3 |
| **P0** | AI Content Builder — admin UI | vitrina | ✅ MVP UI (`content-builder-client.tsx`, routes `/content-builder`, `/pages/[id]/content-builder`) |
| **P1** | Publish flow: TourHub gated + wizard | vitrina | ✅ 2026-07-26 (`/publish`, sellers, `marketplace_slugs`) |
| **P1** | Catalog live из hub (не demo-data) | tourhub | ✅ partners live 2026-07-26; sights ещё demo |
| **P0** | Market dates/seats из booking → listing_cache | vitrina + hub + tourhub | ✅ snapshot + calendar filter (2026-07-26) |
| **P0** | Pages service geography → market filter/card | vitrina + hub + tourhub | ✅ merged 2026-07-27 |
| **P0** | Market P0 UX (seats, checkout, live load) | tourhub | ✅ PR #17 merged |
| **P2** | Публичный GET JSON страницы для TourHub detail | vitrina | backlog §P1 — embed iframe вместо JSON |
| **P2** | Cookie scope split: admin host-only + hub soft-SSO | vitrina + mega-hub | `DOMAINS-MICROP-PROD.md` §Security backlog · comment in `lib/supabase/auth-cookie.ts` |
| **P2** | `/p/*` на vanity: tenant из Host, не только `?tenant=` | vitrina | comment in `middleware.ts` tryHubHostRewrite |
| **P2** | Job queue для marketplace AI dispatch (QStash/Inngest) | mega-hub | `lib/vercel/heavy-api-duration.ts` + HUB_ARCHITECTURE |
| **P2** | Availability concurrency + participants async email | mega-hub | `HUB_ROADMAP-next.md` tech debt |
| **—** | Multi-market B2C: www.ota.kz (отдельный Vercel) | tourhub | ✅ домен в Vercel; см. [agent-context/08-multi-market-domains.md](./agent-context/08-multi-market-domains.md) |
| **P3** | 2+ B2C-маркет: `TOURHUB_MARKET_SLUG` + platform admin «Маркеты» | tourhub + vitrina | фаза 2–3 в 08-multi-market-domains |
| **P1** | Витрина market: карточки тенантов + материалы + ассистент | mega-hub (та же насадка, vitrina не трогать) | [09-themed-sites.md](./agent-context/09-themed-sites.md) |
| **P1** | Владелец маркета + платное размещение карточек (заявки, тарифы, grace) | mega-hub | схема и демо готовы: [10-market-placement.md](./agent-context/10-market-placement.md), [sites/DEMO-KARAKOL.md](./sites/DEMO-KARAKOL.md) |
| **P2** | Счета, авто-скрытие после неоплаты, статистика карточек тенанту | mega-hub | схема заложена (`site_invoices`, `site_card_stats`), UI нет |
| **P3** | Комиссия с брони, выплаты владельцу, claim ручной карточки | mega-hub + vitrina (атрибуция уже есть) | фаза S4 в 10-market-placement |

### Инварианты (не трогать без решения)

| Тема | Статус |
|------|--------|
| Serverless → Supabase только HTTP (`supabase-js`), не `pg`/`:5432` | ✅ зафиксировано; Supavisor `:6543` — только при будущем прямом SQL |
| Cookie `.microp.app` для SSO | ✅ intentional; split — P2 выше |
| Middleware без Edge `getUser` на `/api/*` | ✅ 2026-07-26 |
| Heavy hub API `maxDuration=60` | ✅ 2026-07-26 (нужен Vercel Pro) |

### Perf / Lighthouse (Insights) — что делаем

| Алерт | Решение |
|-------|---------|
| Speed Index ~3.6s | ✅ `next/font` + `display:'swap'` (root Inter + hub fonts); non-default hub fonts `preload:false` |
| Render-blocking ~140ms | принято для admin CSS; не дробить Tailwind ради 140ms |
| Bfcache blocked | **оставить** — нормально для admin + auth cookies / no-store |
| Unused JS ~20 KiB | **игнорировать** |

---

## E2E checklist (TourHub live)

- [x] Профиль сохраняется в admin vitrina
- [x] `hub.company_cache` — legal, tourism, media (кроме bank)
- [x] Seed script sync company + listing webhooks (`seed-tourhub-demo.mjs`)
- [x] Локально: 3 listing в hub + TourHub live API (`count: 3`)
- [x] Prod deploy vitrina + mega-hub (PR #3, hub #2 merged)
- [x] Prod deploy tourhub (PR #2 merged — Next.js only, Netlify demo removed)
- [x] Vercel env tourhub + prod deploy (www.ota.kz)
- [x] Prod seed demo tenants (nomad-trails, steppe-journeys, aquatour-burabay)
- [x] Prod hub channel filter + listing sync (`marketplace_slugs` + approved sellers)
- [x] Prod TourHub live `count: 3` (`MEGA_HUB_API_URL=https://hub.microp.app`)
- [x] Listing booking snapshot на prod (`next_departure_date` / `available_slots` для 3 demo)
- [x] TourHub calendar: ближайшая дата + фильтр по выбранному дню (live API 2026-07-26)
- [x] Pages `service_locations` migration prod (`20260727160000`)
- [x] TourHub city filter: код города + label (Astana → astana, PR #18)
- [ ] Smoke: admin geography collapse + select padding (vitrina #26 deploy)
- [ ] Smoke: kendala tour-2 «Астана» в фильтре market после deploy tourhub #18

Seed:
```bash
cd vitrina && CONFIRM_PROD_SEED=1 node scripts/seed-tourhub-demo.mjs --prod
cd vitrina && CONFIRM_PROD_SEED=1 node scripts/seed-market-booking.mjs --prod
```

---

## Блокеры / внимание

| Тема | Статус |
|------|--------|
| Cloudinary на Vercel prod | Проверить env `CLOUDINARY_*` — без них upload медиа в профиле не работает |
| SuperApp `docs/` не в git | ✅ **sibnike/yanbada-docs** — корень `~/Projects/Yanbada-superApp/` |
| iCloud копия | `~/Documents/Yanbada-superApp/` может отставать |

---

## Репозитории

```
Yanbada-superApp/           ← git: sibnike/yanbada-docs (docs + cursor rules)
├── docs/                   ← экосистема (этот хаб)
├── .cursor/rules/
├── vitrina/                ← git: sibnike/vitrina
├── mega-hub/               ← git: sibnike/hub
└── tourhub/                ← git: sibnike/tourhub → www.ota.kz
```

**Clone docs:** `git clone https://github.com/sibnike/yanbada-docs.git ~/Projects/Yanbada-superApp`
