'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'

type Method = 'POST' | 'PATCH' | 'DELETE'

/**
 * Every cabinet action is a real write. After it lands we re-render the server
 * component, so what the owner sees is what the database holds.
 */
export function useApi() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')

  const call = useCallback(
    async (url: string, method: Method, body?: unknown): Promise<Record<string, unknown> | null> => {
      setPending(true)
      setError('')
      setNote('')
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      }).catch(() => null)
      const data = (await response?.json().catch(() => ({}))) as Record<string, unknown>
      setPending(false)

      if (!response?.ok) {
        setError(typeof data?.error === 'string' ? data.error : 'Не удалось сохранить')
        return null
      }
      router.refresh()
      return data
    },
    [router]
  )

  return { call, pending, error, note, setNote, setError }
}
