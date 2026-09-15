import { NextResponse } from 'next/server'
import { bad, isUuid, ownerContext, readJson, text } from '@/lib/api'
import {
  deleteBlock,
  deleteBlocksForPage,
  deleteManualCard,
  deletePage,
  deletePost,
  findHomePageId,
  getBlock,
  insertBlock,
  insertManualCard,
  insertPage,
  insertPost,
  neighbourBlock,
  nextBlockSort,
  pageBelongsToSite,
  updateBlock,
  updateManualCard,
  updatePage,
  updatePost,
  updateSiteRow,
} from '@/lib/sites/write'
import { templateBlocks } from '@/lib/sites/templates'
import { SITE_BLOCK_TYPES, type SiteBlockType, type SiteTemplate } from '@/types/site'

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

  try {
    if (entity === 'page') return await handlePage(siteId, action, body)
    if (entity === 'block') return await handleBlock(siteId, action, body)
    if (entity === 'post') return await handlePost(siteId, action, body)
    if (entity === 'manual_card') return await handleManualCard(siteId, action, body)
    if (entity === 'template') return await handleTemplate(siteId, action, body)
    return bad('Неизвестный объект')
  } catch (error) {
    return bad(error instanceof Error ? error.message : 'Не удалось сохранить', 500)
  }
}

async function handlePage(siteId: string, action: string, body: Record<string, unknown>) {
  if (action === 'create') {
    const pageSlug = text(body.slug, 60)?.toLowerCase().replace(/[^a-z0-9-]/g, '-')
    const title = text(body.title, 120)
    if (!pageSlug || !title) return bad('Нужны адрес и заголовок страницы')
    const row = await insertPage({
      site_id: siteId,
      slug: pageSlug,
      kind: ['home', 'page', 'blog'].includes(String(body.kind)) ? String(body.kind) : 'page',
      title: { ru: title },
      sort_order: Number(body.sort_order ?? 50),
      is_published: body.is_published !== false,
    })
    return NextResponse.json({ ok: true, id: row?.id })
  }

  if (!isUuid(body.id)) return bad('Нет страницы')

  if (action === 'update') {
    const patch: Record<string, unknown> = {}
    if (text(body.title, 120)) patch.title = { ru: text(body.title, 120) }
    if (typeof body.is_published === 'boolean') patch.is_published = body.is_published
    if (typeof body.sort_order === 'number') patch.sort_order = Math.trunc(body.sort_order)
    if (Object.keys(patch).length === 0) return bad('Нечего менять')
    await updatePage(String(body.id), siteId, patch)
    return NextResponse.json({ ok: true })
  }

  if (action === 'delete') {
    await deletePage(String(body.id), siteId)
    return NextResponse.json({ ok: true })
  }

  return bad('Неизвестное действие')
}

async function handleBlock(siteId: string, action: string, body: Record<string, unknown>) {
  if (action === 'create') {
    if (!isUuid(body.page_id)) return bad('Нет страницы')
    const type = String(body.type) as SiteBlockType
    if (!SITE_BLOCK_TYPES.includes(type)) return bad('Неизвестный тип блока')
    if (!(await pageBelongsToSite(String(body.page_id), siteId))) return bad('Страница не найдена', 404)
    const row = await insertBlock({
      page_id: String(body.page_id),
      type,
      payload: defaultPayload(type),
      sort_order: await nextBlockSort(String(body.page_id)),
    })
    return NextResponse.json({ ok: true, id: row?.id })
  }

  if (!isUuid(body.id)) return bad('Нет блока')
  const block = await getBlock(String(body.id), siteId)
  if (!block) return bad('Блок не найден', 404)

  if (action === 'update') {
    const patch: Record<string, unknown> = {}
    if (body.payload && typeof body.payload === 'object') patch.payload = body.payload
    if (typeof body.is_active === 'boolean') patch.is_active = body.is_active
    if (typeof body.sort_order === 'number') patch.sort_order = Math.trunc(body.sort_order)
    if (Object.keys(patch).length === 0) return bad('Нечего менять')
    await updateBlock(block.id, patch)
    return NextResponse.json({ ok: true })
  }

  if (action === 'move') {
    const direction = body.direction === 'up' ? 'up' : 'down'
    const neighbour = await neighbourBlock(block.page_id, block.sort_order, direction)
    if (!neighbour) return NextResponse.json({ ok: true, moved: false })
    await updateBlock(block.id, { sort_order: neighbour.sort_order })
    await updateBlock(neighbour.id, { sort_order: block.sort_order })
    return NextResponse.json({ ok: true, moved: true })
  }

  if (action === 'delete') {
    await deleteBlock(block.id)
    return NextResponse.json({ ok: true })
  }

  return bad('Неизвестное действие')
}

async function handlePost(siteId: string, action: string, body: Record<string, unknown>) {
  if (action === 'create') {
    const postSlug = text(body.slug, 80)?.toLowerCase().replace(/[^a-z0-9-]/g, '-')
    const title = text(body.title, 200)
    if (!postSlug || !title) return bad('Нужны адрес и заголовок статьи')
    const row = await insertPost({
      site_id: siteId,
      slug: postSlug,
      title: { ru: title },
      excerpt: { ru: text(body.excerpt, 400) ?? '' },
      body: { ru: text(body.body, 8000) ?? '' },
      cover_url: text(body.cover_url, 500),
      is_published: body.is_published !== false,
    })
    return NextResponse.json({ ok: true, id: row?.id })
  }

  if (!isUuid(body.id)) return bad('Нет статьи')

  if (action === 'update') {
    const patch: Record<string, unknown> = {}
    if (text(body.title, 200)) patch.title = { ru: text(body.title, 200) }
    if (body.excerpt !== undefined) patch.excerpt = { ru: text(body.excerpt, 400) ?? '' }
    if (body.body !== undefined) patch.body = { ru: text(body.body, 8000) ?? '' }
    if (body.cover_url !== undefined) patch.cover_url = text(body.cover_url, 500)
    if (typeof body.is_published === 'boolean') {
      patch.is_published = body.is_published
      if (body.is_published) patch.published_at = new Date().toISOString()
    }
    if (Object.keys(patch).length === 0) return bad('Нечего менять')
    await updatePost(String(body.id), siteId, patch)
    return NextResponse.json({ ok: true })
  }

  if (action === 'delete') {
    await deletePost(String(body.id), siteId)
    return NextResponse.json({ ok: true })
  }

  return bad('Неизвестное действие')
}

async function handleManualCard(siteId: string, action: string, body: Record<string, unknown>) {
  if (action === 'create') {
    const title = text(body.title, 200)
    if (!title) return bad('Нужен заголовок карточки')
    const row = await insertManualCard({
      site_id: siteId,
      kind: ['place', 'service', 'company'].includes(String(body.kind)) ? String(body.kind) : 'place',
      title: { ru: title },
      body: { ru: text(body.body, 2000) ?? '' },
      images: text(body.image_url, 500) ? [text(body.image_url, 500) as string] : [],
      price_from: body.price_from == null ? null : Number(body.price_from),
      currency: text(body.currency, 8),
      city_code: text(body.city_code, 60),
      external_url: text(body.external_url, 500),
      sort_order: Number(body.sort_order ?? 50),
    })
    return NextResponse.json({ ok: true, id: row?.id })
  }

  if (!isUuid(body.id)) return bad('Нет карточки')

  if (action === 'update') {
    const patch: Record<string, unknown> = {}
    if (text(body.title, 200)) patch.title = { ru: text(body.title, 200) }
    if (body.body !== undefined) patch.body = { ru: text(body.body, 2000) ?? '' }
    if (typeof body.is_active === 'boolean') patch.is_active = body.is_active
    if (typeof body.sort_order === 'number') patch.sort_order = Math.trunc(body.sort_order)
    if (['unclaimed', 'requested', 'claimed'].includes(String(body.claim_status))) {
      patch.claim_status = String(body.claim_status)
    }
    if (Object.keys(patch).length === 0) return bad('Нечего менять')
    await updateManualCard(String(body.id), siteId, patch)
    return NextResponse.json({ ok: true })
  }

  if (action === 'delete') {
    await deleteManualCard(String(body.id), siteId)
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
    case 'tour_picker':
      return { title: { ru: 'Подобрать тур' }, layout: 'split', limit: 24, anchor: 'tours' }
    case 'route_map':
      return { title: { ru: 'Маршрут' }, mode: 'all', anchor: 'route' }
    default:
      return {}
  }
}

async function handleTemplate(siteId: string, action: string, body: Record<string, unknown>) {
  if (action !== 'apply') return bad('Неизвестное действие')
  const template = String(body.template) as SiteTemplate
  if (!['visit_center', 'tour_operator', 'guide'].includes(template)) return bad('Неизвестный шаблон')
  const homeId = await findHomePageId(siteId)
  if (!homeId) return bad('Нет главной страницы', 404)
  await updateSiteRow(siteId, { template })
  await deleteBlocksForPage(homeId)
  for (const block of templateBlocks(template)) {
    await insertBlock({ page_id: homeId, type: block.type, payload: block.payload, sort_order: block.sort_order })
  }
  return NextResponse.json({ ok: true, template })
}
