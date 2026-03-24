import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export type SearchIntent = {
  tipo: 'busqueda'
  cliente: string | null
  cliente_nif: string | null
  tipo_documento: string | null
  ejercicio_fiscal: number | null
  palabras_clave: string[]
}

export type NonDocumental = {
  tipo: 'no_documental'
  mensaje: string
}

export type ClaudeIntent = SearchIntent | NonDocumental

const EXTRACT_PROMPT = `Eres un extractor de datos para un buscador de documentos de asesoría fiscal en Benavides Asociados.

Recibirás un mensaje del equipo. SIEMPRE responde con JSON puro, sin texto adicional.

REGLA PRINCIPAL: Si el mensaje menciona cualquier cliente, modelo fiscal, documento o archivo → tipo "busqueda".
Si piden "todos" los documentos de un cliente → tipo_documento: null y cliente relleno.
Solo usa "no_documental" para saludos o preguntas sin relación con documentos.

Formato búsqueda:
{"tipo":"busqueda","cliente":"nombre del cliente TAL COMO LO ESCRIBE EL USUARIO (no expandas abreviaturas ni añadas razón social) o null","cliente_nif":"NIF/NIE/CIF o null","tipo_documento":"tipo normalizado o null","ejercicio_fiscal":2024,"palabras_clave":["termino1","termino2"]}

IMPORTANTE sobre el cliente: usa SIEMPRE el término exacto que escribió el usuario. Si dice "afama" → "afama". Si dice "garcia" → "garcia". Si dice "Sa Fonda" → "Sa Fonda". NO pongas "AFAMA S.L." si el usuario solo escribió "afama".

Formato sin documentos:
{"tipo":"no_documental","mensaje":"Solo puedo ayudarte a buscar documentos de clientes."}

TIPOS DE DOCUMENTO — normaliza así:
Modelos fiscales:
  036, alta censal → "Modelo 036"
  037 → "Modelo 037"
  303, iva trimestral → "Modelo 303"
  390, resumen iva anual → "Modelo 390"
  200, impuesto sociedades, IS → "Modelo 200"
  111, retenciones trabajadores → "Modelo 111"
  190, resumen retenciones → "Modelo 190"
  347, operaciones terceros → "Modelo 347"
  349, intracomunitarias → "Modelo 349"
  115, retenciones alquiler → "Modelo 115"
  130, pagos fraccionados → "Modelo 130"
  720, bienes exterior → "Modelo 720"
  renta, irpf, declaración renta → "Declaración de la renta"
  sucesiones, herencia → "Impuesto de Sucesiones"
  plusvalia → "Plusvalía"
  ibi → "IBI (recibo)"

Documentos no fiscales:
  contrato alquiler, arrendamiento → "Contrato de alquiler"
  contrato compraventa → "Contrato de compraventa"
  contrato → "Contrato"
  escritura constitución → "Escritura de constitución"
  escritura propiedad, escritura compraventa → "Escritura de propiedad"
  escritura → "Escritura"
  licencia actividad, apertura → "Licencia de actividad"
  certificado residencia fiscal → "Certificado de residencia fiscal"
  certificado digital → "Certificado digital"
  certificado → "Certificado"
  poder notarial → "Poder notarial"
  nie, nif → "NIE / NIF documento"
  nómina, nomina → "Nómina"
  factura → "Factura"
  vida laboral → "Vida laboral"

Carpetas del sistema (úsalas en palabras_clave si el usuario las menciona):
  "Clientes", "No Residentes", "Campaña de Renta", "IRPF", "Informes Fiscales", "Certificados digitales"

En palabras_clave incluye: nombre del cliente, tipo de documento y año si se mencionan.
Si el usuario pide "todo" o "todos los documentos" → tipo_documento: null, y pon el nombre del cliente en palabras_clave.
Responde ÚNICAMENTE con el JSON. Cero texto adicional.`

export async function extractSearchIntent(
  userMessage: string
): Promise<ClaudeIntent> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 256,
    system: EXTRACT_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text.trim() : ''

  // Strip markdown code blocks if Claude added them
  const clean = text.replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim()

  try {
    return JSON.parse(clean) as ClaudeIntent
  } catch {
    // If JSON fails, default to search with the raw message as keyword
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

export async function generateSearchResponse(
  userMessage: string,
  documents: Array<Record<string, unknown>>,
  intent: SearchIntent
): Promise<string> {
  if (documents.length > 0) {
    const count = documents.length
    const cliente = intent.cliente ? ` de ${intent.cliente}` : ''
    const tipo = intent.tipo_documento ? intent.tipo_documento : 'documentos'
    return `He encontrado ${count} ${count === 1 ? 'resultado' : 'resultados'} de ${tipo}${cliente}. Aquí tienes ${count === 1 ? 'el archivo' : 'los archivos'} con el enlace de descarga directo:`
  }

  // No results — generate a clear, specific message
  const clienteTexto = intent.cliente ? `"${intent.cliente}"` : null
  const tipoTexto = intent.tipo_documento ?? null
  const añoTexto = intent.ejercicio_fiscal ? `del ${intent.ejercicio_fiscal}` : ''

  let contexto = 'No se encontró ningún documento'
  if (clienteTexto && tipoTexto) contexto = `No se encontró ${tipoTexto} ${añoTexto} para el cliente ${clienteTexto}`
  else if (clienteTexto) contexto = `No se encontró ningún documento para el cliente ${clienteTexto}`
  else if (tipoTexto) contexto = `No se encontró ningún ${tipoTexto} ${añoTexto}`

  const prompt = `El equipo de Benavides Asociados buscó: "${userMessage}"
${contexto}.

Escribe un mensaje corto (2 frases máximo) en español que:
1. Confirme que no hay resultados, siendo específico sobre qué se buscó.
2. Sugiera qué hacer: probar con otro término, verificar si el cliente existe en el sistema, o contactar con el responsable del archivo.
Sin markdown. Sin listas. Tono profesional y directo.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 150,
    system: 'Eres el asistente documental de Benavides Asociados. Responde en español, de forma directa y concisa. Nunca expliques tus capacidades técnicas.',
    messages: [{ role: 'user', content: prompt }],
  })

  return response.content[0].type === 'text'
    ? response.content[0].text.trim()
    : `No encontré documentos para "${userMessage}". Prueba con el nombre completo del cliente o un término diferente.`
}
