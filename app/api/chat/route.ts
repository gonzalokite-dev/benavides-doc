import { NextRequest, NextResponse } from 'next/server'
import { extractSearchIntent, generateSearchResponse, generateClienteResponse } from '@/lib/claude'
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
    const { message } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Mensaje requerido' }, { status: 400 })
    }

    // Step 1: Extract intent
    const intent = await extractSearchIntent(message)

    // Step 2: No documental
    if (intent.tipo === 'no_documental') {
      return NextResponse.json({ type: 'text', message: intent.mensaje, documents: [] })
    }

    // Step 3: Búsqueda de expedientes (Airtable EXPEDIENTES table)
    if (intent.tipo === 'busqueda_expedientes') {
      const expedientes = await searchExpedientes({
        cliente: intent.cliente,
        estado: intent.estado,
        tipoServicio: intent.tipo_servicio,
        vencidos: intent.vencidos,
        keyword: intent.keyword,
      }).catch(() => [])

      // Also fetch client card if client specified
      const cliente = intent.cliente
        ? await searchClienteByQuery(intent.cliente).catch(() => null)
        : null

      const count = expedientes.length
      let responseText = ''
      if (count === 0) {
        responseText = `No encontré expedientes${intent.cliente ? ` de "${intent.cliente}"` : ''}${intent.estado ? ` con estado "${intent.estado}"` : ''}. Verifica los filtros o prueba con otros términos.`
      } else {
        const filtro = [
          intent.cliente ? `de ${intent.cliente}` : '',
          intent.estado ? `en estado "${intent.estado}"` : '',
          intent.tipo_servicio ? `de tipo "${intent.tipo_servicio}"` : '',
          intent.vencidos ? 'vencidos' : '',
        ].filter(Boolean).join(', ')
        responseText = `He encontrado ${count} expediente${count !== 1 ? 's' : ''}${filtro ? ` ${filtro}` : ''}.`
      }

      return NextResponse.json({
        type: 'expedientes',
        message: responseText,
        documents: [],
        cliente,
        expedientes,
        intent: { cliente: intent.cliente, tipo_documento: intent.tipo_servicio, ejercicio_fiscal: null },
      })
    }

    // Step 4: Consulta de cliente (CRM only)
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

    // Step 4: Búsqueda de documentos
    // 4a. Look up client in Airtable in parallel with doc search
    const clienteQuery = intent.cliente ?? intent.cliente_nif ?? null
    const [clienteAirtable, documents] = await Promise.all([
      clienteQuery ? searchClienteByQuery(clienteQuery).catch(() => null) : Promise.resolve(null),
      Promise.resolve(searchDocuments(
        // If Airtable NIF not yet known, search with what we have
        intent.cliente_nif
          ? intent
          : intent
      )),
    ])

    // 4b. If Airtable found a NIF and we didn't have one, redo search with exact NIF
    let finalDocs = documents
    if (clienteAirtable?.nif && !intent.cliente_nif && intent.cliente) {
      const enrichedIntent = { ...intent, cliente_nif: clienteAirtable.nif }
      const docsWithNif = searchDocuments(enrichedIntent)
      // Use NIF-based results if they return something, otherwise keep original
      if (docsWithNif.length > 0) finalDocs = docsWithNif
    }

    // 4c. Get expedientes if client found
    const expedientes = clienteAirtable
      ? await getExpedientesByClienteId(clienteAirtable.id).catch(() => [])
      : []

    logSearch(message, intent as Record<string, unknown>, finalDocs.length)

    const responseText = await generateSearchResponse(message, finalDocs, intent)

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
