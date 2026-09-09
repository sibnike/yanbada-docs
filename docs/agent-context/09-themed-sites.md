# 09 — Тематические сайты (hub.sites)

> **Решение:** 2026-09-09  
> **Срез v1:** оба сценария на одной модели `hub.sites` — шаблоны `operator` и `destination`.  
> **Рендер:** TourHub ` /s/{slug} `. **Не** mega-hub `/m/*` и **не** Tenant Hub `/h/*`.

Канон кода (drop-in, пока нет PR в hub/tourhub): [docs/sites/](../sites/README.md).

## Зачем

Нужны публичные сайты, которые:

- берут карточки и услуги из **выбранных тенантов** (город, страна, вид деятельности, или один оператор);
- выглядят **богаче** плиточного микросайта [kendala.tourhub.kz](https://kendala.tourhub.kz/) (это Tenant Hub vitrina, не TourHub);
- живут на **нашем домене со слагом** (`www.ota.kz/s/{slug}`) или на **своём домене**.

## Не путать три продукта

| Слой | Что это | URL | Аудитория |
|------|---------|-----|-----------|
| Tenant Hub | Плиточный launcher **одного** тенанта | `{hub_subdomain}.microp.app`, `hub_custom_domain` (kendala.tourhub.kz) | гости оператора |
| mega-hub `/m/{slug}` | B2B маркет, login + membership | hub.microp.app/m/tourism | тенанты-покупатели |
| **hub.sites** (этот док) | Публичная тематическая витрина 1..N тенантов | **ota.kz/s/{slug}** | туристы |

`*.tourhub.kz` уже занят vitrina custom domains. Новые проекты **не** вешать туда.

## Модель

```
Vitrina (write) → hub.company_cache / listing_cache
                         ↓ scope filter
                   hub.sites (config)
                         ↓ GET /api/sites/{slug}
                   TourHub /s/{slug}
                     operator | destination
```

Таблица: [sql/20260909000000_hub_sites.sql](../sites/sql/20260909000000_hub_sites.sql)

Scope — **AND** по непустым измерениям:

- `tenant_ids[]` — whitelist тенантов (1 = бренд-сайт)
- `theme_slugs[]` — `listing_cache.marketplace_themes`
- `country_codes[]` — `listing.service_country_code` или `company_cache.country`
- `city_codes[]` — `listing.service_city_codes` или city компании
- `marketplace_slug` — обычно `tourhub`; `NULL` для operator, если нужны все published pages тенанта

Пустой scope запрещён CHECK-ом.

## Шаблоны

| template | Сценарий | Визуал |
|----------|----------|--------|
| `operator` | 1 (редко 2–3) тенант, когда внутреннего хаба мало | тёмный editorial, full-bleed hero, программы крупными карточками |
| `destination` | город / страна / вертикаль из нескольких тенантов | светлый DMO: операторы + сетка маршрутов |

Прототипы (открыть в браузере):

- [templates/operator.html](../sites/templates/operator.html)
- [templates/destination.html](../sites/templates/destination.html)

Бронь: существующий Vitrina `/p/{page}?embed=1&embedView=info&tenant=` — **не** новый booking engine.

## Хостинг

**Фаза 1 (сейчас):** path `https://www.ota.kz/s/{slug}`

**Фаза 2:** wildcard `{slug}.ota.kz` + `custom_domain` → TourHub middleware по `hub.sites`. Не mega-hub (иначе откроется B2B).

## API

Публичный (TourHub, без login):

```
GET {MEGA_HUB_API_URL}/api/sites/{slug}
→ { site, listings, companies }
```

Admin (platform_admin):

```
GET/POST /api/admin/sites
GET/PATCH /api/admin/sites/{slug}
```

## Куда класть код

| Репо | Путь |
|------|------|
| mega-hub | `supabase/migrations/20260909000000_hub_sites.sql` (зеркало в vitrina) |
| mega-hub | `lib/sites/*`, `types/site.ts`, `app/api/sites/[slug]`, `app/api/admin/sites`, `app/admin/sites` |
| tourhub | `app/s/[slug]/page.tsx`, `components/sites/*`, `lib/sites/*` |

Готовые файлы: [docs/sites/code/](../sites/code/). Применение: [APPLY.md](../sites/APPLY.md).

## Что не делаем в v1

- Шаблон `vertical` как отдельный пакет (destination покрывает themes)
- Клон Vercel на каждый сайт
- Публичный UI на mega-hub `/m`
- Прокачка плиток Tenant Hub — он остаётся launcher'ом; богатый бренд = `operator` site

## Definition of Done (после переноса в репо)

- [ ] Миграция на local + prod (`db:push:prod` из vitrina)
- [ ] `GET /api/sites/visit-kazakhstan` отдаёт listings из cache
- [ ] `www.ota.kz/s/visit-kazakhstan` и `/s/kendala-studio` (demo или live)
- [ ] Operator визуально не похож на kendala.tourhub.kz
- [ ] Бронь открывает `/p/*` vitrina
