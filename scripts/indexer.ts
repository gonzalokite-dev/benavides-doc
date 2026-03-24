/**
 * indexer.ts — Recorre la carpeta local de OneDrive y cataloga los archivos en data/documentos.json
 *
 * Uso:
 *   npx tsx scripts/indexer.ts                       → indexa todo (sobrescribe)
 *   npx tsx scripts/indexer.ts --dry-run             → muestra qué haría sin escribir nada
 *   npx tsx scripts/indexer.ts --update              → solo añade archivos nuevos
 *   npx tsx scripts/indexer.ts --path="/ruta/custom" → carpeta alternativa
 */

import * as fs from 'fs'
import * as path from 'path'
import { randomUUID } from 'crypto'
import * as dotenv from 'dotenv'
import type { Documento } from '../lib/db'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })
dotenv.config({ path: path.join(process.cwd(), '.env') })

// ─── Config ──────────────────────────────────────────────────────────────────

const DB_PATH = path.join(process.cwd(), 'data', 'documentos.json')
const SHAREPOINT_BASE_URL = (
  process.env.SHAREPOINT_BASE_URL ??
  'https://tuempresa.sharepoint.com/sites/BenavidesAsociados/Shared%20Documents/BENAVIDES%20ASOCIADOS%20-%20GENERAL'
).replace(/\/$/, '')
const DEFAULT_DOCS_PATH = process.env.LOCAL_DOCS_PATH ?? ''

const INDEXABLE_EXTENSIONS = new Set([
  '.pdf', '.docx', '.doc', '.xlsx', '.xls', '.csv',
  '.png', '.jpg', '.jpeg', '.msg', '.eml', '.txt',
])

const IGNORED_ROOT_FOLDERS = new Set([
  'Branding', 'PPT', 'Tarifas', 'VACACIONES', 'Bilky',
  'Arrendamiento de local', 'Germán', 'Gestoría', 'Inmobiliaria',
])

const IGNORED_FILES = new Set(['desktop.ini', 'thumbs.db', '.ds_store'])

const MIXED_FOLDERS = new Set([
  'Campaña de Renta', 'Certificados digitales', 'Informes Fiscales', 'IRPF', 'No Residentes',
])

// ─── Extracción de texto de PDFs ─────────────────────────────────────────────

async function extractPdfText(filePath: string): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse') as (buf: Buffer, opts?: object) => Promise<{ text: string }>
    const buffer = fs.readFileSync(filePath)
    const data = await pdfParse(buffer, { max: 2 }) // solo primeras 2 páginas
    // Clean up whitespace and return first 600 chars
    return data.text
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 600)
  } catch {
    return ''
  }
}

// Intenta extraer un NIF/NIE del texto del documento
function extractNifFromText(text: string): string | null {
  // NIE: X/Y/Z + 7 números + letra
  const nieMatch = text.match(/\b([XYZxyz]\d{7}[A-Za-z])\b/)
  if (nieMatch) return nieMatch[1].toUpperCase()
  // NIF: 8 números + letra
  const nifMatch = text.match(/\b(\d{8}[A-Za-z])\b/)
  if (nifMatch) return nifMatch[1].toUpperCase()
  // CIF: letra + 7 números + dígito/letra
  const cifMatch = text.match(/\b([ABCDEFGHJNPQRSUVWabcdefghjnpqrsuvw]\d{7}[0-9A-Ja-j])\b/)
  if (cifMatch) return cifMatch[1].toUpperCase()
  return null
}

// Intenta extraer el año fiscal del texto si no se encontró en el nombre
function extractEjercicioFromText(text: string, current: number | null): number | null {
  if (current) return current
  const match = text.match(/ejercicio\s+(20\d{2})|año\s+(20\d{2})|(20\d{2})/i)
  if (match) return parseInt(match[1] ?? match[2] ?? match[3], 10)
  return null
}

// ─── Inferencia de tipo de documento ─────────────────────────────────────────

const DOCUMENT_TYPE_PATTERNS: Array<{ pattern: RegExp; tipo: string }> = [
  { pattern: /\b303\b/i,                                tipo: 'Modelo 303' },
  { pattern: /\b390\b/i,                                tipo: 'Modelo 390' },
  { pattern: /\b036\b/i,                                tipo: 'Modelo 036' },
  { pattern: /\b037\b/i,                                tipo: 'Modelo 037' },
  { pattern: /\b200\b/i,                                tipo: 'Modelo 200' },
  { pattern: /\b111\b/i,                                tipo: 'Modelo 111' },
  { pattern: /\b190\b/i,                                tipo: 'Modelo 190' },
  { pattern: /\b347\b/i,                                tipo: 'Modelo 347' },
  { pattern: /\b349\b/i,                                tipo: 'Modelo 349' },
  { pattern: /\b115\b/i,                                tipo: 'Modelo 115' },
  { pattern: /\b130\b/i,                                tipo: 'Modelo 130' },
  { pattern: /\b720\b/i,                                tipo: 'Modelo 720' },
  { pattern: /contrato.{0,15}alquiler|arrendamiento/i,  tipo: 'Contrato de alquiler' },
  { pattern: /contrato.{0,15}compraventa|compraventa/i, tipo: 'Contrato de compraventa' },
  { pattern: /contrato/i,                               tipo: 'Contrato' },
  { pattern: /escritura.{0,15}constitu/i,               tipo: 'Escritura de constitución' },
  { pattern: /escritura.{0,15}propiedad/i,              tipo: 'Escritura de propiedad' },
  { pattern: /escritura/i,                              tipo: 'Escritura' },
  { pattern: /irpf|declaracion.{0,10}renta|renta_20\d\d/i, tipo: 'Declaración de la renta' },
  { pattern: /sucesiones/i,                             tipo: 'Impuesto de Sucesiones' },
  { pattern: /plusvalia/i,                              tipo: 'Plusvalía' },
  { pattern: /\bibi\b/i,                                tipo: 'IBI (recibo)' },
  { pattern: /licencia.{0,15}actividad|apertura/i,      tipo: 'Licencia de actividad' },
  { pattern: /certificado.{0,20}residencia/i,           tipo: 'Certificado de residencia fiscal' },
  { pattern: /certificado.{0,20}digital/i,              tipo: 'Certificado digital' },
  { pattern: /certificado/i,                            tipo: 'Certificado' },
  { pattern: /poder.{0,15}notarial/i,                   tipo: 'Poder notarial' },
  { pattern: /\bnie\b|\bnif\b|identificacion/i,         tipo: 'NIE / NIF documento' },
  { pattern: /nomina|nómina/i,                          tipo: 'Nómina' },
  { pattern: /factura/i,                                tipo: 'Factura' },
  { pattern: /vida.{0,10}laboral/i,                     tipo: 'Vida laboral' },
  { pattern: /sociedades|impuesto.{0,10}sociedades/i,   tipo: 'Modelo 200' },
  { pattern: /retencion|retenciones/i,                  tipo: 'Modelo 111' },
]

function inferTipo(fileName: string, relPath: string, pdfText: string): string {
  const s = (fileName + ' ' + relPath + ' ' + pdfText).toLowerCase()
  for (const { pattern, tipo } of DOCUMENT_TYPE_PATTERNS) {
    if (pattern.test(s)) return tipo
  }
  return 'Otros'
}

function extractEjercicio(fileName: string): number | null {
  const m = fileName.match(/\b(20\d{2})\b/)
  return m ? parseInt(m[1], 10) : null
}

function buildUrl(relativePath: string): string {
  return (
    SHAREPOINT_BASE_URL +
    '/' +
    relativePath.split('/').map((s) => encodeURIComponent(s)).join('/')
  )
}

function extractTags(
  fileName: string,
  cliente: string | null,
  tipo: string,
  carpeta: string,
  pdfText: string
): string[] {
  const tags = new Set<string>()
  const add = (str: string) =>
    str.toLowerCase().split(/[-_\s.,/]+/).filter((w) => w.length > 2).forEach((w) => tags.add(w))

  add(tipo)
  add(fileName.replace(/\.[^.]+$/, ''))
  add(carpeta)
  if (cliente) add(cliente)

  // Add meaningful words from PDF text
  if (pdfText) {
    pdfText
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 4 && !/^\d+$/.test(w))
      .slice(0, 30)
      .forEach((w) => tags.add(w.replace(/[^a-záéíóúñü]/gi, '')))
  }

  return Array.from(tags).filter((t) => t.length > 2).slice(0, 30)
}

// ─── Walker ───────────────────────────────────────────────────────────────────

type RawRecord = Omit<Documento, 'id' | 'created_at' | 'updated_at'>

async function processFile(
  filePath: string,
  rootPath: string,
  carpetaOrigen: string,
  cliente: string | null
): Promise<RawRecord> {
  const fileName = path.basename(filePath)
  const ext = path.extname(fileName).toLowerCase()
  const relativePath = path.relative(rootPath, filePath).replace(/\\/g, '/')

  // Extract text from PDF
  let pdfText = ''
  if (ext === '.pdf') {
    pdfText = await extractPdfText(filePath)
  }

  const tipo = inferTipo(fileName, relativePath, pdfText)
  const ejercicioFromName = extractEjercicio(fileName)
  const ejercicio = extractEjercicioFromText(pdfText, ejercicioFromName)
  const nif = extractNifFromText(pdfText)

  // Build descripcion from PDF text
  let descripcion: string | null = null
  if (pdfText.length > 20) {
    descripcion = pdfText.slice(0, 300).trim()
  }

  let fechaDocumento: string | null = null
  try {
    fechaDocumento = fs.statSync(filePath).mtime.toISOString().split('T')[0]
  } catch { /* ignore */ }

  return {
    cliente,
    cliente_nif: nif,
    tipo_documento: tipo,
    nombre_archivo: fileName,
    descripcion,
    fecha_documento: fechaDocumento,
    ejercicio_fiscal: ejercicio,
    enlace_descarga: buildUrl(relativePath),
    carpeta_origen: carpetaOrigen,
    ruta_relativa: relativePath,
    etiquetas: extractTags(fileName, cliente, tipo, carpetaOrigen, pdfText),
  }
}

async function walk(
  dirPath: string,
  rootPath: string,
  carpetaOrigen: string,
  cliente: string | null,
  out: RawRecord[],
  stats: { ok: number; errors: number }
): Promise<void> {
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true })
  } catch {
    console.warn(`  ⚠️  No se puede leer: ${dirPath}`)
    return
  }

  for (const entry of entries) {
    if (IGNORED_FILES.has(entry.name.toLowerCase()) || entry.name.startsWith('.')) continue

    const fullPath = path.join(dirPath, entry.name)

    if (entry.isDirectory()) {
      const nextCliente = carpetaOrigen === 'Clientes' && cliente === null ? entry.name : cliente
      await walk(fullPath, rootPath, carpetaOrigen, nextCliente, out, stats)
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase()
      if (!INDEXABLE_EXTENSIONS.has(ext)) continue

      try {
        const record = await processFile(fullPath, rootPath, carpetaOrigen, cliente)
        out.push(record)
        stats.ok++
        if (stats.ok % 10 === 0) process.stdout.write(`\r   Procesados: ${stats.ok}`)
      } catch (err) {
        console.error(`\n  ❌ Error en ${entry.name}:`, err)
        stats.errors++
      }
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const isDryRun = args.includes('--dry-run')
  const isUpdate = args.includes('--update')
  const pathArg = args.find((a) => a.startsWith('--path='))?.split('=')[1]
  const docsPath = pathArg ?? DEFAULT_DOCS_PATH

  if (!docsPath) {
    console.error('❌ Especifica la ruta con LOCAL_DOCS_PATH en .env.local o --path="..."')
    process.exit(1)
  }

  const resolvedPath = docsPath.replace(/^~/, process.env.HOME ?? process.env.USERPROFILE ?? '')

  if (!fs.existsSync(resolvedPath)) {
    console.error(`❌ La carpeta no existe: ${resolvedPath}`)
    process.exit(1)
  }

  console.log(`📁 Indexando: ${resolvedPath}`)
  console.log(`📄 Extracción de texto PDF: activada`)
  if (isDryRun) console.log('🔍 Modo dry-run — no se escribirá nada\n')
  if (isUpdate) console.log('🔄 Modo update — solo archivos nuevos\n')

  const records: RawRecord[] = []
  const stats = { ok: 0, errors: 0 }

  for (const entry of fs.readdirSync(resolvedPath, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    if (IGNORED_ROOT_FOLDERS.has(entry.name)) {
      console.log(`  ⏭️  Ignorando: ${entry.name}`)
      continue
    }
    const subPath = path.join(resolvedPath, entry.name)
    console.log(`  📂 ${entry.name}...`)
    await walk(subPath, resolvedPath, entry.name, entry.name === 'Clientes' ? null : null, records, stats)
  }

  console.log(`\n\n📊 Archivos encontrados: ${records.length} (${stats.errors} errores)`)

  if (isDryRun) {
    console.log('\n📋 Vista previa (primeros 20):')
    records.slice(0, 20).forEach((r, i) =>
      console.log(`  ${i + 1}. [${r.carpeta_origen}] ${r.cliente ?? '-'} — ${r.nombre_archivo}`)
    )
    if (records[0]?.descripcion) {
      console.log(`\n📝 Ejemplo descripción extraída:\n   "${records[0].descripcion}"`)
    }
    console.log('\n✅ Dry-run completado.')
    return
  }

  // ── Write JSON ──────────────────────────────────────────────────────────

  const now = new Date().toISOString()
  let existing: Documento[] = []

  if (isUpdate && fs.existsSync(DB_PATH)) {
    try { existing = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')) } catch { existing = [] }
  }

  const existingKeys = new Set(
    existing.map((d) => `${d.nombre_archivo}|${d.cliente ?? ''}|${d.carpeta_origen ?? ''}`)
  )

  let inserted = 0
  let skipped = 0

  for (const r of records) {
    const key = `${r.nombre_archivo}|${r.cliente ?? ''}|${r.carpeta_origen ?? ''}`
    if (isUpdate && existingKeys.has(key)) { skipped++; continue }
    existing.push({ ...r, id: randomUUID(), created_at: now, updated_at: now })
    inserted++
  }

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
  fs.writeFileSync(DB_PATH, JSON.stringify(existing, null, 2), 'utf-8')

  const logLines = [
    `Indexación: ${now}`,
    `Carpeta: ${resolvedPath}`,
    `Archivos: ${records.length} | Insertados: ${inserted} | Omitidos: ${skipped} | Errores: ${stats.errors}`,
    '',
    ...records.map((r) => `${r.carpeta_origen} | ${r.cliente ?? '-'} | ${r.nombre_archivo} | ${r.tipo_documento} | NIF: ${r.cliente_nif ?? '-'}`),
  ]
  fs.writeFileSync(path.join(process.cwd(), 'indexer.log'), logLines.join('\n'), 'utf-8')

  console.log(`\n📊 Resumen:`)
  console.log(`   ✅ Insertados: ${inserted}`)
  if (isUpdate) console.log(`   ⏭️  Omitidos: ${skipped}`)
  console.log(`   ❌ Errores: ${stats.errors}`)
  console.log(`   📄 Total en BD: ${existing.length}`)
  console.log(`\n💡 Haz git push para actualizar Vercel con los nuevos datos.`)
}

main().catch((err) => {
  console.error('❌ Error fatal:', err)
  process.exit(1)
})
