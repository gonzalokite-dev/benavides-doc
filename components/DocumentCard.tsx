import type { Documento } from '@/lib/db'

function getFileIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase()

  if (ext === 'pdf') {
    return (
      <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="6" fill="#E53E3E" />
        <text x="16" y="21" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="sans-serif">
          PDF
        </text>
      </svg>
    )
  }

  if (ext === 'docx' || ext === 'doc') {
    return (
      <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="6" fill="#2B579A" />
        <text x="16" y="21" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="sans-serif">
          DOC
        </text>
      </svg>
    )
  }

  if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
    return (
      <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="6" fill="#217346" />
        <text x="16" y="21" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="sans-serif">
          XLS
        </text>
      </svg>
    )
  }

  if (ext === 'msg' || ext === 'eml') {
    return (
      <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="6" fill="#0078D4" />
        <text x="16" y="21" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="sans-serif">
          MSG
        </text>
      </svg>
    )
  }

  if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') {
    return (
      <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="6" fill="#D69E2E" />
        <text x="16" y="21" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="sans-serif">
          IMG
        </text>
      </svg>
    )
  }

  return (
    <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="6" fill="#718096" />
      <text x="16" y="21" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="sans-serif">
        FILE
      </text>
    </svg>
  )
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })
}

interface DocumentCardProps {
  documento: Documento
  compact?: boolean
}

export default function DocumentCard({ documento, compact = false }: DocumentCardProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-3 py-2 px-3 hover:bg-warm-50 rounded-lg group">
        <div className="flex-shrink-0">{getFileIcon(documento.nombre_archivo)}</div>
        <div className="flex-1 min-w-0">
          <p className="text-navy font-medium text-sm leading-tight truncate" title={documento.nombre_archivo}>
            {documento.nombre_archivo}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {documento.ejercicio_fiscal && (
              <span className="text-xs bg-gold/10 text-gold-700 px-1.5 py-0.5 rounded-full font-medium">
                {documento.ejercicio_fiscal}
              </span>
            )}
            {documento.fecha_documento && (
              <span className="text-xs text-warm-400 font-kumbh">{formatDate(documento.fecha_documento)}</span>
            )}
          </div>
        </div>
        <a
          href={documento.enlace_descarga}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 flex items-center gap-1 bg-navy/5 text-navy text-xs font-medium px-2.5 py-1.5 rounded-lg hover:bg-gold hover:text-navy transition-colors whitespace-nowrap"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Descargar
        </a>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-warm-200 p-4 hover:shadow-md hover:border-gold/30 group">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{getFileIcon(documento.nombre_archivo)}</div>
        <div className="flex-1 min-w-0">
          <p className="text-navy font-medium text-sm leading-tight truncate" title={documento.nombre_archivo}>
            {documento.nombre_archivo}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
            <span className="text-xs text-warm-500 font-kumbh">
              <span className="text-navy/50">Cliente:</span>{' '}
              <span className="text-navy/80 font-medium">{documento.cliente}</span>
            </span>
            <span className="text-xs text-warm-500 font-kumbh">
              <span className="text-navy/50">Tipo:</span>{' '}
              <span className="text-navy/80 font-medium">{documento.tipo_documento}</span>
            </span>
            {documento.ejercicio_fiscal && (
              <span className="text-xs bg-gold/10 text-gold-700 px-2 py-0.5 rounded-full font-medium">
                {documento.ejercicio_fiscal}
              </span>
            )}
            {documento.fecha_documento && (
              <span className="text-xs text-warm-400 font-kumbh">{formatDate(documento.fecha_documento)}</span>
            )}
          </div>
          {documento.carpeta_origen && (
            <p className="text-xs text-warm-400 mt-1 truncate font-kumbh">
              <svg className="inline w-3 h-3 mr-1 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              {documento.carpeta_origen}
            </p>
          )}
        </div>
        <div className="flex-shrink-0 ml-1">
          <a
            href={documento.enlace_descarga}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-navy text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-gold hover:text-navy focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-1 whitespace-nowrap"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Descargar
          </a>
        </div>
      </div>
    </div>
  )
}
