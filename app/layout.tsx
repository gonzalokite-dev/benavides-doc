import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Argos — Gestor documental · Benavides Asociados',
  description: 'Argos: el gestor documental inteligente de Benavides Asociados',
  robots: 'noindex, nofollow',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-warm-100 font-kumbh">
        {children}
      </body>
    </html>
  )
}
