import io
import pandas as pd
from fastapi import UploadFile, HTTPException
from app.services.excel.detector import detect_excel_type
from app.services.excel.escandallo_validator import validate_escandallo
from app.services.excel.proveedores_validator import validate_proveedores
from app.services.excel.ventas_validator import validate_ventas
from app.services.excel.inventario_validator import validate_inventario
from app.services.excel.supabase_uploader import upload_to_supabase
from app.services.excel.column_mapper import apply_column_mapping
from app.db import supabase

async def process_excel(file: UploadFile, save: bool = False, user_id: str = None, force: bool = False):
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))

        original_columns = df.columns.tolist()
        print("🔥 COLUMNAS ORIGINALES:", original_columns)

        excel_type = detect_excel_type(df)
        df = apply_column_mapping(df, user_id, excel_type)

        mapped_columns = df.columns.tolist()
        print("🔥 COLUMNAS DESPUÉS DEL MAPPING:", mapped_columns)

        if excel_type == "escandallo":
            data = validate_escandallo(df)
            if save:
                for row in data:
                    row["user_id"] = user_id
                upload_to_supabase("escandallo", data)

        elif excel_type == "proveedores":
            data = validate_proveedores(df)
            if save:
                for row in data:
                    row["user_id"] = user_id
                upload_to_supabase("proveedores", data)

        elif excel_type == "ventas":
            data = validate_ventas(df)
            if save:
                fechas = pd.to_datetime(pd.Series([row["fecha"] for row in data]), errors="coerce")
                fecha_min = fechas.min().date().isoformat()
                fecha_max = fechas.max().date().isoformat()

                existing = supabase.table("ventas") \
                    .select("fecha") \
                    .eq("user_id", user_id) \
                    .gte("fecha", fecha_min) \
                    .lte("fecha", fecha_max) \
                    .execute()

                if existing.data:
                    if not force:
                        raise HTTPException(
                            status_code=409,
                            detail=f"Ya tienes ventas registradas entre {fecha_min} y {fecha_max}. ¿Quieres sobreescribirlas?"
                        )
                    else:
                        # Borrar registros del período antes de insertar
                        supabase.table("ventas") \
                            .delete() \
                            .eq("user_id", user_id) \
                            .gte("fecha", fecha_min) \
                            .lte("fecha", fecha_max) \
                            .execute()

                for row in data:
                    row["user_id"] = user_id
                upload_to_supabase("ventas", data)

        elif excel_type == "inventario":
            data = validate_inventario(df)
            if save:
                for row in data:
                    row["user_id"] = user_id
                upload_to_supabase("inventario", data)

        else:
            raise HTTPException(status_code=400, detail="Tipo de Excel no reconocido.")

        # Guardar historial éxito
        supabase.table("excel_uploads").insert({
            "restaurante_id": user_id,
            "filename": file.filename,
            "excel_type": excel_type,
            "success": True,
            "original_columns": original_columns,
            "mapped_columns": mapped_columns
        }).execute()

        return {"tipo": excel_type, "data": data}

    except Exception as e:
        # Guardar historial error
        supabase.table("excel_uploads").insert({
            "restaurante_id": user_id,
            "filename": file.filename,
            "excel_type": excel_type if 'excel_type' in locals() else None,
            "success": False,
            "error_message": str(e),
            "original_columns": original_columns if 'original_columns' in locals() else None,
            "mapped_columns": mapped_columns if 'mapped_columns' in locals() else None
        }).execute()
        raise e
