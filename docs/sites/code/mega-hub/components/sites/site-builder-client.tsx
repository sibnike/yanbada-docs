'use client'

import { useEffect, useState } from 'react'
import type { SiteBlockType, SiteKnowledge, SitePage, SitePost, SiteRow } from '@/types/site'

const BLOCK_LABELS: Record<SiteBlockType, string> = {
  hero: 'Hero',
  info: 'Текст / описание',
  tenant_cards: 'Карточки тенантов',
  listing_cards: 'Карточки услуг',
  posts: 'Журнал',
  gallery: 'Галерея',
  faq: 'FAQ',
  cta: 'Кнопка',
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
    const payload =
      type === 'tenant_cards' || type === 'listing_cards'
        ? { mode: 'scope', limit: 12 }
        : type === 'info'
          ? { title: { ru: 'Заголовок' }, body: { ru: '' } }
          : {}
    await fetch(`/api/admin/sites/${slug}/pages/${pageId}/blocks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, payload }),
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
                  {block.type === 'tenant_cards' || block.type === 'listing_cards' ? ' · live cache' : null}
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
      <aside>
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
