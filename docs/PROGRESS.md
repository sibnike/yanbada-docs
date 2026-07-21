# Progress — Yanbada SuperApp

> **Обновлено:** 2026-07-21  
> Журнал сессий (детальнее): [agent-context/CHANGELOG.md](./agent-context/CHANGELOG.md)

## Текущая фаза

**Live E2E + demo tenants на prod** ✅. **AI Content Builder UI** — MVP admin-экран в vitrina (чат + preview), backend был готов ранее.

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
| **P0** | TourHub `live-mapper` + seller profile из `company_cache` | tourhub + mega-hub | ✅ merged PR #2 |
| **P1** | Registration: tourism + `marketplace_themes` | vitrina | ✅ merged PR #3 |
| **P0** | AI Content Builder — admin UI | vitrina | ✅ MVP UI (`content-builder-client.tsx`, routes `/content-builder`, `/pages/[id]/content-builder`) |
| **P1** | Publish flow: профиль → template → page → listing sync | vitrina | `04-vitrina-work-backlog.md` |
| **P1** | Catalog live из hub (не demo-data) | tourhub | `tourhub/docs/ARCHITECTURE.md` |
| **P2** | Публичный GET JSON страницы для TourHub detail | vitrina | backlog §P1 |

---

## E2E checklist (TourHub live)

- [x] Профиль сохраняется в admin vitrina
- [x] `hub.company_cache` — legal, tourism, media (кроме bank)
- [x] Seed script sync company + listing webhooks (`seed-tourhub-demo.mjs`)
- [x] Локально: 3 listing в hub + TourHub live API (`count: 3`)
- [x] Prod deploy vitrina + mega-hub (PR #3, hub #2 merged)
- [x] Prod deploy tourhub (PR #2 merged — Next.js only, Netlify demo removed)
- [x] Vercel env tourhub + prod deploy (tourhub.yanbada.com)
- [x] Prod seed demo tenants (nomad-trails, steppe-journeys, aquatour-burabay)

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
└── tourhub/                ← git: sibnike/tourhub → tourhub.yanbada.com
```

**Clone docs:** `git clone https://github.com/sibnike/yanbada-docs.git ~/Projects/Yanbada-superApp`
