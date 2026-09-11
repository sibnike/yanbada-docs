'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export type SiteOption = {
  slug: string
  name: string
  tenants: { id: string; name: string }[]
}

export function LoginForm({ sites }: { sites: SiteOption[] }) {
  const router = useRouter()
  const [slug, setSlug] = useState(sites[0]?.slug ?? '')
  const [role, setRole] = useState<'owner' | 'tenant'>('owner')
  const [tenant, setTenant] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const site = sites.find((s) => s.slug === slug)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError('')
    const response = await fetch('/api/cabinet/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        site: slug,
        role,
        tenant_id: role === 'tenant' ? tenant || site?.tenants[0]?.id : undefined,
        code,
      }),
    }).catch(() => null)
    setPending(false)

    const data = (await response?.json().catch(() => ({}))) as { redirect?: string; error?: string }
    if (!response?.ok) {
      setError(data.error || 'Не удалось войти')
      return
    }
    router.push(data.redirect ?? `/cabinet/${slug}`)
    router.refresh()
  }

  return (
    <form className="cab__form" onSubmit={submit}>
      {sites.length > 1 ? (
        <label>
          Витрина
          <select value={slug} onChange={(e) => setSlug(e.target.value)}>
            {sites.map((option) => (
              <option key={option.slug} value={option.slug}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label>
        Кто вы
        <select value={role} onChange={(e) => setRole(e.target.value as 'owner' | 'tenant')}>
          <option value="owner">Владелец витрины</option>
          <option value="tenant">Компания-участник</option>
        </select>
      </label>

      {role === 'tenant' ? (
        <label>
          Компания
          <select value={tenant} onChange={(e) => setTenant(e.target.value)}>
            {(site?.tenants ?? []).map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label>
        Код доступа
        <input value={code} onChange={(e) => setCode(e.target.value)} type="password" required />
      </label>

      {error ? <p className="cab__error">{error}</p> : null}

      <button className="cab__btn" type="submit" disabled={pending}>
        {pending ? 'Входим…' : 'Войти'}
      </button>

      <p className="cab__muted">
        Публичная витрина открыта без входа: <a href={`/s/${slug}`}>/s/{slug}</a>
      </p>
    </form>
  )
}
