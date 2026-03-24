import type { AirtableCliente, AirtableExpediente } from '@/lib/airtable'

const ESTADO_COLORS: Record<string, string> = {
  'Activo':     'bg-green-50 text-green-700 border-green-200',
  'Inactivo':   'bg-warm-100 text-warm-500 border-warm-200',
  'Potencial':  'bg-blue-50 text-blue-700 border-blue-200',
  'Perdido':    'bg-red-50 text-red-600 border-red-200',
}

const EXPEDIENTE_ESTADO_COLORS: Record<string, string> = {
  'En curso':   'bg-blue-50 text-blue-700',
  'Completado': 'bg-green-50 text-green-700',
  'Pendiente':  'bg-amber-50 text-amber-700',
  'Cancelado':  'bg-red-50 text-red-600',
}

function formatDate(d: string | null): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatCurrency(n: number | null): string {
  if (n === null) return ''
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n)
}

interface ClientCardProps {
  cliente: AirtableCliente
  expedientes: AirtableExpediente[]
}

export default function ClientCard({ cliente, expedientes }: ClientCardProps) {
  const estadoClass = ESTADO_COLORS[cliente.estadoComercial ?? ''] ?? 'bg-warm-100 text-warm-500 border-warm-200'
  const openExpedientes = expedientes.filter(e => e.estado !== 'Completado' && e.estado !== 'Cancelado')

  return (
    <div className="bg-white border border-navy/10 rounded-xl overflow-hidden shadow-sm">

      {/* Header */}
      <div className="bg-navy/5 px-4 py-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-navy font-kumbh truncate">{cliente.nombre}</p>
            {cliente.nif && (
              <span className="text-xs bg-gold/15 text-gold-700 border border-gold/20 px-2 py-0.5 rounded-full font-kumbh font-medium flex-shrink-0">
                {cliente.nif}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {cliente.estadoComercial && (
              <span className={`text-xs px-2 py-0.5 rounded-full border font-kumbh font-medium ${estadoClass}`}>
                {cliente.estadoComercial}
              </span>
            )}
            {cliente.tipo && (
              <span className="text-xs text-warm-400 font-kumbh">{cliente.tipo}</span>
            )}
            {cliente.ubicacion && (
              <span className="text-xs text-warm-400 font-kumbh">· {cliente.ubicacion}</span>
            )}
          </div>
        </div>

        {/* Asesor badge */}
        {cliente.asesor && (
          <div className="flex-shrink-0 flex items-center gap-1.5 bg-navy/5 rounded-lg px-2.5 py-1.5">
            <div className="w-5 h-5 bg-navy rounded-full flex items-center justify-center">
              <span className="text-white text-[9px] font-bold">
                {cliente.asesor.split(' ').map(n => n[0]).slice(0, 2).join('')}
              </span>
            </div>
            <span className="text-xs text-navy font-kumbh font-medium">{cliente.asesor.split(' ')[0]}</span>
          </div>
        )}
      </div>

      {/* Contact + financial row */}
      <div className="px-4 py-3 flex flex-wrap gap-x-5 gap-y-1.5 border-b border-warm-100">
        {cliente.email && (
          <a href={`mailto:${cliente.email}`} className="flex items-center gap-1.5 text-xs text-warm-500 hover:text-navy font-kumbh">
            <svg className="w-3.5 h-3.5 text-warm-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {cliente.email}
          </a>
        )}
        {cliente.telefono && (
          <a href={`tel:${cliente.telefono}`} className="flex items-center gap-1.5 text-xs text-warm-500 hover:text-navy font-kumbh">
            <svg className="w-3.5 h-3.5 text-warm-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            {cliente.telefono}
          </a>
        )}
        {cliente.cuota && (
          <span className="flex items-center gap-1.5 text-xs text-warm-500 font-kumbh">
            <svg className="w-3.5 h-3.5 text-warm-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {formatCurrency(cliente.cuota)}/mes
          </span>
        )}
      </div>

      {/* Services */}
      {cliente.servicios.length > 0 && (
        <div className="px-4 py-3 border-b border-warm-100">
          <p className="text-xs text-warm-400 font-kumbh mb-2">Servicios contratados</p>
          <div className="flex flex-wrap gap-1.5">
            {cliente.servicios.map(s => (
              <span key={s} className="text-xs bg-navy/5 text-navy/70 border border-navy/10 px-2 py-0.5 rounded-full font-kumbh">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Expedientes */}
      {expedientes.length > 0 && (
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-warm-400 font-kumbh">
              Expedientes
              {openExpedientes.length > 0 && (
                <span className="ml-1.5 bg-gold/15 text-gold-700 border border-gold/20 px-1.5 py-0.5 rounded-full font-medium">
                  {openExpedientes.length} activos
                </span>
              )}
            </p>
            <span className="text-xs text-warm-300 font-kumbh">{expedientes.length} total</span>
          </div>
          <div className="space-y-1.5">
            {expedientes.slice(0, 5).map(exp => (
              <div key={exp.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-navy/80 font-kumbh truncate">{exp.nombre || exp.identificador}</p>
                  {exp.tipoServicio.length > 0 && (
                    <p className="text-xs text-warm-400 font-kumbh truncate">{exp.tipoServicio.join(', ')}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {exp.fechaVencimiento && (
                    <span className="text-xs text-warm-400 font-kumbh">{formatDate(exp.fechaVencimiento)}</span>
                  )}
                  {exp.estado && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-kumbh font-medium ${EXPEDIENTE_ESTADO_COLORS[exp.estado] ?? 'bg-warm-100 text-warm-500'}`}>
                      {exp.estado}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {expedientes.length > 5 && (
              <p className="text-xs text-warm-400 font-kumbh pt-1">+{expedientes.length - 5} más</p>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
