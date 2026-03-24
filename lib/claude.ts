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

const EXTRACT_PROMPT = `Eres un extractor de datos para un buscador de documentos de asesoría fiscal.

Recibirás un mensaje del equipo de Benavides Asociados. SIEMPRE responde con JSON puro, sin texto adicional.

REGLA PRINCIPAL: Si el mensaje menciona cualquier cliente, modelo fiscal, documento o archivo → tipo "busqueda".
Solo usa "no_documental" para saludos o preguntas sin relación con documentos (ej: "¿qué tiempo hace?").

Formato para búsqueda de documentos:
{"tipo":"busqueda","cliente":"nombre exacto del cliente o null","cliente_nif":"NIF/NIE/CIF si se menciona o null","tipo_documento":"tipo de documento o null","ejercicio_fiscal":2024,"palabras_clave":["termino1","termino2"]}

Formato para mensajes sin relación con documentos:
{"tipo":"no_documental","mensaje":"Solo puedo ayudarte a buscar documentos de clientes. Prueba con: 'modelo 303 de [cliente]' o 'contrato de [cliente]'."}

Modelos fiscales — traducciones:
036, censal → "Modelo 036"
303, iva trimestral → "Modelo 303"
390, resumen iva → "Modelo 390"
200, sociedades → "Modelo 200"
111, retenciones → "Modelo 111"
190, resumen retenciones → "Modelo 190"
347, operaciones terceros → "Modelo 347"
349, intracomunitarias → "Modelo 349"
renta, irpf → "Declaración de la renta"
sucesiones → "Impuesto de Sucesiones"

En palabras_clave incluye el nombre del cliente, tipo de documento y año si se menciona.
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

  // No results — ask Claude for helpful suggestions
  const prompt = `El equipo de Benavides Asociados buscó: "${userMessage}"
Cliente buscado: ${intent.cliente ?? 'no especificado'}
Tipo de documento: ${intent.tipo_documento ?? 'no especificado'}
No se encontraron documentos en la base de datos.

Escribe exactamente 2 frases en español:
1. Di que no encontraste el documento (menciona cliente y tipo si se dieron).
2. Sugiere cómo reformular la búsqueda (prueba con nombre completo, otro año, etc).
Sin markdown. Sin listas. Solo texto plano.`

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
