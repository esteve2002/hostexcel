from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from supabase import create_client
import os

router = APIRouter(prefix="/excel/mapping", tags=["Excel Mapping"])

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

# -----------------------------
# MODELOS
# -----------------------------

class MappingCreate(BaseModel):
    restaurante_id: int
    excel_type: str
    original_column: str
    mapped_column: str


# -----------------------------
# ENDPOINTS
# -----------------------------

# 1️⃣ Crear o actualizar un mapping
@router.post("/")
def create_mapping(mapping: MappingCreate):
    # Comprobar si ya existe
    existing = supabase.table("excel_column_mappings") \
        .select("*") \
        .eq("restaurante_id", mapping.restaurante_id) \
        .eq("excel_type", mapping.excel_type) \
        .eq("original_column", mapping.original_column) \
        .execute()

    if existing.data:
        # Actualizar
        supabase.table("excel_column_mappings") \
            .update({"mapped_column": mapping.mapped_column}) \
            .eq("id", existing.data[0]["id"]) \
            .execute()

        return {"status": "updated", "id": existing.data[0]["id"]}

    # Crear nuevo
    result = supabase.table("excel_column_mappings") \
        .insert(mapping.dict()) \
        .execute()

    return {"status": "created", "id": result.data[0]["id"]}


# 2️⃣ Listar mappings por restaurante y tipo
@router.get("/list")
def list_mappings(restaurante_id: int, excel_type: str):
    result = supabase.table("excel_column_mappings") \
        .select("*") \
        .eq("restaurante_id", restaurante_id) \
        .eq("excel_type", excel_type) \
        .execute()

    return {"mappings": result.data}


# 3️⃣ Eliminar un mapping
@router.delete("/{mapping_id}")
def delete_mapping(mapping_id: int):
    result = supabase.table("excel_column_mappings") \
        .delete() \
        .eq("id", mapping_id) \
        .execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Mapping no encontrado")

    return {"status": "deleted", "id": mapping_id}
