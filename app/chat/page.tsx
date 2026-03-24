'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Header from '@/components/Header'
import ChatMessage, { type Message, TypingIndicator } from '@/components/ChatMessage'
import ChatInput from '@/components/ChatInput'
import type { Documento } from '@/lib/db'

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Hola, soy Argos, el gestor documental inteligente de Benavides Asociados. Tengo acceso a toda la documentación de clientes en SharePoint: contratos, modelos fiscales, escrituras, certificados y más. Pregúntame por cualquier documento y te lo localizo al instante. ¿Qué necesitas?',
  type: 'welcome',
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE])
  const [isLoading, setIsLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  const handleSend = useCallback(
    async (text: string) => {
      if (isLoading) return

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text,
      }

      setMessages((prev) => [...prev, userMsg])
      setIsLoading(true)

      // Build history for context (exclude welcome)
      const history = messages
        .filter((m) => m.id !== 'welcome')
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content }))

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, history }),
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.message ?? 'Error del servidor')
        }

        const assistantMsg: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.message,
          documents: data.documents as Documento[],
          type: data.type,
          intent: data.intent,
        }

        setMessages((prev) => [...prev, assistantMsg])
      } catch (error) {
        const errMsg: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content:
            error instanceof Error && error.message
              ? error.message
              : 'Lo siento, ha ocurrido un error. Por favor, inténtalo de nuevo.',
          type: 'error',
        }
        setMessages((prev) => [...prev, errMsg])
      } finally {
        setIsLoading(false)
      }
    },
    [isLoading, messages]
  )

  return (
    <div className="flex flex-col h-screen bg-warm-100">
      <Header />

      {/* Chat area */}
      <main className="flex-1 overflow-y-auto pt-14 pb-0 scrollbar-thin">
        <div className="max-w-chat mx-auto px-4 py-6 space-y-4">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} onSearch={handleSend} />
          ))}

          {isLoading && <TypingIndicator />}

          <div ref={bottomRef} className="h-1" />
        </div>
      </main>

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={isLoading} />

      {/* Footer */}
      <div className="text-center text-xs text-warm-400 py-1.5 bg-white/50 font-kumbh border-t border-warm-200">
        Argos v1.0 · Benavides Asociados — Solo para uso interno
      </div>
    </div>
  )
}
