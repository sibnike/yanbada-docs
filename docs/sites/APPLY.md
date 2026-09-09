# Если внедрять страницы проектов

Это **новая фича mega-hub**. Код приложения Vitrina не копировать и не менять.

DDL кладётся в `mega-hub/supabase/migrations/`. Зеркало в `vitrina/supabase/migrations/` — только существующий способ push схемы `hub.*` на общий Supabase, без правок `app/` vitrina.

```bash
cp docs/sites/sql/20260909000000_hub_sites.sql mega-hub/supabase/migrations/
cp docs/sites/sql/20260909120000_hub_site_builder.sql mega-hub/supabase/migrations/
```

Черновик UI/API: `docs/sites/code/mega-hub/` → репозиторий hub.

Проверка после внедрения в hub:

```
http://localhost:3001/admin/sites/visit-kazakhstan/builder
http://localhost:3001/s/visit-kazakhstan
```

Публичные хабы тенантов (`{slug}.microp.app`, kendala.tourhub.kz) как работали в vitrina, так и остаются.
