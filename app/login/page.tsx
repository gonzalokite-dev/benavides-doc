'use client'

import Image from 'next/image'
import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        router.push('/chat')
        router.refresh()
      } else {
        const data = await res.json()
        setError(data.error ?? 'Contraseña incorrecta')
      }
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-warm-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Branding */}
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/logo-benavides.png"
            alt="Benavides Asociados"
            width={180}
            height={48}
            className="mb-6"
            priority
          />
          <div className="flex items-center gap-2 mb-1">
            <div className="w-px h-5 bg-navy/20" />
            <h1 className="text-2xl font-lora font-bold text-navy tracking-tight">
              Argos
            </h1>
            <div className="w-px h-5 bg-navy/20" />
          </div>
          <p className="text-warm-500 text-sm font-kumbh text-center">
            Gestor documental inteligente
          </p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-2xl shadow-sm border border-warm-200 p-8">
          <h2 className="text-navy font-kumbh font-semibold text-sm uppercase tracking-widest mb-6 text-center opacity-60">
            Acceso del equipo
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-navy mb-2"
              >
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 rounded-xl border border-warm-200 bg-warm-50 text-navy placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent font-kumbh"
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full bg-navy text-white font-kumbh font-medium py-3 px-6 rounded-xl hover:bg-navy-600 focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle
                      className="opacity-25"
                      cx="12" cy="12" r="10"
                      stroke="currentColor" strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                  Verificando...
                </span>
              ) : (
                'Acceder'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-warm-400 mt-6 font-kumbh">
          Solo para uso interno · Benavides Asociados
        </p>
      </div>
    </div>
  )
}
