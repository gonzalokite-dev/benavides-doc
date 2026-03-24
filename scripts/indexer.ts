/**
 * indexer.ts — Recorre la carpeta local de OneDrive y cataloga todos los archivos en Supabase
 *
 * Uso:
 *   npx tsx scripts/indexer.ts                          → indexa todo
 *   npx tsx scripts/indexer.ts --dry-run                → muestra qué haría sin escribir
 *   npx tsx scripts/indexer.ts --update                 → solo archivos nuevos (no duplica)
 *   npx tsx scripts/indexer.ts --path="/ruta/custom"    → carpeta alternativa
 */

import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })
dotenv.config({ path: path.join(process.cwd(), '.env') })

// ─── Config ──────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SHAREPOINT_BASE_URL = (
  process.env.SHAREPOINT_BASE_URL ?? 'https://tuempresa.sharepoint.com/sites/BenavidesAsociados/Shared%20Documents/BENAVIDES%20ASOCIADOS%20-%20GENERAL'
).replace(/\/$/, '')
const DEFAULT_DOCS_PATH = process.env.LOCAL_DOCS_PATH ?? ''

const INDEXABLE_EXTENSIONS = new Set([
  '.pdf', '.docx', '.doc', '.xlsx', '.xls', '.csv',
  '.png', '.jpg', '.jpeg', '.msg', '.eml', '.txt',
])

// Carpetas de nivel raíz a IGNORAR completamente
const IGNORED_ROOT_FOLDERS = new Set([
  'Branding', 'PPT', 'Tarifas', 'VACACIONES', 'Bilky',
  'Arrendamiento de local', 'Germán', 'Gestoría', 'Inmobiliaria',
])

// Archivos del sistema a ignorar
const IGNORED_FILES = new Set([
  'desktop.ini', 'thumbs.db', '.ds_store',
])

// Carpetas mixtas que contienen tanto documentos de clientes como plantillas
const MIXED_FOLDERS = new Set([
  'Campaña de Renta', 'Certificados digitales', 'Informes Fiscales',
  'IRPF', 'No Residentes',
])

// ─── Tipo de documento — patrones de nombre de archivo ───────────────────────

const DOCUMENT_TYPE_PATTERNS: Array<{ pattern: RegExp; tipo: string }> = [
  { pattern: /\b303\b/i, tipo: 'Modelo 303' },
  { pattern: /\b390\b/i, tipo: 'Modelo 390' },
  { pattern: /\b036\b/i, tipo: 'Modelo 036' },
  { pattern: /\b037\b/i, tipo: 'Modelo 037' },
  { pattern: /\b200\b/i, tipo: 'Modelo 200' },
  { pattern: /\b111\b/i, tipo: 'Modelo 111' },
  { pattern: /\b190\b/i, tipo: 'Modelo 190' },
  { pattern: /\b347\b/i, tipo: 'Modelo 347' },
  { pattern: /\b349\b/i, tipo: 'Modelo 349' },
  { pattern: /\b115\b/i, tipo: 'Modelo 115' },
  { pattern: /\b130\b/i, tipo: 'Modelo 130' },
  { pattern: /\b720\b/i, tipo: 'Modelo 720' },
  { pattern: /contrato.{0,15}alquiler|arrendamiento/i, tipo: 'Contrato de alquiler' },
  { pattern: /contrato.{0,15}compraventa|compraventa/i, tipo: 'Contrato de compraventa' },
  { pattern: /contrato/i, tipo: 'Contrato' },
  { pattern: /escritura.{0,15}constitu/i, tipo: 'Escritura de constitución' },
  { pattern: /escritura.{0,15}propiedad/i, tipo: 'Escritura de propiedad' },
  { pattern: /escritura/i, tipo: 'Escritura' },
  { pattern: /\birpf\b|declaracion.{0,10}renta|renta_20\d\d/i, tipo: 'Declaración de la renta' },
  { pattern: /sucesiones/i, tipo: 'Impuesto de Sucesiones' },
  { pattern: /plusvalia/i, tipo: 'Plusvalía' },
  { pattern: /\bibi\b/i, tipo: 'IBI (recibo)' },
  { pattern: /licencia.{0,15}actividad|apertura/i, tipo: 'Licencia de actividad' },
  { pattern: /certificado.{0,20}residencia/i, tipo: 'Certificado de residencia fiscal' },
  { pattern: /certificado.{0,20}digital/i, tipo: 'Certificado digital' },
  { pattern: /certificado/i, tipo: 'Certificado' },
  { pattern: /poder.{0,15}notarial/i, tipo: 'Poder notarial' },
  { pattern: /\bnie\b|\bnif\b|identificacion/i, tipo: 'NIE / NIF documento' },
  { pattern: /nomina|nómina/i, tipo: 'Nómina' },
  { pattern: /factura/i, tipo: 'Factura' },
  { pattern: /vida.{0,10}laboral/i, tipo: 'Vida laboral' },
  { pattern: /alta.{0,15}censal|baja.{0,15}censal/i, tipo: 'Modelo 036' },
  { pattern: /sociedades|impuesto.{0,10}sociedades/i, tipo: 'Modelo 200' },
  { pattern: /retencion|retenciones/i, tipo: 'Modelo 111' },
]

function inferTipoDocumento(fileName: string, folderPath: string): string {
  const searchString = (fileName + ' ' + folderPath).toLowerCase()

  for (const { pattern, tipo } of DOCUMENT_TYPE_PATTERNS) {
    if (pattern.test(searchString)) return tipo
  }

  return 'Otros'
}

function extractEjercicioFiscal(fileName: string): number | null {
  const match = fileName.match(/\b(20\d{2})\b/)
  return match ? parseInt(match[1], 10) : null
}

function buildSharePointUrl(relativePath: string): string {
  // Encode each segment of the path separately
  const encoded = relativePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  return `${SHAREPOINT_BASE_URL}/${encoded}`
}

function extractTags(fileName: string, cliente: string | null, tipoDoc: string, folderName: string): string[] {
  const tags = new Set<string>()

  // Add tipo doc words
  tipoDoc
    .toLowerCase()
    .split(/\s+/)
    .forEach((w) => w.length > 2 && tags.add(w))

  // Add words from filename (remove extension, split by separators)
  fileName
    .replace(/\.[^.]+$/, '')
    .split(/[-_\s.]+/)
    .map((w) => w.toLowerCase())
    .filter((w) => w.length > 2 && !/^\d{1,2}$/.test(w))
    .forEach((w) => tags.add(w))

  // Add folder name
  folderName
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .forEach((w) => tags.add(w))

  // Add client name parts
  if (cliente) {
    cliente
      .toLowerCase()
      .split(/[\s,]+/)
      .filter((w) => w.length > 2)
      .forEach((w) => tags.add(w))
  }

  return Array.from(tags).slice(0, 20)
}

// ─── File walker ─────────────────────────────────────────────────────────────

interface FileRecord {
  cliente: string | null
  cliente_nif: string | null
  tipo_documento: string
  nombre_archivo: string
  descripcion: string | null
  fecha_documento: string | null
  ejercicio_fiscal: number | null
  enlace_descarga: string
  carpeta_origen: string
  ruta_relativa: string
  etiquetas: string[]
}

function walkDirectory(
  dirPath: string,
  rootPath: string,
  carpetaOrigen: string,
  cliente: string | null,
  records: FileRecord[]
): void {
  let entries: fs.Dirent[]

  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true })
  } catch (err) {
    console.warn(`  ⚠️  No se puede leer: ${dirPath}`)
    return
  }

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)
    const nameLower = entry.name.toLowerCase()

    if (IGNORED_FILES.has(nameLower) || entry.name.startsWith('.')) continue

    if (entry.isDirectory()) {
      // If we're in /Clientes/, each subdirectory is a client
      if (carpetaOrigen === 'Clientes' && cliente === null) {
        walkDirectory(fullPath, rootPath, carpetaOrigen, entry.name, records)
      } else {
        // Recurse into subdirectory, keeping same client context
        walkDirectory(fullPath, rootPath, carpetaOrigen, cliente, records)
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase()
      if (!INDEXABLE_EXTENSIONS.has(ext)) continue

      const relativePath = path.relative(rootPath, fullPath).replace(/\\/g, '/')
      const tipoDoc = inferTipoDocumento(entry.name, relativePath)
      const ejercicio = extractEjercicioFiscal(entry.name)

      // Get file modified date
      let fechaDocumento: string | null = null
      try {
        const stat = fs.statSync(fullPath)
        fechaDocumento = stat.mtime.toISOString().split('T')[0]
      } catch {
        // ignore
      }

      records.push({
        cliente: cliente,
        cliente_nif: null,
        tipo_documento: tipoDoc,
        nombre_archivo: entry.name,
        descripcion: null,
        fecha_documento: fechaDocumento,
        ejercicio_fiscal: ejercicio,
        enlace_descarga: buildSharePointUrl(relativePath),
        carpeta_origen: carpetaOrigen,
        ruta_relativa: relativePath,
        etiquetas: extractTags(entry.name, cliente, tipoDoc, carpetaOrigen),
      })
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
    console.error('❌ Debes especificar la ruta de la carpeta local.')
    console.error('   Opción 1: Configura LOCAL_DOCS_PATH en .env.local')
    console.error('   Opción 2: Usa --path="C:/ruta/a/carpeta"')
    process.exit(1)
  }

  const resolvedPath = docsPath.replace(/^~/, process.env.HOME ?? process.env.USERPROFILE ?? '')

  if (!fs.existsSync(resolvedPath)) {
    console.error(`❌ La carpeta no existe: ${resolvedPath}`)
    process.exit(1)
  }

  console.log(`📁 Indexando: ${resolvedPath}`)
  console.log(`🔗 SharePoint base: ${SHAREPOINT_BASE_URL}`)
  if (isDryRun) console.log('🔍 Modo dry-run — no se escribirá en Supabase\n')
  if (isUpdate) console.log('🔄 Modo update — solo archivos nuevos\n')

  // ── Scan filesystem ─────────────────────────────────────────────────────

  const records: FileRecord[] = []
  let ignoredFolders = 0

  let topLevel: fs.Dirent[]
  try {
    topLevel = fs.readdirSync(resolvedPath, { withFileTypes: true })
  } catch (err) {
    console.error(`❌ No se puede leer la carpeta raíz: ${err}`)
    process.exit(1)
  }

  for (const entry of topLevel) {
    if (!entry.isDirectory()) continue
    if (IGNORED_ROOT_FOLDERS.has(entry.name)) {
      console.log(`  ⏭️  Ignorando carpeta: ${entry.name}`)
      ignoredFolders++
      continue
    }

    const subPath = path.join(resolvedPath, entry.name)

    if (entry.name === 'Clientes') {
      console.log(`  📂 Procesando /Clientes/ (fuente principal)...`)
      walkDirectory(subPath, resolvedPath, 'Clientes', null, records)
    } else if (MIXED_FOLDERS.has(entry.name)) {
      console.log(`  📂 Procesando /${entry.name}/ (carpeta mixta)...`)
      walkDirectory(subPath, resolvedPath, entry.name, null, records)
    } else {
      // Other folders — index with folder name as context
      console.log(`  📂 Procesando /${entry.name}/...`)
      walkDirectory(subPath, resolvedPath, entry.name, null, records)
    }
  }

  console.log(`\n📊 Archivos encontrados: ${records.length}`)

  if (isDryRun) {
    console.log('\n📋 Vista previa (primeros 20 registros):')
    records.slice(0, 20).forEach((r, i) => {
      console.log(`  ${i + 1}. [${r.carpeta_origen}] ${r.cliente ?? 'sin cliente'} — ${r.nombre_archivo} (${r.tipo_documento})`)
    })
    console.log('\n✅ Dry-run completado. Nada fue escrito en Supabase.')
    return
  }

  // ── Write to Supabase ────────────────────────────────────────────────────

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('\n❌ Faltan variables de entorno para Supabase:')
    console.error('   NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  let inserted = 0
  let updated = 0
  let skipped = 0
  let errors = 0

  // Fetch existing records if in update mode
  let existingKeys = new Set<string>()
  if (isUpdate) {
    console.log('\n🔍 Consultando registros existentes...')
    const { data } = await supabase
      .from('documentos')
      .select('nombre_archivo, cliente, carpeta_origen')
    if (data) {
      existingKeys = new Set(
        data.map((r: { nombre_archivo: string; cliente: string; carpeta_origen: string }) =>
          `${r.nombre_archivo}|${r.cliente ?? ''}|${r.carpeta_origen ?? ''}`
        )
      )
      console.log(`   ${existingKeys.size} registros ya indexados.`)
    }
  }

  console.log('\n💾 Guardando en Supabase...')

  // Process in batches of 50
  const BATCH_SIZE = 50
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE)

    if (isUpdate) {
      const newBatch = batch.filter((r) => {
        const key = `${r.nombre_archivo}|${r.cliente ?? ''}|${r.carpeta_origen ?? ''}`
        return !existingKeys.has(key)
      })
      skipped += batch.length - newBatch.length
      if (newBatch.length === 0) continue

      const { error } = await supabase.from('documentos').insert(
        newBatch.map((r) => ({ ...r, updated_at: new Date().toISOString() }))
      )
      if (error) {
        console.error(`  ❌ Error batch ${i}-${i + BATCH_SIZE}:`, error.message)
        errors += newBatch.length
      } else {
        inserted += newBatch.length
        process.stdout.write(`\r   Procesados: ${i + batch.length}/${records.length}`)
      }
    } else {
      const { error } = await supabase.from('documentos').upsert(
        batch.map((r) => ({ ...r, updated_at: new Date().toISOString() })),
        { onConflict: 'nombre_archivo,cliente,carpeta_origen' }
      )
      if (error) {
        console.error(`  ❌ Error batch ${i}-${i + BATCH_SIZE}:`, error.message)
        errors += batch.length
      } else {
        inserted += batch.length
        process.stdout.write(`\r   Procesados: ${i + batch.length}/${records.length}`)
      }
    }
  }

  console.log('\n')
  console.log('📊 Resumen final:')
  console.log(`   ✅ Insertados/actualizados: ${inserted}`)
  if (isUpdate) console.log(`   ⏭️  Omitidos (ya existían): ${skipped}`)
  console.log(`   ❌ Errores: ${errors}`)
  console.log(`   🚫 Carpetas ignoradas: ${ignoredFolders}`)

  // Write log file
  const logPath = path.join(process.cwd(), 'indexer.log')
  const logContent = [
    `Indexación: ${new Date().toISOString()}`,
    `Carpeta: ${resolvedPath}`,
    `Archivos encontrados: ${records.length}`,
    `Insertados: ${inserted} | Omitidos: ${skipped} | Errores: ${errors}`,
    '',
    ...records.map((r) => `${r.carpeta_origen} | ${r.cliente ?? '-'} | ${r.nombre_archivo} | ${r.tipo_documento}`),
  ].join('\n')

  fs.writeFileSync(logPath, logContent, 'utf-8')
  console.log(`\n📝 Log guardado en: ${logPath}`)
  console.log('\n🎉 Indexación completada.')
}

main().catch((err) => {
  console.error('❌ Error fatal:', err)
  process.exit(1)
})
