import DocumentCard from './DocumentCard'
import type { Documento } from '@/lib/db'

export type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  documents?: Documento[]
  type?: 'text' | 'search' | 'error' | 'welcome'
}

interface ChatMessageProps {
  message: Message
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] bg-navy/90 text-white px-4 py-3 rounded-2xl rounded-tr-sm shadow-sm">
          <p className="text-sm font-kumbh leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
      </div>
    )
  }

  // Assistant message
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] w-full space-y-3">
        {/* Text bubble */}
        <div className="bg-white border border-warm-200 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm">
          {/* Assistant icon */}
          <div className="flex items-start gap-2.5">
            <div className="w-6 h-6 bg-gold rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-navy text-xs font-lora font-bold">B</span>
            </div>
            <p
              className={`text-sm font-kumbh leading-relaxed flex-1 ${
                message.type === 'error' ? 'text-red-600' : 'text-navy/90'
              }`}
            >
              {message.content}
            </p>
          </div>
        </div>

        {/* Document cards */}
        {message.documents && message.documents.length > 0 && (
          <div className="space-y-2 pl-1">
            <p className="text-xs text-warm-400 font-kumbh pl-1">
              {message.documents.length}{' '}
              {message.documents.length === 1 ? 'documento encontrado' : 'documentos encontrados'}
            </p>
            {message.documents.map((doc) => (
              <DocumentCard key={doc.id} documento={doc} />
            ))}
          </div>
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
