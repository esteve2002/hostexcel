import pandas as pd
from fastapi import HTTPException

REQUIRED_COLUMNS = ["producto", "stock_actual", "stock_minimo", "fecha_ultima_compra"]


def normalize_excel_date(value):
    if pd.isna(value):
        return None

    if isinstance(value, pd.Timestamp):
        return value.date().isoformat()

    if hasattr(value, "isoformat") and not isinstance(value, str):
        try:
            return value.isoformat()
        except Exception:
            pass

    if isinstance(value, (int, float)):
        return (pd.Timestamp("1899-12-30") + pd.to_timedelta(value, unit="D")).date().isoformat()

    parsed = pd.to_datetime(value, errors="coerce")
    if pd.isna(parsed):
        return None

    return parsed.date().isoformat()

def validate_inventario(df: pd.DataFrame) -> list:
    # 1. Validar columnas obligatorias
    missing = [col for col in REQUIRED_COLUMNS if col not in df.columns]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Faltan columnas obligatorias en inventario: {missing}"
        )

    # 2. Eliminar filas completamente vacías
    df = df.dropna(how="all")

    errors = []

    # 3. Validación fila por fila
    for index, row in df.iterrows():
        producto = row["producto"]
        stock_actual = row["stock_actual"]
        stock_minimo = row["stock_minimo"]
        fecha_compra = normalize_excel_date(row["fecha_ultima_compra"])

        if pd.isna(producto) or str(producto).strip() == "":
            errors.append(f"Fila {index+1}: Producto vacío.")

        if not isinstance(stock_actual, (int, float)) or stock_actual < 0:
            errors.append(f"Fila {index+1}: Stock actual inválido ({stock_actual}).")

        if not isinstance(stock_minimo, (int, float)) or stock_minimo < 0:
            errors.append(f"Fila {index+1}: Stock mínimo inválido ({stock_minimo}).")

        if isinstance(stock_actual, (int, float)) and isinstance(stock_minimo, (int, float)):
            if stock_actual < stock_minimo:
                errors.append(
                    f"Fila {index+1}: Stock actual ({stock_actual}) menor que stock mínimo ({stock_minimo})."
                )

        if row["fecha_ultima_compra"] is not None and not fecha_compra:
            errors.append(f"Fila {index+1}: Fecha última compra inválida ({fecha_compra}).")
        elif fecha_compra:
            df.at[index, "fecha_ultima_compra"] = fecha_compra

    if errors:
        raise HTTPException(status_code=400, detail=errors)

    return df.to_dict(orient="records")
