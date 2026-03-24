import fs from 'fs'
import path from 'path'

export type Documento = {
  id: string
  cliente: string | null
  cliente_nif: string | null
  tipo_documento: string
  nombre_archivo: string
  descripcion: string | null
  fecha_documento: string | null
  ejercicio_fiscal: number | null
  enlace_descarga: string
  carpeta_origen: string | null
  ruta_relativa: string | null
  etiquetas: string[] | null
  created_at: string
  updated_at: string
}

const DB_PATH = path.join(process.cwd(), 'data', 'documentos.json')

export function readDocuments(): Documento[] {
  try {
    const content = fs.readFileSync(DB_PATH, 'utf-8')
    return JSON.parse(content) as Documento[]
  } catch {
    return []
  }
}
