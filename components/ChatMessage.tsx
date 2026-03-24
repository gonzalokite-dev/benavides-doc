'use client'

import { useState } from 'react'
import DocumentCard from './DocumentCard'
import ClientCard from './ClientCard'
import type { Documento } from '@/lib/db'
import type { AirtableCliente, AirtableExpediente } from '@/lib/airtable'

export type SearchIntent = {
  cliente: string | null
  tipo_documento: string | null
  ejercicio_fiscal: number | null
}

export type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  documents?: Documento[]
  type?: 'text' | 'search' | 'cliente' | 'expedientes' | 'error' | 'welcome'
  intent?: SearchIntent
  cliente?: AirtableCliente
  expedientes?: AirtableExpediente[]
}

// ─── Intent badges ────────────────────────────────────────────────────────────

function IntentBadges({ intent }: { intent: SearchIntent }) {
  const chips: string[] = []
  if (intent.cliente) chips.push(`👤 ${intent.cliente}`)
  if (intent.tipo_documento) chips.push(`📄 ${intent.tipo_documento}`)
  if (intent.ejercicio_fiscal) chips.push(`📅 ${intent.ejercicio_fiscal}`)
  if (chips.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-warm-100">
      <span className="text-xs text-warm-400 font-kumbh self-center">Interpreté:</span>
      {chips.map((chip) => (
        <span key={chip} className="text-xs bg-gold/10 text-gold-700 border border-gold/20 px-2 py-0.5 rounded-full font-kumbh font-medium">
          {chip}
        </span>
      ))}
    </div>
  )
}

// ─── Feedback ─────────────────────────────────────────────────────────────────

function FeedbackButtons({ messageId }: { messageId: string }) {
  const [sent, setSent] = useState<'up' | 'down' | null>(null)

  async function sendFeedback(value: 'up' | 'down') {
    if (sent) return
    setSent(value)
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, feedback: value }),
      })
    } catch { /* ignore */ }
  }

  if (sent) {
    return <span className="text-xs text-warm-400 font-kumbh">{sent === 'up' ? '¡Gracias!' : 'Anotado, lo mejoraremos.'}</span>
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-warm-400 font-kumbh">¿Útil?</span>
      <button onClick={() => sendFeedback('up')} className="text-sm hover:scale-110 transition-transform" title="Sí">👍</button>
      <button onClick={() => sendFeedback('down')} className="text-sm hover:scale-110 transition-transform" title="No">👎</button>
    </div>
  )
}

// ─── Type group (collapsible) ─────────────────────────────────────────────────

function TypeGroup({ tipo, docs }: { tipo: string; docs: Documento[] }) {
  const [open, setOpen] = useState(true)

  return (
    <div className="border border-warm-200 rounded-xl overflow-hidden bg-white">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-warm-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-navy font-kumbh">{tipo}</span>
          <span className="text-xs bg-gold/15 text-gold-700 border border-gold/20 px-1.5 py-0.5 rounded-full font-medium">
            {docs.length}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-warm-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-warm-100 divide-y divide-warm-100">
          {docs.map((doc) => (
            <DocumentCard key={doc.id} documento={doc} compact />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Expediente view ──────────────────────────────────────────────────────────

function ExpedientePanel({
  documents,
  intent,
  messageId,
  onSearch,
}: {
  documents: Documento[]
  intent?: SearchIntent
  messageId: string
  onSearch?: (q: string) => void
}) {
  const [yearFilter, setYearFilter] = useState<number | null>(intent?.ejercicio_fiscal ?? null)

  // Unique clients
  const clients = [...new Set(documents.map((d) => d.cliente).filter(Boolean))] as string[]
  const isSingleClient = clients.length === 1

  // Years available
  const years = [...new Set(
    documents.map((d) => d.ejercicio_fiscal).filter((y): y is number => y !== null)
  )].sort((a, b) => b - a)

  const minYear = years.length ? Math.min(...years) : null
  const maxYear = years.length ? Math.max(...years) : null

  // Filtered docs
  const filtered = yearFilter ? documents.filter((d) => d.ejercicio_fiscal === yearFilter) : documents

  // Grouped by tipo
  const grouped = filtered.reduce<Record<string, Documento[]>>((acc, doc) => {
    const tipo = doc.tipo_documento || 'Otros'
    if (!acc[tipo]) acc[tipo] = []
    acc[tipo].push(doc)
    return acc
  }, {})
  const sortedTypes = Object.entries(grouped).sort((a, b) => b[1].length - a[1].length)

  // Is this already a full expedition query?
  const isFullExpediente = !intent?.tipo_documento && !intent?.ejercicio_fiscal

  return (
    <div className="space-y-2.5">

      {/* Client summary card */}
      {isSingleClient && (
        <div className="bg-navy/5 border border-navy/10 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-navy truncate font-kumbh">{clients[0]}</p>
            <p className="text-xs text-warm-500 mt-0.5 font-kumbh">
              {documents.length} {documents.length === 1 ? 'documento' : 'documentos'}
              {minYear && maxYear && minYear !== maxYear && ` · ${minYear}–${maxYear}`}
              {minYear && maxYear && minYear === maxYear && ` · ${minYear}`}
              {` · ${sortedTypes.length} ${sortedTypes.length === 1 ? 'tipo' : 'tipos'}`}
            </p>
          </div>
          {/* Quick action: ver expediente completo */}
          {!isFullExpediente && onSearch && (
            <button
              onClick={() => onSearch(`todos los documentos de ${clients[0]}`)}
              className="flex-shrink-0 flex items-center gap-1.5 text-xs text-navy border border-navy/20 bg-white px-3 py-1.5 rounded-lg hover:bg-navy hover:text-white transition-colors font-kumbh whitespace-nowrap"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              Ver expediente completo
            </button>
          )}
        </div>
      )}

      {/* Year filter chips */}
      {years.length > 1 && (
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setYearFilter(null)}
            className={`text-xs px-3 py-1 rounded-full border font-kumbh transition-colors ${
              yearFilter === null
                ? 'bg-navy text-white border-navy'
                : 'bg-white text-warm-500 border-warm-200 hover:border-navy/40'
            }`}
          >
            Todos
          </button>
          {years.map((y) => (
            <button
              key={y}
              onClick={() => setYearFilter(yearFilter === y ? null : y)}
              className={`text-xs px-3 py-1 rounded-full border font-kumbh transition-colors ${
                yearFilter === y
                  ? 'bg-navy text-white border-navy'
                  : 'bg-white text-warm-500 border-warm-200 hover:border-navy/40'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      )}

      {/* Grouped results */}
      {sortedTypes.map(([tipo, docs]) => (
        <TypeGroup key={tipo} tipo={tipo} docs={docs} />
      ))}

      {/* Footer */}
      <div className="flex items-center justify-between px-1 pt-0.5">
        <p className="text-xs text-warm-400 font-kumbh">
          {filtered.length} {filtered.length === 1 ? 'documento' : 'documentos'}
          {yearFilter ? ` en ${yearFilter}` : ''}
        </p>
        <FeedbackButtons messageId={messageId} />
      </div>
    </div>
  )
}

// ─── Main ChatMessage ─────────────────────────────────────────────────────────

interface ChatMessageProps {
  message: Message
  onSearch?: (q: string) => void
}

export default function ChatMessage({ message, onSearch }: ChatMessageProps) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] bg-navy/90 text-white px-4 py-3 rounded-2xl rounded-tr-sm shadow-sm">
          <p className="text-sm font-kumbh leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    )
  }

  const isSearch = message.type === 'search'
  const isCliente = message.type === 'cliente'
  const isExpedientes = message.type === 'expedientes'
  const hasDocs = message.documents && message.documents.length > 0
  const hasCliente = !!message.cliente
  const hasExpedientes = !!(message.expedientes && message.expedientes.length > 0)

  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] w-full space-y-3">

        {/* Text bubble */}
        <div className="bg-white border border-warm-200 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm">
          <div className="flex items-start gap-2.5">
            <div className="w-6 h-6 bg-gold rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-navy text-xs font-lora font-bold">B</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-kumbh leading-relaxed ${message.type === 'error' ? 'text-red-600' : 'text-navy/90'}`}>
                {message.content}
              </p>
              {(isSearch || isCliente || isExpedientes) && message.intent && <IntentBadges intent={message.intent} />}
            </div>
          </div>
        </div>

        {/* Client card (Airtable data) — for busqueda/consulta_cliente, shows full card with expedientes */}
        {hasCliente && !isExpedientes && (
          <ClientCard
            cliente={message.cliente!}
            expedientes={message.expedientes ?? []}
          />
        )}

        {/* Expedientes result — when busqueda_expedientes is the primary intent */}
        {isExpedientes && hasExpedientes && (
          <ClientCard
            cliente={message.cliente ?? { id: '', nombre: '', nif: null, email: null, telefono: null, tipo: null, ubicacion: null, estadoComercial: null, servicios: [], cuota: null, asesor: null, fechaAlta: null }}
            expedientes={message.expedientes!}
            expedientesOnly={!message.cliente}
          />
        )}

        {/* Document panel */}
        {hasDocs && (
          <ExpedientePanel
            documents={message.documents!}
            intent={message.intent}
            messageId={message.id}
            onSearch={onSearch}
          />
        )}

        {/* Feedback */}
        {(isSearch || isCliente || isExpedientes) && !hasDocs && !hasExpedientes && !hasCliente && (
          <div className="pl-1"><FeedbackButtons messageId={message.id} /></div>
        )}
      </div>
    </div>
  )
}

export function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-white border border-warm-200 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 bg-gold rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-navy text-xs font-lora font-bold">B</span>
          </div>
          <div className="flex gap-1 items-center">
            <span className="w-2 h-2 bg-warm-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-2 h-2 bg-warm-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="w-2 h-2 bg-warm-400 rounded-full animate-bounce" />
          </div>
        </div>
      </div>
    </div>
  )
}
