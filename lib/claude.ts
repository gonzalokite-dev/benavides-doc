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

const SYSTEM_PROMPT = `Eres el asistente documental de Benavides Asociados, una asesoría fiscal y legal en las Islas Baleares.

Tu ÚNICA función es ayudar al equipo a encontrar documentos de clientes.

Cuando recibas una pregunta, extrae la información relevante y responde SIEMPRE con un objeto JSON válido sin texto adicional ni bloques de código.

Si la pregunta es sobre documentos, responde con este formato exacto:
{"tipo":"busqueda","cliente":"nombre del cliente o null","cliente_nif":"NIF/NIE si se menciona o null","tipo_documento":"tipo de documento o null","ejercicio_fiscal":año_como_número_o_null,"palabras_clave":["array","de","términos"]}

Si la pregunta NO es sobre documentos o búsqueda de archivos, responde con:
{"tipo":"no_documental","mensaje":"respuesta amable explicando que solo puedes ayudar con búsqueda de documentación de clientes"}

Interpreta los modelos fiscales españoles:
- "el 303", "iva trimestral", "iva" → "Modelo 303"
- "el 036" → "Modelo 036"
- "el 037" → "Modelo 037"
- "el 200", "sociedades", "IS" → "Modelo 200"
- "la renta", "irpf", "declaración de la renta" → "Declaración de la renta"
- "el 111", "retenciones" → "Modelo 111"
- "el 190", "resumen retenciones" → "Modelo 190"
- "el 390", "resumen anual iva" → "Modelo 390"
- "el 347", "operaciones con terceros" → "Modelo 347"
- "el 349", "intracomunitarias" → "Modelo 349"
- "censal" → "Modelo 036"
- "sucesiones" → "Impuesto de Sucesiones"

Sé flexible con nombres de clientes: "Vicusi", "inversiones vicusi", "Inversiones Vicusi SL" son el mismo cliente.
Para palabras_clave incluye sinónimos y variaciones del término buscado.
Responde SOLO con el JSON, sin explicaciones ni formato markdown.`

export async function extractSearchIntent(
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<ClaudeIntent> {
  const messages = [
    ...conversationHistory.slice(-6).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: userMessage },
  ]

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages,
  })

  const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '{}'

  try {
    return JSON.parse(text) as ClaudeIntent
  } catch {
    // If JSON parsing fails, treat as non-documental
    return {
      tipo: 'no_documental',
      mensaje: 'Lo siento, ha ocurrido un error procesando tu consulta. Por favor, inténtalo de nuevo.',
    }
  }
}

export async function generateSearchResponse(
  userMessage: string,
  documents: Array<Record<string, unknown>>,
  intent: SearchIntent
): Promise<string> {
  const docsContext =
    documents.length > 0
      ? `Documentos encontrados (${documents.length}):\n${JSON.stringify(documents, null, 2)}`
      : 'No se encontraron documentos.'

  const prompt = `El usuario buscó: "${userMessage}"
Intención detectada: cliente="${intent.cliente ?? 'no especificado'}", tipo="${intent.tipo_documento ?? 'no especificado'}", ejercicio=${intent.ejercicio_fiscal ?? 'no especificado'}

${docsContext}

Redacta una respuesta breve y natural en español para el equipo de Benavides Asociados:
- Si hay documentos: preséntalos de forma clara mencionando que aparecen las tarjetas con los enlaces de descarga.
- Si no hay documentos: sé empático y sugiere 2-3 variaciones de búsqueda concretas que podrían funcionar.
- Máximo 3 frases. Sin markdown ni listas.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 256,
    messages: [{ role: 'user', content: prompt }],
    system:
      'Eres el asistente documental de Benavides Asociados. Responde siempre en español, de forma concisa y profesional.',
  })

  return response.content[0].type === 'text'
    ? response.content[0].text.trim()
    : 'He procesado tu búsqueda.'
}
