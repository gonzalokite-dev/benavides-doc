'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'

export default function Header() {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-navy shadow-md">
      <div className="max-w-chat mx-auto px-4 h-14 flex items-center justify-between">

        {/* Logo + nombre producto */}
        <div className="flex items-center gap-3">
          <Image
            src="/logo-benavides.png"
            alt="Benavides Asociados"
            width={120}
            height={32}
            className="brightness-0 invert opacity-90"
            priority
          />
          <div className="flex items-center gap-2">
            <div className="w-px h-5 bg-white/20" />
            <div>
              <span className="text-white font-lora font-semibold text-base leading-none tracking-wide">
                Argos
              </span>
              <span className="block text-gold/70 text-[10px] font-kumbh leading-none mt-0.5 hidden sm:block">
                Gestor documental inteligente
              </span>
            </div>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-warm-300 hover:text-white text-sm font-kumbh px-3 py-1.5 rounded-lg hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-gold/50"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          <span className="hidden sm:inline">Cerrar sesión</span>
        </button>

      </div>
    </header>
  )
}
