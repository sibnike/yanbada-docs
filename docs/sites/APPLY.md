# Если внедрять витрину market

Контент **той же насадки** mega-hub, где уже живёт market. Код приложения Vitrina не копировать и не менять.

DDL — в `mega-hub/supabase/migrations/` (схема `hub`). Зеркало в `vitrina/supabase/migrations/` только как существующий способ push, без правок `app/` vitrina.

```bash
cp docs/sites/sql/20260909000000_hub_sites.sql mega-hub/supabase/migrations/
cp docs/sites/sql/20260909120000_hub_site_builder.sql mega-hub/supabase/migrations/
cp docs/sites/sql/20260909140000_hub_market_placement.sql mega-hub/supabase/migrations/
cp docs/sites/sql/20260909150000_seed_karakol_market.sql mega-hub/supabase/migrations/
```

Порядок важен: `140000` добавляет колонки в `hub.sites` и расширяет CHECK на типы блоков, `150000` уже пользуется ими.

Черновик UI/API: `docs/sites/code/mega-hub/` → репозиторий hub. Рабочая версия того же контура — `apps/market`: там эти же рендерер и типы уже крутятся на живой базе, а Supabase заменён на прямой pg. Логику брать оттуда, слой доступа к данным — из `code/mega-hub/`.

`lib/sites/site-access.ts` ожидает серверный клиент Supabase (`@/lib/supabase/server`) и `public.current_user_tenants()`. Если в hub помощник называется иначе — поправить импорт, логику не менять.

Проверка:

```
http://localhost:3001/admin/sites/visit-kazakhstan/builder
http://localhost:3001/s/visit-kazakhstan
http://localhost:3001/s/visit-karakol        демо маркета Каракола
http://localhost:3001/s/visit-karakol/join   тарифы и заявка
```

Микросайты тенантов (`{slug}.microp.app`, kendala.tourhub.kz) остаются в vitrina.
