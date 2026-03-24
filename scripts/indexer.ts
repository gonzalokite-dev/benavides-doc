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
  process.env.SHAREPOINT_BASE_URL ?? 'https://tuempresa.sharepoint.com/sites/BenavidesAsociados/Shared%20Documents/BENAVIDES%20ASOCIADOS%20-%20GENERAL'
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

// ─── Inferencia de tipo de documento ─────────────────────────────────────────

const DOCUMENT_TYPE_PATTERNS: Array<{ pattern: RegExp; tipo: string }> = [
  { pattern: /\b303\b/i,                               tipo: 'Modelo 303' },
  { pattern: /\b390\b/i,                               tipo: 'Modelo 390' },
  { pattern: /\b036\b/i,                               tipo: 'Modelo 036' },
  { pattern: /\b037\b/i,                               tipo: 'Modelo 037' },
  { pattern: /\b200\b/i,                               tipo: 'Modelo 200' },
  { pattern: /\b111\b/i,                               tipo: 'Modelo 111' },
  { pattern: /\b190\b/i,                               tipo: 'Modelo 190' },
  { pattern: /\b347\b/i,                               tipo: 'Modelo 347' },
  { pattern: /\b349\b/i,                               tipo: 'Modelo 349' },
  { pattern: /\b115\b/i,                               tipo: 'Modelo 115' },
  { pattern: /\b130\b/i,                               tipo: 'Modelo 130' },
  { pattern: /\b720\b/i,                               tipo: 'Modelo 720' },
  { pattern: /contrato.{0,15}alquiler|arrendamiento/i, tipo: 'Contrato de alquiler' },
  { pattern: /contrato.{0,15}compraventa|compraventa/i,tipo: 'Contrato de compraventa' },
  { pattern: /contrato/i,                              tipo: 'Contrato' },
  { pattern: /escritura.{0,15}constitu/i,              tipo: 'Escritura de constitución' },
  { pattern: /escritura.{0,15}propiedad/i,             tipo: 'Escritura de propiedad' },
  { pattern: /escritura/i,                             tipo: 'Escritura' },
  { pattern: /irpf|declaracion.{0,10}renta|renta_20\d\d/i, tipo: 'Declaración de la renta' },
  { pattern: /sucesiones/i,                            tipo: 'Impuesto de Sucesiones' },
  { pattern: /plusvalia/i,                             tipo: 'Plusvalía' },
  { pattern: /\bibi\b/i,                               tipo: 'IBI (recibo)' },
  { pattern: /licencia.{0,15}actividad|apertura/i,     tipo: 'Licencia de actividad' },
  { pattern: /certificado.{0,20}residencia/i,          tipo: 'Certificado de residencia fiscal' },
  { pattern: /certificado.{0,20}digital/i,             tipo: 'Certificado digital' },
  { pattern: /certificado/i,                           tipo: 'Certificado' },
  { pattern: /poder.{0,15}notarial/i,                  tipo: 'Poder notarial' },
  { pattern: /\bnie\b|\bnif\b|identificacion/i,        tipo: 'NIE / NIF documento' },
  { pattern: /nomina|nómina/i,                         tipo: 'Nómina' },
  { pattern: /factura/i,                               tipo: 'Factura' },
  { pattern: /vida.{0,10}laboral/i,                    tipo: 'Vida laboral' },
  { pattern: /sociedades|impuesto.{0,10}sociedades/i,  tipo: 'Modelo 200' },
  { pattern: /retencion|retenciones/i,                 tipo: 'Modelo 111' },
]

function inferTipo(fileName: string, relPath: string): string {
  const s = (fileName + ' ' + relPath).toLowerCase()
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
    relativePath
      .split('/')
      .map((s) => encodeURIComponent(s))
      .join('/')
  )
}

function extractTags(fileName: string, cliente: string | null, tipo: string, carpeta: string): string[] {
  const tags = new Set<string>()
  const add = (str: string) =>
    str.toLowerCase().split(/[-_\s.,/]+/).filter((w) => w.length > 2).forEach((w) => tags.add(w))
  add(tipo)
  add(fileName.replace(/\.[^.]+$/, ''))
  add(carpeta)
  if (cliente) add(cliente)
  return Array.from(tags).slice(0, 20)
}

// ─── Walker ───────────────────────────────────────────────────────────────────

type RawRecord = Omit<Documento, 'id' | 'created_at' | 'updated_at'>

function walk(
  dirPath: string,
  rootPath: string,
  carpetaOrigen: string,
  cliente: string | null,
  out: RawRecord[]
) {
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
      walk(fullPath, rootPath, carpetaOrigen, nextCliente, out)
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase()
      if (!INDEXABLE_EXTENSIONS.has(ext)) continue

      const relativePath = path.relative(rootPath, fullPath).replace(/\\/g, '/')
      const tipo = inferTipo(entry.name, relativePath)
      const ejercicio = extractEjercicio(entry.name)

      let fechaDocumento: string | null = null
      try {
        fechaDocumento = fs.statSync(fullPath).mtime.toISOString().split('T')[0]
      } catch { /* ignore */ }

      out.push({
        cliente,
        cliente_nif: null,
        tipo_documento: tipo,
        nombre_archivo: entry.name,
        descripcion: null,
        fecha_documento: fechaDocumento,
        ejercicio_fiscal: ejercicio,
        enlace_descarga: buildUrl(relativePath),
        carpeta_origen: carpetaOrigen,
        ruta_relativa: relativePath,
        etiquetas: extractTags(entry.name, cliente, tipo, carpetaOrigen),
      })
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
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
  if (isDryRun) console.log('🔍 Modo dry-run — no se escribirá nada\n')
  if (isUpdate) console.log('🔄 Modo update — solo archivos nuevos\n')

  // ── Scan ────────────────────────────────────────────────────────────────

  const records: RawRecord[] = []

  for (const entry of fs.readdirSync(resolvedPath, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    if (IGNORED_ROOT_FOLDERS.has(entry.name)) {
      console.log(`  ⏭️  Ignorando: ${entry.name}`)
      continue
    }
    const subPath = path.join(resolvedPath, entry.name)
    const carpeta = entry.name === 'Clientes' ? 'Clientes'
      : MIXED_FOLDERS.has(entry.name) ? entry.name
      : entry.name

    console.log(`  📂 ${entry.name}...`)
    walk(subPath, resolvedPath, carpeta, entry.name === 'Clientes' ? null : null, records)
  }

  console.log(`\n📊 Archivos encontrados: ${records.length}`)

  if (isDryRun) {
    console.log('\n📋 Vista previa (primeros 20):')
    records.slice(0, 20).forEach((r, i) =>
      console.log(`  ${i + 1}. [${r.carpeta_origen}] ${r.cliente ?? '-'} — ${r.nombre_archivo} (${r.tipo_documento})`)
    )
    console.log('\n✅ Dry-run completado. Nada fue escrito.')
    return
  }

  // ── Write JSON ───────────────────────────────────────────────────────────

  const now = new Date().toISOString()

  // Read existing if update mode
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
    if (isUpdate && existingKeys.has(key)) {
      skipped++
      continue
    }
    existing.push({ ...r, id: randomUUID(), created_at: now, updated_at: now })
    inserted++
  }

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
  fs.writeFileSync(DB_PATH, JSON.stringify(existing, null, 2), 'utf-8')

  // Log
  const logLines = [
    `Indexación: ${now}`,
    `Carpeta: ${resolvedPath}`,
    `Archivos encontrados: ${records.length} | Insertados: ${inserted} | Omitidos: ${skipped}`,
    '',
    ...records.map((r) => `${r.carpeta_origen} | ${r.cliente ?? '-'} | ${r.nombre_archivo} | ${r.tipo_documento}`),
  ]
  fs.writeFileSync(path.join(process.cwd(), 'indexer.log'), logLines.join('\n'), 'utf-8')

  console.log(`\n📊 Resumen:`)
  console.log(`   ✅ Insertados: ${inserted}`)
  if (isUpdate) console.log(`   ⏭️  Omitidos (ya existían): ${skipped}`)
  console.log(`   📄 Total en BD: ${existing.length}`)
  console.log(`   📝 Log: indexer.log`)
  console.log('\n🎉 Indexación completada. Haz git push para actualizar Vercel.')
}

main()
