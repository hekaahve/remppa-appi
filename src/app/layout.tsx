import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import Providers from '@/components/Providers'
import './globals.css'

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
})

export const metadata: Metadata = {
  title: 'Ykspetäjä rempat',
  description: 'Remonttikulujen seuranta',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fi" className={`${geist.variable} h-full`}>
      <body className="h-full bg-gray-50 font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
