import { NextResponse } from 'next/server'
import { one, q } from '@/lib/db'
import { bad, isUuid, ownerContext, readJson, text } from '@/lib/api'
import { SITE_BLOCK_TYPES, type SiteBlockType } from '@/types/site'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ slug: string }> }

/**
 * The constructor: pages, blocks, journal posts and owner-made cards.
 * One endpoint keeps the client simple — the entity is in the body.
 */
export async function POST(request: Request, { params }: Params) {
  const { slug } = await params
  const context = await ownerContext(slug)
  if (context instanceof NextResponse) return context
  const siteId = context.site.id

  const body = await readJson(request)
  const entity = String(body.entity ?? '')
  const action = String(body.action ?? '')

  if (entity === 'page') return handlePage(siteId, action, body)
  if (entity === 'block') return handleBlock(siteId, action, body)
  if (entity === 'post') return handlePost(siteId, action, body)
  if (entity === 'manual_card') return handleManualCard(siteId, action, body)
  return bad('Неизвестный объект')
}

async function handlePage(siteId: string, action: string, body: Record<string, unknown>) {
  if (action === 'create') {
    const pageSlug = text(body.slug, 60)?.toLowerCase().replace(/[^a-z0-9-]/g, '-')
    const title = text(body.title, 120)
    if (!pageSlug || !title) return bad('Нужны адрес и заголовок страницы')
    const row = await one<{ id: string }>(
      `INSERT INTO hub.site_pages (site_id, slug, kind, title, sort_order, is_published)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (site_id, slug) DO UPDATE SET title = EXCLUDED.title, is_published = EXCLUDED.is_published
       RETURNING id`,
      [
        siteId,
        pageSlug,
        ['home', 'page', 'blog'].includes(String(body.kind)) ? String(body.kind) : 'page',
        JSON.stringify({ ru: title }),
        Number(body.sort_order ?? 50),
        body.is_published !== false,
      ]
    )
    return NextResponse.json({ ok: true, id: row?.id })
  }

  if (!isUuid(body.id)) return bad('Нет страницы')

  if (action === 'update') {
    const sets: string[] = []
    const values: unknown[] = [body.id, siteId]
    const push = (column: string, value: unknown) => {
      values.push(value)
      sets.push(`${column} = $${values.length}`)
    }
    if (text(body.title, 120)) push('title', JSON.stringify({ ru: text(body.title, 120) }))
    if (typeof body.is_published === 'boolean') push('is_published', body.is_published)
    if (typeof body.sort_order === 'number') push('sort_order', Math.trunc(body.sort_order))
    if (sets.length === 0) return bad('Нечего менять')
    await q(
      `UPDATE hub.site_pages SET ${sets.join(', ')}, updated_at = now() WHERE id = $1 AND site_id = $2`,
      values
    )
    return NextResponse.json({ ok: true })
  }

  if (action === 'delete') {
    await q('DELETE FROM hub.site_pages WHERE id = $1 AND site_id = $2', [body.id, siteId])
    return NextResponse.json({ ok: true })
  }

  return bad('Неизвестное действие')
}

async function handleBlock(siteId: string, action: string, body: Record<string, unknown>) {
  if (action === 'create') {
    if (!isUuid(body.page_id)) return bad('Нет страницы')
    const type = String(body.type) as SiteBlockType
    if (!SITE_BLOCK_TYPES.includes(type)) return bad('Неизвестный тип блока')
    const page = await one('SELECT id FROM hub.site_pages WHERE id = $1 AND site_id = $2', [
      body.page_id,
      siteId,
    ])
    if (!page) return bad('Страница не найдена', 404)

    const next = await one<{ next: number }>(
      'SELECT COALESCE(max(sort_order), 0) + 10 AS next FROM hub.site_blocks WHERE page_id = $1',
      [body.page_id]
    )
    const row = await one<{ id: string }>(
      'INSERT INTO hub.site_blocks (page_id, type, payload, sort_order) VALUES ($1, $2, $3, $4) RETURNING id',
      [body.page_id, type, JSON.stringify(defaultPayload(type)), Number(next?.next ?? 10)]
    )
    return NextResponse.json({ ok: true, id: row?.id })
  }

  if (!isUuid(body.id)) return bad('Нет блока')
  const block = await one<{ id: string; page_id: string; sort_order: number }>(
    `SELECT b.id, b.page_id, b.sort_order FROM hub.site_blocks b
       JOIN hub.site_pages p ON p.id = b.page_id
      WHERE b.id = $1 AND p.site_id = $2`,
    [body.id, siteId]
  )
  if (!block) return bad('Блок не найден', 404)

  if (action === 'update') {
    const sets: string[] = []
    const values: unknown[] = [block.id]
    const push = (column: string, value: unknown) => {
      values.push(value)
      sets.push(`${column} = $${values.length}`)
    }
    if (body.payload && typeof body.payload === 'object') push('payload', JSON.stringify(body.payload))
    if (typeof body.is_active === 'boolean') push('is_active', body.is_active)
    if (typeof body.sort_order === 'number') push('sort_order', Math.trunc(body.sort_order))
    if (sets.length === 0) return bad('Нечего менять')
    await q(`UPDATE hub.site_blocks SET ${sets.join(', ')} WHERE id = $1`, values)
    return NextResponse.json({ ok: true })
  }

  if (action === 'move') {
    const direction = body.direction === 'up' ? 'up' : 'down'
    const neighbour = await one<{ id: string; sort_order: number }>(
      direction === 'up'
        ? `SELECT id, sort_order FROM hub.site_blocks
            WHERE page_id = $1 AND sort_order < $2 ORDER BY sort_order DESC LIMIT 1`
        : `SELECT id, sort_order FROM hub.site_blocks
            WHERE page_id = $1 AND sort_order > $2 ORDER BY sort_order LIMIT 1`,
      [block.page_id, block.sort_order]
    )
    if (!neighbour) return NextResponse.json({ ok: true, moved: false })
    await q('UPDATE hub.site_blocks SET sort_order = $2 WHERE id = $1', [block.id, neighbour.sort_order])
    await q('UPDATE hub.site_blocks SET sort_order = $2 WHERE id = $1', [neighbour.id, block.sort_order])
    return NextResponse.json({ ok: true, moved: true })
  }

  if (action === 'delete') {
    await q('DELETE FROM hub.site_blocks WHERE id = $1', [block.id])
    return NextResponse.json({ ok: true })
  }

  return bad('Неизвестное действие')
}

async function handlePost(siteId: string, action: string, body: Record<string, unknown>) {
  if (action === 'create') {
    const postSlug = text(body.slug, 80)?.toLowerCase().replace(/[^a-z0-9-]/g, '-')
    const title = text(body.title, 200)
    if (!postSlug || !title) return bad('Нужны адрес и заголовок статьи')
    const row = await one<{ id: string }>(
      `INSERT INTO hub.site_posts (site_id, slug, title, excerpt, body, cover_url, is_published, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CASE WHEN $7 THEN now() ELSE NULL END)
       ON CONFLICT (site_id, slug) DO UPDATE SET
         title = EXCLUDED.title, excerpt = EXCLUDED.excerpt, body = EXCLUDED.body,
         cover_url = EXCLUDED.cover_url, is_published = EXCLUDED.is_published, updated_at = now()
       RETURNING id`,
      [
        siteId,
        postSlug,
        JSON.stringify({ ru: title }),
        JSON.stringify({ ru: text(body.excerpt, 400) ?? '' }),
        JSON.stringify({ ru: text(body.body, 8000) ?? '' }),
        text(body.cover_url, 500),
        body.is_published !== false,
      ]
    )
    return NextResponse.json({ ok: true, id: row?.id })
  }

  if (!isUuid(body.id)) return bad('Нет статьи')

  if (action === 'update') {
    const sets: string[] = []
    const values: unknown[] = [body.id, siteId]
    const push = (column: string, value: unknown) => {
      values.push(value)
      sets.push(`${column} = $${values.length}`)
    }
    if (text(body.title, 200)) push('title', JSON.stringify({ ru: text(body.title, 200) }))
    if (body.excerpt !== undefined) push('excerpt', JSON.stringify({ ru: text(body.excerpt, 400) ?? '' }))
    if (body.body !== undefined) push('body', JSON.stringify({ ru: text(body.body, 8000) ?? '' }))
    if (body.cover_url !== undefined) push('cover_url', text(body.cover_url, 500))
    if (typeof body.is_published === 'boolean') {
      push('is_published', body.is_published)
      if (body.is_published) sets.push('published_at = COALESCE(published_at, now())')
    }
    if (sets.length === 0) return bad('Нечего менять')
    await q(
      `UPDATE hub.site_posts SET ${sets.join(', ')}, updated_at = now() WHERE id = $1 AND site_id = $2`,
      values
    )
    return NextResponse.json({ ok: true })
  }

  if (action === 'delete') {
    await q('DELETE FROM hub.site_posts WHERE id = $1 AND site_id = $2', [body.id, siteId])
    return NextResponse.json({ ok: true })
  }

  return bad('Неизвестное действие')
}

async function handleManualCard(siteId: string, action: string, body: Record<string, unknown>) {
  if (action === 'create') {
    const title = text(body.title, 200)
    if (!title) return bad('Нужен заголовок карточки')
    const row = await one<{ id: string }>(
      `INSERT INTO hub.site_manual_cards
         (site_id, kind, title, body, images, price_from, currency, city_code, external_url, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        siteId,
        ['place', 'service', 'company'].includes(String(body.kind)) ? String(body.kind) : 'place',
        JSON.stringify({ ru: title }),
        JSON.stringify({ ru: text(body.body, 2000) ?? '' }),
        text(body.image_url, 500) ? [text(body.image_url, 500)] : [],
        body.price_from == null ? null : Number(body.price_from),
        text(body.currency, 8),
        text(body.city_code, 60),
        text(body.external_url, 500),
        Number(body.sort_order ?? 50),
      ]
    )
    return NextResponse.json({ ok: true, id: row?.id })
  }

  if (!isUuid(body.id)) return bad('Нет карточки')

  if (action === 'update') {
    const sets: string[] = []
    const values: unknown[] = [body.id, siteId]
    const push = (column: string, value: unknown) => {
      values.push(value)
      sets.push(`${column} = $${values.length}`)
    }
    if (text(body.title, 200)) push('title', JSON.stringify({ ru: text(body.title, 200) }))
    if (body.body !== undefined) push('body', JSON.stringify({ ru: text(body.body, 2000) ?? '' }))
    if (typeof body.is_active === 'boolean') push('is_active', body.is_active)
    if (typeof body.sort_order === 'number') push('sort_order', Math.trunc(body.sort_order))
    if (['unclaimed', 'requested', 'claimed'].includes(String(body.claim_status))) {
      push('claim_status', String(body.claim_status))
    }
    if (sets.length === 0) return bad('Нечего менять')
    await q(`UPDATE hub.site_manual_cards SET ${sets.join(', ')} WHERE id = $1 AND site_id = $2`, values)
    return NextResponse.json({ ok: true })
  }

  if (action === 'delete') {
    await q('DELETE FROM hub.site_manual_cards WHERE id = $1 AND site_id = $2', [body.id, siteId])
    return NextResponse.json({ ok: true })
  }

  return bad('Неизвестное действие')
}

function defaultPayload(type: SiteBlockType): Record<string, unknown> {
  switch (type) {
    case 'hero':
      return { source: 'site_settings', actions: [] }
    case 'info':
      return { title: { ru: 'Заголовок' }, body: { ru: 'Текст блока' } }
    case 'stats':
      return { items: [{ value: '0', label: { ru: 'показатель' } }] }
    case 'steps':
      return { title: { ru: 'Как это работает' }, items: [{ title: { ru: 'Шаг' }, body: { ru: 'Описание' } }] }
    case 'tenant_cards':
      return { mode: 'approved', title: { ru: 'Компании витрины' }, limit: 12 }
    case 'listing_cards':
      return { mode: 'approved', title: { ru: 'Услуги' }, themes: [], limit: 12 }
    case 'manual_cards':
      return { title: { ru: 'Места рядом' }, limit: 6 }
    case 'team':
      return { title: { ru: 'Команда' }, items: [{ name: 'Имя', role: { ru: 'Роль' }, bio: { ru: '' } }] }
    case 'posts':
      return { title: { ru: 'Журнал' }, limit: 3 }
    case 'gallery':
      return { title: { ru: 'Фото' }, images: [] }
    case 'reviews':
      return { title: { ru: 'Отзывы' }, items: [{ author: 'Гость', rating: 5, body: { ru: '' } }] }
    case 'faq':
      return { title: { ru: 'Частые вопросы' }, items: [{ q: { ru: 'Вопрос' }, a: { ru: 'Ответ' } }] }
    case 'map':
      return { title: { ru: 'На карте' }, source: 'site_settings', pins: 'cards' }
    case 'contacts':
      return { title: { ru: 'Связаться' }, items: [{ kind: 'telegram', value: '@' }] }
    case 'partners':
      return { title: { ru: 'Партнёры' }, items: [{ name: 'Партнёр', logo_url: null }] }
    case 'video':
      return { title: { ru: 'Видео' }, provider: 'youtube', url: '' }
    case 'pricing':
      return { title: { ru: 'Тарифы' }, source: 'site_plans' }
    case 'join':
      return { title: { ru: 'Заявка на размещение' }, require_terms: true, terms: { ru: '' } }
    case 'cta':
      return { title: { ru: 'Призыв' }, body: { ru: '' }, action: { label: { ru: 'Подробнее' }, href: '#' } }
    default:
      return {}
  }
}
