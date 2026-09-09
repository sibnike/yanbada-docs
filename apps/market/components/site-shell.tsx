import { SiteCanvas } from '@/components/sites/site-canvas'
import { AssistantDock } from '@/components/sites/assistant-dock'
import { loc } from '@/lib/sites/public-copy'
import { CardTracker } from '@/components/card-tracker'
import type { SitePublicPayload } from '@/types/site'

/**
 * Public storefront: the constructor renderer that ships to mega-hub, plus the
 * assistant and the impression/click counter that feeds hub.site_card_stats.
 */
export function SiteShell({
  payload,
  pageSlug = 'home',
  locale = 'ru',
}: {
  payload: SitePublicPayload
  pageSlug?: string
  locale?: string
}) {
  const assistant = payload.site.settings.assistant
  return (
    <>
      <SiteCanvas payload={payload} pageSlug={pageSlug} locale={locale} />
      <CardTracker slug={payload.site.slug} />
      {assistant?.enabled ? (
        <AssistantDock
          slug={payload.site.slug}
          name={loc(assistant.name, locale, 'Ассистент витрины')}
          greeting={loc(assistant.greeting, locale, 'Спросите про карточки витрины.')}
        />
      ) : null}
    </>
  )
}
