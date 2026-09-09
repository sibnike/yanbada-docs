# Публичная витрина market (hub.sites)

Контент **той же насадки** mega-hub, где живёт market: тенанты из Vitrina, несколько вместе или один, если микросайта мало. Vitrina не меняется.

Канон: [../agent-context/09-themed-sites.md](../agent-context/09-themed-sites.md).

| Файл | Назначение |
|------|-----------|
| [../../apps/market/](../../apps/market/README.md) | **Рабочее приложение**: витрина, кабинет владельца и компании на настоящем Postgres |
| [sql/](./sql/) | Новые таблицы `hub.sites*` (схема `hub`, не public) |
| [code/mega-hub/](./code/mega-hub/) | Черновик конструктора и публичной `/s/{slug}` — только mega-hub |
| [templates/](./templates/) | Макеты вида |
| [DEMO-KARAKOL.md](./DEMO-KARAKOL.md) | Маркет Каракола: гостевой дом + туркомпания, как запустить и что показывать |
| [demo/](./demo/) | Карточки демо-тенантов для кэша |
| [APPLY.md](./APPLY.md) | Если внедрять в `sibnike/hub` |

Рендерер, типы и стили из `code/mega-hub` и `types.ts` не дублируются в приложении — `apps/market` импортирует их отсюда напрямую, поэтому проверенное в приложении и есть то, что уезжает в hub.

Владелец маркета, заявки на размещение и платные карточки: [../agent-context/10-market-placement.md](../agent-context/10-market-placement.md).
