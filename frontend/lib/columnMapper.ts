import { supabase } from './supabase';

export type ExcelType = 'ventas' | 'escandallo' | 'inventario' | 'proveedores';

export interface ColumnMapping {
  id?: number;
  restaurante_id: string;
  excel_type: ExcelType;
  original_column: string;
  mapped_column: string;
}

export interface TpvPreset {
  name: string;
  label: string;
  mappings: Record<string, string>; // original -> mapped
}

const VENTAS_COLS = ['fecha', 'producto', 'cantidad_vendida', 'precio_unitario', 'total'] as const;
const ESCANDALLO_COLS = ['producto', 'ingrediente', 'cantidad', 'unidad', 'precio_unidad'] as const;
const INVENTARIO_COLS = ['producto', 'stock_actual', 'stock_minimo', 'fecha_ultima_compra'] as const;
const PROVEEDORES_COLS = ['proveedor', 'cif', 'email', 'telefono', 'direccion'] as const;

export const REQUIRED_COLUMNS: Record<ExcelType, readonly string[]> = {
  ventas: VENTAS_COLS,
  escandallo: ESCANDALLO_COLS,
  inventario: INVENTARIO_COLS,
  proveedores: PROVEEDORES_COLS,
};

export const EXCEL_TYPE_LABELS: Record<ExcelType, string> = {
  ventas: 'Ventas',
  escandallo: 'Escandallo',
  inventario: 'Inventario',
  proveedores: 'Proveedores',
};

export const SYSTEM_COLUMN_LABELS: Record<string, string> = {
  fecha: 'Fecha',
  producto: 'Producto',
  cantidad_vendida: 'Cantidad vendida',
  precio_unitario: 'Precio unitario',
  total: 'Total',
  ingrediente: 'Ingrediente',
  cantidad: 'Cantidad',
  unidad: 'Unidad',
  precio_unidad: 'Precio por unidad',
  stock_actual: 'Stock actual',
  stock_minimo: 'Stock mínimo',
  fecha_ultima_compra: 'Última compra',
  proveedor: 'Proveedor',
  cif: 'CIF/NIF',
  email: 'Email',
  telefono: 'Teléfono',
  direccion: 'Dirección',
};

export const TPV_PRESETS: TpvPreset[] = [
  {
    name: 'classicges',
    label: 'ClassicGes',
    mappings: {
      'importe': 'total',
      'nombre': 'producto',
      'cant': 'cantidad_vendida',
      'pvp': 'precio_unitario',
    },
  },
  {
    name: 'glop',
    label: 'Glop',
    mappings: {
      'venta_neta': 'total',
      'articulo': 'producto',
      'uds': 'cantidad_vendida',
      'precio': 'precio_unitario',
    },
  },
  {
    name: 'tpv_csv',
    label: 'TPV CSV Genérico',
    mappings: {
      'fecha_venta': 'fecha',
      'plato': 'producto',
      'unidades': 'cantidad_vendida',
      'importe_total': 'total',
    },
  },
  {
    name: 'foodsoft',
    label: 'FoodSoft',
    mappings: {
      'fecha_factura': 'fecha',
      'item': 'producto',
      'cant': 'cantidad_vendida',
      'precio_venta': 'precio_unitario',
      'neto': 'total',
    },
  },
  {
    name: 'posrest',
    label: 'POSRest',
    mappings: {
      'fecha_venta': 'fecha',
      'nombre_producto': 'producto',
      'cantidad_vend': 'cantidad_vendida',
      'precio_unit': 'precio_unitario',
      'importe_total': 'total',
    },
  },
  {
    name: 'custom',
    label: 'Personalizado',
    mappings: {},
  },
];

export function normalizeColumn(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[\s\-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

export function detectPossibleColumns(originalCols: string[]): Record<string, string> {
  const suggestions: Record<string, string> = {};

  for (const col of originalCols) {
    const norm = normalizeColumn(col);
    for (const [field] of Object.entries(SYSTEM_COLUMN_LABELS)) {
      if (norm === field) {
        suggestions[col] = field;
        break;
      }
    }
  }

  return suggestions;
}

export function findBestMatch(normalized: string, candidates: string[]): string | null {
  const direct = candidates.find(c => c === normalized);
  if (direct) return direct;

  const partial = candidates.find(c => normalized.includes(c) || c.includes(normalized));
  if (partial) return partial;

  const normTokens = normalized.split('_');
  for (const candidate of candidates) {
    const candTokens = candidate.split('_');
    const common = normTokens.filter(t => candTokens.includes(t));
    if (common.length >= Math.min(normTokens.length, candTokens.length) - 1) {
      return candidate;
    }
  }

  return null;
}

export function suggestColumnMapping(
  detectedColumns: string[],
  excelType: ExcelType,
): Record<string, string> {
  const required = REQUIRED_COLUMNS[excelType];
  const suggestions: Record<string, string> = {};
  const used = new Set<string>();

  const normalizedCols = detectedColumns.map(c => ({ original: c, norm: normalizeColumn(c) }));

  const allSystemCols = [...required];
  for (const sysCol of allSystemCols) {
    for (const { original, norm } of normalizedCols) {
      if (used.has(sysCol)) continue;
      if (norm === sysCol) {
        suggestions[original] = sysCol;
        used.add(sysCol);
        break;
      }
    }
  }

  for (const sysCol of allSystemCols) {
    if (used.has(sysCol)) continue;
    for (const { original, norm } of normalizedCols) {
      if (used.has(original)) continue;
      const match = findBestMatch(norm, [sysCol]);
      if (match) {
        suggestions[original] = sysCol;
        used.add(sysCol);
        used.add(original);
        break;
      }
    }
  }

  for (const { original, norm } of normalizedCols) {
    if (suggestions[original]) continue;
    for (const preset of TPV_PRESETS) {
      for (const [presetOriginal, presetMapped] of Object.entries(preset.mappings)) {
        if (norm === normalizeColumn(presetOriginal) && !used.has(presetMapped) && required.includes(presetMapped)) {
          suggestions[original] = presetMapped;
          used.add(presetMapped);
          break;
        }
      }
      if (suggestions[original]) break;
    }
  }

  return suggestions;
}

export function applyMapping(
  row: Record<string, string | number | boolean | Date | null | undefined>,
  mapping: Record<string, string>,
): Record<string, string | number | boolean | Date | null | undefined> {
  const result: Record<string, string | number | boolean | Date | null | undefined> = {};
  for (const [originalCol, mappedCol] of Object.entries(mapping)) {
    if (originalCol in row) {
      result[mappedCol] = row[originalCol];
    }
  }
  for (const [col, val] of Object.entries(row)) {
    if (!mapping[col]) {
      result[col] = val;
    }
  }
  return result;
}

export async function fetchMappings(
  restauranteId: string,
  excelType: ExcelType,
): Promise<ColumnMapping[]> {
  const { data, error } = await supabase
    .from('excel_column_mappings')
    .select('*')
    .eq('restaurante_id', restauranteId)
    .eq('excel_type', excelType);

  if (error) throw error;
  return (data as ColumnMapping[] | null) || [];
}

export async function saveMapping(
  restauranteId: string,
  excelType: ExcelType,
  originalColumn: string,
  mappedColumn: string,
): Promise<void> {
  const { data: existing } = await supabase
    .from('excel_column_mappings')
    .select('id')
    .eq('restaurante_id', restauranteId)
    .eq('excel_type', excelType)
    .eq('original_column', originalColumn)
    .single();

  const existingMapping = existing as { id: number } | null;

  if (existingMapping) {
    await supabase
      .from('excel_column_mappings')
      .update({ mapped_column: mappedColumn })
      .eq('id', existingMapping.id);
  } else {
    await supabase
      .from('excel_column_mappings')
      .insert({ restaurante_id: restauranteId, excel_type: excelType, original_column: originalColumn, mapped_column: mappedColumn });
  }
}

export async function deleteMapping(id: number): Promise<void> {
  const { error } = await supabase
    .from('excel_column_mappings')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function saveMappingsBatch(
  restauranteId: string,
  excelType: ExcelType,
  mappings: Record<string, string>,
): Promise<void> {
  for (const [original, mapped] of Object.entries(mappings)) {
    await saveMapping(restauranteId, excelType, original, mapped);
  }
}
