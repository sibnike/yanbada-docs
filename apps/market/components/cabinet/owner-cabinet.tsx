'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PlacementsPanel, RequestsPanel } from '@/components/cabinet/panels-market'
import { InvoicesPanel, PlansPanel } from '@/components/cabinet/panels-money'
import { BuilderPanel, ContentPanel, DesignPanel } from '@/components/cabinet/panels-builder'
import type { OwnerDashboard } from '@/lib/sites/dashboard'

const TABS = [
  ['overview', 'Обзор'],
  ['requests', 'Заявки'],
  ['placements', 'Карточки'],
  ['money', 'Деньги'],
  ['builder', 'Конструктор'],
  ['content', 'Журнал и места'],
  ['design', 'Оформление'],
] as const

type Tab = (typeof TABS)[number][0]

export function OwnerCabinet({ data, title }: { data: OwnerDashboard; title: string }) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('overview')
  const slug = data.site.slug

  const live = data.placements.filter((p) => p.live)
  const waiting = data.placements.filter((p) => p.status === 'pending_payment')
  const pendingRequests = data.requests.filter((r) => r.status === 'pending').length
  const newLeads = data.leads.filter((l) => l.status === 'new').length
  const payout = data.invoices
    .filter((i) => i.status === 'paid')
    .reduce((sum, invoice) => sum + invoice.owner_payout, 0)
  const impressions = data.daily.reduce((sum, day) => sum + day.impressions, 0)
  const clicks = data.daily.reduce((sum, day) => sum + day.clicks, 0)
  const maxDay = Math.max(1, ...data.daily.map((day) => day.impressions))

  async function logout() {
    await fetch('/api/cabinet/session', { method: 'DELETE' })
    router.push('/cabinet')
    router.refresh()
  }

  return (
    <div className="cab">
      <header className="cab__top">
        <div>
          <h1>{title}</h1>
          <p>Кабинет владельца витрины · /s/{slug}</p>
        </div>
        <nav>
          <a href={`/s/${slug}`} target="_blank" rel="noreferrer">
            Открыть витрину
          </a>
          <a href="/cabinet">Войти как компания</a>
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
          <strong>{pendingRequests + newLeads}</strong>
          <span>заявок ждут решения</span>
        </div>
        <div className="cab__kpi">
          <strong>{waiting.length}</strong>
          <span>ждут оплату</span>
        </div>
        <div className="cab__kpi">
          <strong>{payout.toLocaleString('ru-RU')}</strong>
          <span>выплачено вам, {data.site.default_currency}</span>
        </div>
        <div className="cab__kpi">
          <strong>{impressions.toLocaleString('ru-RU')}</strong>
          <span>показов карточек за 14 дней</span>
        </div>
      </div>

      <div className="cab__tabs">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            className={`cab__tab ${tab === key ? 'cab__tab--on' : ''}`}
            onClick={() => setTab(key)}
          >
            {label}
            {key === 'requests' && pendingRequests + newLeads > 0 ? ` · ${pendingRequests + newLeads}` : ''}
          </button>
        ))}
      </div>

      {tab === 'overview' ? (
        <section className="cab__panel">
          <h2>Что происходит в витрине</h2>
          <p>
            Режим наполнения: {modeLabel(data.site.placement_mode)}. Приём заявок{' '}
            {data.site.accepts_requests ? 'открыт' : 'закрыт'}. Платформа удерживает{' '}
            {data.site.platform_fee_percent}% от платежей компаний.
          </p>

          <table className="cab__table">
            <thead>
              <tr>
                <th>День</th>
                <th>Показы</th>
                <th>Клики</th>
                <th>Переходы на бронь</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.daily.slice(-7).reverse().map((day) => (
                <tr key={day.day}>
                  <td>{day.day}</td>
                  <td>{day.impressions}</td>
                  <td>{day.clicks}</td>
                  <td>{day.booking_hits}</td>
                  <td style={{ width: '40%' }}>
                    <div className="cab__bar" style={{ width: `${(day.impressions / maxDay) * 100}%` }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="cab__note">
            Показы и клики пишутся при просмотре витрины — это тот аргумент, с которым компания
            продлевает карточку. Всего за 14 дней: {impressions} показов, {clicks} кликов.
          </p>
        </section>
      ) : null}

      {tab === 'requests' ? (
        <RequestsPanel
          slug={slug}
          requests={data.requests}
          leads={data.leads}
          plans={data.plans}
          tenants={data.tenants}
        />
      ) : null}

      {tab === 'placements' ? (
        <PlacementsPanel slug={slug} placements={data.placements} currency={data.site.default_currency} />
      ) : null}

      {tab === 'money' ? (
        <>
          <PlansPanel slug={slug} plans={data.plans} site={data.site} />
          <InvoicesPanel
            slug={slug}
            invoices={data.invoices}
            feePercent={data.site.platform_fee_percent}
          />
        </>
      ) : null}

      {tab === 'builder' ? <BuilderPanel slug={slug} pages={data.pages} /> : null}

      {tab === 'content' ? (
        <ContentPanel slug={slug} posts={data.posts} manualCards={data.manualCards} />
      ) : null}

      {tab === 'design' ? <DesignPanel slug={slug} site={data.site} /> : null}
    </div>
  )
}

function modeLabel(mode: string): string {
  if (mode === 'approved') return 'только одобренные карточки'
  if (mode === 'mixed') return 'одобренные сверху, остальные по гео и темам'
  return 'автоматически по гео и темам'
}
