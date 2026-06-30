from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from .. import models, auth
from ..database import get_db
from fastapi.responses import StreamingResponse
import csv
import io

router = APIRouter(prefix="/api/logs", tags=["Activity Logs"])


def log_action(db: Session, user_id: int, action: str, details: str = None):
    """Helper function to create a log entry."""
    entry = models.ActivityLog(
        user_id=user_id,
        action=action,
        details=details,
        timestamp=datetime.now().isoformat()
    )
    db.add(entry)
    db.commit()


@router.get("/")
def get_all_logs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role([models.RoleEnum.hr, models.RoleEnum.admin]))
):
    """HR views all activity logs."""
    logs = db.query(models.ActivityLog).order_by(
        models.ActivityLog.id.desc()
    ).limit(200).all()

    result = []
    for log in logs:
        user = db.query(models.User).filter(models.User.id == log.user_id).first()
        result.append({
            "id": log.id,
            "user_name": user.name if user else "Unknown",
            "user_email": user.email if user else "Unknown",
            "action": log.action,
            "details": log.details,
            "timestamp": log.timestamp
        })
    return result

@router.get("/csv")
def download_logs_csv(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role([models.RoleEnum.hr, models.RoleEnum.admin]))
):
    logs = db.query(models.ActivityLog).order_by(models.ActivityLog.id.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["User Name", "User Email", "Action", "Details", "Timestamp"])
    for log in logs:
        user = db.query(models.User).filter(models.User.id == log.user_id).first()
        writer.writerow([
            user.name if user else "Unknown",
            user.email if user else "Unknown",
            log.action, log.details, log.timestamp
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=activity_logs.csv"}
    )
@router.get("/my-logs")
def get_my_logs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Employee views their own logs."""
    logs = db.query(models.ActivityLog).filter(
        models.ActivityLog.user_id == current_user.id
    ).order_by(models.ActivityLog.id.desc()).all()
    return logs
