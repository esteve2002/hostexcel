from fastapi import APIRouter, UploadFile, File, Depends
from app.services.excel.excel_service import process_excel
from auth.utils import get_current_user

router = APIRouter(prefix="/excel")

@router.post("/validate")
async def validate_excel(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user)
):
    return await process_excel(file, save=False, user_id=user_id)

@router.post("/upload")
async def upload_excel(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user)
):
    return await process_excel(file, save=True, user_id=user_id)

@router.post("/upload/force")
async def upload_excel_force(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user)
):
    return await process_excel(file, save=True, user_id=user_id, force=True)