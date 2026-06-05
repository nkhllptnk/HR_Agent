from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import os
import shutil
from datetime import datetime
from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(prefix="/api/content", tags=["Content Management"])


UPLOAD_DIR = "static/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# --- Content Endpoints ---

@router.get("/", response_model=List[schemas.ContentResponse])
def get_all_content(db: Session = Depends(get_db)):
    return db.query(models.Content).order_by(models.Content.order).all()
@router.post("/", response_model=schemas.ContentResponse)
def create_content(
    data: schemas.ContentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role([models.RoleEnum.hr, models.RoleEnum.admin]))
):
    new_content = models.Content(**data.dict())
    db.add(new_content)
    db.commit()
    db.refresh(new_content)
    return new_content

@router.put("/reorder")
def reorder_modules(
    order_data: list[dict],
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role([models.RoleEnum.hr, models.RoleEnum.admin]))
):
    """HR reorders non-intro modules. Expects list of {id, order}"""
    for item in order_data:
        content = db.query(models.Content).filter(
            models.Content.id == item["id"],
            models.Content.is_intro == False
        ).first()
        if content:
            content.order = item["order"]
    db.commit()
    return {"message": "Order updated successfully."}


@router.post("/complete-module", response_model=schemas.ModuleProgressResponse)
def complete_module(
    data: schemas.ModuleProgressCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    passed = data.total_questions > 0 and (data.score / data.total_questions) >= 0.5

    existing = db.query(models.ModuleProgress).filter(
        models.ModuleProgress.user_id == current_user.id,
        models.ModuleProgress.content_id == data.content_id
    ).first()

    if existing:
        if existing.completed:
            return existing

        if existing.attempt_count >= 2:
            raise HTTPException(
                status_code=403,
                detail="Maximum attempts reached. You have been reassigned to the module."
            )

        existing.attempt_count += 1
        existing.score = data.score
        existing.total_questions = data.total_questions

        if passed:
            existing.completed = True
            existing.completed_at = datetime.now().isoformat()

        db.commit()
        db.refresh(existing)

        if not passed and existing.attempt_count >= 2:
            raise HTTPException(
                status_code=403,
                detail="Maximum attempts reached. You have been reassigned to the module."
            )

        return existing

    else:
        new_progress = models.ModuleProgress(
            user_id=current_user.id,
            content_id=data.content_id,
            completed=passed,
            score=data.score,
            total_questions=data.total_questions,
            attempt_count=1,
            completed_at=datetime.now().isoformat() if passed else None
        )
        db.add(new_progress)

        if passed:
            onboarding = db.query(models.OnboardingProgress).filter(
                models.OnboardingProgress.user_id == current_user.id
            ).first()
            if onboarding:
                all_content_count = db.query(models.Content).count()
                completed_count = db.query(models.ModuleProgress).filter(
                    models.ModuleProgress.user_id == current_user.id,
                    models.ModuleProgress.completed == True
                ).count() + 1
                if all_content_count > 0:
                    onboarding.completion_percentage = int((completed_count / all_content_count) * 100)
                onboarding.last_activity_at = datetime.now().isoformat()

        db.commit()
        db.refresh(new_progress)

        if not passed and new_progress.attempt_count >= 2:
            raise HTTPException(
                status_code=403,
                detail="Maximum attempts reached. You have been reassigned to the module."
            )

        return new_progress

# --- MCQ Endpoints ---

@router.get("/{content_id}/mcqs", response_model=List[schemas.MCQResponse])
def get_mcqs_for_content(content_id: int, db: Session = Depends(get_db)):
    return db.query(models.MCQ).filter(models.MCQ.content_id == content_id).all()

@router.post("/mcqs", response_model=schemas.MCQResponse)
def create_mcq(
    data: schemas.MCQCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role([models.RoleEnum.hr, models.RoleEnum.admin]))
):
    new_mcq = models.MCQ(**data.dict())
    db.add(new_mcq)
    db.commit()
    db.refresh(new_mcq)
    return new_mcq

@router.delete("/mcqs/{mcq_id}")
def delete_mcq(
    mcq_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role([models.RoleEnum.hr, models.RoleEnum.admin]))
):
    mcq = db.query(models.MCQ).filter(models.MCQ.id == mcq_id).first()
    if not mcq:
        raise HTTPException(status_code=404, detail="MCQ not found")
    
    db.delete(mcq)
    db.commit()
    return {"message": "MCQ deleted"}

# --- File Upload ---

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.require_role([models.RoleEnum.hr, models.RoleEnum.admin]))
):
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Return the URL path
    return {"url": f"/static/uploads/{file.filename}"}

# --- Module Progress ---

@router.get("/my-progress", response_model=List[schemas.ModuleProgressResponse])
def get_my_progress(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Get all completed modules for the current user."""
    return db.query(models.ModuleProgress).filter(
        models.ModuleProgress.user_id == current_user.id
    ).all()

@router.get("/employee-progress/{user_id}", response_model=List[schemas.ModuleProgressResponse])
def get_employee_progress(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role([models.RoleEnum.hr, models.RoleEnum.admin]))
):
    """HR: Get module progress for a specific employee."""
    return db.query(models.ModuleProgress).filter(
        models.ModuleProgress.user_id == user_id
    ).all()

@router.post("/reset-attempts/{content_id}")
def reset_attempts(
    content_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Reset attempt count when employee restarts the module."""
    existing = db.query(models.ModuleProgress).filter(
        models.ModuleProgress.user_id == current_user.id,
        models.ModuleProgress.content_id == content_id
    ).first()
    if existing:
        existing.attempt_count = 0
        existing.completed = False
        existing.score = 0
        db.commit()
    return {"message": "Attempts reset successfully."}

# --- Content Update ---

@router.put("/{content_id}", response_model=schemas.ContentResponse)
def update_content(
    content_id: int,
    data: schemas.ContentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        auth.require_role([models.RoleEnum.hr, models.RoleEnum.admin])
    )
):
    content = db.query(models.Content).filter(
        models.Content.id == content_id
    ).first()

    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    content.title = data.title
    content.description = data.description
    content.content_type = data.content_type
    content.file_url = data.file_url

    db.commit()
    db.refresh(content)

    return content


# --- Content Delete ---

@router.delete("/{content_id}")
def delete_content(
    content_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        auth.require_role([models.RoleEnum.hr, models.RoleEnum.admin])
    )
):
    content = db.query(models.Content).filter(
        models.Content.id == content_id
    ).first()

    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    if content.is_intro:
        raise HTTPException(
            status_code=400,
            detail="Introduction module cannot be deleted"
        )

    db.delete(content)
    db.commit()

    return {"message": "Content deleted successfully"}

@router.post("/reorder")
def reorder_content(
    data: schemas.ReorderRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        auth.require_role([models.RoleEnum.hr, models.RoleEnum.admin])
    )
):
    intro = db.query(models.Content).filter(
        models.Content.is_intro == True
    ).first()

    if intro:
        intro.order = 0

    for index, content_id in enumerate(data.content_ids, start=1):
        content = db.query(models.Content).filter(
            models.Content.id == content_id
        ).first()

        if content and not content.is_intro:
            content.order = index

    db.commit()

    return {"message": "Order updated successfully"}

@router.put("/{content_id}/toggle")
def toggle_module(
    content_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role([models.RoleEnum.hr, models.RoleEnum.admin]))
):
    """HR enables or disables a module."""
    content = db.query(models.Content).filter(models.Content.id == content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    if content.is_intro:
        raise HTTPException(status_code=400, detail="Introduction module cannot be disabled.")
    content.is_enabled = not content.is_enabled
    db.commit()
    db.refresh(content)
    return {"id": content.id, "is_enabled": content.is_enabled}