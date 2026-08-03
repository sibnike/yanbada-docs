# Резервное копирование Yanbada / Microp

> **БД:** один Supabase prod — **mega-vitrina** (`bfcfwaakxcqplamcswaq`)  
> **Код и миграции:** GitHub (см. ниже)  
> **Автобэкап:** GitHub Actions в репозитории `sibnike/vitrina`

---

## 1. Что уже в GitHub (не теряется)

| Репозиторий | Что хранится |
|-------------|--------------|
| [sibnike/vitrina](https://github.com/sibnike/vitrina) | `supabase/migrations/`, приложение, скрипты |
| [sibnike/hub](https://github.com/sibnike/hub) | `supabase/migrations/` (schema `hub.*`) |
| [sibnike/tourhub](https://github.com/sibnike/tourhub) | B2C-фронт (без своей БД) |
| [sibnike/yanbada-docs](https://github.com/sibnike/yanbada-docs) | экосистемная документация |

Миграции — **источник схемы**. Данные (строки в таблицах) — только в pg_dump.

---

## 2. Ежедневный pg_dump + Storage

Workflow: **`vitrina/.github/workflows/daily-backup.yml`**

| Время | 01:00 UTC (06:00 Алматы) |
|-------|---------------------------|
| pg_dump | схемы `public`, `hub`, `storage` → custom `.dump` |
| Storage | все bucket'ы Supabase → папка + manifest JSON |
| Архив | `mega-vitrina-backup-YYYY-MM-DD.tar.gz` |
| Хранение | GitHub Artifact **90 дней** + опционально S3/R2 |

### Секреты GitHub (repo vitrina → Settings → Secrets)

| Secret | Откуда |
|--------|--------|
| `SUPABASE_DB_URL` | Supabase Dashboard → **Database** → Connection string → **URI** (Session, port **5432**) |
| `SUPABASE_URL` | `https://bfcfwaakxcqplamcswaq.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` |

**Опционально — долгосрочное хранение (Cloudflare R2 / AWS S3):**

| Secret | Пример |
|--------|--------|
| `BACKUP_S3_BUCKET` | `yanbada-backups` |
| `BACKUP_S3_ENDPOINT` | `https://<account>.r2.cloudflarestorage.com` |
| `BACKUP_S3_REGION` | `auto` |
| `BACKUP_S3_ACCESS_KEY_ID` | R2/S3 key |
| `BACKUP_S3_SECRET_ACCESS_KEY` | R2/S3 secret |

### Ручной запуск

```bash
cd vitrina
export SUPABASE_DB_URL='postgresql://postgres.[ref]:[password]@...:5432/postgres'
export SUPABASE_URL='https://bfcfwaakxcqplamcswaq.supabase.co'
export SUPABASE_SERVICE_ROLE_KEY='...'
npm run backup:prod
```

Или в GitHub: **Actions → Daily backup → Run workflow**.

### Восстановление БД

```bash
pg_restore --clean --if-exists --no-owner --dbname="$TARGET_DB_URL" mega-vitrina-YYYY-MM-DD.dump
```

⚠️ Только на **staging** или после явного решения — не на prod без окна обслуживания.

---

## 3. Медиа (Cloudinary)

Основные файлы (фото профилей, photo bank) — **Cloudinary**, не Supabase Storage.

| Действие | Как |
|----------|-----|
| Бэкап | Cloudinary Dashboard → **Backup** (план Pro+) или периодический export через [Admin API](https://cloudinary.com/documentation/admin_api) |
| Env | `CLOUDINARY_CLOUD_NAME`, API key/secret на Vercel vitrina |

Supabase Storage backup в workflow покрывает bucket'ы, если они появятся; сейчас медиа в основном в Cloudinary.

---

## 4. Supabase Platform (дополнительно)

На платных планах Supabase есть **Point-in-Time Recovery (PITR)** — включается в Dashboard → Database → Backups.  
Это **дополнение** к pg_dump, не замена GitHub + off-site archive.

---

## 5. Чеклист владельца

- [ ] Добавить секреты в GitHub `sibnike/vitrina`
- [ ] Один раз запустить workflow вручную и скачать artifact
- [ ] (Рекомендуется) Настроить R2/S3 для хранения > 90 дней
- [ ] Проверить Cloudinary backup / export
- [ ] Раз в квартал — тест восстановления на staging

---

## 6. Связанные файлы

| Путь | Назначение |
|------|------------|
| `vitrina/scripts/backup/pg-dump.mjs` | Postgres dump |
| `vitrina/scripts/backup/supabase-storage.mjs` | Storage buckets |
| `vitrina/scripts/backup/run-daily.mjs` | Оркестратор + S3 upload |
| `vitrina/.github/workflows/daily-backup.yml` | Cron CI |
