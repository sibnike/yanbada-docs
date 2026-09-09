'use client'

import { useEffect, useState } from 'react'
import { useApi } from '@/components/cabinet/use-api'
import { SITE_BLOCK_TYPES, type SiteBlockType, type SiteManualCard, type SitePage, type SitePost, type SiteRow } from '@/types/site'

const BLOCK_LABEL: Record<SiteBlockType, string> = {
  hero: 'Обложка',
  info: 'Текст',
  stats: 'Цифры',
  steps: 'Как это работает',
  tenant_cards: 'Карточки компаний',
  listing_cards: 'Карточки услуг',
  manual_cards: 'Места от автора',
  team: 'Команда',
  posts: 'Журнал',
  gallery: 'Галерея',
  reviews: 'Отзывы',
  faq: 'Вопросы',
  map: 'Карта',
  contacts: 'Контакты',
  partners: 'Партнёры',
  video: 'Видео',
  pricing: 'Тарифы',
  join: 'Форма заявки',
  cta: 'Призыв',
}

export function BuilderPanel({ slug, pages }: { slug: string; pages: SitePage[] }) {
  const { call, pending, error } = useApi()
  const [pageId, setPageId] = useState(pages[0]?.id ?? '')
  const [blockId, setBlockId] = useState('')
  const [draft, setDraft] = useState('')
  const [newType, setNewType] = useState<SiteBlockType>('info')
  const [newPage, setNewPage] = useState({ slug: '', title: '' })

  const page = pages.find((p) => p.id === pageId) ?? pages[0]
  const block = page?.blocks.find((b) => b.id === blockId) ?? null

  useEffect(() => {
    setDraft(block ? JSON.stringify(block.payload, null, 2) : '')
  }, [block])

  return (
    <section className="cab__panel">
      <h2>Конструктор страниц</h2>
      <p>
        Страница собирается из блоков. Карточки компаний и услуг подтягиваются из размещений, всё
        остальное — контент витрины.
      </p>
      {error ? <p className="cab__error">{error}</p> : null}

      <div className="cab__row" style={{ marginBottom: 14 }}>
        {pages.map((item) => (
          <button
            key={item.id}
            className={`cab__tab ${item.id === page?.id ? 'cab__tab--on' : ''}`}
            onClick={() => {
              setPageId(item.id)
              setBlockId('')
            }}
          >
            {item.title.ru ?? item.slug}
            {item.is_published ? '' : ' · черновик'}
          </button>
        ))}
      </div>

      {page ? (
        <>
          <div className="cab__row" style={{ marginBottom: 14 }}>
            <a className="cab__btn cab__btn--ghost" href={page.slug === 'home' ? `/s/${slug}` : `/s/${slug}/${page.slug}`} target="_blank" rel="noreferrer">
              Открыть страницу
            </a>
            <button
              className="cab__btn cab__btn--ghost"
              disabled={pending}
              onClick={() =>
                call(`/api/admin/sites/${slug}/content`, 'POST', {
                  entity: 'page',
                  action: 'update',
                  id: page.id,
                  is_published: !page.is_published,
                })
              }
            >
              {page.is_published ? 'Снять с публикации' : 'Опубликовать'}
            </button>
            {page.slug !== 'home' ? (
              <button
                className="cab__btn cab__btn--danger"
                disabled={pending}
                onClick={() =>
                  call(`/api/admin/sites/${slug}/content`, 'POST', {
                    entity: 'page',
                    action: 'delete',
                    id: page.id,
                  })
                }
              >
                Удалить страницу
              </button>
            ) : null}
          </div>

          <div className="cab__editor">
            <div className="cab__list">
              {page.blocks.map((item) => (
                <button
                  key={item.id}
                  className={item.id === blockId ? 'cab__list--on' : ''}
                  onClick={() => setBlockId(item.id)}
                >
                  {BLOCK_LABEL[item.type]}
                  <div className="cab__muted">{item.type}</div>
                </button>
              ))}
              <div className="cab__inline" style={{ marginTop: 8 }}>
                <select value={newType} onChange={(e) => setNewType(e.target.value as SiteBlockType)}>
                  {SITE_BLOCK_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {BLOCK_LABEL[type]}
                    </option>
                  ))}
                </select>
                <button
                  className="cab__btn"
                  disabled={pending}
                  onClick={() =>
                    call(`/api/admin/sites/${slug}/content`, 'POST', {
                      entity: 'block',
                      action: 'create',
                      page_id: page.id,
                      type: newType,
                    })
                  }
                >
                  Добавить блок
                </button>
              </div>
            </div>

            <div>
              {block ? (
                <>
                  <div className="cab__row" style={{ marginBottom: 8 }}>
                    <strong>{BLOCK_LABEL[block.type]}</strong>
                    <button
                      className="cab__btn cab__btn--ghost"
                      disabled={pending}
                      onClick={() =>
                        call(`/api/admin/sites/${slug}/content`, 'POST', {
                          entity: 'block',
                          action: 'move',
                          id: block.id,
                          direction: 'up',
                        })
                      }
                    >
                      Выше
                    </button>
                    <button
                      className="cab__btn cab__btn--ghost"
                      disabled={pending}
                      onClick={() =>
                        call(`/api/admin/sites/${slug}/content`, 'POST', {
                          entity: 'block',
                          action: 'move',
                          id: block.id,
                          direction: 'down',
                        })
                      }
                    >
                      Ниже
                    </button>
                    <button
                      className="cab__btn cab__btn--danger"
                      disabled={pending}
                      onClick={() => {
                        void call(`/api/admin/sites/${slug}/content`, 'POST', {
                          entity: 'block',
                          action: 'delete',
                          id: block.id,
                        })
                        setBlockId('')
                      }}
                    >
                      Удалить блок
                    </button>
                  </div>
                  <textarea className="cab__json" value={draft} onChange={(e) => setDraft(e.target.value)} />
                  <div className="cab__row" style={{ marginTop: 8 }}>
                    <button
                      className="cab__btn"
                      disabled={pending}
                      onClick={() => {
                        let payload: unknown
                        try {
                          payload = JSON.parse(draft)
                        } catch {
                          alert('Это не похоже на JSON — проверьте кавычки и запятые')
                          return
                        }
                        void call(`/api/admin/sites/${slug}/content`, 'POST', {
                          entity: 'block',
                          action: 'update',
                          id: block.id,
                          payload,
                        })
                      }}
                    >
                      Сохранить блок
                    </button>
                  </div>
                </>
              ) : (
                <p className="cab__muted">Выберите блок слева или добавьте новый.</p>
              )}
            </div>
          </div>
        </>
      ) : null}

      <h2 style={{ marginTop: 24 }}>Новая страница</h2>
      <div className="cab__row">
        <input
          placeholder="адрес, например tours"
          value={newPage.slug}
          onChange={(e) => setNewPage({ ...newPage, slug: e.target.value })}
        />
        <input
          placeholder="Заголовок"
          value={newPage.title}
          onChange={(e) => setNewPage({ ...newPage, title: e.target.value })}
        />
        <button
          className="cab__btn"
          disabled={pending || !newPage.slug || !newPage.title}
          onClick={() =>
            call(`/api/admin/sites/${slug}/content`, 'POST', {
              entity: 'page',
              action: 'create',
              ...newPage,
            })
          }
        >
          Создать
        </button>
      </div>
    </section>
  )
}

export function DesignPanel({ slug, site }: { slug: string; site: SiteRow }) {
  const { call, pending, error } = useApi()
  const [form, setForm] = useState({
    display_name: site.settings.display_name?.ru ?? '',
    accent_color: site.settings.accent_color ?? '#1c7c6b',
    hero_title: site.settings.hero_title?.ru ?? '',
    hero_subtitle: site.settings.hero_subtitle?.ru ?? '',
    hero_image_url: site.settings.hero_image_url ?? '',
    footer_text: site.settings.footer_text?.ru ?? '',
    assistant_name: site.settings.assistant?.name?.ru ?? '',
    assistant_greeting: site.settings.assistant?.greeting?.ru ?? '',
    assistant_enabled: site.settings.assistant?.enabled !== false,
  })

  return (
    <section className="cab__panel">
      <h2>Оформление и правила витрины</h2>
      <p>Владелец задаёт вид и то, как карточки попадают на страницу.</p>
      {error ? <p className="cab__error">{error}</p> : null}

      <div className="cab__form">
        <div className="cab__row">
          <label style={{ flex: 1 }}>
            Название витрины
            <input
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
            />
          </label>
          <label>
            Акцентный цвет
            <input
              type="color"
              value={form.accent_color}
              onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
            />
          </label>
        </div>
        <label>
          Заголовок обложки
          <input value={form.hero_title} onChange={(e) => setForm({ ...form, hero_title: e.target.value })} />
        </label>
        <label>
          Подзаголовок обложки
          <input
            value={form.hero_subtitle}
            onChange={(e) => setForm({ ...form, hero_subtitle: e.target.value })}
          />
        </label>
        <label>
          Картинка обложки (URL)
          <input
            value={form.hero_image_url}
            onChange={(e) => setForm({ ...form, hero_image_url: e.target.value })}
          />
        </label>
        <label>
          Подпись в подвале
          <input
            value={form.footer_text}
            onChange={(e) => setForm({ ...form, footer_text: e.target.value })}
          />
        </label>
        <div className="cab__row">
          <label style={{ flex: 1 }}>
            Имя ассистента
            <input
              value={form.assistant_name}
              onChange={(e) => setForm({ ...form, assistant_name: e.target.value })}
            />
          </label>
          <label style={{ flex: 2 }}>
            Приветствие ассистента
            <input
              value={form.assistant_greeting}
              onChange={(e) => setForm({ ...form, assistant_greeting: e.target.value })}
            />
          </label>
        </div>
        <button
          className="cab__btn"
          disabled={pending}
          onClick={() =>
            call(`/api/admin/sites/${slug}`, 'PATCH', {
              settings: {
                display_name: { ru: form.display_name },
                accent_color: form.accent_color,
                hero_title: { ru: form.hero_title },
                hero_subtitle: { ru: form.hero_subtitle },
                hero_image_url: form.hero_image_url,
                footer_text: { ru: form.footer_text },
                assistant: {
                  enabled: form.assistant_enabled,
                  name: { ru: form.assistant_name },
                  greeting: { ru: form.assistant_greeting },
                },
              },
            })
          }
        >
          Сохранить оформление
        </button>
      </div>

      <h2 style={{ marginTop: 24 }}>Правила размещения</h2>
      <div className="cab__form">
        <label>
          Как карточки попадают в витрину
          <select
            value={site.placement_mode}
            onChange={(e) => call(`/api/admin/sites/${slug}`, 'PATCH', { placement_mode: e.target.value })}
          >
            <option value="approved">только одобренные (платный маркет)</option>
            <option value="mixed">одобренные сверху, остальные по гео и темам</option>
            <option value="scope">автоматически по гео и темам</option>
          </select>
        </label>
        <div className="cab__row">
          <label>
            Приём заявок
            <select
              value={site.accepts_requests ? 'on' : 'off'}
              onChange={(e) =>
                call(`/api/admin/sites/${slug}`, 'PATCH', { accepts_requests: e.target.value === 'on' })
              }
            >
              <option value="on">открыт</option>
              <option value="off">закрыт</option>
            </select>
          </label>
          <label>
            Карточек на компанию
            <input
              type="number"
              defaultValue={site.max_cards_per_tenant ?? 0}
              onBlur={(e) =>
                call(`/api/admin/sites/${slug}`, 'PATCH', {
                  max_cards_per_tenant: Number(e.target.value) || null,
                })
              }
            />
          </label>
          <label>
            Доля платформы, %
            <input
              type="number"
              defaultValue={site.platform_fee_percent}
              onBlur={(e) =>
                call(`/api/admin/sites/${slug}`, 'PATCH', {
                  platform_fee_percent: Number(e.target.value),
                })
              }
            />
          </label>
        </div>
      </div>
    </section>
  )
}

export function ContentPanel({
  slug,
  posts,
  manualCards,
}: {
  slug: string
  posts: SitePost[]
  manualCards: SiteManualCard[]
}) {
  const { call, pending, error } = useApi()
  const [post, setPost] = useState({ slug: '', title: '', excerpt: '', body: '', cover_url: '' })
  const [card, setCard] = useState({ title: '', body: '', image_url: '', kind: 'place' })

  return (
    <>
      <section className="cab__panel">
        <h2>Журнал</h2>
        <p>Статьи автора витрины. Ассистент опирается на них так же, как на карточки.</p>
        {error ? <p className="cab__error">{error}</p> : null}

        <table className="cab__table">
          <tbody>
            {posts.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.title.ru ?? item.slug}</strong>
                  <div className="cab__muted">{item.excerpt.ru ?? ''}</div>
                </td>
                <td>
                  <span className={`cab__badge ${item.published_at ? 'cab__badge--live' : ''}`}>
                    {item.published_at ? 'опубликована' : 'черновик'}
                  </span>
                </td>
                <td>
                  <div className="cab__row">
                    <a className="cab__btn cab__btn--ghost" href={`/s/${slug}/journal/${item.slug}`} target="_blank" rel="noreferrer">
                      Открыть
                    </a>
                    <button
                      className="cab__btn cab__btn--danger"
                      disabled={pending}
                      onClick={() =>
                        call(`/api/admin/sites/${slug}/content`, 'POST', {
                          entity: 'post',
                          action: 'delete',
                          id: item.id,
                        })
                      }
                    >
                      Удалить
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 style={{ marginTop: 20 }}>Новая статья</h2>
        <div className="cab__form">
          <div className="cab__row">
            <input
              placeholder="адрес, например ala-kol"
              value={post.slug}
              onChange={(e) => setPost({ ...post, slug: e.target.value })}
            />
            <input
              placeholder="Заголовок"
              style={{ flex: 1 }}
              value={post.title}
              onChange={(e) => setPost({ ...post, title: e.target.value })}
            />
          </div>
          <input
            placeholder="Короткое описание"
            value={post.excerpt}
            onChange={(e) => setPost({ ...post, excerpt: e.target.value })}
          />
          <textarea
            rows={4}
            placeholder="Текст"
            value={post.body}
            onChange={(e) => setPost({ ...post, body: e.target.value })}
          />
          <input
            placeholder="Обложка (URL)"
            value={post.cover_url}
            onChange={(e) => setPost({ ...post, cover_url: e.target.value })}
          />
          <button
            className="cab__btn"
            disabled={pending || !post.slug || !post.title}
            onClick={() =>
              call(`/api/admin/sites/${slug}/content`, 'POST', {
                entity: 'post',
                action: 'create',
                ...post,
              })
            }
          >
            Опубликовать
          </button>
        </div>
      </section>

      <section className="cab__panel">
        <h2>Места от автора</h2>
        <p>
          Объекты без аккаунта в Vitrina: озеро, ущелье, кафе. Если владелец объекта попросит забрать
          карточку — это будущий тенант.
        </p>
        <table className="cab__table">
          <tbody>
            {manualCards.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.title.ru ?? ''}</strong>
                  <div className="cab__muted">{item.body.ru ?? ''}</div>
                </td>
                <td>
                  <span
                    className={`cab__badge ${item.claim_status === 'requested' ? 'cab__badge--warn' : ''}`}
                  >
                    {item.claim_status === 'requested'
                      ? 'просят забрать'
                      : item.claim_status === 'claimed'
                        ? 'передана владельцу'
                        : 'карточка автора'}
                  </span>
                </td>
                <td>
                  <div className="cab__row">
                    {item.claim_status === 'requested' ? (
                      <button
                        className="cab__btn"
                        disabled={pending}
                        onClick={() =>
                          call(`/api/admin/sites/${slug}/content`, 'POST', {
                            entity: 'manual_card',
                            action: 'update',
                            id: item.id,
                            claim_status: 'claimed',
                          })
                        }
                      >
                        Передать владельцу
                      </button>
                    ) : null}
                    <button
                      className="cab__btn cab__btn--danger"
                      disabled={pending}
                      onClick={() =>
                        call(`/api/admin/sites/${slug}/content`, 'POST', {
                          entity: 'manual_card',
                          action: 'delete',
                          id: item.id,
                        })
                      }
                    >
                      Удалить
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 style={{ marginTop: 20 }}>Новое место</h2>
        <div className="cab__form">
          <div className="cab__row">
            <input
              placeholder="Название"
              style={{ flex: 1 }}
              value={card.title}
              onChange={(e) => setCard({ ...card, title: e.target.value })}
            />
            <select value={card.kind} onChange={(e) => setCard({ ...card, kind: e.target.value })}>
              <option value="place">место</option>
              <option value="service">услуга</option>
              <option value="company">компания</option>
            </select>
          </div>
          <textarea
            rows={3}
            placeholder="Описание"
            value={card.body}
            onChange={(e) => setCard({ ...card, body: e.target.value })}
          />
          <input
            placeholder="Картинка (URL)"
            value={card.image_url}
            onChange={(e) => setCard({ ...card, image_url: e.target.value })}
          />
          <button
            className="cab__btn"
            disabled={pending || !card.title}
            onClick={() =>
              call(`/api/admin/sites/${slug}/content`, 'POST', {
                entity: 'manual_card',
                action: 'create',
                ...card,
              })
            }
          >
            Добавить место
          </button>
        </div>
      </section>
    </>
  )
}
