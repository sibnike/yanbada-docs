'use client'

import { useState } from 'react'
import { loc } from '@/lib/sites/public-copy'
import type { SitePlan } from '@/types/site'

type State = 'idle' | 'sending' | 'sent' | 'error'

export function JoinForm({
  siteSlug,
  plans,
  locale = 'ru',
  terms,
  requireTerms = false,
}: {
  siteSlug: string
  plans: SitePlan[]
  locale?: string
  terms?: string
  requireTerms?: boolean
}) {
  const [state, setState] = useState<State>('idle')
  const [error, setError] = useState<string>('')

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setState('sending')
    setError('')

    const response = await fetch(`/api/sites/${siteSlug}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_name: form.get('company_name'),
        contact_name: form.get('contact_name'),
        contact: {
          phone: String(form.get('phone') ?? ''),
          email: String(form.get('email') ?? ''),
          telegram: String(form.get('telegram') ?? ''),
        },
        plan_slug: form.get('plan_slug'),
        message: form.get('message'),
        accepted_terms: form.get('accepted_terms') === 'on',
      }),
    }).catch(() => null)

    if (!response || !response.ok) {
      const message = response ? ((await response.json().catch(() => ({}))) as { error?: string }).error : null
      setError(message || 'Не удалось отправить заявку')
      setState('error')
      return
    }
    setState('sent')
  }

  if (state === 'sent') {
    return (
      <p className="th-join__done">
        Заявка отправлена. Автор витрины свяжется по указанному контакту.
      </p>
    )
  }

  return (
    <form className="th-join" onSubmit={submit}>
      <div className="th-join__row">
        <label>
          Компания
          <input name="company_name" required placeholder="Гостевой дом, туркомпания…" />
        </label>
        <label>
          Ваше имя
          <input name="contact_name" placeholder="Как обращаться" />
        </label>
      </div>

      <div className="th-join__row">
        <label>
          Телефон
          <input name="phone" inputMode="tel" placeholder="+996…" />
        </label>
        <label>
          Email
          <input name="email" type="email" placeholder="mail@example.com" />
        </label>
        <label>
          Telegram
          <input name="telegram" placeholder="@username" />
        </label>
      </div>

      {plans.length > 0 ? (
        <label>
          Тариф
          <select name="plan_slug" defaultValue={plans[0]?.slug}>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.slug}>
                {loc(plan.name, locale, plan.slug)}
                {plan.price_per_card > 0
                  ? ` — ${plan.price_per_card} ${plan.currency} за карточку`
                  : ' — бесплатно'}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label>
        Что хотите разместить
        <textarea name="message" rows={3} placeholder="Какие услуги или номера, сколько карточек" />
      </label>

      {requireTerms && terms ? (
        <label className="th-join__terms">
          <input type="checkbox" name="accepted_terms" required />
          <span>{terms}</span>
        </label>
      ) : null}

      {error ? <p className="th-join__error">{error}</p> : null}

      <button className="th-btn" type="submit" disabled={state === 'sending'}>
        {state === 'sending' ? 'Отправляем…' : 'Отправить заявку'}
      </button>
    </form>
  )
}
