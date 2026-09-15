import type { Metadata } from 'next'
// The public skin is the same stylesheet that ships to mega-hub.
import '../../../docs/sites/code/mega-hub/app/s/sites.css'
import './globals.css'

export const metadata: Metadata = {
  title: 'Витрина маркета',
  description: 'Тематическая витрина mega-hub: карточки тенантов Vitrina, платное размещение, кабинет владельца.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
