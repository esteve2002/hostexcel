from fastapi import APIRouter, Depends, HTTPException
from app.db import supabase
from auth.utils import get_current_user

router = APIRouter(prefix="/datos", tags=["datos"])


@router.get("/ventas")
async def get_ventas(user_id: str = Depends(get_current_user)):
    """Obtiene todas las ventas del restaurante autenticado"""
    try:
        print(f"DEBUG - get_ventas - user_id: {user_id}")
        response = supabase.table("ventas").select("*").eq("user_id", user_id).execute()
        print(f"DEBUG - get_ventas - response.data count: {len(response.data) if response.data else 0}")
        return response.data if response.data else []
    except Exception as e:
        print(f"Error fetching ventas: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/inventario")
async def get_inventario(user_id: str = Depends(get_current_user)):
    """Obtiene el inventario del restaurante autenticado"""
    try:
        response = supabase.table("inventario").select("*").eq("user_id", user_id).execute()
        return response.data if response.data else []
    except Exception as e:
        print(f"Error fetching inventario: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/escandallo")
async def get_escandallo(user_id: str = Depends(get_current_user)):
    """Obtiene los escandallos (BOM) del restaurante autenticado"""
    try:
        response = supabase.table("escandallo").select("*").eq("user_id", user_id).execute()
        return response.data if response.data else []
    except Exception as e:
        print(f"Error fetching escandallo: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/proveedores")
async def get_proveedores(user_id: str = Depends(get_current_user)):
    """Obtiene los proveedores del restaurante autenticado"""
    try:
        response = supabase.table("proveedores").select("*").eq("user_id", user_id).execute()
        return response.data if response.data else []
    except Exception as e:
        print(f"Error fetching proveedores: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
