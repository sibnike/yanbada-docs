# Если внедрять витрину market

Контент **той же насадки** mega-hub, где уже живёт market. Код приложения Vitrina не копировать и не менять.

DDL — в `mega-hub/supabase/migrations/` (схема `hub`). Зеркало в `vitrina/supabase/migrations/` только как существующий способ push, без правок `app/` vitrina.

```bash
cp docs/sites/sql/20260909000000_hub_sites.sql mega-hub/supabase/migrations/
cp docs/sites/sql/20260909120000_hub_site_builder.sql mega-hub/supabase/migrations/
```

Черновик UI/API: `docs/sites/code/mega-hub/` → репозиторий hub.

Проверка:

```
http://localhost:3001/admin/sites/visit-kazakhstan/builder
http://localhost:3001/s/visit-kazakhstan
```

Микросайты тенантов (`{slug}.microp.app`, kendala.tourhub.kz) остаются в vitrina.
