const BASE_ID = process.env.AIRTABLE_BASE_ID ?? 'appdYsXZSl6o2hnS5'
const TABLE_CLIENTES    = 'tblizBOwfbd6ONvtx'
const TABLE_EXPEDIENTES = 'tbltsQCHd1GMDh9dq'

export type AirtableCliente = {
  id: string
  nombre: string
  nif: string | null
  email: string | null
  telefono: string | null
  tipo: string | null
  ubicacion: string | null
  estadoComercial: string | null
  servicios: string[]
  cuota: number | null
  asesor: string | null
  fechaAlta: string | null
}

export type AirtableExpediente = {
  id: string
  identificador: string
  nombre: string
  tipoServicio: string[]
  estado: string | null
  asesor: string | null
  fechaVencimiento: string | null
  honorarios: number | null
  diasVencidos: number | null
  notas: string | null
  facturado: boolean
}

// ─── HTTP ──────────────────────────────────────────────────────────────────────

async function atFetch(url: string): Promise<Record<string, unknown>> {
  const token = process.env.AIRTABLE_TOKEN
  if (!token) throw new Error('AIRTABLE_TOKEN no configurado')
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`Airtable ${res.status}`)
  return res.json() as Promise<Record<string, unknown>>
}

function atUrl(table: string, params: Record<string, string>): string {
  const base = `https://api.airtable.com/v0/${BASE_ID}/${table}`
  const qs = new URLSearchParams(params).toString()
  return `${base}?${qs}`
}

// ─── Parsers ───────────────────────────────────────────────────────────────────

function parseCliente(record: Record<string, unknown>): AirtableCliente {
  const f = record.fields as Record<string, unknown>
  return {
    id: record.id as string,
    nombre: (f['Nombre y apellidos'] as string) ?? '',
    nif: (f['Identificación Fiscal'] as string) ?? null,
    email: (f['Email'] as string) ?? null,
    telefono: (f['Teléfono'] as string) ?? null,
    tipo: (f['Tipo de cliente'] as string) ?? null,
    ubicacion: (f['Ubicación'] as string) ?? null,
    estadoComercial: (f['Estado Comercial'] as string) ?? null,
    servicios: (f['Servicio contratado'] as string[]) ?? [],
    cuota: (f['Cuota'] as number) ?? null,
    asesor: (f['Asesor'] as { name?: string } | null)?.name ?? null,
    fechaAlta: (f['Fecha alta cliente'] as string) ?? null,
  }
}

function parseExpediente(record: Record<string, unknown>): AirtableExpediente {
  const f = record.fields as Record<string, unknown>
  return {
    id: record.id as string,
    identificador: (f['Identificador'] as string) ?? '',
    nombre: (f['Nombre del expediente'] as string) ?? '',
    tipoServicio: (f['Tipo de servicio'] as string[]) ?? [],
    estado: (f['Estado'] as string) ?? null,
    asesor: (f['Asesor Asignado'] as { name?: string } | null)?.name ?? null,
    fechaVencimiento: (f['Fecha vencimiento'] as string) ?? null,
    honorarios: (f['Honorarios'] as number) ?? null,
    diasVencidos: (f['Días vencidos'] as number) ?? null,
    notas: (f['Notas'] as string) ?? null,
    facturado: (f['Facturado'] as boolean) ?? false,
  }
}

// ─── Public API ────────────────────────────────────────────────────────────────

const CLIENTE_FIELDS = [
  'Nombre y apellidos', 'Identificación Fiscal', 'Email', 'Teléfono',
  'Tipo de cliente', 'Ubicación', 'Estado Comercial', 'Servicio contratado',
  'Cuota', 'Asesor', 'Fecha alta cliente',
]

const EXPEDIENTE_FIELDS = [
  'Identificador', 'Nombre del expediente', 'Tipo de servicio',
  'Estado', 'Asesor Asignado', 'Fecha vencimiento', 'Honorarios',
  'Días vencidos', 'Notas', 'Facturado',
]

function buildFieldsParam(fields: string[]): string {
  return fields.map(f => `fields%5B%5D=${encodeURIComponent(f)}`).join('&')
}

export async function searchClienteByQuery(query: string): Promise<AirtableCliente | null> {
  const q = query.trim()
  if (!q) return null

  // 1. Exact NIF match
  const nifFormula = `{Identificación Fiscal}="${q.toUpperCase()}"`
  try {
    const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_CLIENTES}?filterByFormula=${encodeURIComponent(nifFormula)}&maxRecords=1&${buildFieldsParam(CLIENTE_FIELDS)}`
    const data = await atFetch(url)
    const records = data.records as Record<string, unknown>[]
    if (records?.length) return parseCliente(records[0])
  } catch { /* fall through */ }

  // 2. Name substring search (case-insensitive)
  const nameLower = q.toLowerCase().replace(/["']/g, '')
  const nameFormula = `SEARCH(LOWER("${nameLower}"), LOWER({Nombre y apellidos}))`
  try {
    const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_CLIENTES}?filterByFormula=${encodeURIComponent(nameFormula)}&maxRecords=5&${buildFieldsParam(CLIENTE_FIELDS)}`
    const data = await atFetch(url)
    const records = data.records as Record<string, unknown>[]
    if (records?.length) {
      // Best match: shortest name that contains the query (most specific)
      const sorted = [...records].sort((a, b) => {
        const aN = ((a.fields as Record<string, unknown>)['Nombre y apellidos'] as string ?? '').length
        const bN = ((b.fields as Record<string, unknown>)['Nombre y apellidos'] as string ?? '').length
        return aN - bN
      })
      return parseCliente(sorted[0])
    }
  } catch { /* fall through */ }

  // 3. Token search — first significant token (>3 chars)
  const tokens = q.split(/\s+/).filter(t => t.length > 3)
  if (tokens.length === 0) return null
  const token = tokens[0].toLowerCase().replace(/["']/g, '')
  const tokenFormula = `SEARCH(LOWER("${token}"), LOWER({Nombre y apellidos}))`
  try {
    const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_CLIENTES}?filterByFormula=${encodeURIComponent(tokenFormula)}&maxRecords=3&${buildFieldsParam(CLIENTE_FIELDS)}`
    const data = await atFetch(url)
    const records = data.records as Record<string, unknown>[]
    if (records?.length) return parseCliente(records[0])
  } catch { /* fall through */ }

  return null
}

export async function getExpedientesByClienteId(clienteId: string): Promise<AirtableExpediente[]> {
  const formula = `FIND("${clienteId}", ARRAYJOIN(Cliente, ","))`
  try {
    const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_EXPEDIENTES}?filterByFormula=${encodeURIComponent(formula)}&${buildFieldsParam(EXPEDIENTE_FIELDS)}&sort%5B0%5D%5Bfield%5D=Fecha%20vencimiento&sort%5B0%5D%5Bdirection%5D=desc`
    const data = await atFetch(url)
    const records = data.records as Record<string, unknown>[]
    return (records ?? []).map(parseExpediente)
  } catch {
    return []
  }
}

export type SearchExpedientesParams = {
  cliente?: string | null        // client name to look up
  clienteId?: string | null      // direct Airtable record ID
  estado?: string | null         // "En curso", "Pendiente", "Completado", "Cancelado"
  tipoServicio?: string | null   // e.g. "Renta", "IVA"
  vencidos?: boolean             // only overdue (diasVencidos > 0)
  keyword?: string | null        // free text search in name/notes
}

export async function searchExpedientes(params: SearchExpedientesParams): Promise<AirtableExpediente[]> {
  const formulas: string[] = []

  // If client name given, resolve to ID first
  let clienteId = params.clienteId ?? null
  if (!clienteId && params.cliente) {
    const cliente = await searchClienteByQuery(params.cliente).catch(() => null)
    if (cliente) clienteId = cliente.id
  }

  if (clienteId) {
    formulas.push(`FIND("${clienteId}", ARRAYJOIN(Cliente, ","))`)
  }

  if (params.estado) {
    formulas.push(`{Estado}="${params.estado}"`)
  }

  if (params.tipoServicio) {
    formulas.push(`FIND(LOWER("${params.tipoServicio.toLowerCase()}"), LOWER(ARRAYJOIN({Tipo de servicio}, ",")))`)
  }

  if (params.vencidos) {
    formulas.push(`{Días vencidos}>0`)
  }

  if (params.keyword) {
    const kw = params.keyword.toLowerCase().replace(/["']/g, '')
    formulas.push(`OR(SEARCH(LOWER("${kw}"), LOWER({Nombre del expediente})), SEARCH(LOWER("${kw}"), LOWER({Notas})))`)
  }

  const formula = formulas.length === 0
    ? 'TRUE()'
    : formulas.length === 1
      ? formulas[0]
      : `AND(${formulas.join(',')})`

  try {
    const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_EXPEDIENTES}?filterByFormula=${encodeURIComponent(formula)}&${buildFieldsParam(EXPEDIENTE_FIELDS)}&sort%5B0%5D%5Bfield%5D=Fecha%20vencimiento&sort%5B0%5D%5Bdirection%5D=asc&maxRecords=50`
    const data = await atFetch(url)
    const records = data.records as Record<string, unknown>[]
    return (records ?? []).map(parseExpediente)
  } catch {
    return []
  }
}
