# Публичная витрина market (hub.sites)

Контент **той же насадки** mega-hub, где живёт market: тенанты из Vitrina, несколько вместе или один, если микросайта мало. Vitrina не меняется.

Канон: [../agent-context/09-themed-sites.md](../agent-context/09-themed-sites.md).

| Файл | Назначение |
|------|-----------|
| [../../apps/market/](../../apps/market/README.md) | **Рабочее приложение**: витрина, кабинет владельца и компании на настоящем Postgres |
| [sql/](./sql/) | Новые таблицы `hub.sites*` (схема `hub`, не public) и сиды двух витрин |
| [code/mega-hub/](./code/mega-hub/) | Рендерер, конструктор и публичная `/s/{slug}` — только mega-hub |
| [KARAKOL.md](./KARAKOL.md) | Каракол: маркет города и микросайт компании — как запустить и что показывать |
| [demo/](./demo/) | Карточки тенантов для кэша + stub для чистого Postgres |
| [APPLY.md](./APPLY.md) | Если внедрять в `sibnike/hub` |

Рендерер, типы и стили из `code/mega-hub` и `types.ts` не дублируются в приложении — `apps/market` импортирует их отсюда напрямую, поэтому проверенное в приложении и есть то, что уезжает в hub.

Владелец маркета, заявки на размещение и платные карточки: [../agent-context/10-market-placement.md](../agent-context/10-market-placement.md).
