import { readDocuments, type Documento } from './db'
import type { SearchIntent } from './claude'

export function searchDocuments(intent: SearchIntent): Documento[] {
  const all = readDocuments()

  const clienteEspecificado = !!intent.cliente || !!intent.cliente_nif

  // Strategy 1: full match with all filters
  let results = filter(all, intent)
  if (results.length > 0) return results

  // Strategy 2: same client, relax year
  if (clienteEspecificado && intent.ejercicio_fiscal) {
    results = filter(all, { ...intent, ejercicio_fiscal: null })
    if (results.length > 0) return results
  }

  // Strategy 3: same client, relax document type too
  if (clienteEspecificado && intent.tipo_documento) {
    results = filter(all, { ...intent, tipo_documento: null, ejercicio_fiscal: null })
    if (results.length > 0) return results
  }

  // Strategy 4: only document type (ONLY if no client was specified)
  if (!clienteEspecificado && intent.tipo_documento) {
    results = filter(all, { ...intent, cliente: null, cliente_nif: null, ejercicio_fiscal: null })
    if (results.length > 0) return results
  }

  // Strategy 5: keyword search — always includes client terms if specified
  results = keywordSearch(all, intent)

  return results
}

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function contains(haystack: string | null | undefined, needle: string): boolean {
  if (!haystack) return false
  return normalize(haystack).includes(normalize(needle))
}

function tipoMatches(tipoDoc: string, query: string): boolean {
  const numMatch = query.match(/\d{3}/)
  if (numMatch) return normalize(tipoDoc).includes(numMatch[0])
  return contains(tipoDoc, query)
}

function filter(docs: Documento[], intent: SearchIntent): Documento[] {
  return docs
    .filter((doc) => {
      // NIF — exact match
      if (intent.cliente_nif) {
        if (!doc.cliente_nif) return false
        if (normalize(doc.cliente_nif) !== normalize(intent.cliente_nif)) return false
      }
      // Client — partial match
      if (intent.cliente && !contains(doc.cliente ?? '', intent.cliente)) return false
      // Document type — partial match
      if (intent.tipo_documento && !tipoMatches(doc.tipo_documento, intent.tipo_documento)) return false
      // Fiscal year — exact match
      if (intent.ejercicio_fiscal && doc.ejercicio_fiscal !== intent.ejercicio_fiscal) return false
      return true
    })
    .sort(byDateDesc)
    .slice(0, 10)
}

function keywordSearch(docs: Documento[], intent: SearchIntent): Documento[] {
  // Build search terms from keywords
  const terms = intent.palabras_clave.slice(0, 5).map(normalize).filter((t) => t.length > 2)
  if (terms.length === 0) return []

  // If a client was specified, ALL results must match the client term
  const clientTerms = intent.cliente
    ? intent.cliente.split(/\s+/).map(normalize).filter((t) => t.length > 2)
    : []

  return docs
    .filter((doc) => {
      const haystack = [
        doc.cliente,
        doc.tipo_documento,
        doc.nombre_archivo,
        doc.descripcion,
        doc.carpeta_origen,
        ...(doc.etiquetas ?? []),
      ]
        .filter((s): s is string => s !== null && s !== undefined)
        .map(normalize)
        .join(' ')

      // If client was specified, document must match at least one client term
      if (clientTerms.length > 0) {
        const clientMatch = clientTerms.some((ct) => haystack.includes(ct))
        if (!clientMatch) return false
      }

      return terms.some((t) => haystack.includes(t))
    })
    .sort(byDateDesc)
    .slice(0, 10)
}

function byDateDesc(a: Documento, b: Documento): number {
  if (!a.fecha_documento && !b.fecha_documento) return 0
  if (!a.fecha_documento) return 1
  if (!b.fecha_documento) return -1
  return b.fecha_documento.localeCompare(a.fecha_documento)
}
