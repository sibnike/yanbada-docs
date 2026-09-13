'use client'

import type { ReactNode } from 'react'
import type { SiteBlock, SiteBlockType } from '@/types/site'

type Payload = Record<string, unknown>
type Item = Record<string, unknown>

function ru(value: unknown): string {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') {
    const map = value as Record<string, unknown>
    if (typeof map.ru === 'string') return map.ru
    const first = Object.values(map).find((item) => typeof item === 'string')
    return typeof first === 'string' ? first : ''
  }
  return ''
}

function setRu(existing: unknown, next: string): Record<string, string> {
  const base = existing && typeof existing === 'object' ? { ...(existing as Record<string, string>) } : {}
  return { ...base, ru: next }
}

function list(value: unknown): Item[] {
  return Array.isArray(value) ? (value as Item[]) : []
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="cab__field">
      <span>
        {label}
        {hint ? <em>{hint}</em> : null}
      </span>
      {children}
    </label>
  )
}

export function BlockEditor({
  block,
  onChange,
}: {
  block: SiteBlock
  onChange: (payload: Payload) => void
}) {
  const payload = block.payload

  const set = (next: Payload) => onChange({ ...payload, ...next })

  const updateItem = (index: number, patch: Item) => {
    const items = list(payload.items).map((item, i) => (i === index ? { ...item, ...patch } : item))
    set({ items })
  }

  const addItem = (item: Item) => set({ items: [...list(payload.items), item] })
  const removeItem = (index: number) => set({ items: list(payload.items).filter((_, i) => i !== index) })

  return (
    <div className="cab__fields">
      {editorFor(block.type, payload, { set, updateItem, addItem, removeItem })}
    </div>
  )
}

function editorFor(
  type: SiteBlockType,
  payload: Payload,
  ops: {
    set: (next: Payload) => void
    updateItem: (index: number, patch: Item) => void
    addItem: (item: Item) => void
    removeItem: (index: number) => void
  }
) {
  const { set, updateItem, addItem, removeItem } = ops

  switch (type) {
    case 'hero':
      return (
        <>
          <p className="cab__muted">Заголовок, подзаголовок и фото — во вкладке «Оформление». Здесь кнопки на обложке.</p>
          {list(payload.actions).map((action, i) => (
            <div key={i} className="cab__item">
              <div className="cab__item-head">
                <strong>Кнопка {i + 1}</strong>
                <button type="button" className="cab__btn cab__btn--ghost" onClick={() => {
                  const actions = list(payload.actions).filter((_, idx) => idx !== i)
                  set({ actions })
                }}>
                  Убрать
                </button>
              </div>
              <Field label="Текст">
                <input
                  value={ru(action.label)}
                  onChange={(e) => {
                    const actions = list(payload.actions).map((item, idx) =>
                      idx === i ? { ...item, label: setRu(item.label, e.target.value) } : item
                    )
                    set({ actions })
                  }}
                />
              </Field>
              <Field label="Ссылка" hint="#listings или /s/visit-karakol/join">
                <input
                  value={String(action.href ?? '')}
                  onChange={(e) => {
                    const actions = list(payload.actions).map((item, idx) =>
                      idx === i ? { ...item, href: e.target.value } : item
                    )
                    set({ actions })
                  }}
                />
              </Field>
            </div>
          ))}
          <button
            type="button"
            className="cab__btn cab__btn--ghost"
            onClick={() => set({ actions: [...list(payload.actions), { label: { ru: 'Смотреть' }, href: '#' }] })}
          >
            Добавить кнопку
          </button>
        </>
      )

    case 'info':
    case 'join':
    case 'cta':
    case 'pricing':
      return (
        <>
          <Field label="Заголовок">
            <input value={ru(payload.title)} onChange={(e) => set({ title: setRu(payload.title, e.target.value) })} />
          </Field>
          <Field label={type === 'pricing' ? 'Пояснение' : 'Текст'}>
            <textarea
              rows={5}
              value={ru(type === 'pricing' ? payload.note : payload.body)}
              onChange={(e) =>
                type === 'pricing'
                  ? set({ note: setRu(payload.note, e.target.value) })
                  : set({ body: setRu(payload.body, e.target.value) })
              }
            />
          </Field>
          {type === 'join' ? (
            <>
              <Field label="Условия заявки">
                <textarea rows={3} value={ru(payload.terms)} onChange={(e) => set({ terms: setRu(payload.terms, e.target.value) })} />
              </Field>
              <label className="cab__check">
                <input
                  type="checkbox"
                  checked={payload.require_terms === true}
                  onChange={(e) => set({ require_terms: e.target.checked })}
                />
                Нужно согласие с условиями
              </label>
            </>
          ) : null}
          {type === 'cta' ? (
            <>
              <Field label="Текст кнопки">
                <input
                  value={ru((payload.action as Item | undefined)?.label)}
                  onChange={(e) =>
                    set({
                      action: {
                        ...((payload.action as Item) ?? {}),
                        label: setRu((payload.action as Item | undefined)?.label, e.target.value),
                      },
                    })
                  }
                />
              </Field>
              <Field label="Ссылка кнопки">
                <input
                  value={String((payload.action as Item | undefined)?.href ?? '')}
                  onChange={(e) =>
                    set({
                      action: { ...((payload.action as Item) ?? {}), href: e.target.value },
                    })
                  }
                />
              </Field>
            </>
          ) : null}
        </>
      )

    case 'listing_cards':
    case 'tenant_cards':
    case 'manual_cards':
    case 'posts':
    case 'map':
      return (
        <>
          <Field label="Заголовок">
            <input value={ru(payload.title)} onChange={(e) => set({ title: setRu(payload.title, e.target.value) })} />
          </Field>
          {type === 'manual_cards' ? (
            <Field label="Подпись сверху">
              <input value={ru(payload.note)} onChange={(e) => set({ note: setRu(payload.note, e.target.value) })} />
            </Field>
          ) : null}
          {type === 'listing_cards' ? (
            <Field label="Темы" hint="через запятую: tourism, guides, accommodation">
              <input
                value={Array.isArray(payload.themes) ? (payload.themes as string[]).join(', ') : ''}
                onChange={(e) =>
                  set({
                    themes: e.target.value
                      .split(',')
                      .map((item) => item.trim())
                      .filter(Boolean),
                  })
                }
              />
            </Field>
          ) : null}
          {type !== 'map' ? (
            <Field label="Сколько карточек показать">
              <input
                type="number"
                min={1}
                max={48}
                value={Number(payload.limit ?? 12)}
                onChange={(e) => set({ limit: Number(e.target.value) || 12 })}
              />
            </Field>
          ) : (
            <p className="cab__muted">Точки берутся из карточек. Центр карты — во вкладке «Оформление».</p>
          )}
          {type === 'listing_cards' || type === 'tenant_cards' ? (
            <Field label="Якорь" hint="для ссылки с обложки, например listings">
              <input
                value={String(payload.anchor ?? '')}
                onChange={(e) => set({ anchor: e.target.value })}
              />
            </Field>
          ) : null}
        </>
      )

    case 'stats':
      return (
        <>
          {list(payload.items).map((item, i) => (
            <div key={i} className="cab__item">
              <div className="cab__item-head">
                <strong>Цифра {i + 1}</strong>
                <button type="button" className="cab__btn cab__btn--ghost" onClick={() => removeItem(i)}>
                  Убрать
                </button>
              </div>
              <Field label="Значение">
                <input value={String(item.value ?? '')} onChange={(e) => updateItem(i, { value: e.target.value })} />
              </Field>
              <Field label="Подпись">
                <input value={ru(item.label)} onChange={(e) => updateItem(i, { label: setRu(item.label, e.target.value) })} />
              </Field>
            </div>
          ))}
          <button type="button" className="cab__btn cab__btn--ghost" onClick={() => addItem({ value: '0', label: { ru: '' } })}>
            Добавить цифру
          </button>
        </>
      )

    case 'steps':
      return (
        <>
          <Field label="Заголовок">
            <input value={ru(payload.title)} onChange={(e) => set({ title: setRu(payload.title, e.target.value) })} />
          </Field>
          {list(payload.items).map((item, i) => (
            <div key={i} className="cab__item">
              <div className="cab__item-head">
                <strong>Шаг {i + 1}</strong>
                <button type="button" className="cab__btn cab__btn--ghost" onClick={() => removeItem(i)}>
                  Убрать
                </button>
              </div>
              <Field label="Название">
                <input value={ru(item.title)} onChange={(e) => updateItem(i, { title: setRu(item.title, e.target.value) })} />
              </Field>
              <Field label="Текст">
                <textarea rows={2} value={ru(item.body)} onChange={(e) => updateItem(i, { body: setRu(item.body, e.target.value) })} />
              </Field>
            </div>
          ))}
          <button type="button" className="cab__btn cab__btn--ghost" onClick={() => addItem({ title: { ru: 'Шаг' }, body: { ru: '' } })}>
            Добавить шаг
          </button>
        </>
      )

    case 'faq':
      return (
        <>
          <Field label="Заголовок">
            <input value={ru(payload.title)} onChange={(e) => set({ title: setRu(payload.title, e.target.value) })} />
          </Field>
          {list(payload.items).map((item, i) => (
            <div key={i} className="cab__item">
              <div className="cab__item-head">
                <strong>Вопрос {i + 1}</strong>
                <button type="button" className="cab__btn cab__btn--ghost" onClick={() => removeItem(i)}>
                  Убрать
                </button>
              </div>
              <Field label="Вопрос">
                <input value={ru(item.q)} onChange={(e) => updateItem(i, { q: setRu(item.q, e.target.value) })} />
              </Field>
              <Field label="Ответ">
                <textarea rows={3} value={ru(item.a)} onChange={(e) => updateItem(i, { a: setRu(item.a, e.target.value) })} />
              </Field>
            </div>
          ))}
          <button type="button" className="cab__btn cab__btn--ghost" onClick={() => addItem({ q: { ru: '' }, a: { ru: '' } })}>
            Добавить вопрос
          </button>
        </>
      )

    case 'reviews':
      return (
        <>
          <Field label="Заголовок">
            <input value={ru(payload.title)} onChange={(e) => set({ title: setRu(payload.title, e.target.value) })} />
          </Field>
          {list(payload.items).map((item, i) => (
            <div key={i} className="cab__item">
              <div className="cab__item-head">
                <strong>Отзыв {i + 1}</strong>
                <button type="button" className="cab__btn cab__btn--ghost" onClick={() => removeItem(i)}>
                  Убрать
                </button>
              </div>
              <Field label="Автор">
                <input value={String(item.author ?? '')} onChange={(e) => updateItem(i, { author: e.target.value })} />
              </Field>
              <Field label="Оценка">
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={Number(item.rating ?? 5)}
                  onChange={(e) => updateItem(i, { rating: Number(e.target.value) || 5 })}
                />
              </Field>
              <Field label="Текст">
                <textarea rows={3} value={ru(item.body)} onChange={(e) => updateItem(i, { body: setRu(item.body, e.target.value) })} />
              </Field>
            </div>
          ))}
          <button type="button" className="cab__btn cab__btn--ghost" onClick={() => addItem({ author: '', rating: 5, body: { ru: '' } })}>
            Добавить отзыв
          </button>
        </>
      )

    case 'team':
      return (
        <>
          <Field label="Заголовок">
            <input value={ru(payload.title)} onChange={(e) => set({ title: setRu(payload.title, e.target.value) })} />
          </Field>
          {list(payload.items).map((item, i) => (
            <div key={i} className="cab__item">
              <div className="cab__item-head">
                <strong>{String(item.name || `Человек ${i + 1}`)}</strong>
                <button type="button" className="cab__btn cab__btn--ghost" onClick={() => removeItem(i)}>
                  Убрать
                </button>
              </div>
              <Field label="Имя">
                <input value={String(item.name ?? '')} onChange={(e) => updateItem(i, { name: e.target.value })} />
              </Field>
              <Field label="Роль">
                <input value={ru(item.role)} onChange={(e) => updateItem(i, { role: setRu(item.role, e.target.value) })} />
              </Field>
              <Field label="О себе">
                <textarea rows={2} value={ru(item.bio)} onChange={(e) => updateItem(i, { bio: setRu(item.bio, e.target.value) })} />
              </Field>
              <Field label="Фото (URL)">
                <input value={String(item.photo_url ?? '')} onChange={(e) => updateItem(i, { photo_url: e.target.value })} />
              </Field>
            </div>
          ))}
          <button
            type="button"
            className="cab__btn cab__btn--ghost"
            onClick={() => addItem({ name: '', role: { ru: '' }, bio: { ru: '' }, photo_url: '' })}
          >
            Добавить человека
          </button>
        </>
      )

    case 'contacts':
      return (
        <>
          <Field label="Заголовок">
            <input value={ru(payload.title)} onChange={(e) => set({ title: setRu(payload.title, e.target.value) })} />
          </Field>
          {list(payload.items).map((item, i) => (
            <div key={i} className="cab__item">
              <div className="cab__item-head">
                <strong>{String(item.kind || `Контакт ${i + 1}`)}</strong>
                <button type="button" className="cab__btn cab__btn--ghost" onClick={() => removeItem(i)}>
                  Убрать
                </button>
              </div>
              <Field label="Тип">
                <input value={String(item.kind ?? '')} onChange={(e) => updateItem(i, { kind: e.target.value })} />
              </Field>
              <Field label="Значение">
                <input
                  value={typeof item.value === 'string' ? item.value : ru(item.value)}
                  onChange={(e) => updateItem(i, { value: e.target.value })}
                />
              </Field>
            </div>
          ))}
          <button type="button" className="cab__btn cab__btn--ghost" onClick={() => addItem({ kind: 'telegram', value: '@' })}>
            Добавить контакт
          </button>
        </>
      )

    case 'partners':
      return (
        <>
          <Field label="Заголовок">
            <input value={ru(payload.title)} onChange={(e) => set({ title: setRu(payload.title, e.target.value) })} />
          </Field>
          {list(payload.items).map((item, i) => (
            <div key={i} className="cab__item">
              <div className="cab__item-head">
                <strong>{String(item.name || `Партнёр ${i + 1}`)}</strong>
                <button type="button" className="cab__btn cab__btn--ghost" onClick={() => removeItem(i)}>
                  Убрать
                </button>
              </div>
              <Field label="Название">
                <input value={String(item.name ?? '')} onChange={(e) => updateItem(i, { name: e.target.value })} />
              </Field>
              <Field label="Логотип (URL)">
                <input value={String(item.logo_url ?? '')} onChange={(e) => updateItem(i, { logo_url: e.target.value || null })} />
              </Field>
            </div>
          ))}
          <button type="button" className="cab__btn cab__btn--ghost" onClick={() => addItem({ name: '', logo_url: null })}>
            Добавить партнёра
          </button>
        </>
      )

    case 'gallery':
      return (
        <>
          <Field label="Заголовок">
            <input value={ru(payload.title)} onChange={(e) => set({ title: setRu(payload.title, e.target.value) })} />
          </Field>
          <Field label="Фото" hint="по одному URL на строку">
            <textarea
              rows={6}
              value={(Array.isArray(payload.images) ? (payload.images as string[]) : []).join('\n')}
              onChange={(e) =>
                set({
                  images: e.target.value
                    .split('\n')
                    .map((line) => line.trim())
                    .filter(Boolean),
                })
              }
            />
          </Field>
        </>
      )

    case 'video':
      return (
        <>
          <Field label="Заголовок">
            <input value={ru(payload.title)} onChange={(e) => set({ title: setRu(payload.title, e.target.value) })} />
          </Field>
          <Field label="Ссылка на видео">
            <input value={String(payload.url ?? '')} onChange={(e) => set({ url: e.target.value })} />
          </Field>
          <Field label="Постер (URL)">
            <input value={String(payload.poster_url ?? '')} onChange={(e) => set({ poster_url: e.target.value })} />
          </Field>
        </>
      )

    default:
      return <p className="cab__muted">Этот блок настраивается автоматически.</p>
  }
}
