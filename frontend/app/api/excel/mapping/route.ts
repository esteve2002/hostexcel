import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { restaurante_id, excel_type, original_column, mapped_column } = body

    // Check if mapping already exists
    const { data: existing } = await supabase
      .from('excel_column_mappings')
      .select('*')
      .eq('restaurante_id', restaurante_id)
      .eq('excel_type', excel_type)
      .eq('original_column', original_column)
      .single()

    if (existing) {
      // Update
      const { data, error } = await supabase
        .from('excel_column_mappings')
        .update({ mapped_column })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ status: 'updated', id: data.id })
    } else {
      // Create
      const { data, error } = await supabase
        .from('excel_column_mappings')
        .insert({ restaurante_id, excel_type, original_column, mapped_column })
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ status: 'created', id: data.id })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const restaurante_id = searchParams.get('restaurante_id')
    const excel_type = searchParams.get('excel_type')

    if (!restaurante_id || !excel_type) {
      return NextResponse.json({ error: 'restaurante_id y excel_type son requeridos' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('excel_column_mappings')
      .select('*')
      .eq('restaurante_id', restaurante_id)
      .eq('excel_type', excel_type)

    if (error) throw error

    return NextResponse.json({ mappings: data || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
