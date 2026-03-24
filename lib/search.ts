import { readDocuments, type Documento } from './db'
import type { SearchIntent } from './claude'

export function searchDocuments(intent: SearchIntent): Documento[] {
  const all = readDocuments()

  const clienteEspecificado = !!intent.cliente || !!intent.cliente_nif

  // If NIF specified — exact match only
  if (intent.cliente_nif) {
    const byNif = all.filter(
      (d) => d.cliente_nif && normalize(d.cliente_nif) === normalize(intent.cliente_nif!)
    )
    if (byNif.length > 0) return scoreAndSort(byNif, intent)
  }

  // Score all documents and return those with score > 0, sorted by relevance
  const scored = all
    .map((doc) => ({ doc, score: scoreDoc(doc, intent) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || byDateDescPair(a.doc, b.doc))

  // If client was specified, ONLY return documents that match that client
  if (clienteEspecificado) {
    const query = intent.cliente ?? ''
    const tokenCount = query.split(/[\s,./\-()+]+/).filter((t) => t.length > 2).length
    // Multi-token queries (e.g. "garcia lopez") require allMatch (score ≥ 15)
    // Single-token queries (e.g. "garcia") accept anyMatch (score ≥ 10)
    const minScore = tokenCount > 1 ? 15 : 10
    const withClient = scored.filter(({ doc }) => clientScore(doc, query) >= minScore)
    return withClient.slice(0, 50).map(({ doc }) => doc)
  }

  return scored.slice(0, 50).map(({ doc }) => doc)
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

function scoreDoc(doc: Documento, intent: SearchIntent): number {
  let score = 0

  // Client scoring
  if (intent.cliente) {
    score += clientScore(doc, intent.cliente)
  }

  // Document type scoring
  if (intent.tipo_documento) {
    if (tipoMatches(doc.tipo_documento, intent.tipo_documento)) score += 15
  }

  // Fiscal year scoring
  if (intent.ejercicio_fiscal) {
    if (doc.ejercicio_fiscal === intent.ejercicio_fiscal) score += 8
    else if (intent.ejercicio_fiscal) score -= 3  // slight penalty for wrong year
  }

  // Keyword scoring — search across all fields
  const haystack = buildHaystack(doc)
  for (const kw of intent.palabras_clave) {
    const kwNorm = normalize(kw)
    if (kwNorm.length <= 2) continue
    if (haystack.includes(kwNorm)) score += 3
  }

  return score
}

function clientScore(doc: Documento, queryCliente: string): number {
  if (!queryCliente) return 0
  if (!doc.cliente) return 0
  const query = normalize(queryCliente)
  const docCliente = normalize(doc.cliente)

  // Exact substring match (highest)
  if (docCliente.includes(query)) return 20

  // Fully stripped comparison: "GRUPO OVERLANDER, S.L.U." vs "Grupo Overlander SLU"
  // both become "grupooverlanderexperienceslu" — handles S.L.U. = SLU
  const docStripped = stripPunct(docCliente)
  const queryStripped = stripPunct(query)
  if (docStripped.includes(queryStripped) || queryStripped.includes(docStripped)) return 18

  // Token-based match — strip punctuation per token
  const queryTokens = query.split(/[\s,./\-()+]+/).filter((t) => t.length > 2).map(stripPunct).filter((t) => t.length > 2)
  // Doc tokens: minimum 3 chars to avoid short tokens like "la", "sl", "sa" matching inside query words
  const docTokensRaw = docCliente.split(/\s+/).map(stripPunct).filter((t) => t.length > 2)

  // All query tokens match doc tokens
  // Only dt.includes(qt): doc token contains query token (e.g. "overlanders" contains "overlander")
  // NOT qt.includes(dt): would cause "overlander".includes("la") = true (false positive)
  const allMatch = queryTokens.length > 0 && queryTokens.every((qt) =>
    docTokensRaw.some((dt) => dt.includes(qt))
  )
  if (allMatch) return 15

  // Any query token matches (only useful for single-token queries)
  const anyMatch = queryTokens.some((qt) =>
    docTokensRaw.some((dt) => dt.includes(qt))
  )
  if (anyMatch) return 10

  return 0
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

// Strips all punctuation — used for token comparison so "S.L.U." = "SLU" = "slu"
function stripPunct(str: string): string {
  return str.replace(/[^a-z0-9]/g, '')
}

function tipoMatches(tipoDoc: string, query: string): boolean {
  const normTipo = normalize(tipoDoc)
  const normQuery = normalize(query)
  // Number match (e.g. "303" in query matches "Modelo 303")
  const numMatch = normQuery.match(/\d{3}/)
  if (numMatch) return normTipo.includes(numMatch[0])
  // Substring match
  if (normTipo.includes(normQuery) || normQuery.includes(normTipo)) return true
  // Token match
  const queryTokens = normQuery.split(/\s+/).filter((t) => t.length > 2)
  return queryTokens.some((t) => normTipo.includes(t))
}

function buildHaystack(doc: Documento): string {
  return [
    doc.cliente,
    doc.tipo_documento,
    doc.nombre_archivo,
    doc.descripcion,
    doc.carpeta_origen,
    doc.ruta_relativa,
    ...(doc.etiquetas ?? []),
  ]
    .filter((s): s is string => s !== null && s !== undefined)
    .map(normalize)
    .join(' ')
}

function scoreAndSort(docs: Documento[], intent: SearchIntent): Documento[] {
  return docs
    .map((doc) => ({ doc, score: scoreDoc(doc, intent) }))
    .sort((a, b) => b.score - a.score || byDateDescPair(a.doc, b.doc))
    .slice(0, 50)
    .map(({ doc }) => doc)
}

function byDateDescPair(a: Documento, b: Documento): number {
  if (!a.fecha_documento && !b.fecha_documento) return 0
  if (!a.fecha_documento) return 1
  if (!b.fecha_documento) return -1
  return b.fecha_documento.localeCompare(a.fecha_documento)
}
