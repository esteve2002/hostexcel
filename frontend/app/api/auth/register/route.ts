import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { hashPassword, createToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, nombre_restaurante, telefono } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email y password son requeridos' }, { status: 400 })
    }

    const usuario = {
      email,
      password_hash: hashPassword(password),
      nombre_restaurante,
      telefono,
    } as never

    const { data, error } = await supabase
      .from('usuarios')
      .insert(usuario)
      .select()
      .single()

    const createdUser = data as { id: string } | null

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!createdUser) {
      return NextResponse.json({ error: 'No se pudo crear el usuario' }, { status: 400 })
    }

    const token = createToken(createdUser.id)

    return NextResponse.json({ token })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error desconocido' }, { status: 500 })
  }
}
