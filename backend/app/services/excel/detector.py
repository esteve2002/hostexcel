from fastapi import HTTPException
import unicodedata

def strip_accents(text: str) -> str:
    return ''.join(
        c for c in unicodedata.normalize('NFD', text)
        if unicodedata.category(c) != 'Mn'
    )

def normalize(col: str) -> str:
    col = strip_accents(col)
    col = col.strip().lower()
    col = col.replace(" ", "_")  # ⭐ ESTA ES LA LÍNEA QUE FALTABA
    return col



def detect_excel_type(df):
    cols = {normalize(c) for c in df.columns}

    escandallo_cols = {"producto", "ingrediente", "cantidad", "unidad", "precio_unidad"}
    proveedores_cols = {"proveedor", "cif", "email", "telefono", "direccion"}
    ventas_cols = {"fecha", "producto", "cantidad_vendida", "precio_unitario", "total"}
    inventario_cols = {"producto", "stock_actual", "stock_minimo", "fecha_ultima_compra"}

    if escandallo_cols.issubset(cols):
        return "escandallo"

    if proveedores_cols.issubset(cols):
        return "proveedores"

    if ventas_cols.issubset(cols):
        return "ventas"

    if inventario_cols.issubset(cols):
        return "inventario"

    raise HTTPException(
        status_code=400,
        detail=f"No se reconoce el tipo de Excel. Columnas detectadas: {list(df.columns)}"
    )





