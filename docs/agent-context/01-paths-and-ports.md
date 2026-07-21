# 01 — Пути и порты

## Канонические пути (работать здесь)

```
~/Projects/Yanbada-superApp/
├── vitrina/          # github.com/sibnike/vitrina
├── mega-hub/         # Exhibitor Hub + marketplace API
├── tourhub/          # B2C TourHub prod app
├── tourhub-restore/  # бэкап/черновик, не основной
└── docs/
    ├── YANBADA_ARCHITECTURE.md
    └── agent-context/   ← эта папка
```

## Дубликаты (осторожно)

| Путь | Риск |
|------|------|
| `~/Documents/Yanbada-superApp/` | iCloud — файлы могли пропадать; может отставать от Projects |
| `~/Documents/TourHub/` | Старый demo / iCloud |
| `~/Projects/TourHub-recovered` | UX-референс демо (vanilla JS), read-only для переноса |

## Dev-порты приложений

| App | URL | Supabase local |
|-----|-----|----------------|
| vitrina | http://localhost:3000 | 54331 (API), 54332 (PG) |
| mega-hub | http://localhost:3001 | 55431, 55432 |
| tourhub | http://localhost:3002 | 58431, 58432 (tourhub-local) |

## GitHub

| Repo | Remote (типично) |
|------|------------------|
| vitrina | `sibnike/vitrina` |
| tourhub | `tourhub-realapp` (проверить `git remote -v` в проекте) |

**TourHub в Projects может быть без `git init`** — перед рискованными операциями предложить commit + push.

## Ключевые env (локально)

### tourhub `.env.local`
```
TOURHUB_DATA_MODE=demo|live
MEGA_HUB_API_URL=http://localhost:3001
```

### mega-hub `.env.local`
```
ANTHROPIC_API_KEY=...   # нужен для полного AI-парсинга заявок
VITRINA_WEBHOOK_SECRET=...  # HMAC sync с vitrina
```

### vitrina `.env.local`
```
HUB_WEBHOOK_URL=http://localhost:3001/api/sync/company
VITRINA_WEBHOOK_SECRET=...  # тот же секрет
```

## Prod Supabase

Один проект для всех: **mega-vitrina** (`bfcfwaakxcqplamcswaq`), схемы `public` + `hub`.
Миграции prod — только из vitrina: `CONFIRM_PROD_DB_PUSH=1 npm run db:push:prod`.
