# Домены Microp (prod)

Канонический чеклист cutover: **[vitrina/docs/DOMAINS-MICROP-PROD.md](../vitrina/docs/DOMAINS-MICROP-PROD.md)** в репозитории `sibnike/vitrina`.

## Карта (кратко)

| Роль | Host |
|------|------|
| Маркетинг | `microp.app` |
| Vitrina admin | `admin.microp.app` |
| Vitrina `/p/*` | `vitrina.microp.app` |
| Hub тенанта | `{hub_subdomain}.microp.app` |
| Exhibitor Hub | `hub.microp.app` |
| Marketplace | `{sub}.microp.app` → mega-hub |

Логика та же, что для `yanbada.com`: корень задаётся env (`NEXT_PUBLIC_HUB_ROOT_DOMAIN`, `NEXT_PUBLIC_APP_DOMAIN`, …).

Legacy `*.yanbada.com` — опциональные 301 в Cloudflare.
