import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth'
import { processExcel } from '@/lib/excel'

export async function POST(request: NextRequest) {
  const userId = getUserIdFromRequest(request)
  if (!userId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const force = formData.get('force') === 'true'

    if (!file) {
      return NextResponse.json({ error: 'No se encontró el archivo' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const result = await processExcel(buffer, userId, true, force)

    return NextResponse.json(result)
  } catch (error: any) {
    const status = error.message?.includes('sobreescribirlas') ? 409 : 400
    return NextResponse.json({ error: error.message }, { status })
  }
}
