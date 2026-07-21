# Yanbada SuperApp

Три Next.js-приложения + общий Supabase (**mega-vitrina**). Рабочая папка: `~/Projects/Yanbada-superApp/` (не iCloud).

| Проект | GitHub | Prod | Dev |
|--------|--------|------|-----|
| **vitrina** | `sibnike/vitrina` | admin.yanbada.com | :3000 |
| **mega-hub** | `sibnike/hub` | hub.yanbada.com | :3001 |
| **tourhub** | `sibnike/tourhub` | tourhub.yanbada.com | :3002 |

**Docs git:** [github.com/sibnike/yanbada-docs](https://github.com/sibnike/yanbada-docs) — корень этой папки (`docs/`, `.cursor/rules/`).

## Документация — с чего начать

| Кто | Первый файл |
|-----|-------------|
| **AI-агент** | [docs/agent-context/00-START-HERE.md](./docs/agent-context/00-START-HERE.md) → [07-where-to-look.md](./docs/agent-context/07-where-to-look.md) |
| **Человек — статус** | [docs/PROGRESS.md](./docs/PROGRESS.md) |
| **Архитектура экосистемы** | [docs/YANBADA_ARCHITECTURE.md](./docs/YANBADA_ARCHITECTURE.md) |
| **Индекс всего** | [docs/README.md](./docs/README.md) |

## Золотое правило

**Vitrina — источник истины** для профилей и карточек услуг. Hub — кэш + события + AI-матчинг. TourHub — B2C read-only UI.
