import pandas as pd
from fastapi import HTTPException

REQUIRED_COLUMNS = ["fecha", "producto", "cantidad_vendida", "precio_unitario"]


def validate_ventas(df):
    cols = set(df.columns)

    missing = [c for c in REQUIRED_COLUMNS if c not in cols]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Faltan columnas obligatorias en ventas: {missing}"
        )

    # Convertir columnas numéricas de forma segura
    for col in ["cantidad_vendida", "precio_unitario", "total"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')

    # Eliminar filas completamente vacías
    df = df.dropna(how="all")

    errors = []

    # Validación fila por fila
    for index, row in df.iterrows():
        fecha = row["fecha"]
        producto = row["producto"]
        cantidad = row["cantidad_vendida"]
        precio = row["precio_unitario"]
        total = row["total"] if "total" in df.columns else None

        # Validar fecha
        try:
            pd.to_datetime(fecha)
        except Exception:
            errors.append(f"Fila {index+1}: Fecha inválida ({fecha}).")

        # Producto no puede estar vacío
        if pd.isna(producto) or str(producto).strip() == "":
            errors.append(f"Fila {index+1}: Producto vacío.")

        # Cantidad debe ser número > 0
        if pd.isna(cantidad) or cantidad <= 0:
            errors.append(f"Fila {index+1}: Cantidad vendida inválida ({row['cantidad_vendida']}).")

        # Precio unitario debe ser número > 0
        if pd.isna(precio) or precio <= 0:
            errors.append(f"Fila {index+1}: Precio unitario inválido ({row['precio_unitario']}).")

        # Si existe total, recalcular precio_unitario para evitar errores de formato
        if total is not None and not pd.isna(total) and total > 0 and not pd.isna(cantidad) and cantidad > 0:
            precio_correcto = round(total / cantidad, 2)
            if abs(precio - precio_correcto) > 0.01:
                # El precio leído del Excel no coincide, usar el calculado del total
                df.at[index, "precio_unitario"] = precio_correcto
                precio = precio_correcto

        # Calcular o validar total
        if total is None or pd.isna(total):
            # Calcular automáticamente
            if not pd.isna(cantidad) and not pd.isna(precio):
                df.at[index, "total"] = round(cantidad * precio, 2)
        else:
            # Validar que el total sea coherente
            expected_total = round(cantidad * precio, 2)
            if abs(total - expected_total) > 0.01:
                errors.append(
                    f"Fila {index+1}: Total incorrecto ({total}), debería ser {expected_total}."
                )

    # Si hay errores → devolverlos todos juntos
    if errors:
        raise HTTPException(
            status_code=400,
            detail=errors
        )

    # Si todo está bien → devolver datos limpios
    return df.to_dict(orient="records")
