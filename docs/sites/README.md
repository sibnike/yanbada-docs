# Тематические сайты (hub.sites)

Публичные B2C-витрины из кэша тенантов. Канон для агентов: [../agent-context/09-themed-sites.md](../agent-context/09-themed-sites.md).

| Файл | Назначение |
|------|-----------|
| [sql/20260909000000_hub_sites.sql](./sql/20260909000000_hub_sites.sql) | Миграция `hub.sites` |
| [types.ts](./types.ts) | Общие типы + `listingMatchesSiteScope` |
| [code/mega-hub/](./code/mega-hub/) | API + admin drop-in |
| [code/tourhub/](./code/tourhub/) | Рендер `/s/[slug]` |
| [templates/operator.html](./templates/operator.html) | Визуал бренда одного оператора |
| [templates/destination.html](./templates/destination.html) | Визуал направления (много тенантов) |
| [APPLY.md](./APPLY.md) | Как перенести в репо |

Срез v1: **оба** сценария на одной модели, шаблоны `operator` + `destination`.
