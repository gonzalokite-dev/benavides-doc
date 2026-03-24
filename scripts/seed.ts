/**
 * seed.ts — Inserta datos de ejemplo en data/documentos.json
 * Uso: npx tsx scripts/seed.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { randomUUID } from 'crypto'
import type { Documento } from '../lib/db'

const DB_PATH = path.join(process.cwd(), 'data', 'documentos.json')
const BASE_URL = 'https://tuempresa.sharepoint.com/sites/BenavidesAsociados/Shared%20Documents'

const now = new Date().toISOString()

const SEED_DATA: Omit<Documento, 'id' | 'created_at' | 'updated_at'>[] = [
  // ─── Inversiones Vicusi SL ───────────────────────────────────────────────
  {
    cliente: 'Inversiones Vicusi SL', cliente_nif: 'B07123456',
    tipo_documento: 'Modelo 303', nombre_archivo: 'Vicusi_303_2T_2024.pdf',
    descripcion: 'IVA trimestral 2T 2024', fecha_documento: '2024-07-20', ejercicio_fiscal: 2024,
    enlace_descarga: `${BASE_URL}/Clientes/Inversiones%20Vicusi%20SL/Vicusi_303_2T_2024.pdf`,
    carpeta_origen: 'Clientes', ruta_relativa: 'Clientes/Inversiones Vicusi SL/Vicusi_303_2T_2024.pdf',
    etiquetas: ['iva', 'trimestral', 'modelo 303', '2024', 'vicusi'],
  },
  {
    cliente: 'Inversiones Vicusi SL', cliente_nif: 'B07123456',
    tipo_documento: 'Modelo 303', nombre_archivo: 'Vicusi_303_3T_2024.pdf',
    descripcion: 'IVA trimestral 3T 2024', fecha_documento: '2024-10-20', ejercicio_fiscal: 2024,
    enlace_descarga: `${BASE_URL}/Clientes/Inversiones%20Vicusi%20SL/Vicusi_303_3T_2024.pdf`,
    carpeta_origen: 'Clientes', ruta_relativa: 'Clientes/Inversiones Vicusi SL/Vicusi_303_3T_2024.pdf',
    etiquetas: ['iva', 'trimestral', 'modelo 303', '2024', 'vicusi'],
  },
  {
    cliente: 'Inversiones Vicusi SL', cliente_nif: 'B07123456',
    tipo_documento: 'Modelo 200', nombre_archivo: 'Vicusi_IS_2023.pdf',
    descripcion: 'Impuesto de Sociedades ejercicio 2023', fecha_documento: '2024-07-25', ejercicio_fiscal: 2023,
    enlace_descarga: `${BASE_URL}/Clientes/Inversiones%20Vicusi%20SL/Vicusi_IS_2023.pdf`,
    carpeta_origen: 'Clientes', ruta_relativa: 'Clientes/Inversiones Vicusi SL/Vicusi_IS_2023.pdf',
    etiquetas: ['sociedades', 'modelo 200', '2023', 'vicusi'],
  },
  {
    cliente: 'Inversiones Vicusi SL', cliente_nif: 'B07123456',
    tipo_documento: 'Modelo 036', nombre_archivo: 'Vicusi_036_Constitucion.pdf',
    descripcion: 'Alta censal en el momento de constitución', fecha_documento: '2019-03-10', ejercicio_fiscal: null,
    enlace_descarga: `${BASE_URL}/Clientes/Inversiones%20Vicusi%20SL/Vicusi_036_Constitucion.pdf`,
    carpeta_origen: 'Clientes', ruta_relativa: 'Clientes/Inversiones Vicusi SL/Vicusi_036_Constitucion.pdf',
    etiquetas: ['censal', 'alta', 'modelo 036', 'vicusi'],
  },

  // ─── García López, María ─────────────────────────────────────────────────
  {
    cliente: 'García López, María', cliente_nif: '43123456X',
    tipo_documento: 'Declaración de la renta', nombre_archivo: 'Garcia_Lopez_IRPF_2023.pdf',
    descripcion: 'Declaración IRPF ejercicio 2023', fecha_documento: '2024-06-14', ejercicio_fiscal: 2023,
    enlace_descarga: `${BASE_URL}/Clientes/Garc%C3%ADa%20L%C3%B3pez%2C%20Mar%C3%ADa/Garcia_Lopez_IRPF_2023.pdf`,
    carpeta_origen: 'Clientes', ruta_relativa: 'Clientes/García López, María/Garcia_Lopez_IRPF_2023.pdf',
    etiquetas: ['renta', 'irpf', '2023', 'garcia lopez'],
  },
  {
    cliente: 'García López, María', cliente_nif: '43123456X',
    tipo_documento: 'Declaración de la renta', nombre_archivo: 'Garcia_Lopez_IRPF_2022.pdf',
    descripcion: 'Declaración IRPF ejercicio 2022', fecha_documento: '2023-06-20', ejercicio_fiscal: 2022,
    enlace_descarga: `${BASE_URL}/Clientes/Garc%C3%ADa%20L%C3%B3pez%2C%20Mar%C3%ADa/Garcia_Lopez_IRPF_2022.pdf`,
    carpeta_origen: 'Clientes', ruta_relativa: 'Clientes/García López, María/Garcia_Lopez_IRPF_2022.pdf',
    etiquetas: ['renta', 'irpf', '2022', 'garcia lopez'],
  },
  {
    cliente: 'García López, María', cliente_nif: '43123456X',
    tipo_documento: 'Contrato de alquiler', nombre_archivo: 'Garcia_Lopez_Contrato_Alquiler_Palma.pdf',
    descripcion: 'Contrato de arrendamiento de vivienda en Palma', fecha_documento: '2022-09-01', ejercicio_fiscal: null,
    enlace_descarga: `${BASE_URL}/Clientes/Garc%C3%ADa%20L%C3%B3pez%2C%20Mar%C3%ADa/Garcia_Lopez_Contrato_Alquiler_Palma.pdf`,
    carpeta_origen: 'Clientes', ruta_relativa: 'Clientes/García López, María/Garcia_Lopez_Contrato_Alquiler_Palma.pdf',
    etiquetas: ['contrato', 'alquiler', 'arrendamiento', 'garcia lopez'],
  },

  // ─── Pollensa Properties SL ──────────────────────────────────────────────
  {
    cliente: 'Pollensa Properties SL', cliente_nif: 'B07654321',
    tipo_documento: 'Modelo 303', nombre_archivo: 'Pollensa_303_1T_2024.pdf',
    descripcion: 'IVA trimestral 1T 2024', fecha_documento: '2024-04-20', ejercicio_fiscal: 2024,
    enlace_descarga: `${BASE_URL}/Clientes/Pollensa%20Properties%20SL/Pollensa_303_1T_2024.pdf`,
    carpeta_origen: 'Clientes', ruta_relativa: 'Clientes/Pollensa Properties SL/Pollensa_303_1T_2024.pdf',
    etiquetas: ['iva', 'trimestral', 'modelo 303', '2024', 'pollensa'],
  },
  {
    cliente: 'Pollensa Properties SL', cliente_nif: 'B07654321',
    tipo_documento: 'Escritura de constitución', nombre_archivo: 'Pollensa_Escritura_Constitucion_2018.pdf',
    descripcion: 'Escritura de constitución de la sociedad', fecha_documento: '2018-05-15', ejercicio_fiscal: null,
    enlace_descarga: `${BASE_URL}/Clientes/Pollensa%20Properties%20SL/Pollensa_Escritura_Constitucion_2018.pdf`,
    carpeta_origen: 'Clientes', ruta_relativa: 'Clientes/Pollensa Properties SL/Pollensa_Escritura_Constitucion_2018.pdf',
    etiquetas: ['escritura', 'constitucion', 'pollensa'],
  },
  {
    cliente: 'Pollensa Properties SL', cliente_nif: 'B07654321',
    tipo_documento: 'Modelo 347', nombre_archivo: 'Pollensa_347_2023.pdf',
    descripcion: 'Operaciones con terceros 2023', fecha_documento: '2024-02-28', ejercicio_fiscal: 2023,
    enlace_descarga: `${BASE_URL}/Clientes/Pollensa%20Properties%20SL/Pollensa_347_2023.pdf`,
    carpeta_origen: 'Clientes', ruta_relativa: 'Clientes/Pollensa Properties SL/Pollensa_347_2023.pdf',
    etiquetas: ['modelo 347', 'operaciones terceros', '2023', 'pollensa'],
  },
  {
    cliente: 'Pollensa Properties SL', cliente_nif: 'B07654321',
    tipo_documento: 'Modelo 390', nombre_archivo: 'Pollensa_390_2023.pdf',
    descripcion: 'Resumen anual IVA 2023', fecha_documento: '2024-01-30', ejercicio_fiscal: 2023,
    enlace_descarga: `${BASE_URL}/Clientes/Pollensa%20Properties%20SL/Pollensa_390_2023.pdf`,
    carpeta_origen: 'Clientes', ruta_relativa: 'Clientes/Pollensa Properties SL/Pollensa_390_2023.pdf',
    etiquetas: ['modelo 390', 'resumen iva', '2023', 'pollensa'],
  },

  // ─── Schmidt, Hans (no residente) ────────────────────────────────────────
  {
    cliente: 'Schmidt, Hans', cliente_nif: 'X1234567A',
    tipo_documento: 'Certificado de residencia fiscal', nombre_archivo: 'Schmidt_Certificado_Residencia_Fiscal_2024.pdf',
    descripcion: 'Certificado de residencia fiscal en Alemania', fecha_documento: '2024-03-10', ejercicio_fiscal: 2024,
    enlace_descarga: `${BASE_URL}/No%20Residentes/Schmidt%2C%20Hans/Schmidt_Certificado_Residencia_Fiscal_2024.pdf`,
    carpeta_origen: 'No Residentes', ruta_relativa: 'No Residentes/Schmidt, Hans/Schmidt_Certificado_Residencia_Fiscal_2024.pdf',
    etiquetas: ['certificado', 'residencia', 'no residente', 'schmidt'],
  },
  {
    cliente: 'Schmidt, Hans', cliente_nif: 'X1234567A',
    tipo_documento: 'NIE / NIF documento', nombre_archivo: 'Schmidt_NIE.pdf',
    descripcion: 'Número de Identificación de Extranjero', fecha_documento: '2020-06-20', ejercicio_fiscal: null,
    enlace_descarga: `${BASE_URL}/No%20Residentes/Schmidt%2C%20Hans/Schmidt_NIE.pdf`,
    carpeta_origen: 'No Residentes', ruta_relativa: 'No Residentes/Schmidt, Hans/Schmidt_NIE.pdf',
    etiquetas: ['nie', 'identificacion', 'extranjero', 'schmidt'],
  },
  {
    cliente: 'Schmidt, Hans', cliente_nif: 'X1234567A',
    tipo_documento: 'Escritura de propiedad', nombre_archivo: 'Schmidt_Escritura_Propiedad_Alcudia.pdf',
    descripcion: 'Escritura de compraventa de inmueble en Alcúdia', fecha_documento: '2021-08-15', ejercicio_fiscal: null,
    enlace_descarga: `${BASE_URL}/No%20Residentes/Schmidt%2C%20Hans/Schmidt_Escritura_Propiedad_Alcudia.pdf`,
    carpeta_origen: 'No Residentes', ruta_relativa: 'No Residentes/Schmidt, Hans/Schmidt_Escritura_Propiedad_Alcudia.pdf',
    etiquetas: ['escritura', 'propiedad', 'compraventa', 'alcudia', 'schmidt'],
  },

  // ─── Restaurante Sa Fonda CB ──────────────────────────────────────────────
  {
    cliente: 'Restaurante Sa Fonda CB', cliente_nif: 'E07111222',
    tipo_documento: 'Modelo 303', nombre_archivo: 'SaFonda_303_4T_2023.pdf',
    descripcion: 'IVA trimestral 4T 2023', fecha_documento: '2024-01-20', ejercicio_fiscal: 2023,
    enlace_descarga: `${BASE_URL}/Clientes/Restaurante%20Sa%20Fonda%20CB/SaFonda_303_4T_2023.pdf`,
    carpeta_origen: 'Clientes', ruta_relativa: 'Clientes/Restaurante Sa Fonda CB/SaFonda_303_4T_2023.pdf',
    etiquetas: ['iva', 'trimestral', 'modelo 303', '2023', 'sa fonda'],
  },
  {
    cliente: 'Restaurante Sa Fonda CB', cliente_nif: 'E07111222',
    tipo_documento: 'Modelo 111', nombre_archivo: 'SaFonda_111_3T_2024.pdf',
    descripcion: 'Retenciones IRPF trabajadores 3T 2024', fecha_documento: '2024-10-20', ejercicio_fiscal: 2024,
    enlace_descarga: `${BASE_URL}/Clientes/Restaurante%20Sa%20Fonda%20CB/SaFonda_111_3T_2024.pdf`,
    carpeta_origen: 'Clientes', ruta_relativa: 'Clientes/Restaurante Sa Fonda CB/SaFonda_111_3T_2024.pdf',
    etiquetas: ['retenciones', 'modelo 111', 'irpf', '2024', 'sa fonda'],
  },
  {
    cliente: 'Restaurante Sa Fonda CB', cliente_nif: 'E07111222',
    tipo_documento: 'Licencia de actividad', nombre_archivo: 'SaFonda_Licencia_Actividad_2019.pdf',
    descripcion: 'Licencia municipal de apertura y actividad', fecha_documento: '2019-04-01', ejercicio_fiscal: null,
    enlace_descarga: `${BASE_URL}/Clientes/Restaurante%20Sa%20Fonda%20CB/SaFonda_Licencia_Actividad_2019.pdf`,
    carpeta_origen: 'Clientes', ruta_relativa: 'Clientes/Restaurante Sa Fonda CB/SaFonda_Licencia_Actividad_2019.pdf',
    etiquetas: ['licencia', 'actividad', 'apertura', 'sa fonda'],
  },
  {
    cliente: 'Restaurante Sa Fonda CB', cliente_nif: 'E07111222',
    tipo_documento: 'Modelo 190', nombre_archivo: 'SaFonda_190_2023.pdf',
    descripcion: 'Resumen anual retenciones 2023', fecha_documento: '2024-01-31', ejercicio_fiscal: 2023,
    enlace_descarga: `${BASE_URL}/Clientes/Restaurante%20Sa%20Fonda%20CB/SaFonda_190_2023.pdf`,
    carpeta_origen: 'Clientes', ruta_relativa: 'Clientes/Restaurante Sa Fonda CB/SaFonda_190_2023.pdf',
    etiquetas: ['modelo 190', 'resumen retenciones', '2023', 'sa fonda'],
  },
]

function seed() {
  // Read existing data
  let existing: Documento[] = []
  if (fs.existsSync(DB_PATH)) {
    try {
      existing = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'))
    } catch {
      existing = []
    }
  }

  const existingKeys = new Set(
    existing.map((d) => `${d.nombre_archivo}|${d.cliente ?? ''}|${d.carpeta_origen ?? ''}`)
  )

  let inserted = 0
  let skipped = 0

  const newDocs: Documento[] = SEED_DATA.map((d) => ({
    ...d,
    id: randomUUID(),
    created_at: now,
    updated_at: now,
  }))

  for (const doc of newDocs) {
    const key = `${doc.nombre_archivo}|${doc.cliente ?? ''}|${doc.carpeta_origen ?? ''}`
    if (existingKeys.has(key)) {
      console.log(`  ⏭️  Ya existe: ${doc.nombre_archivo}`)
      skipped++
    } else {
      existing.push(doc)
      console.log(`  ✅ Añadido: ${doc.nombre_archivo} (${doc.cliente})`)
      inserted++
    }
  }

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
  fs.writeFileSync(DB_PATH, JSON.stringify(existing, null, 2), 'utf-8')

  console.log(`\n📊 Resumen:`)
  console.log(`   ✅ Insertados: ${inserted}`)
  console.log(`   ⏭️  Omitidos: ${skipped}`)
  console.log(`   📄 Total en BD: ${existing.length}`)
  console.log(`\n🎉 Seed completado. Prueba: "303 de Vicusi", "renta de García López"`)
}

seed()
