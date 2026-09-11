'use client'

import { useState } from 'react'
import { useApi } from '@/components/cabinet/use-api'
import type { LeadView, PlacementView, RequestView, TenantOption } from '@/lib/sites/dashboard'
import type { SitePlan } from '@/types/site'

const date = (value: string | null): string =>
  value ? new Date(value).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'

const money = (value: number, currency: string): string =>
  value === 0 ? 'бесплатно' : `${value.toLocaleString('ru-RU')} ${currency}`

export function RequestsPanel({
  slug,
  requests,
  leads,
  plans,
  tenants,
}: {
  slug: string
  requests: RequestView[]
  leads: LeadView[]
  plans: SitePlan[]
  tenants: TenantOption[]
}) {
  const { call, pending, error } = useApi()
  const [reason, setReason] = useState<Record<string, string>>({})
  const [inviteTenant, setInviteTenant] = useState(tenants[0]?.tenant_id ?? '')
  const [invitePlan, setInvitePlan] = useState(plans[0]?.id ?? '')
  const [inviteListings, setInviteListings] = useState<string[]>([])

  const pendingRequests = requests.filter((r) => r.status === 'pending')
  const decided = requests.filter((r) => r.status !== 'pending')
  const tenant = tenants.find((t) => t.tenant_id === inviteTenant)

  return (
    <>
      <section className="cab__panel">
        <h2>Заявки на размещение</h2>
        <p>
          Одобрение создаёт карточки. Бесплатный или пробный тариф включается сразу, платный ждёт
          оплату счёта.
        </p>
        {error ? <p className="cab__error">{error}</p> : null}

        {pendingRequests.length === 0 ? (
          <p className="cab__muted">Новых заявок нет.</p>
        ) : (
          <table className="cab__table">
            <thead>
              <tr>
                <th>Компания</th>
                <th>Что просят</th>
                <th>Тариф</th>
                <th>Решение</th>
              </tr>
            </thead>
            <tbody>
              {pendingRequests.map((request) => (
                <tr key={request.id}>
                  <td>
                    <strong>{request.tenant_name ?? request.tenant_id.slice(0, 8)}</strong>
                    <div className="cab__muted">
                      {request.direction === 'owner_invite' ? 'приглашение от вас' : 'заявка компании'} ·{' '}
                      {date(request.created_at)}
                    </div>
                    {Object.entries(request.contact).length > 0 ? (
                      <div className="cab__muted">
                        {Object.entries(request.contact)
                          .map(([key, value]) => `${key}: ${value}`)
                          .join(', ')}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    {request.include_company ? <div>карточка компании</div> : null}
                    {request.listing_titles.map((title, i) => (
                      <div key={i}>{title}</div>
                    ))}
                    {request.message ? <div className="cab__muted">«{request.message}»</div> : null}
                  </td>
                  <td>{request.plan_name ?? '—'}</td>
                  <td>
                    <div className="cab__row">
                      <button
                        className="cab__btn"
                        disabled={pending}
                        onClick={() =>
                          call(`/api/admin/sites/${slug}/requests`, 'PATCH', {
                            id: request.id,
                            action: 'approve',
                          })
                        }
                      >
                        Одобрить
                      </button>
                      <button
                        className="cab__btn cab__btn--danger"
                        disabled={pending}
                        onClick={() =>
                          call(`/api/admin/sites/${slug}/requests`, 'PATCH', {
                            id: request.id,
                            action: 'reject',
                            reject_reason: reason[request.id] ?? '',
                          })
                        }
                      >
                        Отклонить
                      </button>
                    </div>
                    <input
                      className="cab__json"
                      style={{ minHeight: 0, marginTop: 6, padding: '6px 8px' }}
                      placeholder="Причина отказа — её увидит компания"
                      value={reason[request.id] ?? ''}
                      onChange={(e) => setReason({ ...reason, [request.id]: e.target.value })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {decided.length > 0 ? (
          <>
            <h2 style={{ marginTop: 22 }}>История решений</h2>
            <table className="cab__table">
              <tbody>
                {decided.slice(0, 8).map((request) => (
                  <tr key={request.id}>
                    <td>{request.tenant_name}</td>
                    <td>
                      <span
                        className={`cab__badge ${
                          request.status === 'approved' ? 'cab__badge--live' : 'cab__badge--off'
                        }`}
                      >
                        {request.status === 'approved' ? 'одобрено' : request.status === 'rejected' ? 'отказ' : request.status}
                      </span>
                    </td>
                    <td className="cab__muted">{request.reject_reason ?? request.message ?? ''}</td>
                    <td className="cab__muted">{date(request.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : null}
      </section>

      <section className="cab__panel">
        <h2>Пригласить компанию</h2>
        <p>Обратное направление: вы сами предлагаете тенанту разместиться.</p>
        <div className="cab__form">
          <label>
            Компания
            <select value={inviteTenant} onChange={(e) => { setInviteTenant(e.target.value); setInviteListings([]) }}>
              {tenants.map((option) => (
                <option key={option.tenant_id} value={option.tenant_id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Тариф
            <select value={invitePlan} onChange={(e) => setInvitePlan(e.target.value)}>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name.ru ?? plan.slug} — {money(plan.price_per_card, plan.currency)}
                </option>
              ))}
            </select>
          </label>
          <div>
            <span className="cab__muted">Услуги</span>
            <div className="cab__row" style={{ marginTop: 6 }}>
              {(tenant?.listings ?? []).map((listing) => (
                <label key={listing.id} className="cab__badge" style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={inviteListings.includes(listing.id)}
                    onChange={(e) =>
                      setInviteListings(
                        e.target.checked
                          ? [...inviteListings, listing.id]
                          : inviteListings.filter((id) => id !== listing.id)
                      )
                    }
                  />{' '}
                  {listing.title}
                  {listing.placed ? ' · уже в витрине' : ''}
                </label>
              ))}
            </div>
          </div>
          <div className="cab__row">
            <button
              className="cab__btn cab__btn--ghost"
              disabled={pending || !inviteTenant}
              onClick={() =>
                call(`/api/admin/sites/${slug}/requests`, 'POST', {
                  tenant_id: inviteTenant,
                  plan_id: invitePlan,
                  listing_ids: inviteListings,
                  include_company: false,
                  message: 'Приглашение от витрины',
                })
              }
            >
              Отправить приглашение
            </button>
            <button
              className="cab__btn"
              disabled={pending || !inviteTenant || inviteListings.length === 0}
              onClick={() =>
                call(`/api/admin/sites/${slug}/placements`, 'POST', {
                  tenant_id: inviteTenant,
                  plan_id: invitePlan,
                  listing_ids: inviteListings,
                  include_company: false,
                })
              }
            >
              Разместить сразу
            </button>
          </div>
        </div>
      </section>

      <section className="cab__panel">
        <h2>Заявки без аккаунта</h2>
        <p>
          Формы с публичной страницы от компаний, которых ещё нет в Vitrina. Их нужно довести до
          регистрации, иначе воронка обрывается.
        </p>
        {leads.length === 0 ? (
          <p className="cab__muted">Пока пусто.</p>
        ) : (
          <table className="cab__table">
            <thead>
              <tr>
                <th>Компания</th>
                <th>Контакт</th>
                <th>Тариф</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <strong>{lead.company_name}</strong>
                    {lead.message ? <div className="cab__muted">«{lead.message}»</div> : null}
                  </td>
                  <td className="cab__muted">
                    {lead.contact_name ? <div>{lead.contact_name}</div> : null}
                    {Object.entries(lead.contact).map(([key, value]) => (
                      <div key={key}>
                        {key}: {value}
                      </div>
                    ))}
                  </td>
                  <td>{lead.plan_name ?? '—'}</td>
                  <td>
                    <select
                      value={lead.status}
                      onChange={(e) =>
                        call(`/api/admin/sites/${slug}/leads`, 'PATCH', {
                          id: lead.id,
                          status: e.target.value,
                        })
                      }
                    >
                      <option value="new">новая</option>
                      <option value="contacted">связались</option>
                      <option value="invited">позвали в Vitrina</option>
                      <option value="converted">стала тенантом</option>
                      <option value="declined">отказ</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  )
}

export function PlacementsPanel({
  slug,
  placements,
  currency,
}: {
  slug: string
  placements: PlacementView[]
  currency: string
}) {
  const { call, pending, error } = useApi()

  return (
    <section className="cab__panel">
      <h2>Карточки в витрине</h2>
      <p>
        Одна строка — одна оплачиваемая карточка. Позиция (обычная / витринная / закреплённая) и вес
        решают порядок на странице.
      </p>
      {error ? <p className="cab__error">{error}</p> : null}

      <table className="cab__table">
        <thead>
          <tr>
            <th>Карточка</th>
            <th>Статус</th>
            <th>Позиция</th>
            <th>Оплачено до</th>
            <th>14 дней</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {placements.map((placement) => (
            <tr key={placement.id}>
              <td>
                <strong>{placement.listing_title}</strong>
                <div className="cab__muted">
                  {placement.tenant_name} · {placement.plan_name ?? 'без тарифа'} ·{' '}
                  {money(placement.price_per_period, placement.currency || currency)}
                </div>
              </td>
              <td>
                <span
                  className={`cab__badge ${
                    placement.live
                      ? 'cab__badge--live'
                      : placement.status === 'pending_payment'
                        ? 'cab__badge--warn'
                        : 'cab__badge--off'
                  }`}
                >
                  {placement.live ? 'на странице' : statusLabel(placement.status)}
                </span>
                {placement.live && placement.paid_until && new Date(placement.paid_until) < new Date() ? (
                  <div className="cab__muted">оплата просрочена, идут дни запаса</div>
                ) : null}
              </td>
              <td>
                <div className="cab__inline">
                  <select
                    value={placement.slot}
                    onChange={(e) =>
                      call(`/api/admin/sites/${slug}/placements`, 'PATCH', {
                        id: placement.id,
                        slot: e.target.value,
                      })
                    }
                  >
                    <option value="standard">обычная</option>
                    <option value="featured">витринная</option>
                    <option value="pinned">закреплённая</option>
                  </select>
                  <input
                    type="number"
                    defaultValue={placement.sort_weight}
                    onBlur={(e) =>
                      call(`/api/admin/sites/${slug}/placements`, 'PATCH', {
                        id: placement.id,
                        sort_weight: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </td>
              <td>{placement.paid_until ? date(placement.paid_until) : 'бессрочно'}</td>
              <td className="cab__muted">
                {placement.impressions} показов
                <br />
                {placement.clicks} кликов · {placement.booking_hits} на бронь
              </td>
              <td>
                <div className="cab__row">
                  <button
                    className="cab__btn cab__btn--ghost"
                    disabled={pending}
                    onClick={() =>
                      call(`/api/admin/sites/${slug}/placements`, 'PATCH', {
                        id: placement.id,
                        action: 'extend',
                        months: 1,
                      })
                    }
                  >
                    Продлить
                  </button>
                  <button
                    className="cab__btn cab__btn--ghost"
                    disabled={pending}
                    onClick={() =>
                      call(`/api/admin/sites/${slug}/placements`, 'PATCH', {
                        id: placement.id,
                        status: placement.status === 'paused' ? 'active' : 'paused',
                      })
                    }
                  >
                    {placement.status === 'paused' ? 'Вернуть' : 'Пауза'}
                  </button>
                  <button
                    className="cab__btn cab__btn--danger"
                    disabled={pending}
                    onClick={() => call(`/api/admin/sites/${slug}/placements`, 'DELETE', { id: placement.id })}
                  >
                    Снять
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="cab__note">
        «Продлить» выставляет счёт на следующий период. Карточка становится видимой, когда счёт
        отмечен оплаченным на вкладке «Деньги».
      </p>
    </section>
  )
}

function statusLabel(status: string): string {
  switch (status) {
    case 'pending_payment':
      return 'ждёт оплату'
    case 'paused':
      return 'пауза'
    case 'expired':
      return 'истекло'
    case 'hidden':
      return 'скрыта'
    default:
      return status
  }
}
