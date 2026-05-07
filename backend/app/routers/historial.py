from fastapi import APIRouter, Depends
from auth.utils import get_current_user
from app.db import supabase

router = APIRouter(prefix="/historial", tags=["historial"])

@router.get("/uploads")
def get_historial(user_id: str = Depends(get_current_user)):
    res = supabase.table("excel_uploads") \
        .select("id, filename, excel_type, uploaded_at, success, error_message") \
        .eq("restaurante_id", user_id) \
        .order("uploaded_at", desc=True) \
        .execute()
    return res.data