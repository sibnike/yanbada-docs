'use client'

import { useEffect, useState } from 'react'

type RequestRow = {
  id: string
  tenant_id: string
  direction: 'tenant_request' | 'owner_invite'
  listing_ids: string[] | null
  include_company: boolean
  message: string | null
  contact: Record<string, string> | null
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  reject_reason: string | null
  created_at: string
}

type LeadRow = {
  id: string
  company_name: string
  contact_name: string | null
  contact: Record<string, string> | null
  message: string | null
  status: string
  created_at: string
}

/** Owner-side moderation: approve creates placements, reject demands a reason. */
export function MarketRequestsPanel({ slug }: { slug: string }) {
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [leads, setLeads] = useState<LeadRow[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string>('')

  async function reload() {
    const res = await fetch(`/api/admin/sites/${slug}/requests`)
    if (!res.ok) {
      setError('Нет доступа к заявкам этого маркета')
      return
    }
    const data = (await res.json()) as { requests: RequestRow[]; leads: LeadRow[] }
    setRequests(data.requests ?? [])
    setLeads(data.leads ?? [])
  }

  useEffect(() => {
    void reload()
  }, [slug])

  async function decide(id: string, action: 'approve' | 'reject') {
    const reason =
      action === 'reject'
        ? window.prompt('Причина отказа — тенант должен понять, что исправить')?.trim()
        : undefined
    if (action === 'reject' && !reason) return

    setBusy(id)
    const res = await fetch(`/api/admin/sites/${slug}/requests`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: id, action, reject_reason: reason }),
    })
    setBusy(null)
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      setError(data.error ?? 'Не удалось обработать заявку')
      return
    }
    setError('')
    await reload()
  }

  const pending = requests.filter((r) => r.status === 'pending')

  return (
    <section style={{ marginBottom: 24 }}>
      <h2>
        Заявки на размещение{' '}
        {pending.length > 0 ? <span style={{ color: '#b3261e' }}>· {pending.length}</span> : null}
      </h2>

      {error ? <p style={{ color: '#b3261e' }}>{error}</p> : null}

      {pending.length === 0 ? <p>Новых заявок нет.</p> : null}

      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 12 }}>
        {pending.map((request) => (
          <li key={request.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              {request.direction === 'owner_invite' ? 'приглашение владельца' : 'заявка тенанта'}
            </div>
            <div style={{ fontWeight: 600 }}>{request.tenant_id.slice(0, 8)}…</div>
            <div>
              карточек: {(request.listing_ids?.length ?? 0) + (request.include_company ? 1 : 0)}
            </div>
            {request.message ? <p style={{ fontSize: 13 }}>{request.message}</p> : null}
            {request.contact
              ? Object.entries(request.contact).map(([key, value]) => (
                  <div key={key} style={{ fontSize: 12 }}>
                    {key}: {value}
                  </div>
                ))
              : null}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button type="button" disabled={busy === request.id} onClick={() => void decide(request.id, 'approve')}>
                Одобрить
              </button>
              <button type="button" disabled={busy === request.id} onClick={() => void decide(request.id, 'reject')}>
                Отклонить
              </button>
            </div>
          </li>
        ))}
      </ul>

      {leads.length > 0 ? (
        <>
          <h3>Лиды без аккаунта</h3>
          <p style={{ fontSize: 13, opacity: 0.75 }}>
            Компании ещё нет в Vitrina — сначала пригласить, потом создать размещение.
          </p>
          <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 8 }}>
            {leads.map((lead) => (
              <li key={lead.id} style={{ border: '1px dashed #e2e8f0', borderRadius: 12, padding: 10 }}>
                <div style={{ fontWeight: 600 }}>{lead.company_name}</div>
                {lead.contact_name ? <div style={{ fontSize: 12 }}>{lead.contact_name}</div> : null}
                {lead.contact
                  ? Object.entries(lead.contact).map(([key, value]) => (
                      <div key={key} style={{ fontSize: 12 }}>
                        {key}: {value}
                      </div>
                    ))
                  : null}
                <div style={{ fontSize: 12, opacity: 0.7 }}>{lead.status}</div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  )
}
