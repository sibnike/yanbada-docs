# Каракол: маркет города

Карточки **не выдумываются в кэше**. Сначала компании живут в Vitrina как тенанты, потом sync пишет `hub.company_cache` / `hub.listing_cache`, витрина только читает.

```
cd vitrina
CONFIRM_PROD_SEED=1 node scripts/seed-karakol-tenants.mjs --prod
```

После этого в админке: [Гостевой дом Ала-Кёль](https://admin.microp.app/admin/t/ala-kol-guesthouse), [Karakol Trails](https://admin.microp.app/admin/t/karakol-trails). Правка профиля или страницы → sync → карточка на `/s/visit-karakol`.

На стенде показываем **одну** витрину: `visit-karakol`. Публичный вид один (светлая страница, акцент из настроек), без скинов operator/destination как двух продуктов. Сид `karakol-trails` остаётся в БД, в кабинете и на `/` его нет.

В данных две записи `hub.sites` на одном кэше Vitrina — это не два продукта, а запасной пример настроек:

| Витрина | Кто ведёт | Размещение |
|---|---|---|
| `visit-karakol` | местный автор, не platform admin | `approved`, платно за карточку в месяц, комиссия платформы 20% |
| `karakol-trails` (не в UI стенда) | сама туркомпания | `mixed`, бесплатно, компания сама выбирает свои карточки |

Тенантов два: туркомпания продаёт туры, гостевой дом размещает гостей. Туркомпания одновременно участник маркета и хозяин своего микросайта — карточки в обоих местах приходят из одного кэша Vitrina.

Это не макет: приложение лежит в [`apps/market`](../../apps/market/README.md), читает и пишет настоящий Postgres. Модель размещения и монетизации — [../agent-context/10-market-placement.md](../agent-context/10-market-placement.md).

## Запустить

```bash
# 1. Тенанты в Vitrina (карточки + sync в hub.*_cache)
cd vitrina
CONFIRM_PROD_SEED=1 node scripts/seed-karakol-tenants.mjs --prod

# 2. Стенд витрины читает тот же mega-vitrina
cd ../apps/market
cp .env.example .env.local   # NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
npm install
npm run dev                  # http://localhost:3001
```

| Адрес | Что там |
|---|---|
| `/s/visit-karakol` | витрина города: блоки конструктора, живые карточки, ассистент |
| `/s/visit-karakol/join` | тарифы и заявка на размещение |
| `/cabinet` | вход: владелец витрины или компания-участник (код `karakol`) |
| `/cabinet/visit-karakol` | кабинет владельца: заявки, карточки, тарифы, счета, конструктор |
| `/cabinet/visit-karakol/tenant` | кабинет компании: свои карточки, статистика, счета, заявка |

## Сценарий, который стоит показывать

1. На витрине компания оставляет заявку → строка в `hub.site_leads` (аккаунта в Vitrina нет) или в `hub.site_placement_requests` (тенант вошёл в кабинет).
2. Владелец в кабинете одобряет заявку → появляются размещения и счёт, платформа удерживает 20%.
3. Счёт отмечен оплаченным → `paid_until` сдвигается, карточка появляется на публичной странице.
4. Владелец меняет текст блока или цвет витрины в конструкторе → страница перерисовывается.
5. Гость листает витрину → показы и клики пишутся в `hub.site_card_stats`, компания видит их у себя перед продлением.

Отказ требует причины: без неё API не пропустит решение, иначе воронка обрывается молча.

## Кто в данных

**Karakol Trails** — туркомпания, `karakol-trails`.
Трек к Ала-Кёлю (2 дня, 7 500 KGS), джип-тур в Джети-Огуз (4 200 KGS), зимний скитур (9 800 KGS, вне сезона).

**Гостевой дом Ала-Кёль** — размещение, `ala-kol-guesthouse`.
Двухместный номер (2 400 KGS), койко-место (900 KGS), баня после трека (1 200 KGS).

**Маркет** — `visit-karakol`, режим `approved`, оплата за карточку в месяц, комиссия платформы 20%. Владелец — блогер, не platform admin. Это то, что показываем.

**Запись `karakol-trails`** — в сиде, не в UI стенда. Режим `mixed`, бесплатно. Раньше это был отдельный скин `operator`; сейчас публичный вид тот же.

## Состояния, заложенные в данные

Одной «зелёной» витрины мало: показывать надо то, что случается на второй месяц.

- **Витринный тариф** — трек к Ала-Кёлю в верхнем блоке за 2 500 KGS.
- **Триал** — карточка гостевого дома по тарифу «Старт», бесплатно 30 дней.
- **Задержка оплаты** — койко-место просрочено на 2 дня, но висит: grace 7 дней.
- **Истекло** — зимний скитур снят и с маркета, и с микросайта, тенант просит вернуть к декабрю.
- **Отказ с причиной** — заявке гостевого дома отказали: нужны фото от 1200px и цена за ночь.
- **Приглашение от владельца** — автор сам просит добавить баню отдельной карточкой.
- **Лид без аккаунта** — кафе «Дасторкон» пришло с публичной формы, тенанта в Vitrina ещё нет.
- **Ручная карточка и claim** — озеро и ущелье добавил автор; кафе просит забрать свою карточку.

Почему у микросайта режим `mixed`, а не `scope`: в `scope` размещения игнорируются, и снятый с сезона скитур всё равно попал бы на страницу. `mixed` оставляет компании право выбирать, какие из своих карточек показывать.

## Блоки конструктора

`visit-karakol` — главная: `hero`, `stats`, `info`, `listing_cards` (туры), `listing_cards` (ночёвки), `tenant_cards`, `manual_cards`, `steps`, `reviews`, `map`, `posts`, `faq`, `cta`.
О витрине: `info`, `team`, `partners`, `video`, `gallery`, `contacts`. Разместиться: `info`, `pricing`, `join`, `faq`. Журнал: `posts`.

`karakol-trails` — главная: `hero`, `stats`, `listing_cards`, `steps`, `gallery`, `reviews`, `map`, `posts`, `faq`, `cta`. О компании: `info`, `team`, `video`, `partners`, `contacts`. Заметки: `posts`.

Карточки компаний и услуг подтягиваются из кэша Vitrina. Всё остальное — контент владельца витрины.

## Как поднять в mega-hub

```bash
cp docs/sites/sql/20260909000000_hub_sites.sql            mega-hub/supabase/migrations/
cp docs/sites/sql/20260909120000_hub_site_builder.sql     mega-hub/supabase/migrations/
cp docs/sites/sql/20260909140000_hub_market_placement.sql mega-hub/supabase/migrations/
cp docs/sites/sql/20260909150000_seed_karakol_market.sql  mega-hub/supabase/migrations/
cp docs/sites/sql/20260909160000_seed_karakol_operator.sql mega-hub/supabase/migrations/
```

Первые три файла — только схема, без примеров данных: витрина без страниц рендерится пустой и всё равно попадает в список кабинета.

Карточки двух тенантов создаёт `vitrina/scripts/seed-karakol-tenants.mjs` (`public.tenants` + `pages` + `catalog_items` + webhook `syncToHub()`). Витрина не вставляет строки в кэш.

Владельцы в seed — placeholder'ы `00000000-0000-4000-8000-0000000000b1` (маркет) и `...0000000000c1` (микросайт). Замените на реальные `auth.users.id`, иначе кабинет не откроется.

```
/s/visit-karakol          главная
/s/visit-karakol/about    команда, партнёры, контакты
/s/visit-karakol/join     тарифы и заявка
/s/visit-karakol/journal  журнал
/s/karakol-trails         микросайт компании
```

## Проверка логики

```bash
node --experimental-strip-types docs/sites/code/tests/placement.test.mjs
node docs/sites/code/tests/scope.test.mjs
```

Первый тест закрывает то, на чём легко ошибиться: grace-период, истёкшее размещение не попадает на страницу, `approved` не пускает бесплатные карточки, `featured` идёт выше.

## Проверка миграций на пустом Postgres

Миграции и seed прогоняются на чистом PostgreSQL 16 без ошибок — это и делает `npm run db:reset`. Вручную:

```bash
createdb hubcheck
psql -d hubcheck -f docs/sites/demo/pg-stub.sql              # роли, схемы, RLS-хелперы, кэш
psql -v ON_ERROR_STOP=1 -d hubcheck \
  -f docs/sites/sql/20260909000000_hub_sites.sql \
  -f docs/sites/sql/20260909120000_hub_site_builder.sql \
  -f docs/sites/sql/20260909140000_hub_market_placement.sql \
  -f docs/sites/sql/20260909150000_seed_karakol_market.sql \
  -f docs/sites/sql/20260909160000_seed_karakol_operator.sql
```

Что показала проверка на этих данных:

- под `anon` в маркете видно 6 карточек из 7 — истёкший скитур не отдаётся, просроченное койко-место отдаётся (grace);
- под `anon` видно 3 тарифа из 4 — закрытый «Партнёр сезона» скрыт;
- `site_leads`, `site_invoices`, `site_placement_requests` для `anon` закрыты.

Отдельно проверено, что одобрение заявки (upsert размещения) работает: ключ `site_placements` — `UNIQUE NULLS NOT DISTINCT (site_id, tenant_id, listing_id)`. Частичные уникальные индексы для этого не годятся, Postgres не берёт их арбитром `ON CONFLICT`.
