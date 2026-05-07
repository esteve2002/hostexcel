import pandas as pd
import re
from fastapi import HTTPException

# Columnas mínimas requeridas (normalizadas)
REQUIRED_COLUMNS = {"proveedor", "cif", "email", "telefono", "direccion"}

# Regex
EMAIL_REGEX = r"^[\w\.-]+@[\w\.-]+\.\w+$"
CIF_REGEX = r"^[A-Za-z]\d{7}[A-Za-z0-9]$"
PHONE_REGEX = r"^\d{9}$"

# Normaliza nombres de columnas (sin tildes)
def normalize(col: str) -> str:
    col = col.strip().lower()
    col = col.replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")
    return col

def validate_proveedores(df: pd.DataFrame) -> list:
    # Normalizar columnas del Excel
    normalized_cols = {normalize(c): c for c in df.columns}

    # Validar columnas obligatorias
    missing = [col for col in REQUIRED_COLUMNS if col not in normalized_cols]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Faltan columnas obligatorias en proveedores: {missing}"
        )

    # Mapear columnas normalizadas → nombres reales
    col_prov = normalized_cols["proveedor"]
    col_cif = normalized_cols["cif"]
    col_email = normalized_cols["email"]
    col_tel = normalized_cols["telefono"]
    col_dir = normalized_cols["direccion"]

    # Eliminar filas completamente vacías
    df = df.dropna(how="all")

    errors = []

    # Validación fila por fila
    for index, row in df.iterrows():
        proveedor = row[col_prov]
        cif = row[col_cif]
        email = row[col_email]
        telefono = row[col_tel]
        direccion = row[col_dir]

        # Proveedor no vacío
        if pd.isna(proveedor) or str(proveedor).strip() == "":
            errors.append(f"Fila {index+1}: Proveedor vacío.")

        # CIF válido
        if pd.isna(cif) or not re.match(CIF_REGEX, str(cif)):
            errors.append(f"Fila {index+1}: CIF inválido ({cif}).")

        # Email válido
        if pd.isna(email) or not re.match(EMAIL_REGEX, str(email)):
            errors.append(f"Fila {index+1}: Email inválido ({email}).")

        # Teléfono válido
        if pd.isna(telefono) or not re.match(PHONE_REGEX, str(telefono)):
            errors.append(f"Fila {index+1}: Teléfono inválido ({telefono}).")

        # Dirección no vacía
        if pd.isna(direccion) or str(direccion).strip() == "":
            errors.append(f"Fila {index+1}: Dirección inválida ({direccion}).")

    # Si hay errores → devolverlos
    if errors:
        raise HTTPException(
            status_code=400,
            detail=errors
        )

    # Si todo está bien → devolver datos limpios
    return df.to_dict(orient="records")
