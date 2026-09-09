# Yanbada SuperApp — Docs

## Для AI-агентов (начни здесь)

1. **[agent-context/00-START-HERE.md](./agent-context/00-START-HERE.md)** — 2 минуты контекста
2. **[agent-context/07-where-to-look.md](./agent-context/07-where-to-look.md)** — куда смотреть по задаче
3. **[PROGRESS.md](./PROGRESS.md)** — что на prod, что дальше
4. **[agent-context/CHANGELOG.md](./agent-context/CHANGELOG.md)** — журнал сессий

Полный индекс agent-context: [agent-context/README.md](./agent-context/README.md)

## Ops / резервные копии

[BACKUP.md](./BACKUP.md) — ежедневный pg_dump, Supabase Storage, GitHub Actions.

## Архитектура

[YANBADA_ARCHITECTURE.md](./YANBADA_ARCHITECTURE.md) — экосистема Vitrina + mega-hub + TourHub (единственная каноническая копия).

[sites/README.md](./sites/README.md) — публичная витрина market в mega-hub (Vitrina не меняется).

## По проектам (детали внутри репо)

| Проект | Мастер-док | Progress / backlog |
|--------|------------|-------------------|
| vitrina | [../vitrina/docs/ARCHITECTURE.md](../vitrina/docs/ARCHITECTURE.md) | [agent-context/04-vitrina-work-backlog.md](./agent-context/04-vitrina-work-backlog.md) |
| mega-hub | [../mega-hub/ARCHITECTURE.md](../mega-hub/ARCHITECTURE.md) | sync + events в YANBADA_ARCHITECTURE |
| tourhub | [../tourhub/docs/ARCHITECTURE.md](../tourhub/docs/ARCHITECTURE.md) | [agent-context/03-tourhub-current-state.md](./agent-context/03-tourhub-current-state.md) |

## Слои документации

```
docs/PROGRESS.md              ← статус экосистемы (люди + агенты)
docs/YANBADA_ARCHITECTURE.md  ← связи между проектами
docs/agent-context/           ← короткий контекст для агентов
{repo}/docs/ или ARCHITECTURE ← глубина одного проекта
```

Не дублировать ecosystem-доки внутри vitrina/mega-hub/tourhub — только ссылка на `../docs/`.
