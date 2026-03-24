# BenavidesDoc

Buscador inteligente de documentación de clientes para el equipo de **Benavides Asociados**. Permite encontrar contratos, modelos fiscales y escrituras mediante lenguaje natural, obteniendo el enlace de descarga directo desde SharePoint/OneDrive.

---

## Índice

1. [Clonar e instalar](#1-clonar-e-instalar)
2. [Configurar Supabase](#2-configurar-supabase)
3. [Variables de entorno](#3-variables-de-entorno)
4. [Ejecutar en local](#4-ejecutar-en-local)
5. [Cargar datos de ejemplo](#5-cargar-datos-de-ejemplo)
6. [Indexar tu carpeta de OneDrive](#6-indexar-tu-carpeta-de-onedrive)
7. [Desplegar en Vercel](#7-desplegar-en-vercel)
8. [Añadir documentos nuevos](#8-añadir-documentos-nuevos)
9. [Cómo funcionan los enlaces de SharePoint](#9-como-funcionan-los-enlaces-de-sharepoint)

---

## 1. Clonar e instalar

```bash
git clone <url-del-repo>
cd benavides-doc
npm install
```

---

## 2. Configurar Supabase

1. Ve a [supabase.com](https://supabase.com) y crea un proyecto nuevo (gratis).
2. En el panel lateral, entra en **SQL Editor**.
3. Pega y ejecuta el contenido del archivo `supabase-schema.sql`.
4. Anota tu **Project URL** y **service_role key** (en Settings → API).

---

## 3. Variables de entorno

Copia el archivo de ejemplo y rellena los valores:

```bash
cp .env.example .env.local
```

Edita `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Anthropic (Claude)
ANTHROPIC_API_KEY=sk-ant-...

# Auth del equipo
TEAM_PASSWORD=la-contraseña-del-equipo
JWT_SECRET=un-string-aleatorio-de-al-menos-32-caracteres

# SharePoint — URL base de tu tenant (sin slash final)
SHAREPOINT_BASE_URL=https://tuempresa.sharepoint.com/sites/BenavidesAsociados/Shared%20Documents/BENAVIDES%20ASOCIADOS%20-%20GENERAL

# Ruta local de la carpeta sincronizada con OneDrive
LOCAL_DOCS_PATH=C:/Users/TuUsuario/OneDrive - Benavides Asociados/BENAVIDES ASOCIADOS - GENERAL
```

> **¿Cómo obtengo la SHAREPOINT_BASE_URL?**
> Abre cualquier archivo en SharePoint → clic derecho → "Copiar vínculo". La URL hasta la carpeta raíz es tu base.

---

## 4. Ejecutar en local

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). Te pedirá la contraseña del equipo (`TEAM_PASSWORD`).

---

## 5. Cargar datos de ejemplo

Para probar la app sin el indexador real:

```bash
npm run seed
```

Esto carga ~18 documentos ficticios en Supabase. Puedes probar buscando:
- `"303 de Vicusi"`
- `"renta de García López"`
- `"escritura de Pollensa Properties"`
- `"retenciones de Sa Fonda"`

---

## 6. Indexar tu carpeta de OneDrive

El indexador recorre tu carpeta local sincronizada con OneDrive y cataloga todos los archivos en Supabase.

### Modo dry-run (ver qué haría sin escribir nada)

```bash
npx tsx scripts/indexer.ts --dry-run
```

### Indexación completa

```bash
npx tsx scripts/indexer.ts
```

### Solo archivos nuevos (re-indexación rápida)

```bash
npx tsx scripts/indexer.ts --update
```

### Con ruta personalizada

```bash
npx tsx scripts/indexer.ts --path="C:/Users/Gonzalo/OneDrive - Benavides Asociados/BENAVIDES ASOCIADOS - GENERAL"
```

### Qué indexa y qué ignora

**Indexa:**
- `/Clientes/` → fuente principal (subcarpeta = nombre de cliente)
- `/No Residentes/`, `/IRPF/`, `/Campaña de Renta/`, `/Certificados digitales/`, `/Informes Fiscales/`

**Ignora:**
- `Branding`, `PPT`, `Tarifas`, `VACACIONES`, `Bilky`, `Arrendamiento de local`, `Germán`, `Gestoría`, `Inmobiliaria`

**Extensiones:** `.pdf`, `.docx`, `.doc`, `.xlsx`, `.xls`, `.csv`, `.png`, `.jpg`, `.jpeg`, `.msg`, `.eml`, `.txt`

El indexador genera un log en `indexer.log` con todos los archivos procesados.

---

## 7. Desplegar en Vercel

```bash
npm install -g vercel
vercel
```

O conecta el repositorio directamente desde [vercel.com](https://vercel.com):

1. Importa el repositorio de GitHub.
2. En **Settings → Environment Variables**, añade todas las variables de `.env.local`.
3. El despliegue es automático en cada push.

> **Importante:** El indexador se ejecuta localmente (desde tu máquina con OneDrive sincronizado). No se ejecuta en Vercel.

---

## 8. Añadir documentos nuevos

Cuando añadas archivos nuevos a tu carpeta de OneDrive y se sincronicen, re-ejecuta el indexador en modo update:

```bash
npx tsx scripts/indexer.ts --update
```

Esto solo añade los archivos nuevos sin duplicar los existentes.

---

## 9. Cómo funcionan los enlaces de SharePoint

Cada enlace de descarga se construye así:

```
SHAREPOINT_BASE_URL + "/" + ruta_relativa_encoded
```

Ejemplo:
```
https://tuempresa.sharepoint.com/sites/BenavidesAsociados/.../BENAVIDES ASOCIADOS - GENERAL
  + /
  + Clientes/Inversiones%20Vicusi%20SL/Vicusi_303_2T_2024.pdf
```

Al hacer clic en "Descargar", se abre directamente el archivo en SharePoint en una nueva pestaña.

Si cambia la URL base de tu SharePoint (raro pero posible), actualiza `SHAREPOINT_BASE_URL` en las variables de entorno y re-ejecuta el indexador.

---

## Arquitectura rápida

```
Usuario escribe → /api/chat
  → Claude extrae: {cliente, tipo_documento, ejercicio_fiscal}
  → Supabase busca documentos que coincidan
  → Claude redacta respuesta natural
  → Frontend muestra mensaje + tarjetas de documentos con enlace
```

---

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** (sin librerías de componentes)
- **Supabase** (PostgreSQL)
- **Claude Sonnet** (Anthropic API)
- **Vercel** (despliegue)
