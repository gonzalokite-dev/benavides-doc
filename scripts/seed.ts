/**
 * seed.ts — Inserta datos de ejemplo en la tabla `documentos` de Supabase
 * Uso: npx tsx scripts/seed.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })
dotenv.config({ path: path.join(process.cwd(), '.env') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const BASE_URL = 'https://tuempresa.sharepoint.com/sites/BenavidesAsociados/Shared%20Documents'

const SEED_DATA = [
  // ─── Inversiones Vicusi SL ───────────────────────────────────────────────
  {
    cliente: 'Inversiones Vicusi SL',
    cliente_nif: 'B07123456',
    tipo_documento: 'Modelo 303',
    nombre_archivo: 'Vicusi_303_2T_2024.pdf',
    descripcion: 'IVA trimestral 2T 2024',
    fecha_documento: '2024-07-20',
    ejercicio_fiscal: 2024,
    enlace_descarga: `${BASE_URL}/Clientes/Inversiones%20Vicusi%20SL/Vicusi_303_2T_2024.pdf`,
    carpeta_origen: 'Clientes',
    ruta_relativa: 'Clientes/Inversiones Vicusi SL/Vicusi_303_2T_2024.pdf',
    etiquetas: ['iva', 'trimestral', 'modelo 303', '2024', 'vicusi'],
  },
  {
    cliente: 'Inversiones Vicusi SL',
    cliente_nif: 'B07123456',
    tipo_documento: 'Modelo 303',
    nombre_archivo: 'Vicusi_303_3T_2024.pdf',
    descripcion: 'IVA trimestral 3T 2024',
    fecha_documento: '2024-10-20',
    ejercicio_fiscal: 2024,
    enlace_descarga: `${BASE_URL}/Clientes/Inversiones%20Vicusi%20SL/Vicusi_303_3T_2024.pdf`,
    carpeta_origen: 'Clientes',
    ruta_relativa: 'Clientes/Inversiones Vicusi SL/Vicusi_303_3T_2024.pdf',
    etiquetas: ['iva', 'trimestral', 'modelo 303', '2024', 'vicusi'],
  },
  {
    cliente: 'Inversiones Vicusi SL',
    cliente_nif: 'B07123456',
    tipo_documento: 'Modelo 200',
    nombre_archivo: 'Vicusi_IS_2023.pdf',
    descripcion: 'Impuesto de Sociedades ejercicio 2023',
    fecha_documento: '2024-07-25',
    ejercicio_fiscal: 2023,
    enlace_descarga: `${BASE_URL}/Clientes/Inversiones%20Vicusi%20SL/Vicusi_IS_2023.pdf`,
    carpeta_origen: 'Clientes',
    ruta_relativa: 'Clientes/Inversiones Vicusi SL/Vicusi_IS_2023.pdf',
    etiquetas: ['sociedades', 'modelo 200', '2023', 'vicusi', 'is'],
  },
  {
    cliente: 'Inversiones Vicusi SL',
    cliente_nif: 'B07123456',
    tipo_documento: 'Modelo 036',
    nombre_archivo: 'Vicusi_036_Constitucion.pdf',
    descripcion: 'Alta censal en el momento de constitución',
    fecha_documento: '2019-03-10',
    ejercicio_fiscal: null,
    enlace_descarga: `${BASE_URL}/Clientes/Inversiones%20Vicusi%20SL/Vicusi_036_Constitucion.pdf`,
    carpeta_origen: 'Clientes',
    ruta_relativa: 'Clientes/Inversiones Vicusi SL/Vicusi_036_Constitucion.pdf',
    etiquetas: ['censal', 'alta', 'modelo 036', 'constitución', 'vicusi'],
  },

  // ─── García López, María ─────────────────────────────────────────────────
  {
    cliente: 'García López, María',
    cliente_nif: '43123456X',
    tipo_documento: 'Declaración de la renta',
    nombre_archivo: 'Garcia_Lopez_IRPF_2023.pdf',
    descripcion: 'Declaración IRPF ejercicio 2023',
    fecha_documento: '2024-06-14',
    ejercicio_fiscal: 2023,
    enlace_descarga: `${BASE_URL}/Clientes/Garc%C3%ADa%20L%C3%B3pez%2C%20Mar%C3%ADa/Garcia_Lopez_IRPF_2023.pdf`,
    carpeta_origen: 'Clientes',
    ruta_relativa: 'Clientes/García López, María/Garcia_Lopez_IRPF_2023.pdf',
    etiquetas: ['renta', 'irpf', '2023', 'garcia lopez', 'declaracion'],
  },
  {
    cliente: 'García López, María',
    cliente_nif: '43123456X',
    tipo_documento: 'Declaración de la renta',
    nombre_archivo: 'Garcia_Lopez_IRPF_2022.pdf',
    descripcion: 'Declaración IRPF ejercicio 2022',
    fecha_documento: '2023-06-20',
    ejercicio_fiscal: 2022,
    enlace_descarga: `${BASE_URL}/Clientes/Garc%C3%ADa%20L%C3%B3pez%2C%20Mar%C3%ADa/Garcia_Lopez_IRPF_2022.pdf`,
    carpeta_origen: 'Clientes',
    ruta_relativa: 'Clientes/García López, María/Garcia_Lopez_IRPF_2022.pdf',
    etiquetas: ['renta', 'irpf', '2022', 'garcia lopez', 'declaracion'],
  },
  {
    cliente: 'García López, María',
    cliente_nif: '43123456X',
    tipo_documento: 'Contrato de alquiler',
    nombre_archivo: 'Garcia_Lopez_Contrato_Alquiler_Palma.pdf',
    descripcion: 'Contrato de arrendamiento de vivienda en Palma de Mallorca',
    fecha_documento: '2022-09-01',
    ejercicio_fiscal: null,
    enlace_descarga: `${BASE_URL}/Clientes/Garc%C3%ADa%20L%C3%B3pez%2C%20Mar%C3%ADa/Garcia_Lopez_Contrato_Alquiler_Palma.pdf`,
    carpeta_origen: 'Clientes',
    ruta_relativa: 'Clientes/García López, María/Garcia_Lopez_Contrato_Alquiler_Palma.pdf',
    etiquetas: ['contrato', 'alquiler', 'arrendamiento', 'vivienda', 'garcia lopez'],
  },

  // ─── Pollensa Properties SL ──────────────────────────────────────────────
  {
    cliente: 'Pollensa Properties SL',
    cliente_nif: 'B07654321',
    tipo_documento: 'Modelo 303',
    nombre_archivo: 'Pollensa_303_1T_2024.pdf',
    descripcion: 'IVA trimestral 1T 2024',
    fecha_documento: '2024-04-20',
    ejercicio_fiscal: 2024,
    enlace_descarga: `${BASE_URL}/Clientes/Pollensa%20Properties%20SL/Pollensa_303_1T_2024.pdf`,
    carpeta_origen: 'Clientes',
    ruta_relativa: 'Clientes/Pollensa Properties SL/Pollensa_303_1T_2024.pdf',
    etiquetas: ['iva', 'trimestral', 'modelo 303', '2024', 'pollensa'],
  },
  {
    cliente: 'Pollensa Properties SL',
    cliente_nif: 'B07654321',
    tipo_documento: 'Escritura de constitución',
    nombre_archivo: 'Pollensa_Escritura_Constitucion_2018.pdf',
    descripcion: 'Escritura de constitución de la sociedad ante notario',
    fecha_documento: '2018-05-15',
    ejercicio_fiscal: null,
    enlace_descarga: `${BASE_URL}/Clientes/Pollensa%20Properties%20SL/Pollensa_Escritura_Constitucion_2018.pdf`,
    carpeta_origen: 'Clientes',
    ruta_relativa: 'Clientes/Pollensa Properties SL/Pollensa_Escritura_Constitucion_2018.pdf',
    etiquetas: ['escritura', 'constitucion', 'notario', 'pollensa', 'sociedad'],
  },
  {
    cliente: 'Pollensa Properties SL',
    cliente_nif: 'B07654321',
    tipo_documento: 'Modelo 347',
    nombre_archivo: 'Pollensa_347_2023.pdf',
    descripcion: 'Operaciones con terceros 2023',
    fecha_documento: '2024-02-28',
    ejercicio_fiscal: 2023,
    enlace_descarga: `${BASE_URL}/Clientes/Pollensa%20Properties%20SL/Pollensa_347_2023.pdf`,
    carpeta_origen: 'Clientes',
    ruta_relativa: 'Clientes/Pollensa Properties SL/Pollensa_347_2023.pdf',
    etiquetas: ['modelo 347', 'operaciones terceros', '2023', 'pollensa'],
  },
  {
    cliente: 'Pollensa Properties SL',
    cliente_nif: 'B07654321',
    tipo_documento: 'Modelo 390',
    nombre_archivo: 'Pollensa_390_2023.pdf',
    descripcion: 'Resumen anual IVA 2023',
    fecha_documento: '2024-01-30',
    ejercicio_fiscal: 2023,
    enlace_descarga: `${BASE_URL}/Clientes/Pollensa%20Properties%20SL/Pollensa_390_2023.pdf`,
    carpeta_origen: 'Clientes',
    ruta_relativa: 'Clientes/Pollensa Properties SL/Pollensa_390_2023.pdf',
    etiquetas: ['modelo 390', 'resumen iva', '2023', 'pollensa'],
  },

  // ─── Schmidt, Hans (no residente) ────────────────────────────────────────
  {
    cliente: 'Schmidt, Hans',
    cliente_nif: 'X1234567A',
    tipo_documento: 'Certificado de residencia fiscal',
    nombre_archivo: 'Schmidt_Certificado_Residencia_Fiscal_2024.pdf',
    descripcion: 'Certificado de residencia fiscal en Alemania para 2024',
    fecha_documento: '2024-03-10',
    ejercicio_fiscal: 2024,
    enlace_descarga: `${BASE_URL}/No%20Residentes/Schmidt%2C%20Hans/Schmidt_Certificado_Residencia_Fiscal_2024.pdf`,
    carpeta_origen: 'No Residentes',
    ruta_relativa: 'No Residentes/Schmidt, Hans/Schmidt_Certificado_Residencia_Fiscal_2024.pdf',
    etiquetas: ['certificado', 'residencia', 'no residente', 'alemania', 'schmidt'],
  },
  {
    cliente: 'Schmidt, Hans',
    cliente_nif: 'X1234567A',
    tipo_documento: 'NIE / NIF documento',
    nombre_archivo: 'Schmidt_NIE.pdf',
    descripcion: 'Número de Identificación de Extranjero',
    fecha_documento: '2020-06-20',
    ejercicio_fiscal: null,
    enlace_descarga: `${BASE_URL}/No%20Residentes/Schmidt%2C%20Hans/Schmidt_NIE.pdf`,
    carpeta_origen: 'No Residentes',
    ruta_relativa: 'No Residentes/Schmidt, Hans/Schmidt_NIE.pdf',
    etiquetas: ['nie', 'identificacion', 'extranjero', 'schmidt'],
  },
  {
    cliente: 'Schmidt, Hans',
    cliente_nif: 'X1234567A',
    tipo_documento: 'Escritura de propiedad',
    nombre_archivo: 'Schmidt_Escritura_Propiedad_Alcudia.pdf',
    descripcion: 'Escritura de compraventa de inmueble en Alcúdia',
    fecha_documento: '2021-08-15',
    ejercicio_fiscal: null,
    enlace_descarga: `${BASE_URL}/No%20Residentes/Schmidt%2C%20Hans/Schmidt_Escritura_Propiedad_Alcudia.pdf`,
    carpeta_origen: 'No Residentes',
    ruta_relativa: 'No Residentes/Schmidt, Hans/Schmidt_Escritura_Propiedad_Alcudia.pdf',
    etiquetas: ['escritura', 'propiedad', 'compraventa', 'alcudia', 'schmidt'],
  },

  // ─── Restaurante Sa Fonda CB ──────────────────────────────────────────────
  {
    cliente: 'Restaurante Sa Fonda CB',
    cliente_nif: 'E07111222',
    tipo_documento: 'Modelo 303',
    nombre_archivo: 'SaFonda_303_4T_2023.pdf',
    descripcion: 'IVA trimestral 4T 2023',
    fecha_documento: '2024-01-20',
    ejercicio_fiscal: 2023,
    enlace_descarga: `${BASE_URL}/Clientes/Restaurante%20Sa%20Fonda%20CB/SaFonda_303_4T_2023.pdf`,
    carpeta_origen: 'Clientes',
    ruta_relativa: 'Clientes/Restaurante Sa Fonda CB/SaFonda_303_4T_2023.pdf',
    etiquetas: ['iva', 'trimestral', 'modelo 303', '2023', 'sa fonda', 'restaurante'],
  },
  {
    cliente: 'Restaurante Sa Fonda CB',
    cliente_nif: 'E07111222',
    tipo_documento: 'Modelo 111',
    nombre_archivo: 'SaFonda_111_3T_2024.pdf',
    descripcion: 'Retenciones IRPF trabajadores 3T 2024',
    fecha_documento: '2024-10-20',
    ejercicio_fiscal: 2024,
    enlace_descarga: `${BASE_URL}/Clientes/Restaurante%20Sa%20Fonda%20CB/SaFonda_111_3T_2024.pdf`,
    carpeta_origen: 'Clientes',
    ruta_relativa: 'Clientes/Restaurante Sa Fonda CB/SaFonda_111_3T_2024.pdf',
    etiquetas: ['retenciones', 'modelo 111', 'irpf', '2024', 'sa fonda', 'trabajadores'],
  },
  {
    cliente: 'Restaurante Sa Fonda CB',
    cliente_nif: 'E07111222',
    tipo_documento: 'Licencia de actividad',
    nombre_archivo: 'SaFonda_Licencia_Actividad_2019.pdf',
    descripcion: 'Licencia municipal de apertura y actividad',
    fecha_documento: '2019-04-01',
    ejercicio_fiscal: null,
    enlace_descarga: `${BASE_URL}/Clientes/Restaurante%20Sa%20Fonda%20CB/SaFonda_Licencia_Actividad_2019.pdf`,
    carpeta_origen: 'Clientes',
    ruta_relativa: 'Clientes/Restaurante Sa Fonda CB/SaFonda_Licencia_Actividad_2019.pdf',
    etiquetas: ['licencia', 'actividad', 'apertura', 'restaurante', 'sa fonda'],
  },
  {
    cliente: 'Restaurante Sa Fonda CB',
    cliente_nif: 'E07111222',
    tipo_documento: 'Modelo 190',
    nombre_archivo: 'SaFonda_190_2023.pdf',
    descripcion: 'Resumen anual retenciones e ingresos a cuenta 2023',
    fecha_documento: '2024-01-31',
    ejercicio_fiscal: 2023,
    enlace_descarga: `${BASE_URL}/Clientes/Restaurante%20Sa%20Fonda%20CB/SaFonda_190_2023.pdf`,
    carpeta_origen: 'Clientes',
    ruta_relativa: 'Clientes/Restaurante Sa Fonda CB/SaFonda_190_2023.pdf',
    etiquetas: ['modelo 190', 'resumen retenciones', '2023', 'sa fonda'],
  },
]

async function seed() {
  console.log('🌱 Iniciando seed de datos de ejemplo...\n')

  let inserted = 0
  let skipped = 0
  let errors = 0

  for (const doc of SEED_DATA) {
    try {
      const { error } = await supabase.from('documentos').upsert(
        {
          ...doc,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'nombre_archivo,cliente,carpeta_origen',
          ignoreDuplicates: false,
        }
      )

      if (error) {
        if (error.code === '23505') {
          console.log(`  ⏭️  Ya existe: ${doc.nombre_archivo}`)
          skipped++
        } else {
          console.error(`  ❌ Error en ${doc.nombre_archivo}:`, error.message)
          errors++
        }
      } else {
        console.log(`  ✅ Insertado: ${doc.nombre_archivo} (${doc.cliente})`)
        inserted++
      }
    } catch (err) {
      console.error(`  ❌ Error inesperado en ${doc.nombre_archivo}:`, err)
      errors++
    }
  }

  console.log(`\n📊 Resumen:`)
  console.log(`   ✅ Insertados: ${inserted}`)
  console.log(`   ⏭️  Omitidos (ya existían): ${skipped}`)
  console.log(`   ❌ Errores: ${errors}`)

  if (errors === 0) {
    console.log('\n🎉 Seed completado con éxito.')
    console.log('   Puedes probar la app buscando: "303 de Vicusi", "renta de García López", etc.')
  } else {
    console.log('\n⚠️  Seed completado con errores. Revisa la tabla `documentos` en Supabase.')
    console.log('   Asegúrate de que la tabla existe con el schema correcto.')
  }
}

seed().catch(console.error)
