import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    
    const { error } = await supabase
      .from('excel_column_mappings')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ status: 'deleted', id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }
}
