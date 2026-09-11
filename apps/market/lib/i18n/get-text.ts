import { loc } from '@/lib/sites/public-copy'
import type { I18nMap } from '@/types/site'

/** mega-hub calls this helper getI18nText; same behaviour as loc(). */
export function getI18nText(
  map: I18nMap | string | null | undefined,
  locale = 'ru',
  fallback = ''
): string {
  return loc(map, locale, fallback)
}
