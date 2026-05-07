from fastapi import APIRouter
from app.db import supabase

router = APIRouter()

@router.get("/restaurantes/{restaurante_id}/uploads")
def get_uploads(restaurante_id: int):
    res = supabase.table("excel_uploads") \
        .select("*") \
        .eq("restaurante_id", restaurante_id) \
        .order("uploaded_at", desc=True) \
        .execute()

    return res.data
