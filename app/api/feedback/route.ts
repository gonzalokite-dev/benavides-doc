import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import fs from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  const token = request.cookies.get('bd_session')?.value
  if (!token || !(await verifyToken(token))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const { messageId, feedback } = await request.json()
    const logPath = path.join(process.cwd(), 'data', 'search.log')

    const line = JSON.stringify({
      ts: new Date().toISOString(),
      type: 'feedback',
      messageId,
      feedback, // 'up' | 'down'
    }) + '\n'

    fs.appendFileSync(logPath, line, 'utf-8')
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
