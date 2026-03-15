"""File upload API for articles."""
import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from app.dependencies import get_admin_user

router = APIRouter(prefix="/admin/upload", tags=["Admin Upload"])

UPLOAD_DIR = Path("/root/RealSearch/server/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}


@router.post("")
async def upload_file(
    file: UploadFile = File(...),
    _admin=Depends(get_admin_user),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, "Only JPEG, PNG, GIF, WebP images allowed")

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(400, "File too large (max 5MB)")

    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = UPLOAD_DIR / filename
    filepath.write_bytes(content)

    return {"url": f"/uploads/{filename}", "filename": filename}
