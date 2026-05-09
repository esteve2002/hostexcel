import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getUserIdFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const userId = getUserIdFromRequest(request)

  if (!userId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('usuarios')
    .select('id, email, nombre_restaurante, plan, created_at')
    .eq('id', userId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }

  return NextResponse.json(data)
}
