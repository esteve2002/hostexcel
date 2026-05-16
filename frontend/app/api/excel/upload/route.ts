import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getUserIdFromRequest } from '@/lib/auth'
import { processExcel } from '@/lib/excel'

const TRIAL_LIMIT = 2

export async function POST(request: NextRequest) {
  const userId = getUserIdFromRequest(request)
  if (!userId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const { data: uploads, error: uploadsError } = await supabase
      .from('excel_uploads')
      .select('id, success')
      .eq('restaurante_id', userId)

    if (uploadsError) {
      throw uploadsError
    }

    const successfulUploads = (Array.isArray(uploads) ? uploads : []).filter((upload) => Boolean(upload.success)).length
    if (successfulUploads >= TRIAL_LIMIT) {
      return NextResponse.json(
        { error: `Has alcanzado el límite de ${TRIAL_LIMIT} subidas de prueba. Contacta con nosotros para seguir usando la app.` },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const force = formData.get('force') === 'true'
    const mappingParam = formData.get('mapping') as string | null

    let mapping: Record<string, string> | undefined
    if (mappingParam) {
      try {
        mapping = JSON.parse(mappingParam)
      } catch {
        return NextResponse.json({ error: 'El formato del mapping no es válido' }, { status: 400 })
      }
    }

    if (!file) {
      return NextResponse.json({ error: 'No se encontró el archivo' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const result = await processExcel(buffer, userId, true, force, mapping)

    return NextResponse.json(result)
  } catch (error: unknown) {
    const message = error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: unknown }).message || 'Error desconocido')
          : JSON.stringify(error) || 'Error desconocido'
    const status = message.includes('sobreescribirlas') ? 409 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
