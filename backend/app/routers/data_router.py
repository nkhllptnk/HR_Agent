from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from datetime import datetime
from .logs_router import log_action
import os
import shutil

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(prefix="/api/data", tags=["Data Collection"])

UPLOAD_DIR = "static/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/acknowledge")
def acknowledge_policies(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Employee acknowledges all policies after completing induction."""
    existing = db.query(models.EmployeeSubmission).filter(
        models.EmployeeSubmission.user_id == current_user.id
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Already acknowledged.")

    acknowledgement = models.EmployeeSubmission(
        user_id=current_user.id,
        full_name=current_user.name,
        address="",
        emergency_contact="",
        status=models.SubmissionStatus.approved,
        submitted_at=datetime.now().isoformat()
    )
    db.add(acknowledgement)
    db.commit()
    log_action(db, current_user.id, "ACKNOWLEDGED", "Employee acknowledged Keka document upload")
    return {"message": "Acknowledgement recorded successfully."}


@router.get("/my-acknowledgement")
def get_my_acknowledgement(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Check if employee has already acknowledged."""
    submission = db.query(models.EmployeeSubmission).filter(
        models.EmployeeSubmission.user_id == current_user.id
    ).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Not acknowledged yet.")
    return {"acknowledged": True, "submitted_at": submission.submitted_at}


@router.get("/submissions", response_model=list[schemas.SubmissionResponse])
def get_all_submissions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role([models.RoleEnum.hr, models.RoleEnum.admin]))
):
    """HR views all employee acknowledgements."""
    return db.query(models.EmployeeSubmission).all()


@router.put("/submissions/{submission_id}/status", response_model=schemas.SubmissionResponse)
def update_submission_status(
    submission_id: int,
    data: schemas.SubmissionStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role([models.RoleEnum.hr, models.RoleEnum.admin]))
):
    """HR approves or rejects with optional remark."""
    submission = db.query(models.EmployeeSubmission).filter(
        models.EmployeeSubmission.id == submission_id
    ).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found.")

    submission.status = data.status
    submission.hr_remark = data.hr_remark
    db.commit()
    db.refresh(submission)
    return submission