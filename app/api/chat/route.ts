import { NextRequest, NextResponse } from 'next/server'
import { extractSearchIntent, generateSearchResponse } from '@/lib/claude'
import { searchDocuments } from '@/lib/search'
import { verifyToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  // Verify session
  const token = request.cookies.get('bd_session')?.value
  if (!token || !(await verifyToken(token))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { message, history = [] } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Mensaje requerido' }, { status: 400 })
    }

    // Step 1: Extract intent with Claude
    const intent = await extractSearchIntent(message, history)

    // Step 2: If not about documents, return the message directly
    if (intent.tipo === 'no_documental') {
      return NextResponse.json({
        type: 'text',
        message: intent.mensaje,
        documents: [],
      })
    }

    // Step 3: Search documents
    const documents = await searchDocuments(intent)

    // Step 4: Generate natural response with Claude
    const responseText = await generateSearchResponse(message, documents, intent)

    return NextResponse.json({
      type: 'search',
      message: responseText,
      documents,
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
        message:
          'Lo siento, ha ocurrido un error al procesar tu búsqueda. Por favor, inténtalo de nuevo en unos momentos.',
        documents: [],
      },
      { status: 500 }
    )
  }
}
