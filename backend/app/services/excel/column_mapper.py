import unicodedata
from fastapi import HTTPException
from supabase import create_client
import os

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

def normalize_column_name(name: str) -> str:
    name = name.strip().lower()
    name = ''.join(
        c for c in unicodedata.normalize('NFD', name)
        if unicodedata.category(c) != 'Mn'
    )
    return name.replace(" ", "_")

def get_column_mapping(restaurante_id: int, excel_type: str | None):
    query = (
        supabase.table("excel_column_mappings")
        .select("original_column, mapped_column")
        .eq("restaurante_id", restaurante_id)
    )

    # Si excel_type es None → NO filtramos por tipo
    if excel_type is not None:
        query = query.eq("excel_type", excel_type)

    resp = query.execute()
    rows = resp.data or []

    # Normalizar claves
    mapping = {}
    for row in rows:
        original_norm = normalize_column_name(row["original_column"])
        mapping[original_norm] = row["mapped_column"]

    return mapping


def apply_column_mapping(df, restaurante_id, excel_type: str):
    mapping = get_column_mapping(restaurante_id, excel_type)

    # Normalizar nombres de columnas siempre
    df.columns = [
        col.strip().lower()
        .replace(" ", "_")
        .replace("á","a").replace("é","e").replace("í","i")
        .replace("ó","o").replace("ú","u")
        for col in df.columns
    ]

    # Si no hay mapping configurado, devolver df tal cual
    if not mapping:
        return df

    normalized_cols = {normalize_column_name(c): c for c in df.columns}
    rename_dict = {}

    for original_norm, target_col in mapping.items():
        if original_norm in normalized_cols:
            excel_col = normalized_cols[original_norm]
            rename_dict[excel_col] = target_col

    return df.rename(columns=rename_dict)
