import { createClient } from '@supabase/supabase-js'

export type Documento = {
  id: string
  cliente: string
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Server-side client with service role (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
})

// Public client (for potential future client-side use)
export const createPublicClient = () =>
  createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? supabaseServiceKey)
