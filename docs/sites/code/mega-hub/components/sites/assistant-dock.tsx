'use client'

import { useState } from 'react'
import type { AssistantReply } from '@/types/site'

export function AssistantDock({
  slug,
  greeting,
  name,
}: {
  slug: string
  greeting: string
  name: string
}) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [log, setLog] = useState<{ role: 'user' | 'assistant'; text: string; links?: AssistantReply['links'] }[]>([])
  const [pending, setPending] = useState(false)

  async function send() {
    const message = text.trim()
    if (!message || pending) return
    setText('')
    setLog((prev) => [...prev, { role: 'user', text: message }])
    setPending(true)
    try {
      const res = await fetch(`/api/sites/${encodeURIComponent(slug)}/assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      const data = (await res.json()) as AssistantReply & { error?: string }
      setLog((prev) => [
        ...prev,
        { role: 'assistant', text: data.reply || data.error || 'Не удалось ответить', links: data.links },
      ])
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="th-assistant">
      {open ? (
        <div className="th-assistant__panel">
          <header>
            <strong>{name}</strong>
            <button type="button" onClick={() => setOpen(false)}>
              Закрыть
            </button>
          </header>
          <p className="th-assistant__hello">{greeting}</p>
          <div className="th-assistant__log">
            {log.map((item, i) => (
              <div key={i} className={`th-assistant__msg th-assistant__msg--${item.role}`}>
                <p>{item.text}</p>
                {item.links?.map((link) => (
                  <a key={link.href} href={link.href}>
                    {link.label}
                  </a>
                ))}
              </div>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void send()
            }}
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Что найти на сайте?"
            />
            <button type="submit" disabled={pending}>
              {pending ? '…' : 'Спросить'}
            </button>
          </form>
        </div>
      ) : (
        <button type="button" className="th-assistant__fab" onClick={() => setOpen(true)}>
          {name}
        </button>
      )}
    </div>
  )
}
