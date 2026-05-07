#!/bin/bash

echo "🚀 Iniciando HostExcel..."

# Ruta del proyecto
ROOT="/home/esteve/Proyectos/HostExcel"

# -------------------------------
# 1) BACKEND
# -------------------------------
echo "📦 Iniciando backend..."

cd "$ROOT/backend" || exit

# Activar entorno virtual
if [ -d "venv" ]; then
    echo "🔧 Activando entorno virtual..."
    source venv/bin/activate
else
    echo "⚠️ No existe venv. Creándolo..."
    python3 -m venv venv
    source venv/bin/activate
    pip install fastapi uvicorn[standard] python-multipart pandas openpyxl
fi

# Arrancar backend en segundo plano
echo "🔥 Backend en http://localhost:8000"
uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!

# -------------------------------
# 2) FRONTEND
# -------------------------------
echo "🎨 Iniciando frontend..."

cd "$ROOT/frontend" || exit

# Instalar dependencias si faltan
if [ ! -d "node_modules" ]; then
    echo "📥 Instalando dependencias del frontend..."
    npm install
fi

# Arrancar frontend
echo "🌐 Frontend en http://localhost:3000"
npm run dev &

FRONTEND_PID=$!

# -------------------------------
# 3) CONTROL + SALIDA
# -------------------------------
echo ""
echo "✅ HostExcel está corriendo."
echo "   Backend PID: $BACKEND_PID"
echo "   Frontend PID: $FRONTEND_PID"
echo ""
echo "🛑 Pulsa CTRL+C para cerrar ambos servicios."

# Esperar a que el usuario cierre
wait
