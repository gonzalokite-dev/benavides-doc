import { readDocuments, type Documento } from './db'
import type { SearchIntent } from './claude'

export function searchDocuments(intent: SearchIntent): Documento[] {
  const all = readDocuments()

  // Strategy 1: full match with all available filters
  let results = filter(all, intent, true)
  if (results.length > 0) return results

  // Strategy 2: only by client
  if (intent.cliente) {
    results = filter(all, { ...intent, tipo_documento: null, ejercicio_fiscal: null }, false)
    if (results.length > 0) return results
  }

  // Strategy 3: only by document type
  if (intent.tipo_documento) {
    results = filter(all, { ...intent, cliente: null, cliente_nif: null, ejercicio_fiscal: null }, false)
    if (results.length > 0) return results
  }

  // Strategy 4: keyword search across all text fields
  if (intent.palabras_clave.length > 0) {
    results = keywordSearch(all, intent.palabras_clave)
  }

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
  // Try to match just the number (e.g. "303" matches "Modelo 303")
  const numMatch = query.match(/\d{3}/)
  if (numMatch) return normalize(tipoDoc).includes(numMatch[0])
  return contains(tipoDoc, query)
}

function filter(docs: Documento[], intent: SearchIntent, strict: boolean): Documento[] {
  return docs
    .filter((doc) => {
      if (intent.cliente_nif) {
        if (!doc.cliente_nif) return false
        if (normalize(doc.cliente_nif) !== normalize(intent.cliente_nif)) return false
      }
      if (intent.cliente && !contains(doc.cliente ?? '', intent.cliente)) return false
      if (intent.tipo_documento && !tipoMatches(doc.tipo_documento, intent.tipo_documento)) return false
      if (strict && intent.ejercicio_fiscal && doc.ejercicio_fiscal !== intent.ejercicio_fiscal) return false
      return true
    })
    .sort(byDateDesc)
    .slice(0, 10)
}

function keywordSearch(docs: Documento[], keywords: string[]): Documento[] {
  const terms = keywords.slice(0, 3).map(normalize)
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
