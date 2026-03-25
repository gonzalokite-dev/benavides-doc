import Anthropic from '@anthropic-ai/sdk'
import type { AirtableCliente, AirtableExpediente } from './airtable'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── Types ────────────────────────────────────────────────────────────────────

export type HistoryMessage = { role: 'user' | 'assistant'; content: string }

export type SearchIntent = {
  tipo: 'busqueda'
  cliente: string | null
  cliente_nif: string | null
  tipo_documento: string | null
  ejercicio_fiscal: number | null
  palabras_clave: string[]
}

export type ConsultaCliente = {
  tipo: 'consulta_cliente'
  cliente: string
  pregunta: string
}

export type BusquedaExpedientes = {
  tipo: 'busqueda_expedientes'
  cliente: string | null
  estado: string | null
  tipo_servicio: string | null
  vencidos: boolean
  keyword: string | null
}

export type NonDocumental = {
  tipo: 'no_documental'
  mensaje: string
}

export type ClaudeIntent = SearchIntent | ConsultaCliente | BusquedaExpedientes | NonDocumental

// ─── System prompt ────────────────────────────────────────────────────────────

const ARGOS_SYSTEM = `Eres Argos, el asistente inteligente de Benavides Asociados (asesoría fiscal en Baleares).
Tienes acceso a:
1. Más de 10.000 documentos de clientes en SharePoint (contratos, modelos fiscales, escrituras, certificados...)
2. El CRM de clientes y expedientes en Airtable

CÓMO RESPONDER:
- Analiza los datos proporcionados y responde de forma directa, útil y profesional
- Si hay documentos: menciona los más relevantes con detalles concretos (tipo, año, fecha)
- Si tienes datos del CRM: úsalos para dar contexto (servicios, asesor, expedientes pendientes)
- Puedes hacer análisis: contar documentos por año, detectar si falta algo, comparar periodos
- Si no hay resultados: explica claramente y sugiere alternativas concretas
- Máximo 3-4 frases. Sin markdown. Sin listas. Texto fluido y natural.
- NUNCA inventes datos que no estén en los resultados proporcionados
- Habla en primera persona como Argos`

// ─── Intent extraction (con memoria conversacional) ───────────────────────────

const EXTRACT_PROMPT = `Eres un extractor de datos para Argos, el asistente de Benavides Asociados.
Argos tiene acceso a documentos de SharePoint Y a la base de datos CRM de clientes (Airtable).

Recibirás el historial de la conversación y el mensaje actual. SIEMPRE responde con JSON puro.

IMPORTANTE — MEMORIA: Si el mensaje actual es ambiguo ("el de 2023", "¿y los contratos?", "¿cuántos tiene?"),
usa el historial para inferir a qué cliente o documento se refiere.

HAY 4 TIPOS:

1. busqueda — archivos, contratos, modelos, escrituras, PDFs
{"tipo":"busqueda","cliente":"nombre EXACTO del usuario o null","cliente_nif":"NIF o null","tipo_documento":"normalizado o null","ejercicio_fiscal":2024,"palabras_clave":["term"]}

2. busqueda_expedientes — expedientes de trabajo (abiertos, pendientes, vencidos, en curso)
{"tipo":"busqueda_expedientes","cliente":"nombre o null","estado":"En curso|Pendiente|Completado|Cancelado|null","tipo_servicio":"Renta|IVA|etc o null","vencidos":false,"keyword":"term o null"}

3. consulta_cliente — datos CRM de un cliente: servicios, cuota, asesor, contacto, estado
{"tipo":"consulta_cliente","cliente":"nombre","pregunta":"resumen"}

4. no_documental — saludos, preguntas ajenas
{"tipo":"no_documental","mensaje":"Solo puedo ayudarte con documentos, expedientes o información de clientes."}

TIPOS DE DOCUMENTO normalizados:
303/iva trimestral→"Modelo 303" | 390→"Modelo 390" | 036/alta censal→"Modelo 036" | 200/sociedades→"Modelo 200"
111/retenciones→"Modelo 111" | 190→"Modelo 190" | 347→"Modelo 347" | 349→"Modelo 349"
115/alquiler→"Modelo 115" | 130/pagos fraccionados→"Modelo 130" | 720→"Modelo 720"
renta/irpf→"Declaración de la renta" | sucesiones→"Impuesto de Sucesiones" | plusvalia→"Plusvalía"
contrato alquiler→"Contrato de alquiler" | escritura constitución→"Escritura de constitución"
escritura propiedad→"Escritura de propiedad" | certificado digital→"Certificado digital"
poder notarial→"Poder notarial" | nomina→"Nómina" | factura→"Factura" | vida laboral→"Vida laboral"

Responde ÚNICAMENTE con el JSON.`

export async function extractSearchIntent(
  userMessage: string,
  history: HistoryMessage[] = []
): Promise<ClaudeIntent> {
  // Build messages: last 3 user turns as context + current message
  const contextLines = history
    .filter((m) => m.role === 'user')
    .slice(-3)
    .map((m) => `Consulta anterior: "${m.content}"`)
    .join('\n')

  const fullMessage = contextLines
    ? `${contextLines}\n\nConsulta actual: "${userMessage}"`
    : userMessage

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 256,
    system: EXTRACT_PROMPT,
    messages: [{ role: 'user', content: fullMessage }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
  const clean = text.replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim()

  try {
    return JSON.parse(clean) as ClaudeIntent
  } catch {
    return {
      tipo: 'busqueda',
      cliente: null,
      cliente_nif: null,
      tipo_documento: null,
      ejercicio_fiscal: null,
      palabras_clave: userMessage.split(' ').filter((w) => w.length > 2),
    }
  }
}

// ─── Generative response (A + C) ──────────────────────────────────────────────

type DocContext = {
  nombre_archivo: string
  tipo_documento?: string
  cliente?: string
  ejercicio_fiscal?: number
  fecha_documento?: string
  descripcion?: string
  carpeta_origen?: string
}

function formatDocsForContext(docs: DocContext[]): string {
  if (docs.length === 0) return 'Sin resultados.'
  return docs
    .slice(0, 15)
    .map((d, i) => {
      const parts = [
        `[${d.tipo_documento ?? 'Documento'}]`,
        d.cliente ?? d.carpeta_origen ?? '',
        d.ejercicio_fiscal ? `· ${d.ejercicio_fiscal}` : '',
        d.fecha_documento ? `· ${d.fecha_documento}` : '',
        d.descripcion ? `· "${d.descripcion.slice(0, 120)}"` : '',
      ].filter(Boolean)
      return `${i + 1}. ${d.nombre_archivo} — ${parts.join(' ')}`
    })
    .join('\n')
}

function formatClienteForContext(
  cliente: AirtableCliente | null,
  expedientes: AirtableExpediente[]
): string {
  if (!cliente) return ''

  const lines = [
    `CLIENTE CRM: ${cliente.nombre}${cliente.nif ? ` (${cliente.nif})` : ''}`,
    cliente.estadoComercial ? `Estado: ${cliente.estadoComercial}` : '',
    cliente.asesor ? `Asesor: ${cliente.asesor}` : '',
    cliente.servicios.length ? `Servicios: ${cliente.servicios.join(', ')}` : '',
    cliente.cuota ? `Cuota: ${cliente.cuota}€/mes` : '',
    cliente.email ? `Email: ${cliente.email}` : '',
    cliente.telefono ? `Tel: ${cliente.telefono}` : '',
  ].filter(Boolean)

  if (expedientes.length > 0) {
    lines.push(`Expedientes (${expedientes.length}):`)
    expedientes.slice(0, 5).forEach((e) => {
      const venc = e.fechaVencimiento ? ` | vence ${e.fechaVencimiento}` : ''
      const vencido = e.diasVencidos && e.diasVencidos > 0 ? ` ⚠️ +${e.diasVencidos}d vencido` : ''
      lines.push(`  - ${e.nombre || e.identificador} [${e.estado ?? '?'}]${venc}${vencido}`)
    })
  }

  return lines.join('\n')
}

export async function generateAssistantResponse(params: {
  userMessage: string
  documents: DocContext[]
  cliente: AirtableCliente | null
  expedientes: AirtableExpediente[]
  history: HistoryMessage[]
  intent: SearchIntent | ConsultaCliente | BusquedaExpedientes
}): Promise<string> {
  const { userMessage, documents, cliente, expedientes, history, intent } = params

  const docsContext = formatDocsForContext(documents)
  const clienteContext = formatClienteForContext(cliente, expedientes)

  const contextBlock = [
    documents.length > 0 ? `DOCUMENTOS ENCONTRADOS (${documents.length} total, mostrando hasta 15):\n${docsContext}` : 'DOCUMENTOS: Sin resultados para esta búsqueda.',
    clienteContext ? `\n${clienteContext}` : '',
  ].filter(Boolean).join('\n')

  // Simplified history for context (last 3 exchanges)
  const historyMessages: Anthropic.MessageParam[] = history.slice(-6).map((m) => ({
    role: m.role,
    content: m.content.slice(0, 300), // truncate long messages
  }))

  const userPrompt = `El equipo pregunta: "${userMessage}"

${contextBlock}

Genera una respuesta directa y útil basándote en estos datos.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    system: ARGOS_SYSTEM,
    messages: [
      ...historyMessages,
      { role: 'user', content: userPrompt },
    ],
  })

  return response.content[0].type === 'text'
    ? response.content[0].text.trim()
    : documents.length > 0
      ? `He encontrado ${documents.length} documentos relacionados con tu búsqueda.`
      : `No encontré resultados para "${userMessage}". Prueba con otro término o verifica el nombre del cliente.`
}

// ─── Cliente response (consulta CRM) ─────────────────────────────────────────

export async function generateClienteResponse(
  pregunta: string,
  clienteNombre: string,
  clienteData: Record<string, unknown> | null,
  expedientesData: Record<string, unknown>[]
): Promise<string> {
  if (!clienteData) {
    return `No encontré a "${clienteNombre}" en la base de datos de clientes. Verifica el nombre o prueba con el NIF.`
  }

  const contexto = JSON.stringify({ cliente: clienteData, expedientes: expedientesData }, null, 2)

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 250,
    system: ARGOS_SYSTEM,
    messages: [{
      role: 'user',
      content: `El equipo pregunta: "${pregunta}"\n\nDATOS CRM:\n${contexto}\n\nResponde directamente usando estos datos.`,
    }],
  })

  return response.content[0].type === 'text'
    ? response.content[0].text.trim()
    : `He encontrado la ficha de ${clienteNombre} en el sistema.`
}
