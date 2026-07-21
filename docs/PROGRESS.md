# Progress — Yanbada SuperApp

> **Обновлено:** 2026-07-21  
> Журнал сессий (детальнее): [agent-context/CHANGELOG.md](./agent-context/CHANGELOG.md)

## Текущая фаза

**Профиль компании в Vitrina — на prod.** Следующий фокус: **AI Content Builder UI** → **TourHub live** (mapper + catalog из hub).

---

## На prod ✅

| Что | Проект | Примечание |
|-----|--------|------------|
| Расширенный профиль компании (legal, tourism, media, bank) | vitrina | PR #2 merged, admin `/admin/t/{slug}/profile` |
| Sync новых полей в `hub.company_cache` | vitrina + mega-hub | PR hub #1 merged; `bank_details` **не** sync |
| Миграция `20260721100000_company_profile_legal_extended` | vitrina + mega-hub | Local = Remote на prod Supabase |
| Booking, inbox, marketplace ingest, Touchin embed | vitrina | см. `vitrina/docs/reports/` |
| Market F21 + catalog F11 (demo) | tourhub | `TOURHUB_DATA_MODE=demo` по умолчанию |
| Live market listings API | tourhub + mega-hub | частично; mapper не все поля cache |
| Exhibitor Hub (events, map, catalog) | mega-hub | hub.yanbada.com |

---

## В работе / следующее

| Приоритет | Задача | Проект | Док |
|-----------|--------|--------|-----|
| **P0** | AI Content Builder — admin UI (диалог, PATCH blocks) | vitrina | `vitrina/docs/TZ-AI-Content-Builder-Tourism.md` |
| **P0** | TourHub `live-mapper` — новые поля `company_cache` (cover, gallery, license…) | tourhub | `03-tourhub-current-state.md` |
| **P1** | Категории при регистрации: `tourism` + обязательный `marketplace_themes` | vitrina | `04-vitrina-work-backlog.md` |
| **P1** | Publish flow: профиль → template → page → listing sync | vitrina | `04-vitrina-work-backlog.md` |
| **P1** | Catalog live из hub (не demo-data) | tourhub | `tourhub/docs/ARCHITECTURE.md` |
| **P2** | Публичный GET JSON страницы для TourHub detail | vitrina | backlog §P1 |

---

## E2E checklist (TourHub live)

- [x] Профиль сохраняется в admin vitrina
- [x] `hub.company_cache` — legal, tourism, media (кроме bank)
- [ ] `marketplace_themes` заполнены у тестового тенанта
- [ ] Опубликована страница с `catalog_items`
- [ ] `hub.listing_cache` содержит listing
- [ ] `curl localhost:3002/api/market/listings` (live mode) показывает карточку

Seed: `cd vitrina && node scripts/seed-tourhub-demo.mjs`

---

## Блокеры / внимание

| Тема | Статус |
|------|--------|
| Cloudinary на Vercel prod | Проверить env `CLOUDINARY_*` — без них upload медиа в профиле не работает |
| SuperApp `docs/` не в git | ✅ **sibnike/yanbada-docs** — корень `~/Projects/Yanbada-superApp/` |
| iCloud копия | `~/Documents/Yanbada-superApp/` может отставать |

---

## Репозитории

```
Yanbada-superApp/           ← git: sibnike/yanbada-docs (docs + cursor rules)
├── docs/                   ← экосистема (этот хаб)
├── .cursor/rules/
├── vitrina/                ← git: sibnike/vitrina
├── mega-hub/               ← git: sibnike/hub
└── tourhub/                ← локально
```

**Clone docs:** `git clone https://github.com/sibnike/yanbada-docs.git ~/Projects/Yanbada-superApp`
