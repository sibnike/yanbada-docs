# 03 — TourHub: текущее состояние

**Обновлено:** 2026-07-21

## Стек

Next.js 14, TypeScript, Tailwind (CSS из demo), React 18, Vercel serverless API routes.
UI/UX как у `TourHub-recovered` (vanilla demo).

## Режимы данных

| Режим | Env | Источник |
|-------|-----|----------|
| demo | `TOURHUB_DATA_MODE=demo` (default) | `lib/demo-data/*` |
| live | `TOURHUB_DATA_MODE=live` | mega-hub API |

## Реализовано ✅

### Market (F21)
- `/market` — grid + calendar, фильтры, поиск
- Listing sheet, reserve + escrow flow (5 мин, payment → EDS → success)
- `/market/seller/[sellerId]` — профиль туроператора
- Live badge при `dataMode=live`
- `GET /api/market/listings` → hub search-listings

### Catalog (F11 + F11.2)
- `/catalog` — partners / sights, фильтры, сортировка
- **Partners live:** `GET /api/catalog/partners` → hub `search-listings` (`marketplace=tourhub`), dedupe по tenant; detail `/catalog/partner/[slug]` → `company` API
- Sights / objects — пока demo (`lib/demo-data/objects.ts`)
- `/catalog/object/[id]` — профиль объекта + секция «Опубликовано в Маркете»

### Заявки
- `/request` — реальная форма → `POST /api/marketplace-request` → mega-hub (не demo)

### Hero
- `/` — hero screen, ссылки на market, catalog (и другие экраны — часть 404)

## Demo-data файлы

| Файл | Содержимое |
|------|------------|
| `lib/demo-data/market.ts` | listings, sellers, categories |
| `lib/demo-data/scenarios.ts` | partner offers для catalog |
| `lib/demo-data/objects.ts` | sights (Байтерек, Чарын, …) |
| `lib/demo-data/i18n.ts` | ru/en/kk строки |

## Ключевые модули

```
lib/market/           — types, reservation, booking, sellers, live-mapper
lib/catalog/          — partners, objects, filters, live-mapper
lib/marketplace/      — hub-bridge, listings-bridge, company-bridge
components/screens/   — market-screen, catalog-screen, *-profile-screen
components/market/    — cards, calendar, listing sheet, checkout
```

### Themed sites
Новые страницы проектов — **добавка** в mega-hub. Vitrina не меняется, TourHub не рантайм. См. [09-themed-sites.md](./09-themed-sites.md).

## Не сделано / backlog

| Задача | Приоритет |
|--------|-----------|
| Catalog sights live (не demo objects) | P2 |
| Partner services/reviews из vitrina page JSON | P2 |
| Enrichment live listings (цены, слоты из Vitrina JSON API) | P0 после profiles |
| SLA / ticket после escrow | Средний |
| Cabinets, trip planner, category flow, content builder UI | Низкий (cabinet/CB в vitrina) |
| Deploy www.ota.kz | ✅ prod |
| Скрыть `/request` как internal или встроить в hero flow | По решению |

## Заглушки в UI

- Partner profile: «Забронировать» / «Отправить запрос» → toast
- Object profile: «Купить билеты» → toast (ticket sheet из demo не перенесён)

## Инструкция live mode

`tourhub/tasks/phase-2-seed-vitrina.md`
