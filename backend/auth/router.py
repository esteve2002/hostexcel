from fastapi import APIRouter, HTTPException
from .schemas import RegisterRequest, LoginRequest
from .utils import hash_password, verify_password, create_token
from app.supabase_client import supabase

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register")
def register(data: RegisterRequest):
    res = supabase.table("usuarios").insert({
        "email": data.email,
        "password_hash": hash_password(data.password),
        "nombre_restaurante": data.nombre_restaurante,
        "telefono": data.telefono,
    }).execute()

    if not res.data:
        raise HTTPException(400, "Error al crear el usuario")

    user = res.data[0]
    return {"token": create_token(user["id"])}

@router.post("/login")
def login(data: LoginRequest):
    res = supabase.table("usuarios").select("*").eq("email", data.email).execute()

    if not res.data:
        raise HTTPException(401, "Credenciales incorrectas")

    user = res.data[0]

    if not verify_password(data.password, user["password_hash"]):
        raise HTTPException(401, "Credenciales incorrectas")

    return {"token": create_token(user["id"])}



from auth.utils import get_current_user
from fastapi import Depends

@router.get("/me")
def get_me(user_id: str = Depends(get_current_user)):
    res = supabase.table("usuarios").select("*").eq("id", user_id).execute()
    
    if not res.data:
        raise HTTPException(404, "Usuario no encontrado")
    
    user = res.data[0]
    return {
        "id": user["id"],
        "email": user["email"],
        "nombre_restaurante": user["nombre_restaurante"],
        "plan": user["plan"],
    }