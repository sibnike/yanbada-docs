'use client'

import { useEffect, useState } from 'react'
import { MarketRequestsPanel } from '@/components/sites/market-requests-panel'
import type { SiteBlockType, SiteKnowledge, SitePage, SitePost, SiteRow } from '@/types/site'

const BLOCK_LABELS: Record<SiteBlockType, string> = {
  hero: 'Hero',
  info: 'Текст / описание',
  stats: 'Цифры',
  steps: 'Как это работает',
  tenant_cards: 'Карточки компаний',
  listing_cards: 'Карточки услуг',
  manual_cards: 'Свои карточки мест',
  team: 'Команда',
  posts: 'Журнал',
  gallery: 'Галерея',
  reviews: 'Отзывы',
  faq: 'FAQ',
  map: 'Карта',
  contacts: 'Контакты',
  partners: 'Партнёры',
  video: 'Видео',
  pricing: 'Тарифы размещения',
  join: 'Заявка на размещение',
  cta: 'Кнопка',
}

const LIVE_BLOCKS: SiteBlockType[] = ['tenant_cards', 'listing_cards']

function defaultPayload(type: SiteBlockType): Record<string, unknown> {
  switch (type) {
    case 'tenant_cards':
    case 'listing_cards':
      return { mode: 'approved', limit: 12 }
    case 'info':
      return { title: { ru: 'Заголовок' }, body: { ru: '' } }
    case 'stats':
      return { items: [{ value: '0', label: { ru: 'показатель' } }] }
    case 'steps':
      return { title: { ru: 'Как это работает' }, items: [{ title: { ru: 'Шаг' }, body: { ru: '' } }] }
    case 'team':
      return { title: { ru: 'Команда' }, items: [{ name: '', role: { ru: '' }, bio: { ru: '' } }] }
    case 'reviews':
      return { title: { ru: 'Отзывы' }, items: [{ author: '', rating: 5, body: { ru: '' } }] }
    case 'faq':
      return { title: { ru: 'Частые вопросы' }, items: [{ q: { ru: '' }, a: { ru: '' } }] }
    case 'contacts':
      return { title: { ru: 'Связаться' }, items: [{ kind: 'telegram', value: '' }] }
    case 'partners':
      return { title: { ru: 'Партнёры' }, items: [{ name: '', logo_url: null }] }
    case 'gallery':
      return { title: { ru: 'Фото' }, images: [] }
    case 'video':
      return { title: { ru: 'Видео' }, provider: 'youtube', url: '' }
    case 'map':
      return { title: { ru: 'На карте' }, source: 'site_settings', pins: 'cards' }
    case 'manual_cards':
      return { title: { ru: 'Места рядом' }, limit: 6 }
    case 'pricing':
      return { title: { ru: 'Тарифы' }, source: 'site_plans' }
    case 'join':
      return { title: { ru: 'Заявка на размещение' }, require_terms: true, terms: { ru: '' } }
    case 'cta':
      return { title: { ru: '' }, body: { ru: '' }, action: { label: { ru: '' }, href: '' } }
    default:
      return {}
  }
}

type BuilderPayload = {
  site: SiteRow
  pages: SitePage[]
  posts: SitePost[]
  knowledge: SiteKnowledge[]
}

export function SiteBuilderClient({ slug }: { slug: string }) {
  const [data, setData] = useState<BuilderPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [kbTitle, setKbTitle] = useState('')
  const [kbBody, setKbBody] = useState('')

  async function reload() {
    const res = await fetch(`/api/admin/sites/${slug}/builder`)
    if (!res.ok) {
      setError(await res.text())
      return
    }
    setData((await res.json()) as BuilderPayload)
  }

  useEffect(() => {
    void reload()
  }, [slug])

  async function addBlock(pageId: string, type: SiteBlockType) {
    await fetch(`/api/admin/sites/${slug}/pages/${pageId}/blocks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, payload: defaultPayload(type) }),
    })
    await reload()
  }

  async function addKnowledge() {
    if (!kbTitle.trim() || !kbBody.trim()) return
    await fetch(`/api/admin/sites/${slug}/knowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: { ru: kbTitle }, body: kbBody, kind: 'article' }),
    })
    setKbTitle('')
    setKbBody('')
    await reload()
  }

  if (error) return <p>{error}</p>
  if (!data) return <p>Загрузка…</p>

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24, padding: '1.5rem' }}>
      <div>
        <h1>{data.site.slug}</h1>
        <p>
          Стиль: <strong>{data.site.template}</strong>. Карточки тенантов — живые из cache. Остальное — материалы
          проекта.
        </p>
        {data.pages.map((page) => (
          <section key={page.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <h2>
              {page.slug} <small>({page.kind})</small>
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {(Object.keys(BLOCK_LABELS) as SiteBlockType[]).map((type) => (
                <button key={type} type="button" onClick={() => void addBlock(page.id, type)}>
                  + {BLOCK_LABELS[type]}
                </button>
              ))}
            </div>
            <ol>
              {page.blocks.map((block) => (
                <li key={block.id}>
                  <strong>{BLOCK_LABELS[block.type]}</strong>
                  {LIVE_BLOCKS.includes(block.type) ? ' · live cache' : null}
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
      <aside>
        <MarketRequestsPanel slug={slug} />

        <h2>База знаний ассистента</h2>
        <p>Плюс платформенные статьи (роль менеджера, карточки, бронь).</p>
        <ul>
          {data.knowledge.map((item) => (
            <li key={item.id}>{Object.values(item.title)[0]}</li>
          ))}
        </ul>
        <input
          placeholder="Заголовок"
          value={kbTitle}
          onChange={(e) => setKbTitle(e.target.value)}
          style={{ width: '100%', marginBottom: 8 }}
        />
        <textarea
          placeholder="Что должен знать менеджер этого сайта"
          value={kbBody}
          onChange={(e) => setKbBody(e.target.value)}
          rows={6}
          style={{ width: '100%' }}
        />
        <button type="button" onClick={() => void addKnowledge()}>
          Добавить знание
        </button>
      </aside>
    </div>
  )
}
