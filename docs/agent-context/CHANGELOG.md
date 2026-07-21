# Changelog — Agent Context

Формат: `YYYY-MM-DD | проект | что сделано | что дальше`

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
