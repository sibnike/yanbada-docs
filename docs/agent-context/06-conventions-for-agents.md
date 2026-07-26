# 06 — Правила для агентов

## Язык общения с пользователем

**Русский.** Код и комментарии — по стилю существующего файла.

## Стек TourHub (если работаешь там)

TypeScript, React 18, Next.js 14 App Router, Tailwind (demo CSS classes), Radix-паттерны где уже есть.
Firebase **не используется** в tourhub prod — Firestore только если явно в другом проекте.

## Принципы кода

1. **Минимальный diff** — не трогать несвязанный код
2. **Следовать conventions** соседних файлов
3. **Не over-engineer** — без лишних абстракций
4. **Коммиты** — только по явной просьбе пользователя
5. **Не push force** на main

## Supabase из Serverless (обязательно)

На Vercel **не** подключаться к Postgres напрямую (`DATABASE_URL` / `:5432` / `pg.Pool`).

- Runtime: только `supabase-js` / `@supabase/ssr` → HTTP (PostgREST + Auth)
- TourHub live: HTTP к mega-hub/vitrina, не свой DB-клиент
- Если понадобится прямой SQL — **только** Supavisor transaction pooler (`:6543`), и это
  отдельное осознанное решение с записью в `YANBADA_ARCHITECTURE.md`

Подробнее: `docs/YANBADA_ARCHITECTURE.md` → «Доступ к БД из Vercel Serverless».

## Границы репозиториев

| Делать в vitrina | Делать в tourhub |
|------------------|------------------|
| Профили, страницы, catalog_items | Публичный UI, read API clients |
| syncToHub, listing sync | live-mapper, demo-data fallback |
| AI Content Builder | Market/catalog screens |
| Admin onboarding | Escrow UX (пока demo) |

**Не дублировать** CRUD профилей в TourHub.

## Demo vs Live

Всегда сохранять работоспособность `TOURHUB_DATA_MODE=demo` — стенд для показа не должен ломаться.

## Защита данных пользователя

- Рабочая копия: `~/Projects/`, не iCloud
- Перед рискованными операциями — предложить commit/push
- Не коммитить `.env`, secrets

## UI TourHub

- Переиспользовать CSS-классы из demo (`partner-card`, `catalog-tab`, `screen`, `flow`, …)
- i18n: `useI18n()`, `t('key')`, `loc(text, lang)` — ключи в `lib/demo-data/i18n.ts`
- Иконки market: `@/components/icons/market-icons`

## mega-hub UI

**Не показывать** в TourHub — только API.

## Обновление контекста

После сессии с архитектурными решениями — запись в `CHANGELOG.md` этой папки.

## Полезные команды

```bash
# TourHub
cd ~/Projects/Yanbada-superApp/tourhub && npm run dev

# Typecheck
npx tsc --noEmit && npm run build

# Seed hub
cd ~/Projects/Yanbada-superApp/vitrina && node scripts/seed-tourhub-demo.mjs
```
