# Витрина маркета — рабочее приложение

Запускаемая реализация тематических страниц `hub.sites`: публичная витрина, платное размещение
карточек, кабинет владельца и кабинет компании. Не макет — все действия пишутся в Postgres.

Это та же насадка, что живёт в **mega-hub**: карточки читаются из кэша Vitrina
(`hub.company_cache`, `hub.listing_cache`), приложение Vitrina не меняется.

## Что здесь настоящее

| Сценарий | Что происходит в базе |
|---|---|
| Компания оставляет заявку на витрине | `hub.site_placement_requests` или `hub.site_leads`, если аккаунта в Vitrina ещё нет |
| Владелец одобряет заявку | `hub.site_placements` + счёт в `hub.site_invoices` (платформа удерживает `platform_fee_percent`) |
| Счёт отмечен оплаченным | `paid_until` сдвигается, карточка появляется на публичной странице |
| Оплата задержалась | карточка живёт ещё `grace_days`, потом пропадает — считает `hub.placement_is_live` |
| Владелец правит страницу | `hub.site_pages` / `hub.site_blocks`, страница сразу перерисовывается |
| Гость смотрит витрину | показы и клики пишутся в `hub.site_card_stats`, компания видит их перед продлением |
| Гость спрашивает ассистента | ответ строится по `hub.site_knowledge`, журналу и живым карточкам |

## Запуск локально

```bash
cd apps/market
cp .env.example .env.local          # поправьте DATABASE_URL, если нужно
npm install
npm run db:reset                    # миграции + демо Каракола на чистый Postgres
npm run dev                         # http://localhost:3001
```

`npm run db:reset` берёт SQL прямо из `docs/sites/sql` и `docs/sites/demo` — те же файлы, что
уезжают в `mega-hub/supabase/migrations`. Флаг `--stub` внутри команды добавляет окружение
mega-vitrina (роли, `auth.uid`, таблицы кэша), которого нет на голом Postgres.

Сид поднимает две витрины на одних данных — платный маркет города и бесплатный микросайт
одной компании:

- `/s/visit-karakol` — маркет Каракола, скин `destination`, режим `approved`
- `/s/visit-karakol/join` — тарифы и заявка на размещение
- `/s/karakol-trails` — микросайт туркомпании, скин `operator`, режим `mixed`
- `/cabinet` — вход (код из `CABINET_CODE`, по умолчанию `karakol`)
- `/cabinet/visit-karakol` — кабинет владельца
- `/cabinet/visit-karakol/tenant` — кабинет компании

Оба скина рисует один и тот же `site-canvas.tsx`: вид задаёт `hub.sites.template`, а состав
страницы — блоки конструктора.

## Подключение к настоящей базе

```bash
DATABASE_URL='postgresql://postgres:...@db.<project>.supabase.co:5432/postgres' npm run db:setup
```

Без `--reset` и без `--stub`: в mega-vitrina схема `hub`, роли и кэш уже есть. Скрипт добавит
только таблицы `hub.site_*` и данные Каракола.

## Деплой на Vercel

Приложение лежит в подпапке, поэтому в проекте Vercel нужно указать **Root Directory =
`apps/market`** и снять галочку «Include files outside root directory» — иначе не подтянется
`docs/sites`, откуда берутся типы и рендерер. Проще всего:

```bash
cd apps/market
vercel link
vercel env add DATABASE_URL production      # строка подключения Postgres
vercel env add CABINET_CODE production
vercel env add SESSION_SECRET production
vercel deploy --prod
```

Переменные окружения — в `.env.example`. `OPENAI_API_KEY` необязателен: без ключа ассистент
отвечает подбором по знаниям витрины, с ключом — через модель.

## Как это ложится в mega-hub

| Здесь | В mega-hub |
|---|---|
| `lib/db.ts` (pg по `DATABASE_URL`) | `lib/supabase/server` + RLS |
| `lib/auth.ts` (код доступа) | Supabase Auth + `hub.site_members`, `public.is_tenant_admin` |
| `app/api/admin/sites/[slug]/*` | те же адреса, черновик в `docs/sites/code/mega-hub/app/api` |
| рендерер, типы, стили | импортируются напрямую из `docs/sites` — один экземпляр кода |

Рендерер (`site-canvas.tsx`), типы (`docs/sites/types.ts`) и стили (`app/s/sites.css`) здесь не
копируются, а подключаются из `docs/sites`. Поэтому то, что видно в этом приложении, — ровно то,
что уедет в hub.
