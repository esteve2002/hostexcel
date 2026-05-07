from fastapi import FastAPI
from dotenv import load_dotenv
import os

from fastapi.middleware.cors import CORSMiddleware




load_dotenv()  # ← OBLIGATORIO

from app.routers.excel import router as excel_router
from auth.router import router as auth_router
from app.routers.datos_router import router as datos_router

app = FastAPI()

from app.routers.historial import router as historial_router
app.include_router(historial_router)


app.include_router(excel_router)
app.include_router(auth_router)
app.include_router(datos_router)

# CORS configuration - read from env or use defaults
allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:8000")
allowed_origins = [origin.strip() for origin in allowed_origins_str.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.routers.mapping_router import router as mapping_router

app.include_router(mapping_router)

# MOMENTO EN EL QUE USAMOS ROUTER UPLOADS PARA HIST

from app.routers import uploads

app.include_router(uploads.router)


