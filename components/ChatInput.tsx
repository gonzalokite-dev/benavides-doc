'use client'

import { useState, useRef, KeyboardEvent } from 'react'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleSend() {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleInput() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }

  return (
    <div className="border-t border-warm-200 bg-white/80 backdrop-blur-sm px-4 py-3">
      <div className="max-w-chat mx-auto">
        <div className="flex items-end gap-3 bg-warm-100 border border-warm-200 rounded-2xl px-4 py-2 focus-within:border-gold focus-within:ring-1 focus-within:ring-gold/30">
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            disabled={disabled}
            placeholder="Busca documentación... Ej: modelo 303 de Inversiones Vicusi 2024"
            className="flex-1 bg-transparent resize-none text-sm text-navy placeholder-warm-400 focus:outline-none font-kumbh leading-relaxed py-1 min-h-[24px] max-h-40 scrollbar-thin disabled:opacity-50"
          />

          <button
            onClick={handleSend}
            disabled={!value.trim() || disabled}
            className="flex-shrink-0 w-9 h-9 bg-navy text-white rounded-xl flex items-center justify-center hover:bg-gold hover:text-navy disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-1 mb-0.5"
            aria-label="Enviar mensaje"
          >
            <svg
              className="w-4 h-4 rotate-90"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 19V5m0 0l-7 7m7-7l7 7"
              />
            </svg>
          </button>
        </div>

        <p className="text-xs text-warm-400 text-center mt-2 font-kumbh">
          Pulsa{' '}
          <kbd className="bg-warm-200 px-1 rounded text-[10px] font-mono">Enter</kbd> para enviar
          ·{' '}
          <kbd className="bg-warm-200 px-1 rounded text-[10px] font-mono">Shift+Enter</kbd> para nueva línea
        </p>
      </div>
    </div>
  )
}
