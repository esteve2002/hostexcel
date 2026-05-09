import * as XLSX from 'xlsx'
import { supabase } from './supabase'
import { normalizeColumn, suggestColumnMapping, applyMapping, REQUIRED_COLUMNS, EXCEL_TYPE_LABELS, SYSTEM_COLUMN_LABELS, type ExcelType } from './columnMapper'

export type { ExcelType }
export { REQUIRED_COLUMNS, EXCEL_TYPE_LABELS, SYSTEM_COLUMN_LABELS, normalizeColumn }

export interface ExcelRow {
  [key: string]: string | number | boolean | Date | null | undefined
}

export interface PreviewResult {
  columns: string[]
  data: ExcelRow[]
  suggestedType: ExcelType | null
  suggestedMapping: Record<string, string>
  missingColumns: string[]
  detectedColumns: string[]
}

export function detectExcelType(columns: string[]): ExcelType {
  const cols = new Set(columns.map(normalizeColumn))

  if (['producto', 'ingrediente', 'cantidad', 'unidad', 'precio_unidad'].every(c => cols.has(c))) return 'escandallo'
  if (['proveedor', 'cif', 'email', 'telefono', 'direccion'].every(c => cols.has(c))) return 'proveedores'
  if (['fecha', 'producto', 'cantidad_vendida', 'precio_unitario', 'total'].every(c => cols.has(c))) return 'ventas'
  if (['producto', 'stock_actual', 'stock_minimo', 'fecha_ultima_compra'].every(c => cols.has(c))) return 'inventario'

  throw new Error(`No se reconoce el tipo de Excel. Columnas detectadas: ${columns.join(', ')}`)
}

export function parseExcel(buffer: ArrayBuffer): { data: ExcelRow[], columns: string[] } {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  const data = XLSX.utils.sheet_to_json(worksheet) as ExcelRow[]
  const columns = data.length > 0 ? Object.keys(data[0] as object) : []
  return { data, columns }
}

function normalizeExcelDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().split('T')[0]
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (!parsed) return null
    const y = String(parsed.y).padStart(4, '0')
    const m = String(parsed.m).padStart(2, '0')
    const d = String(parsed.d).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const text = String(value).trim()
  if (!text) return null

  if (/^\d+(\.\d+)?$/.test(text)) {
    const parsed = XLSX.SSF.parse_date_code(Number(text))
    if (!parsed) return null
    const y = String(parsed.y).padStart(4, '0')
    const m = String(parsed.m).padStart(2, '0')
    const d = String(parsed.d).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const parsed = new Date(text)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0]
  }

  return null
}

export function previewExcel(buffer: ArrayBuffer): PreviewResult {
  const { data, columns } = parseExcel(buffer)

  let suggestedType: ExcelType | null = null
  let suggestedMapping: Record<string, string> = {}
  let missingColumns: string[] = []

  const types: ExcelType[] = ['ventas', 'escandallo', 'inventario', 'proveedores']

  for (const type of types) {
    const requiredSet = new Set(REQUIRED_COLUMNS[type] as readonly string[])
    const normalizedCols = columns.map(normalizeColumn)
    const normalizedSet = new Set(normalizedCols)
    const present = Array.from(requiredSet).filter(c => normalizedSet.has(c))
    const missing = Array.from(requiredSet).filter(c => !normalizedSet.has(c))

    if (present.length >= requiredSet.size - 2) {
      suggestedType = type
      missingColumns = missing
      suggestedMapping = suggestColumnMapping(columns, type)
      break
    }
  }

  return {
    columns,
    data,
    suggestedType,
    suggestedMapping,
    missingColumns,
    detectedColumns: columns,
  }
}

export function validateVentas(data: ExcelRow[]): ExcelRow[] {
  const errors: string[] = []
  const validData: ExcelRow[] = []

  data.forEach((row, index) => {
    const fecha = normalizeExcelDate(row['fecha'])
    const producto = row['producto']
    const cantidad = Number(row['cantidad_vendida'])
    const precio = Number(row['precio_unitario'])
    const total = row['total'] !== undefined ? Number(row['total']) : null

    if (!fecha) {
      errors.push(`Fila ${index + 1}: Fecha inválida (${fecha})`)
    } else {
      row['fecha'] = fecha
    }

    if (!producto || String(producto).trim() === '') {
      errors.push(`Fila ${index + 1}: Producto vacío`)
    }

    if (isNaN(cantidad) || cantidad <= 0) {
      errors.push(`Fila ${index + 1}: Cantidad vendida inválida (${row['cantidad_vendida']})`)
    }

    if (isNaN(precio) || precio <= 0) {
      errors.push(`Fila ${index + 1}: Precio unitario inválido (${row['precio_unitario']})`)
    }

    if (total !== null && !isNaN(total) && total > 0 && !isNaN(cantidad) && cantidad > 0) {
      const precioCorrecto = Math.round((total / cantidad) * 100) / 100
      if (Math.abs(precio - precioCorrecto) > 0.01) {
        row['precio_unitario'] = precioCorrecto
      }
    }

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
      errors.push(`Fila ${index + 1}: Ingrediente vacío`)
    }

    if (isNaN(cantidad) || cantidad <= 0) {
      errors.push(`Fila ${index + 1}: Cantidad inválida (${row['cantidad']})`)
    }

    if (!validUnits.has(unidad)) {
      errors.push(`Fila ${index + 1}: Unidad inválida (${row['unidad']})`)
    }

    if (isNaN(precio) || precio <= 0) {
      errors.push(`Fila ${index + 1}: Precio unidad inválido (${row['precio_unidad']})`)
    }

    validData.push(row)
  })

  if (errors.length > 0) {
    throw new Error(errors.join('; '))
  }

  return validData
}

export function validateInventario(data: ExcelRow[]): ExcelRow[] {
  const errors: string[] = []
  const validData: ExcelRow[] = []

  data.forEach((row, index) => {
    const producto = row['producto']
    const stockActual = Number(row['stock_actual'])
    const stockMinimo = Number(row['stock_minimo'])
    const fecha = normalizeExcelDate(row['fecha_ultima_compra'])

    if (!producto || String(producto).trim() === '') {
      errors.push(`Fila ${index + 1}: Producto vacío`)
    }

    if (isNaN(stockActual) || stockActual < 0) {
      errors.push(`Fila ${index + 1}: Stock actual inválido`)
    }

    if (isNaN(stockMinimo) || stockMinimo < 0) {
      errors.push(`Fila ${index + 1}: Stock mínimo inválido`)
    }

    if (row['fecha_ultima_compra'] !== undefined && !fecha) {
      errors.push(`Fila ${index + 1}: Fecha inválida`)
    } else if (fecha) {
      row['fecha_ultima_compra'] = fecha
    }

    validData.push(row)
  })

  if (errors.length > 0) {
    throw new Error(errors.join('; '))
  }

  return validData
}

export function validateProveedores(data: ExcelRow[]): ExcelRow[] {
  const errors: string[] = []
  const validData: ExcelRow[] = []

  data.forEach((row, index) => {
    const proveedor = row['proveedor']
    const cif = row['cif']
    const email = row['email']

    if (!proveedor || String(proveedor).trim() === '') {
      errors.push(`Fila ${index + 1}: Proveedor vacío`)
    }

    if (!cif || String(cif).trim() === '') {
      errors.push(`Fila ${index + 1}: CIF vacío`)
    }

    if (!email || String(email).trim() === '') {
      errors.push(`Fila ${index + 1}: Email vacío`)
    }

    validData.push(row)
  })

  if (errors.length > 0) {
    throw new Error(errors.join('; '))
  }

  return validData
}

export async function uploadToSupabase(table: string, data: ExcelRow[], userId: string) {
  const dataWithUser = data.map(row => ({ ...row, user_id: userId }))
  const { error } = await supabase.from(table).insert(dataWithUser)
  if (error) {
    throw new Error(error.message || `Error al insertar en ${table}`)
  }
}

export async function processExcel(
  buffer: ArrayBuffer,
  userId: string,
  save: boolean = false,
  force: boolean = false,
  mapping?: Record<string, string>,
): Promise<{ tipo: ExcelType, data: ExcelRow[] }> {
  const { data, columns } = parseExcel(buffer)

  const mappedColumns = mapping
    ? columns.map(c => mapping[c] || c)
    : columns

  const tipo = detectExcelType(mappedColumns)

  const mappedData = mapping
    ? data.map(row => applyMapping(row, mapping))
    : data

  let validatedData: ExcelRow[]

  switch (tipo) {
    case 'ventas':
      validatedData = validateVentas(mappedData)
      if (save) {
        const fechas = validatedData
          .map((r) => {
            const fecha = r['fecha']
            if (fecha instanceof Date) return fecha
            if (typeof fecha === 'string' || typeof fecha === 'number') return new Date(fecha)
            throw new Error(`Fecha inválida (${fecha})`)
          })
          .sort((a, b) => a.getTime() - b.getTime())
        if (fechas.length === 0 || fechas.some((f) => Number.isNaN(f.getTime()))) {
          throw new Error('No se pudieron interpretar las fechas del Excel de ventas')
        }
        const fechaMin = fechas[0].toISOString().split('T')[0]
        const fechaMax = fechas[fechas.length - 1].toISOString().split('T')[0]

        const { data: existing } = await supabase
          .from('ventas')
          .select('fecha')
          .eq('user_id', userId)
          .gte('fecha', fechaMin)
          .lte('fecha', fechaMax)

        const existingRows = Array.isArray(existing) ? existing : []

        if (existingRows.length > 0) {
          if (!force) {
            throw new Error(`Ya tienes ventas registradas entre ${fechaMin} y ${fechaMax}. ¿Quieres sobreescribirlas?`)
          } else {
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
      validatedData = validateEscandallo(mappedData)
      if (save) await uploadToSupabase('escandallo', validatedData, userId)
      break
    case 'inventario':
      validatedData = validateInventario(mappedData)
      if (save) await uploadToSupabase('inventario', validatedData, userId)
      break
    case 'proveedores':
      validatedData = validateProveedores(mappedData)
      if (save) await uploadToSupabase('proveedores', validatedData, userId)
      break
  }

  try {
    await supabase.from('excel_uploads').insert({
      restaurante_id: userId,
      filename: 'upload',
      excel_type: tipo,
      success: true,
      original_columns: columns,
      mapped_columns: Object.keys(validatedData[0] || {}),
    })
  } catch {
    // Ignorar error de historial
  }

  return { tipo, data: validatedData }
}
