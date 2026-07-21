# 00 — Start Here (2 минуты)

**Дата актуализации:** 2026-07-21

## Что это за экосистема

Три Next.js-приложения + один Supabase (`mega-vitrina`, ref `bfcfwaakxcqplamcswaq`):

```
Vitrina (write)  →  mega-hub cache  →  TourHub (read, B2C)
 admin.yanbada.com     hub.*_cache       tourhub (dev :3002)
```

| Проект | Роль | Порт dev | Git |
|--------|------|----------|-----|
| **vitrina** | Тенанты, профили, страницы, catalog_items, inbox | 3000 | sibnike/vitrina |
| **mega-hub** | hub.company_cache, listing_cache, AI-матчинг, events | 3001 | sibnike/hub |
| **tourhub** | Публичный B2C-фронт (маркет, каталог, заявки) | 3002 | локально |

## Золотые правила

1. **Vitrina — источник истины** для профилей и карточек услуг. TourHub не создаёт профили — только читает.
2. **TourHub не пишет в БД соседей** без явного согласования. Заявки идут через `mega-hub` API.
3. **UI mega-hub не показывать** пользователю TourHub — только данные через API.
4. **Demo-режим TourHub** (`TOURHUB_DATA_MODE=demo`) — статика из `TourHub-recovered`; **live** — hub API.
5. **AI Content Builder** делается в **vitrina**, не в tourhub.

## Текущая фаза (июль 2026)

- ✅ **Расширенный профиль компании** — на prod (legal, tourism, media, bank; sync в hub)
- **Следующее:** AI Content Builder UI (vitrina) → TourHub live-mapper под новые поля cache → catalog live

Статус подробнее: [../PROGRESS.md](../PROGRESS.md)

## Куда смотреть по задаче

→ **[07-where-to-look.md](./07-where-to-look.md)** — главный навигатор для агентов

## Быстрый E2E (локально)

```bash
# Терминал 1 — vitrina :3000
# Терминал 2 — mega-hub :3001
cd vitrina && node scripts/seed-tourhub-demo.mjs   # наполнить hub cache

# TourHub live
# .env.local: TOURHUB_DATA_MODE=live, MEGA_HUB_API_URL=http://localhost:3001
cd tourhub && npm run dev   # :3002
curl -s http://localhost:3002/api/market/listings | jq '.count'
```

## Demo-референс UX

Vanilla JS демо: `~/Projects/TourHub-recovered` — эталон экранов Ф0–Ф23 (market, catalog, escrow, cabinets, content builder). TourHub повторяет UX, не код.

## Каноническая копия

**Рабочая:** `~/Projects/Yanbada-superApp/` — не iCloud (`~/Documents/` может отставать).
