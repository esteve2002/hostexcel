import pandas as pd
from fastapi import HTTPException

# Columnas mínimas requeridas (sin importar mayúsculas)
REQUIRED_COLUMNS = {"ingrediente", "cantidad", "unidad", "precio_unidad"}

# Unidades válidas
VALID_UNITS = {"g", "kg", "ml", "l", "unidad", "u"}

def validate_escandallo(df: pd.DataFrame) -> list:
    # Normalizar columnas del Excel
    normalized_cols = {c.lower().strip(): c for c in df.columns}

    # Validar columnas obligatorias
    missing = [col for col in REQUIRED_COLUMNS if col not in normalized_cols]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Faltan columnas obligatorias en escandallo: {missing}"
        )

    # Mapear nombres normalizados → nombres reales del Excel
    col_ing = normalized_cols["ingrediente"]
    col_cant = normalized_cols["cantidad"]
    col_unid = normalized_cols["unidad"]
    col_precio = normalized_cols["precio_unidad"]

    # Eliminar filas completamente vacías
    df = df.dropna(how="all")

    errors = []

    # Validación fila por fila
    for index, row in df.iterrows():
        ingrediente = row[col_ing]
        cantidad = row[col_cant]
        unidad = row[col_unid]
        precio = row[col_precio]

        # Ingrediente no vacío
        if pd.isna(ingrediente) or str(ingrediente).strip() == "":
            errors.append(f"Fila {index+1}: Ingrediente vacío.")

        # Cantidad numérica > 0
        if not isinstance(cantidad, (int, float)) or cantidad <= 0:
            errors.append(f"Fila {index+1}: Cantidad inválida ({cantidad}).")

        # Unidad válida
        if str(unidad).lower().strip() not in VALID_UNITS:
            errors.append(f"Fila {index+1}: Unidad inválida ({unidad}).")

        # Precio numérico > 0
        if not isinstance(precio, (int, float)) or precio <= 0:
            errors.append(f"Fila {index+1}: Precio unidad inválido ({precio}).")

    # Si hay errores → devolverlos
    if errors:
        raise HTTPException(
            status_code=400,
            detail=errors
        )

    # Si todo está bien → devolver datos limpios
    return df.to_dict(orient="records")
