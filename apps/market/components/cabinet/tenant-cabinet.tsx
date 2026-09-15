'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApi } from '@/components/cabinet/use-api'
import type { TenantDashboard } from '@/lib/sites/dashboard'

const date = (value: string | null): string =>
  value ? new Date(value).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'

export function TenantCabinet({ data }: { data: TenantDashboard }) {
  const router = useRouter()
  const { call, pending, error } = useApi()
  const slug = data.site.slug
  const [plan, setPlan] = useState(data.plans[0]?.id ?? '')
  const [selected, setSelected] = useState<string[]>([])
  const [company, setCompany] = useState(!data.companyPlaced)
  const [message, setMessage] = useState('')

  const live = data.placements.filter((p) => p.live)
  const impressions = data.placements.reduce((sum, p) => sum + p.impressions, 0)
  const clicks = data.placements.reduce((sum, p) => sum + p.clicks, 0)
  const due = data.invoices.filter((i) => i.status === 'issued')
  const pendingRequest = data.requests.find((r) => r.status === 'pending')
  const lastRejected = data.requests.find((r) => r.status === 'rejected')

  async function logout() {
    await fetch('/api/cabinet/session', { method: 'DELETE' })
    router.push('/cabinet')
    router.refresh()
  }

  return (
    <div className="cab">
      <header className="cab__top">
        <div>
          <h1>{data.tenantName}</h1>
          <p>Кабинет компании в витрине «{data.site.settings.display_name?.ru ?? slug}»</p>
        </div>
        <nav>
          <a href={`/s/${slug}`} target="_blank" rel="noreferrer">
            Открыть витрину
          </a>
          <a href="#" onClick={(e) => { e.preventDefault(); void logout() }}>
            Выйти
          </a>
        </nav>
      </header>

      <div className="cab__kpis">
        <div className="cab__kpi">
          <strong>{live.length}</strong>
          <span>карточек на странице</span>
        </div>
        <div className="cab__kpi">
          <strong>{impressions.toLocaleString('ru-RU')}</strong>
          <span>показов за 14 дней</span>
        </div>
        <div className="cab__kpi">
          <strong>{clicks.toLocaleString('ru-RU')}</strong>
          <span>кликов за 14 дней</span>
        </div>
        <div className="cab__kpi">
          <strong>{due.length}</strong>
          <span>счетов к оплате</span>
        </div>
      </div>

      <section className="cab__panel">
        <h2>Мои карточки</h2>
        <p>Карточки берутся из ваших услуг в Vitrina. Здесь видно, что оплачено и что это дало.</p>
        {data.placements.length === 0 ? (
          <p className="cab__muted">Пока ни одной карточки в этой витрине.</p>
        ) : (
          <table className="cab__table">
            <thead>
              <tr>
                <th>Карточка</th>
                <th>Статус</th>
                <th>Оплачено до</th>
                <th>Показы</th>
                <th>Клики</th>
              </tr>
            </thead>
            <tbody>
              {data.placements.map((placement) => (
                <tr key={placement.id}>
                  <td>
                    <strong>{placement.listing_title}</strong>
                    <div className="cab__muted">
                      {placement.plan_name ?? 'без тарифа'} ·{' '}
                      {placement.price_per_period === 0
                        ? 'бесплатно'
                        : `${placement.price_per_period} ${placement.currency} за период`}
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
                      {placement.live
                        ? 'показывается'
                        : placement.status === 'pending_payment'
                          ? 'ждёт оплату'
                          : placement.status}
                    </span>
                  </td>
                  <td>{placement.paid_until ? date(placement.paid_until) : 'бессрочно'}</td>
                  <td>{placement.impressions}</td>
                  <td>
                    {placement.clicks} · {placement.booking_hits} на бронь
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="cab__panel">
        <h2>Счета</h2>
        <p>Счёт выставляет платформа. Карточка включается, когда оплата отмечена.</p>
        {data.invoices.length === 0 ? (
          <p className="cab__muted">Счетов нет.</p>
        ) : (
          <table className="cab__table">
            <tbody>
              {data.invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="cab__muted">
                    {invoice.period_start} → {invoice.period_end}
                  </td>
                  <td>
                    <strong>
                      {invoice.amount.toLocaleString('ru-RU')} {invoice.currency}
                    </strong>
                  </td>
                  <td>
                    <span
                      className={`cab__badge ${invoice.status === 'paid' ? 'cab__badge--live' : 'cab__badge--warn'}`}
                    >
                      {invoice.status === 'paid' ? 'оплачен' : invoice.status === 'void' ? 'аннулирован' : 'к оплате'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="cab__panel">
        <h2>Заявка на размещение</h2>
        <p>Выберите услуги и тариф. Владелец витрины проверит карточки и ответит.</p>
        {error ? <p className="cab__error">{error}</p> : null}

        {lastRejected?.reject_reason ? (
          <p className="cab__note">Прошлый отказ: {lastRejected.reject_reason}</p>
        ) : null}

        {pendingRequest ? (
          <div className="cab__row">
            <span className="cab__badge cab__badge--warn">заявка на рассмотрении</span>
            <button
              className="cab__btn cab__btn--ghost"
              disabled={pending}
              onClick={() => call(`/api/tenant/${slug}`, 'PATCH', { id: pendingRequest.id })}
            >
              Отозвать
            </button>
          </div>
        ) : (
          <div className="cab__form">
            <div>
              <span className="cab__muted">Услуги</span>
              <div className="cab__row" style={{ marginTop: 6 }}>
                <label className="cab__badge" style={{ cursor: 'pointer' }}>
                  <input type="checkbox" checked={company} onChange={(e) => setCompany(e.target.checked)} />{' '}
                  карточка компании
                </label>
                {data.listings.map((listing) => (
                  <label key={listing.id} className="cab__badge" style={{ cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      disabled={listing.placed}
                      checked={selected.includes(listing.id)}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [...selected, listing.id]
                            : selected.filter((id) => id !== listing.id)
                        )
                      }
                    />{' '}
                    {listing.title}
                    {listing.placed ? ' · уже в витрине' : ''}
                  </label>
                ))}
              </div>
            </div>
            <label>
              Тариф
              <select value={plan} onChange={(e) => setPlan(e.target.value)}>
                {data.plans.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name.ru ?? option.slug} —{' '}
                    {option.price_per_card === 0
                      ? 'бесплатно'
                      : `${option.price_per_card} ${option.currency} за карточку`}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Комментарий
              <textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
            </label>
            <button
              className="cab__btn"
              disabled={pending || (selected.length === 0 && !company)}
              onClick={() =>
                call(`/api/tenant/${slug}`, 'POST', {
                  plan_id: plan,
                  listing_ids: selected,
                  include_company: company,
                  message,
                })
              }
            >
              Отправить заявку
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
