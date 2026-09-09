# Демо: маркет Каракола

Два тенанта в Караколе (Кыргызстан) и один общий маркет. Туркомпания продаёт туры, гостевой дом размещает гостей, маркет ведёт местный автор и берёт деньги за размещение карточек.

Модель размещения и монетизации: [../agent-context/10-market-placement.md](../agent-context/10-market-placement.md).

## Что показывать

| Файл | Что видно |
|------|-----------|
| [templates/index.html](./templates/index.html) | вход в демо: две ссылки и суть модели |
| [templates/karakol-market.html](./templates/karakol-market.html) | публичная витрина: все блоки конструктора, состояния оплаты, форма заявки, ассистент |
| [templates/karakol-owner.html](./templates/karakol-owner.html) | кабинет владельца: карточки, заявки и лиды, тарифы, деньги, статистика |

Открываются двойным щелчком, без сервера и без базы.

## Выложить демо ссылкой

Папка `templates/` — готовый статический сайт, `vercel.json` уже лежит рядом:

```bash
cd docs/sites/templates
vercel deploy --prod
```

Получатся `/market` и `/owner` — короткие адреса для показа с телефона. Отдельный Vercel-проект, к прод-доменам Yanbada не относится.

Это **демо**, а не продукт: данные зашиты в HTML. Рабочая версия живёт в mega-hub на `/s/visit-karakol` и деплоится вместе с ним.

## Кто в демо

**Karakol Trails** — туркомпания, `karakol-trails`.
Трек к Ала-Кёлю (2 дня, 7 500 KGS), джип-тур в Джети-Огуз (4 200 KGS), зимний скитур (9 800 KGS, вне сезона).

**Гостевой дом Ала-Кёль** — размещение, `ala-kol-guesthouse`.
Двухместный номер (2 400 KGS), койко-место (900 KGS), баня после трека (1 200 KGS).

**Маркет** — `visit-karakol`, скин `destination`, режим `approved`, оплата за карточку в месяц, комиссия платформы 20%. Владелец — блогер, не platform admin.

## Состояния, которые специально заложены в демо

Одной «зелёной» витрины мало: показывать надо то, что случается на второй месяц.

- **Витринный тариф** — трек к Ала-Кёлю в верхнем блоке за 2 500 KGS.
- **Триал** — карточка гостевого дома по тарифу «Старт», бесплатно 30 дней.
- **Задержка оплаты** — койко-место просрочено на 2 дня, но висит: grace 7 дней.
- **Истекло** — зимний скитур снят с витрины, тенант просит вернуть к декабрю.
- **Отказ с причиной** — заявке гостевого дома отказали: нужны фото от 1200px и цена за ночь.
- **Приглашение от владельца** — автор сам просит добавить баню отдельной карточкой.
- **Лид без аккаунта** — кафе «Дасторкон» пришло с публичной формы, тенанта в Vitrina ещё нет.
- **Ручная карточка и claim** — озеро и ущелье добавил автор; кафе просит забрать свою карточку.

## Блоки конструктора в демо

Главная: `hero`, `stats`, `info`, `listing_cards` (туры), `listing_cards` (ночёвки), `tenant_cards`, `manual_cards`, `steps`, `reviews`, `map`, `posts`, `faq`, `cta`.
О витрине: `info`, `team`, `partners`, `video`, `gallery`, `contacts`.
Разместиться: `info`, `pricing`, `join`, `faq`.
Журнал: `posts` (три статьи про сезон, ночёвки и акклиматизацию).

Карточки компаний и услуг подтягиваются из кэша Vitrina. Всё остальное — контент владельца маркета.

## Как поднять в mega-hub

```bash
cp docs/sites/sql/20260909000000_hub_sites.sql        mega-hub/supabase/migrations/
cp docs/sites/sql/20260909120000_hub_site_builder.sql mega-hub/supabase/migrations/
cp docs/sites/sql/20260909140000_hub_market_placement.sql mega-hub/supabase/migrations/
cp docs/sites/sql/20260909150000_seed_karakol_market.sql  mega-hub/supabase/migrations/
```

Карточки двух демо-тенантов — [demo/karakol-cache.sql](./demo/karakol-cache.sql). Кэш наполняет sync из Vitrina, поэтому перед запуском сверьте колонки с реальным DDL `hub.company_cache` / `hub.listing_cache` (или проще: расширьте `vitrina/scripts/seed-tourhub-demo.mjs` и дайте `syncToHub()` заполнить кэш).

Владелец в seed — placeholder `00000000-0000-4000-8000-0000000000b1`. Замените на реальный `auth.users.id`, иначе кабинет не откроется под блогером.

Без базы страница тоже работает: payload лежит в `code/mega-hub/lib/sites/demo-sites.json`, `loadPublicSitePayload` подхватывает его как fallback.

```
/s/visit-karakol          главная
/s/visit-karakol/about    команда, партнёры, контакты
/s/visit-karakol/join     тарифы и заявка
/s/visit-karakol/journal  журнал
```

## Проверка логики

```bash
node --experimental-strip-types docs/sites/code/tests/placement.test.mjs
node docs/sites/code/tests/scope.test.mjs
```

Первый тест закрывает то, на чём легко ошибиться: grace-период, истёкшее размещение не попадает на страницу, `approved` не пускает бесплатные карточки, `featured` идёт выше.

## Проверка миграций на пустом Postgres

Миграции и seed прогнаны на чистом PostgreSQL 16 — применяются без ошибок. Повторить:

```bash
createdb hubcheck
psql -d hubcheck -f docs/sites/demo/pg-stub.sql              # роли, схемы, RLS-хелперы, кэш
psql -v ON_ERROR_STOP=1 -d hubcheck \
  -f docs/sites/sql/20260909000000_hub_sites.sql \
  -f docs/sites/sql/20260909120000_hub_site_builder.sql \
  -f docs/sites/sql/20260909140000_hub_market_placement.sql \
  -f docs/sites/demo/karakol-cache.sql \
  -f docs/sites/sql/20260909150000_seed_karakol_market.sql
```

Что показала проверка на данных демо:

- под `anon` видно 6 карточек из 7 — истёкший скитур не отдаётся, просроченное койко-место отдаётся (grace);
- под `anon` видно 3 тарифа из 4 — закрытый «Партнёр сезона» скрыт;
- `site_leads`, `site_invoices`, `site_placement_requests` для `anon` закрыты.

Отдельно проверено, что одобрение заявки (upsert размещения) работает: ключ `site_placements` — `UNIQUE NULLS NOT DISTINCT (site_id, tenant_id, listing_id)`. Частичные уникальные индексы для этого не годятся, Postgres не берёт их арбитром `ON CONFLICT`.
