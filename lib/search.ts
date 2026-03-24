import { supabaseAdmin, type Documento } from './supabase'
import type { SearchIntent } from './claude'

export async function searchDocuments(intent: SearchIntent): Promise<Documento[]> {
  // Strategy 1: Full search with all available filters
  let results = await runQuery(intent, { strict: true })

  if (results.length > 0) return results

  // Strategy 2: Relax — search only by client
  if (intent.cliente) {
    results = await runQuery({ ...intent, tipo_documento: null, ejercicio_fiscal: null }, { strict: false })
    if (results.length > 0) return results
  }

  // Strategy 3: Relax — search only by document type
  if (intent.tipo_documento) {
    results = await runQuery({ ...intent, cliente: null, cliente_nif: null, ejercicio_fiscal: null }, { strict: false })
    if (results.length > 0) return results
  }

  // Strategy 4: Keyword search across multiple fields
  if (intent.palabras_clave.length > 0) {
    results = await keywordSearch(intent.palabras_clave)
  }

  return results
}

async function runQuery(
  intent: SearchIntent,
  options: { strict: boolean }
): Promise<Documento[]> {
  let query = supabaseAdmin
    .from('documentos')
    .select('*')
    .order('fecha_documento', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(10)

  // Filter by NIF (exact match)
  if (intent.cliente_nif) {
    query = query.ilike('cliente_nif', intent.cliente_nif)
  }

  // Filter by client name (partial, case-insensitive)
  if (intent.cliente) {
    const clientTerm = normalizeSearchTerm(intent.cliente)
    query = query.ilike('cliente', `%${clientTerm}%`)
  }

  // Filter by document type (partial match)
  if (intent.tipo_documento) {
    const tipoNormalized = normalizeTipoDocumento(intent.tipo_documento)
    query = query.ilike('tipo_documento', `%${tipoNormalized}%`)
  }

  // Filter by fiscal year (exact)
  if (intent.ejercicio_fiscal) {
    query = query.eq('ejercicio_fiscal', intent.ejercicio_fiscal)
  }

  const { data, error } = await query

  if (error) {
    console.error('Supabase query error:', error)
    return []
  }

  return (data as Documento[]) ?? []
}

async function keywordSearch(keywords: string[]): Promise<Documento[]> {
  // Search across cliente, tipo_documento, nombre_archivo, descripcion, etiquetas
  const term = keywords.slice(0, 3).join(' ')

  const { data, error } = await supabaseAdmin
    .from('documentos')
    .select('*')
    .or(
      [
        `cliente.ilike.%${term}%`,
        `tipo_documento.ilike.%${term}%`,
        `nombre_archivo.ilike.%${term}%`,
        `descripcion.ilike.%${term}%`,
      ].join(',')
    )
    .order('fecha_documento', { ascending: false, nullsFirst: false })
    .limit(10)

  if (error) {
    console.error('Keyword search error:', error)
    return []
  }

  return (data as Documento[]) ?? []
}

function normalizeSearchTerm(term: string): string {
  return term
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents for broader matching
    .trim()
}

function normalizeTipoDocumento(tipo: string): string {
  // Extract just the number or key word for flexible matching
  const modeloMatch = tipo.match(/\d{3}/)
  if (modeloMatch) return modeloMatch[0]
  return normalizeSearchTerm(tipo)
}
