# Tailwind CSS 4 — план выравнивания стека

**Дата:** 2026-07-26  
**Статус:** запланировано (документ-источник истины)  
**Цель:** один Tailwind **4.x** во всех приложениях экосистемы, чтобы без боли шарить UI на Radix и design tokens.

---

## Текущее состояние

| Приложение | Bundler | Tailwind | Конфиг | Animate |
|------------|---------|----------|--------|---------|
| **vitrina** | Next.js 14 | **3.4** | `tailwind.config.ts` + `@tailwind` в `app/globals.css` | `tailwindcss-animate` |
| **mega-hub** | Next.js 14 | **3.4** | `tailwind.config.ts` | `tailwindcss-animate` + уже есть `tw-animate-css` в deps |
| **tourhub** | Next.js 14 | **3.4** | `tailwind.config.ts` | `tailwindcss-animate` |
| **Microp** (лендинг) | Vite 6 | **4.1** | `src/styles/tailwind.css` (`@import 'tailwindcss'`, `@source`) | `tw-animate-css` |

**Изоляция сейчас:** Microp собирается в `vitrina/public/microp-landing/` и не импортирует React-компоненты из vitrina. Рассинхрон **не ломает prod**, но **блокирует общий UI-kit**.

**Решение:** поднять Next-приложения на TW 4 (эталон — уже работающий Microp), **не** откатывать Microp на v3.

---

## Принципы миграции

1. **По одному репозиторию** — vitrina → mega-hub → tourhub; после каждого — `npm run build` + smoke UI.
2. **CSS-переменные first** — токены (`--background`, `--primary`, Microp gradient) в `:root` / `@theme`; компоненты ссылаются на tokens, не на хардкод hex.
3. **Минимальный diff в JSX** — по возможности только конфиг и globals; классы `flex`, `rounded-lg` совместимы.
4. **Не трогать Microp** в фазе 1–3 (уже v4).
5. **Общий пакет UI — только после фазы 3** (`packages/ui` или `vitrina/packages/ui`).

---

## Фаза 0 — подготовка (0.5–1 день)

### 0.1 Design tokens (общий черновик)

Создать **`docs/design-tokens/microp.css`** (или `packages/tokens/microp.css`) — только CSS variables, без Tailwind:

- vitrina admin: `--bg`, `--accent`, `--radius` (`app/globals.css`)
- Microp landing: `--background`, `--primary`, brand gradient `#6D5EF6` → `#22D3EE` (`Microp/src/styles/theme.css`)

Microp и vitrina **подключают один файл** через `@import` — визуальная согласованность до общего UI-kit.

### 0.2 Чеклист регрессии

Зафиксировать экраны для ручной проверки после каждой фазы:

| App | Экраны |
|-----|--------|
| vitrina | login, admin dashboard, company profile, page editor, booking admin |
| mega-hub | hub company card, marketplace request, organizer |
| tourhub | market list, catalog, listing detail, demo mode |
| Microp | `/`, `/presentation`, onboarding drawer |

### 0.3 Ветка

`feat/tailwind-4-vitrina` (от `main` vitrina) — отдельные PR в hub/tourhub после merge vitrina.

---

## Фаза 1 — vitrina → Tailwind 4 (1–2 дня)

**Референс:** [Microp `src/styles/`](../../vitrina/Microp/src/styles/), [Tailwind v4 + Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs).

### 1.1 Зависимости

```bash
cd vitrina
npm uninstall tailwindcss tailwindcss-animate
npm install -D tailwindcss@^4 @tailwindcss/postcss@^4
npm install tw-animate-css   # замена tailwindcss-animate
```

### 1.2 PostCSS

`postcss.config.mjs`:

```js
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
export default config
```

### 1.3 CSS entry

Заменить `app/globals.css`:

```css
@import 'tailwindcss';
@source '../app/**/*.{js,ts,jsx,tsx}';
@source '../components/**/*.{js,ts,jsx,tsx}';
@source '../modules/**/*.{js,ts,jsx,tsx}';

@import 'tw-animate-css';
/* :root tokens — перенести из текущего globals.css */
```

### 1.4 Миграция `tailwind.config.ts`

- Перенести `theme.extend.colors`, `borderRadius`, `darkMode` в **`app/theme.css`** через `@theme`:

```css
@theme {
  --color-background: var(--bg);
  --color-foreground: var(--text);
  --color-primary: var(--accent);
  --radius-lg: var(--radius);
}
```

- Удалить `tailwind.config.ts` после проверки (v4 optional config через `@config` если нужен legacy plugin).

### 1.5 Проверки

```bash
npm run build          # Microp landing + next build
npm run lint
# smoke: login:dev, открыть admin/t/qa-sandbox/…
```

### 1.6 Известные риски vitrina

| Риск | Действие |
|------|----------|
| `@apply` в редких CSS | заменить на utilities или оставить через `@reference` |
| `tailwindcss-animate` классы | маппинг на `tw-animate-css` |
| Dynamic class strings | grep `className={\`` — убедиться что `@source` покрывает файлы |
| Microp sub-build | `build:microp-landing` не зависит от vitrina TW — без изменений |

---

## Фаза 2 — mega-hub → Tailwind 4 (0.5–1 день)

Повторить шаги фазы 1 для `mega-hub/`:

- `app/globals.css`, `postcss.config.mjs`, `@source` на `app/`, `components/`
- Уже установлен `tw-animate-css` — убрать дублирование с `tailwindcss-animate`
- `npm run build` + hub smoke (`/api/sync/company`, публичная карточка компании)

**Зависимость:** желательно после merge vitrina (общий паттерн в доке/PR description).

---

## Фаза 3 — tourhub → Tailwind 4 (0.5–1 день)

Аналогично mega-hub.

- Demo CSS classes из `TourHub-recovered` — проверить market/catalog после миграции
- `TOURHUB_DATA_MODE=demo` и `live` — оба режима

---

## Фаза 4 — общий UI-kit (2–4 дня, отдельный эпик)

**Только когда все на TW 4.**

```
packages/
  tokens/          # microp.css, @theme exports
  ui/              # Radix + cva + cn(), без Next-specific imports
```

| Consumer | Import |
|----------|--------|
| vitrina | `@yanbada/ui/button` |
| mega-hub | то же |
| tourhub | то же |
| Microp (Vite) | `@yanbada/ui` + alias в `vite.config` |

**Порядок переноса компонентов:** Button, Input, Dialog, Sheet/Drawer → Select, Tabs → сложные (DataTable).

**Microp:** постепенно заменить дубликаты `Microp/src/app/components/ui/*` на `@yanbada/ui`.

---

## Что не делаем

- ❌ Откат Microp на Tailwind 3 (потеря `@source`, `@theme`, Figma Make pipeline)
- ❌ Monorepo turbo до фазы 4 (можно начать с `packages/` только в vitrina repo)
- ❌ Одновременная миграция всех трёх Next-apps в одном PR

---

## Критерии готовности (Definition of Done)

- [ ] vitrina, mega-hub, tourhub: `tailwindcss@^4`, `@tailwindcss/postcss`
- [ ] Нет `tailwind.config.ts` или только thin `@config` wrapper
- [ ] `npm run build` зелёный во всех трёх + Microp landing
- [ ] Smoke-экраны из §0.2 без визуальных регрессий
- [ ] `06-conventions-for-agents.md` обновлён: «Tailwind 4 everywhere»
- [ ] `PROGRESS.md` — статус «TW4 aligned»

---

## Оценка сроков

| Фаза | Effort |
|------|--------|
| 0 Подготовка | 0.5–1 д |
| 1 vitrina | 1–2 д |
| 2 mega-hub | 0.5–1 д |
| 3 tourhub | 0.5–1 д |
| 4 UI-kit | 2–4 д (опционально) |
| **Итого до выравнивания TW** | **~3–5 рабочих дней** |

---

## Связанные документы

- [agent-context/06-conventions-for-agents.md](./agent-context/06-conventions-for-agents.md) — стек для агентов
- [YANBADA_ARCHITECTURE.md](./YANBADA_ARCHITECTURE.md) — три Next-приложения
- Microp styles: `vitrina/Microp/src/styles/tailwind.css`, `theme.css`

---

## Changelog плана

| Дата | Изменение |
|------|-----------|
| 2026-07-26 | Первая версия плана (TW3→TW4, vitrina first) |
