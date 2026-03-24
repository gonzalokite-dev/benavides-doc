-- ============================================================
-- BenavidesDoc — Schema de Supabase
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- Tabla principal de documentos
CREATE TABLE IF NOT EXISTS documentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente VARCHAR(255),
  cliente_nif VARCHAR(20),
  tipo_documento VARCHAR(100) NOT NULL,
  nombre_archivo VARCHAR(500) NOT NULL,
  descripcion TEXT,
  fecha_documento DATE,
  ejercicio_fiscal INTEGER,
  enlace_descarga TEXT NOT NULL,
  carpeta_origen VARCHAR(255),
  ruta_relativa TEXT,
  etiquetas TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_documentos_cliente
  ON documentos USING gin (to_tsvector('spanish', COALESCE(cliente, '')));

CREATE INDEX IF NOT EXISTS idx_documentos_tipo
  ON documentos (tipo_documento);

CREATE INDEX IF NOT EXISTS idx_documentos_ejercicio
  ON documentos (ejercicio_fiscal);

CREATE INDEX IF NOT EXISTS idx_documentos_nif
  ON documentos (cliente_nif);

CREATE INDEX IF NOT EXISTS idx_documentos_carpeta
  ON documentos (carpeta_origen);

-- Índice para búsqueda en nombre de archivo
CREATE INDEX IF NOT EXISTS idx_documentos_nombre
  ON documentos USING gin (to_tsvector('spanish', nombre_archivo));

-- Índice único para evitar duplicados al re-indexar
CREATE UNIQUE INDEX IF NOT EXISTS idx_documentos_unique
  ON documentos (nombre_archivo, COALESCE(cliente, ''), COALESCE(carpeta_origen, ''));

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_documentos_updated_at
  BEFORE UPDATE ON documentos
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();


-- ============================================================
-- Tabla opcional de clientes
-- ============================================================

CREATE TABLE IF NOT EXISTS clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL UNIQUE,
  nif VARCHAR(20),
  tipo VARCHAR(50), -- persona_fisica, sociedad, no_residente, comunidad_bienes
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clientes_nombre
  ON clientes USING gin (to_tsvector('spanish', nombre));

CREATE INDEX IF NOT EXISTS idx_clientes_nif
  ON clientes (nif);


-- ============================================================
-- Deshabilitar RLS (la app usa service role key en el servidor)
-- ============================================================
ALTER TABLE documentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE clientes DISABLE ROW LEVEL SECURITY;
