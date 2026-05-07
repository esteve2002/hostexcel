import * as XLSX from 'xlsx'
import { supabase } from './supabase'

// Tipos
export type ExcelType = 'ventas' | 'escandallo' | 'inventario' | 'proveedores'

export interface ExcelRow {
  [key: string]: any
}

// Detectar tipo de Excel
export function detectExcelType(columns: string[]): ExcelType {
  const normalize = (col: string) => 
    col.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ /g, '_')
  
  const cols = new Set(columns.map(normalize))
  
  const escandalloCols = new Set(['producto', 'ingrediente', 'cantidad', 'unidad', 'precio_unidad'])
  const proveedoresCols = new Set(['proveedor', 'cif', 'email', 'telefono', 'direccion'])
  const ventasCols = new Set(['fecha', 'producto', 'cantidad_vendida', 'precio_unitario', 'total'])
  const inventarioCols = new Set(['producto', 'stock_actual', 'stock_minimo', 'fecha_ultima_compra'])
  
  if (['producto', 'ingrediente', 'cantidad', 'unidad', 'precio_unidad'].every(c => cols.has(c))) return 'escandallo'
  if (['proveedor', 'cif', 'email', 'telefono', 'direccion'].every(c => cols.has(c))) return 'proveedores'
  if (['fecha', 'producto', 'cantidad_vendida', 'precio_unitario', 'total'].every(c => cols.has(c))) return 'ventas'
  if (['producto', 'stock_actual', 'stock_minimo', 'fecha_ultima_compra'].every(c => cols.has(c))) return 'inventario'
  
  throw new Error(`No se reconoce el tipo de Excel. Columnas detectadas: ${columns.join(', ')}`)
}

// Leer archivo Excel
export function parseExcel(buffer: ArrayBuffer): { data: ExcelRow[], columns: string[] } {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  const data = XLSX.utils.sheet_to_json(worksheet) as ExcelRow[]
  const columns = data.length > 0 ? Object.keys(data[0] as object) : []
  return { data, columns }
}

// Validar ventas
export function validateVentas(data: ExcelRow[]): ExcelRow[] {
  const errors: string[] = []
  const validData: ExcelRow[] = []
  
  data.forEach((row, index) => {
    const fecha = row['fecha']
    const producto = row['producto']
    const cantidad = Number(row['cantidad_vendida'])
    const precio = Number(row['precio_unitario'])
    const total = row['total'] !== undefined ? Number(row['total']) : null
    
    // Validar fecha
    if (!fecha || isNaN(Date.parse(String(fecha)))) {
      errors.push(`Fila ${index+1}: Fecha inválida (${fecha})`)
    }
    
    // Producto no vacío
    if (!producto || String(producto).trim() === '') {
      errors.push(`Fila ${index+1}: Producto vacío`)
    }
    
    // Cantidad > 0
    if (isNaN(cantidad) || cantidad <= 0) {
      errors.push(`Fila ${index+1}: Cantidad vendida inválida (${row['cantidad_vendida']})`)
    }
    
    // Precio > 0
    if (isNaN(precio) || precio <= 0) {
      errors.push(`Fila ${index+1}: Precio unitario inválido (${row['precio_unitario']})`)
    }
    
    // Recalcular precio si total existe
    if (total !== null && !isNaN(total) && total > 0 && !isNaN(cantidad) && cantidad > 0) {
      const precioCorrecto = Math.round((total / cantidad) * 100) / 100
      if (Math.abs(precio - precioCorrecto) > 0.01) {
        row['precio_unitario'] = precioCorrecto
      }
    }
    
    // Calcular total si no existe
    if (total === null || isNaN(total)) {
      if (!isNaN(cantidad) && !isNaN(precio)) {
        row['total'] = Math.round(cantidad * precio * 100) / 100
      }
    }
    
    validData.push(row)
  })
  
  if (errors.length > 0) {
    throw new Error(errors.join('; '))
  }
  
  return validData
}

// Validar escandallo
export function validateEscandallo(data: ExcelRow[]): ExcelRow[] {
  const validUnits = new Set(['g', 'kg', 'ml', 'l', 'unidad', 'u'])
  const errors: string[] = []
  const validData: ExcelRow[] = []
  
  data.forEach((row, index) => {
    const ingrediente = row['ingrediente']
    const cantidad = Number(row['cantidad'])
    const unidad = String(row['unidad']).toLowerCase().trim()
    const precio = Number(row['precio_unidad'])
    
    if (!ingrediente || String(ingrediente).trim() === '') {
      errors.push(`Fila ${index+1}: Ingrediente vacío`)
    }
    
    if (isNaN(cantidad) || cantidad <= 0) {
      errors.push(`Fila ${index+1}: Cantidad inválida (${row['cantidad']})`)
    }
    
    if (!validUnits.has(unidad)) {
      errors.push(`Fila ${index+1}: Unidad inválida (${row['unidad']})`)
    }
    
    if (isNaN(precio) || precio <= 0) {
      errors.push(`Fila ${index+1}: Precio unidad inválido (${row['precio_unidad']})`)
    }
    
    validData.push(row)
  })
  
  if (errors.length > 0) {
    throw new Error(errors.join('; '))
  }
  
  return validData
}

// Validar inventario
export function validateInventario(data: ExcelRow[]): ExcelRow[] {
  const errors: string[] = []
  const validData: ExcelRow[] = []
  
  data.forEach((row, index) => {
    const producto = row['producto']
    const stockActual = Number(row['stock_actual'])
    const stockMinimo = Number(row['stock_minimo'])
    const fecha = row['fecha_ultima_compra']
    
    if (!producto || String(producto).trim() === '') {
      errors.push(`Fila ${index+1}: Producto vacío`)
    }
    
    if (isNaN(stockActual) || stockActual < 0) {
      errors.push(`Fila ${index+1}: Stock actual inválido`)
    }
    
    if (isNaN(stockMinimo) || stockMinimo < 0) {
      errors.push(`Fila ${index+1}: Stock mínimo inválido`)
    }
    
    if (fecha && isNaN(Date.parse(String(fecha)))) {
      errors.push(`Fila ${index+1}: Fecha inválida`)
    }
    
    validData.push(row)
  })
  
  if (errors.length > 0) {
    throw new Error(errors.join('; '))
  }
  
  return validData
}

// Validar proveedores
export function validateProveedores(data: ExcelRow[]): ExcelRow[] {
  const errors: string[] = []
  const validData: ExcelRow[] = []
    
  data.forEach((row, index) => {
    const proveedor = row['proveedor']
    const cif = row['cif']
    const email = row['email']
        
    if (!proveedor || String(proveedor).trim() === '') {
      errors.push(`Fila ${index+1}: Proveedor vacío`)
    }
        
    if (!cif || String(cif).trim() === '') {
      errors.push(`Fila ${index+1}: CIF vacío`)
    }
        
    if (!email || String(email).trim() === '') {
      errors.push(`Fila ${index+1}: Email vacío`)
    }
        
    validData.push(row)
  })
    
  if (errors.length > 0) {
    throw new Error(errors.join('; '))
  }
    
  return validData
}

// Subir datos a Supabase
export async function uploadToSupabase(table: string, data: ExcelRow[], userId: string) {
  const dataWithUser = data.map(row => ({ ...row, user_id: userId }))
  const { error } = await supabase.from(table).insert(dataWithUser)
  if (error) throw error
}

// Procesar Excel completo
export async function processExcel(
  buffer: ArrayBuffer, 
  userId: string, 
  save: boolean = false, 
  force: boolean = false
): Promise<{ tipo: ExcelType, data: ExcelRow[] }> {
  const { data, columns } = parseExcel(buffer)
  const tipo = detectExcelType(columns)
  
  let validatedData: ExcelRow[]
  
  switch (tipo) {
    case 'ventas':
      validatedData = validateVentas(data)
      if (save) {
        // Verificar si ya hay datos en el rango de fechas
        const fechas = validatedData.map(r => new Date(r['fecha'])).sort((a, b) => a.getTime() - b.getTime())
        const fechaMin = fechas[0].toISOString().split('T')[0]
        const fechaMax = fechas[fechas.length - 1].toISOString().split('T')[0]
        
        const { data: existing } = await supabase
          .from('ventas')
          .select('fecha')
          .eq('user_id', userId)
          .gte('fecha', fechaMin)
          .lte('fecha', fechaMax)
          
        if (existing && existing.length > 0) {
          if (!force) {
            throw new Error(`Ya tienes ventas registradas entre ${fechaMin} y ${fechaMax}. ¿Quieres sobreescribirlas?`)
          } else {
            // Borrar registros del período
            await supabase
              .from('ventas')
              .delete()
              .eq('user_id', userId)
              .gte('fecha', fechaMin)
              .lte('fecha', fechaMax)
          }
        }
        
        await uploadToSupabase('ventas', validatedData, userId)
      }
      break
    case 'escandallo':
      validatedData = validateEscandallo(data)
      if (save) await uploadToSupabase('escandallo', validatedData, userId)
      break
    case 'inventario':
      validatedData = validateInventario(data)
      if (save) await uploadToSupabase('inventario', validatedData, userId)
      break
    case 'proveedores':
      validatedData = validateProveedores(data)
      if (save) await uploadToSupabase('proveedores', validatedData, userId)
      break
  }
  
  // Guardar historial
  try {
    await supabase.from('excel_uploads').insert({
      restaurante_id: userId,
      filename: 'upload',
      excel_type: tipo,
      success: true,
      original_columns: columns,
      mapped_columns: Object.keys(validatedData[0] || {})
    })
  } catch (e) {
    // Ignorar error de historial
  }
  
  return { tipo, data: validatedData }
}
