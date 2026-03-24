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

export type ConsultaCliente = {
  tipo: 'consulta_cliente'
  cliente: string
  pregunta: string
}

export type NonDocumental = {
  tipo: 'no_documental'
  mensaje: string
}

export type ClaudeIntent = SearchIntent | ConsultaCliente | NonDocumental

const EXTRACT_PROMPT = `Eres un extractor de datos para Argos, el asistente de Benavides Asociados.
Argos tiene acceso a documentos de SharePoint Y a la base de datos CRM de clientes (Airtable).

Recibirás un mensaje del equipo. SIEMPRE responde con JSON puro, sin texto adicional.

HAY 3 TIPOS DE RESPUESTA:

1. BÚSQUEDA DE DOCUMENTOS — cuando piden archivos, contratos, modelos, escrituras, etc.
{"tipo":"busqueda","cliente":"nombre TAL COMO LO ESCRIBE EL USUARIO o null","cliente_nif":"NIF/NIE/CIF o null","tipo_documento":"tipo normalizado o null","ejercicio_fiscal":2024,"palabras_clave":["termino1"]}

2. CONSULTA DE CLIENTE — cuando preguntan por datos del CRM: servicios contratados, cuota, asesor, expedientes, contacto, estado comercial, información general del cliente.
Ejemplos: "¿qué servicios tiene X?", "info de X", "ficha de X", "¿cuál es la cuota de X?", "expedientes de X", "datos de contacto de X", "¿quién lleva a X?"
{"tipo":"consulta_cliente","cliente":"nombre del cliente","pregunta":"resumen breve de la pregunta"}

3. NO DOCUMENTAL — solo para saludos o preguntas sin relación con documentos ni clientes.
{"tipo":"no_documental","mensaje":"Solo puedo ayudarte a buscar documentos o información de clientes."}

REGLAS:
- Si piden documentos → "busqueda"
- Si preguntan por datos del cliente (no archivos) → "consulta_cliente"
- Si piden "todo de X" o "expediente de X" → "busqueda" (incluye documentos)
- IMPORTANTE: en "busqueda", el cliente es SIEMPRE el término exacto que escribió el usuario. Si dice "afama" → "afama". Si dice "garcia" → "garcia".

Formato sin documentos:
{"tipo":"no_documental","mensaje":"Solo puedo ayudarte a buscar documentos o información de clientes."}

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

export async function generateClienteResponse(
  pregunta: string,
  clienteNombre: string,
  clienteData: Record<string, unknown> | null,
  expedientesData: Record<string, unknown>[]
): Promise<string> {
  if (!clienteData) {
    return `No encontré a "${clienteNombre}" en la base de datos de clientes. Verifica el nombre o prueba con el NIF.`
  }

  const resumen = JSON.stringify({ cliente: clienteData, expedientes: expedientesData }, null, 2)

  const prompt = `El equipo pregunta: "${pregunta}"

Datos del cliente en el CRM:
${resumen}

Responde en español, de forma directa y concisa (máximo 3 frases). Usa los datos disponibles. Sin markdown. Sin listas. Solo texto fluido.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 200,
    system: 'Eres Argos, el asistente de Benavides Asociados. Respondes preguntas sobre clientes usando datos del CRM. Sé directo y preciso.',
    messages: [{ role: 'user', content: prompt }],
  })

  return response.content[0].type === 'text'
    ? response.content[0].text.trim()
    : `He encontrado la ficha de ${clienteNombre} en el sistema.`
}
