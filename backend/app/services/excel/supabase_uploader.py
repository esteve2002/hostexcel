from fastapi import HTTPException
from supabase import create_client
import os
import pandas as pd
import datetime

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

TABLE_MAP = {
    "escandallo": "escandallo",
    "proveedores": "proveedores",
    "ventas": "ventas",
    "inventario": "inventario"
}

COLUMN_MAP = {
    "inventario": {
        "Producto": "producto",
        "Stock actual": "stock_actual",
        "Stock minimo": "stock_minimo",
        "Fecha ultima compra": "fecha_ultima_compra"
    },
    "ventas": {
        "Fecha": "fecha",
        "Producto": "producto",
        "Cantidad vendida": "cantidad_vendida",
        "Precio unitario": "precio_unitario",
        "Total": "total"
    },
    "escandallo": {
        "Producto": "producto",
        "Ingrediente": "ingrediente",
        "Cantidad": "cantidad",
        "Unidad": "unidad",
        "Precio unidad": "precio_unidad"
    },
    "proveedores": {
        "Proveedor": "proveedor",
        "CIF": "cif",
        "Email": "email",
        "Teléfono": "telefono",
        "Dirección": "direccion"
    }
}

def upload_to_supabase(excel_type: str, data: list):
    if excel_type not in TABLE_MAP:
        raise HTTPException(
            status_code=500,
            detail=f"No existe tabla para el tipo: {excel_type}"
        )

    table_name = TABLE_MAP[excel_type]
    key_map = COLUMN_MAP.get(excel_type, {})

    normalized_data = []
    for row in data:
        new_row = {}
        for k, v in row.items():
            new_key = key_map.get(k, k)
            # Convertir Timestamps a string
            if isinstance(v, (pd.Timestamp, datetime.date, datetime.datetime)):
                v = v.isoformat()
            new_row[new_key] = v
        normalized_data.append(new_row)

    try:
        response = supabase.table(table_name).insert(normalized_data).execute()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al insertar en Supabase: {str(e)}"
        )

    return {
        "inserted": len(normalized_data),
        "table": table_name,
        "supabase_response": response
    }