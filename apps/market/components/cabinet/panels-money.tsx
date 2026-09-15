'use client'

import { useState } from 'react'
import { useApi } from '@/components/cabinet/use-api'
import type { InvoiceView } from '@/lib/sites/dashboard'
import type { SitePlan, SiteRow } from '@/types/site'

const money = (value: number, currency: string): string =>
  `${value.toLocaleString('ru-RU')} ${currency}`

export function PlansPanel({ slug, plans, site }: { slug: string; plans: SitePlan[]; site: SiteRow }) {
  const { call, pending, error } = useApi()
  const [draft, setDraft] = useState({
    slug: '',
    name: '',
    description: '',
    price_per_card: 900,
    period_months: 1,
    card_quota: 1,
    slot: 'standard',
    trial_days: 0,
    is_public: true,
  })

  return (
    <section className="cab__panel">
      <h2>Тарифы размещения</h2>
      <p>Цена за одну карточку за период. Позиция в списке — это апсейл, а не отдельный продукт.</p>
      {error ? <p className="cab__error">{error}</p> : null}

      <div className="cab__grid">
        {plans.map((plan) => (
          <article key={plan.id} className="cab__card">
            <h3>{plan.name.ru ?? plan.slug}</h3>
            <p className="cab__muted">{plan.description.ru ?? ''}</p>
            <div className="cab__inline" style={{ marginBottom: 8 }}>
              <input
                type="number"
                defaultValue={plan.price_per_card}
                onBlur={(e) =>
                  call(`/api/admin/sites/${slug}/plans`, 'PATCH', {
                    id: plan.id,
                    price_per_card: Number(e.target.value),
                  })
                }
              />
              <span className="cab__muted">{plan.currency} за карточку</span>
            </div>
            <div className="cab__inline" style={{ marginBottom: 8 }}>
              <input
                type="number"
                defaultValue={plan.card_quota}
                onBlur={(e) =>
                  call(`/api/admin/sites/${slug}/plans`, 'PATCH', {
                    id: plan.id,
                    card_quota: Number(e.target.value),
                  })
                }
              />
              <span className="cab__muted">карточек</span>
              <select
                value={plan.slot}
                onChange={(e) =>
                  call(`/api/admin/sites/${slug}/plans`, 'PATCH', { id: plan.id, slot: e.target.value })
                }
              >
                <option value="standard">обычная</option>
                <option value="featured">витринная</option>
                <option value="pinned">закреплённая</option>
              </select>
            </div>
            <div className="cab__row">
              <span className="cab__badge">{plan.period_months} мес.</span>
              {plan.trial_days > 0 ? <span className="cab__badge">пробных дней: {plan.trial_days}</span> : null}
              <span className="cab__badge">{plan.is_public ? 'публичный' : 'закрытый'}</span>
            </div>
            <div className="cab__row" style={{ marginTop: 10 }}>
              <button
                className="cab__btn cab__btn--ghost"
                disabled={pending}
                onClick={() =>
                  call(`/api/admin/sites/${slug}/plans`, 'PATCH', {
                    id: plan.id,
                    is_public: !plan.is_public,
                  })
                }
              >
                {plan.is_public ? 'Скрыть с сайта' : 'Показать на сайте'}
              </button>
              <button
                className="cab__btn cab__btn--danger"
                disabled={pending}
                onClick={() => call(`/api/admin/sites/${slug}/plans`, 'DELETE', { id: plan.id })}
              >
                Убрать
              </button>
            </div>
          </article>
        ))}
      </div>

      <h2 style={{ marginTop: 24 }}>Новый тариф</h2>
      <div className="cab__form">
        <div className="cab__row">
          <label style={{ flex: 1 }}>
            Название
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </label>
          <label style={{ flex: 1 }}>
            Код (латиницей)
            <input value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} />
          </label>
        </div>
        <label>
          Описание
          <input
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
        </label>
        <div className="cab__row">
          <label>
            Цена, {site.default_currency}
            <input
              type="number"
              value={draft.price_per_card}
              onChange={(e) => setDraft({ ...draft, price_per_card: Number(e.target.value) })}
            />
          </label>
          <label>
            Период, мес.
            <input
              type="number"
              value={draft.period_months}
              onChange={(e) => setDraft({ ...draft, period_months: Number(e.target.value) })}
            />
          </label>
          <label>
            Карточек
            <input
              type="number"
              value={draft.card_quota}
              onChange={(e) => setDraft({ ...draft, card_quota: Number(e.target.value) })}
            />
          </label>
          <label>
            Пробных дней
            <input
              type="number"
              value={draft.trial_days}
              onChange={(e) => setDraft({ ...draft, trial_days: Number(e.target.value) })}
            />
          </label>
          <label>
            Позиция
            <select value={draft.slot} onChange={(e) => setDraft({ ...draft, slot: e.target.value })}>
              <option value="standard">обычная</option>
              <option value="featured">витринная</option>
              <option value="pinned">закреплённая</option>
            </select>
          </label>
        </div>
        <button
          className="cab__btn"
          disabled={pending || !draft.name || !draft.slug}
          onClick={() => call(`/api/admin/sites/${slug}/plans`, 'POST', draft)}
        >
          Добавить тариф
        </button>
      </div>
    </section>
  )
}

export function InvoicesPanel({
  slug,
  invoices,
  feePercent,
}: {
  slug: string
  invoices: InvoiceView[]
  feePercent: number
}) {
  const { call, pending, error } = useApi()
  const issued = invoices.filter((i) => i.status === 'issued')
  const paid = invoices.filter((i) => i.status === 'paid')
  const payout = paid.reduce((sum, i) => sum + i.owner_payout, 0)
  const currency = invoices[0]?.currency ?? 'KGS'

  return (
    <section className="cab__panel">
      <h2>Счета и выплаты</h2>
      <p>
        Счёт выставляет платформа, она же удерживает {feePercent}%. Остальное — выплата владельцу
        витрины. Отметка «оплачен» включает карточку.
      </p>
      {error ? <p className="cab__error">{error}</p> : null}

      <div className="cab__row" style={{ marginBottom: 14 }}>
        <span className="cab__badge">к оплате: {issued.length}</span>
        <span className="cab__badge cab__badge--live">
          выплачено вам: {money(payout, currency)}
        </span>
      </div>

      <table className="cab__table">
        <thead>
          <tr>
            <th>Компания</th>
            <th>Период</th>
            <th>Сумма</th>
            <th>Платформе</th>
            <th>Вам</th>
            <th>Статус</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id}>
              <td>{invoice.tenant_name ?? invoice.tenant_id.slice(0, 8)}</td>
              <td className="cab__muted">
                {invoice.period_start} → {invoice.period_end}
              </td>
              <td>{money(invoice.amount, invoice.currency)}</td>
              <td className="cab__muted">{money(invoice.platform_fee, invoice.currency)}</td>
              <td>
                <strong>{money(invoice.owner_payout, invoice.currency)}</strong>
              </td>
              <td>
                {invoice.status === 'paid' ? (
                  <span className="cab__badge cab__badge--live">оплачен</span>
                ) : invoice.status === 'void' ? (
                  <span className="cab__badge cab__badge--off">аннулирован</span>
                ) : (
                  <div className="cab__row">
                    <button
                      className="cab__btn"
                      disabled={pending}
                      onClick={() =>
                        call(`/api/admin/sites/${slug}/invoices`, 'PATCH', { id: invoice.id })
                      }
                    >
                      Оплачен
                    </button>
                    <button
                      className="cab__btn cab__btn--ghost"
                      disabled={pending}
                      onClick={() =>
                        call(`/api/admin/sites/${slug}/invoices`, 'PATCH', {
                          id: invoice.id,
                          action: 'void',
                        })
                      }
                    >
                      Аннулировать
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
