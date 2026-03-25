import { NextRequest, NextResponse } from 'next/server'
import {
  extractSearchIntent,
  generateAssistantResponse,
  generateClienteResponse,
  type HistoryMessage,
} from '@/lib/claude'
import { searchDocuments } from '@/lib/search'
import { searchClienteByQuery, getExpedientesByClienteId, searchExpedientes } from '@/lib/airtable'
import { verifyToken } from '@/lib/auth'
import fs from 'fs'
import path from 'path'

function logSearch(query: string, intent: Record<string, unknown>, resultCount: number) {
  try {
    const logPath = path.join(process.cwd(), 'data', 'search.log')
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      query,
      cliente: intent.cliente ?? null,
      tipo: intent.tipo_documento ?? null,
      año: intent.ejercicio_fiscal ?? null,
      resultados: resultCount,
    }) + '\n'
    fs.appendFileSync(logPath, line, 'utf-8')
  } catch { /* non-blocking */ }
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get('bd_session')?.value
  if (!token || !(await verifyToken(token))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { message, history = [] } = body as { message: string; history: HistoryMessage[] }

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Mensaje requerido' }, { status: 400 })
    }

    // ── 1. Extract intent (with conversation history for B) ──────────────────
    const intent = await extractSearchIntent(message, history)

    if (intent.tipo === 'no_documental') {
      return NextResponse.json({ type: 'text', message: intent.mensaje, documents: [] })
    }

    // ── 2. Búsqueda de expedientes ────────────────────────────────────────────
    if (intent.tipo === 'busqueda_expedientes') {
      const [expedientes, cliente] = await Promise.all([
        searchExpedientes({
          cliente: intent.cliente,
          estado: intent.estado,
          tipoServicio: intent.tipo_servicio,
          vencidos: intent.vencidos,
          keyword: intent.keyword,
        }).catch(() => []),
        intent.cliente ? searchClienteByQuery(intent.cliente).catch(() => null) : Promise.resolve(null),
      ])

      const responseText = await generateAssistantResponse({
        userMessage: message,
        documents: [],
        cliente,
        expedientes,
        history,
        intent,
      })

      return NextResponse.json({
        type: 'expedientes',
        message: responseText,
        documents: [],
        cliente,
        expedientes,
        intent: { cliente: intent.cliente, tipo_documento: intent.tipo_servicio, ejercicio_fiscal: null },
      })
    }

    // ── 3. Consulta de cliente ────────────────────────────────────────────────
    if (intent.tipo === 'consulta_cliente') {
      const cliente = await searchClienteByQuery(intent.cliente).catch(() => null)
      const expedientes = cliente
        ? await getExpedientesByClienteId(cliente.id).catch(() => [])
        : []

      const responseText = await generateClienteResponse(
        intent.pregunta,
        intent.cliente,
        cliente as Record<string, unknown> | null,
        expedientes as Record<string, unknown>[]
      )

      return NextResponse.json({
        type: 'cliente',
        message: responseText,
        documents: [],
        cliente,
        expedientes,
        intent: { cliente: intent.cliente, tipo_documento: null, ejercicio_fiscal: null },
      })
    }

    // ── 4. Búsqueda de documentos (A + C) ─────────────────────────────────────
    // Look up Airtable in parallel with doc search
    const clienteQuery = intent.cliente ?? intent.cliente_nif ?? null
    const [clienteAirtable, documents] = await Promise.all([
      clienteQuery ? searchClienteByQuery(clienteQuery).catch(() => null) : Promise.resolve(null),
      Promise.resolve(searchDocuments(intent)),
    ])

    // If Airtable has the exact NIF and doc search returned nothing, retry with NIF
    let finalDocs = documents
    if (clienteAirtable?.nif && !intent.cliente_nif && documents.length === 0) {
      const enriched = { ...intent, cliente_nif: clienteAirtable.nif }
      const docsWithNif = searchDocuments(enriched)
      if (docsWithNif.length > 0) finalDocs = docsWithNif
    }

    // Get expedientes for context
    const expedientes = clienteAirtable
      ? await getExpedientesByClienteId(clienteAirtable.id).catch(() => [])
      : []

    logSearch(message, intent as Record<string, unknown>, finalDocs.length)

    // Generative response using document content + Airtable data + history (A + B + C)
    const responseText = await generateAssistantResponse({
      userMessage: message,
      documents: finalDocs as Record<string, unknown>[] as Parameters<typeof generateAssistantResponse>[0]['documents'],
      cliente: clienteAirtable,
      expedientes,
      history,
      intent,
    })

    return NextResponse.json({
      type: 'search',
      message: responseText,
      documents: finalDocs,
      cliente: clienteAirtable,
      expedientes,
      intent: {
        cliente: intent.cliente,
        tipo_documento: intent.tipo_documento,
        ejercicio_fiscal: intent.ejercicio_fiscal,
      },
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      {
        type: 'error',
        message: 'Lo siento, ha ocurrido un error al procesar tu búsqueda. Por favor, inténtalo de nuevo.',
        documents: [],
      },
      { status: 500 }
    )
  }
}
