from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import string
import random

from .. import schemas, models, auth, database

router = APIRouter(prefix="/api/employees", tags=["employees"])

def generate_random_password(length=12):
    characters = string.ascii_letters + string.digits + string.punctuation
    return ''.join(random.choice(characters) for i in range(length))

@router.get("/", response_model=List[schemas.UserResponse])
def get_employees(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.require_role([models.RoleEnum.admin, models.RoleEnum.hr]))
):
    return db.query(models.User).filter(models.User.role != models.RoleEnum.admin).all()

@router.get("/with-progress")
def get_employees_with_progress(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.require_role([models.RoleEnum.admin, models.RoleEnum.hr]))
):
    """Returns employees with their live module completion stats."""
    employees = db.query(models.User).filter(models.User.role != models.RoleEnum.admin).all()
    result = []
    for emp in employees:
        applicable_contents = db.query(models.Content).filter(
            models.Content.is_enabled == True
        ).all()
        total_content = len(applicable_contents)
        applicable_ids = {c.id for c in applicable_contents}

        completed = db.query(models.ModuleProgress).filter(
            models.ModuleProgress.user_id == emp.id,
            models.ModuleProgress.completed == True,
            models.ModuleProgress.content_id.in_(applicable_ids)
        ).count()
        pct = int((completed / total_content) * 100) if total_content > 0 else 0
        result.append({
            "id": emp.id,
            "name": emp.name,
            "email": emp.email,
            "department": emp.department,
            "doj": emp.doj,
            "role": emp.role.value,
            "is_active": emp.is_active,
            "modules_completed": completed,
            "total_modules": total_content,
            "completion_pct": pct,
        })
    return result

@router.post("/", response_model=schemas.UserResponse)
def create_employee(
    data: schemas.UserCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.require_role([models.RoleEnum.admin, models.RoleEnum.hr]))
):
    # Check if user already exists
    existing_user = db.query(models.User).filter(
        (models.User.email == (data.email or data.personal_email)) | (models.User.personal_email == data.personal_email)
    ).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    # Generate a temporary password
    temp_password = "Password@123" # In a real app, generate a random one and send via email

    new_user = models.User(
        name=data.name,
        email=data.email or data.personal_email,  # Use personal_email if company email not provided
        personal_email=data.personal_email,
        hashed_password=auth.get_password_hash(temp_password),
        role=data.role,
        department=data.department,
        doj=data.doj,
        is_first_login=True
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Initialize Onboarding Progress
    progress = models.OnboardingProgress(
        user_id=new_user.id,
        current_step=1,
        last_activity_at=datetime.now().isoformat()
    )
    db.add(progress)
    db.commit()
    
    # Trigger Email Automation (Immediate check)
    try:
        from ..worker import send_onboarding_email, daily_onboarding_check

        # Check if DOJ is today or within 2 days, send immediately
        today = datetime.now().date()
        try:
            doj = datetime.strptime(new_user.doj, "%Y-%m-%d").date() if isinstance(new_user.doj, str) else new_user.doj
        except Exception:
            doj = None

        if doj:
            if doj == today:
                # Day 0 - send immediately
                send_onboarding_email.delay(new_user.id, "Day 0", {"password": temp_password})
            elif doj == today + timedelta(days=2):
                # T-2 - send immediately
                send_onboarding_email.delay(new_user.id, "T-2")

        # Also queue the daily check for other tasks
        daily_onboarding_check.delay()
    except Exception as e:
        # Celery/Redis not available — log and continue; employee was still created
        import logging
        logging.warning(f"Celery task could not be queued (Redis may not be running): {e}")

    return new_user

@router.post("/{user_id}/control")
def control_employee_progress(
    user_id: int,
    action: str,
    content_id: Optional[int] = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.require_role([models.RoleEnum.hr, models.RoleEnum.admin]))
):
    """HR controls employee onboarding progress."""
    if action == "reset_all":
        db.query(models.ModuleProgress).filter(
            models.ModuleProgress.user_id == user_id
        ).delete()
        db.query(models.EmployeeSubmission).filter(
            models.EmployeeSubmission.user_id == user_id
        ).delete()
        onboarding = db.query(models.OnboardingProgress).filter(
            models.OnboardingProgress.user_id == user_id
        ).first()
        if onboarding:
            onboarding.current_step = 1
            onboarding.completion_percentage = 0
        db.commit()
        return {"message": "Onboarding reset successfully."}

    elif action == "reset_module":
        if not content_id:
            raise HTTPException(status_code=400, detail="content_id required for reset_module")
        db.query(models.ModuleProgress).filter(
            models.ModuleProgress.user_id == user_id,
            models.ModuleProgress.content_id == content_id
        ).delete()
        db.commit()
        return {"message": "Module reset successfully."}

    elif action in ["next", "prev"]:
        all_contents = db.query(models.Content).filter(
            models.Content.is_enabled == True
        ).order_by(models.Content.order).all()

        completed = db.query(models.ModuleProgress).filter(
            models.ModuleProgress.user_id == user_id,
            models.ModuleProgress.completed == True
        ).all()
        completed_ids = {p.content_id for p in completed}

        if action == "next":
            for content in all_contents:
                if content.id not in completed_ids:
                    new_progress = models.ModuleProgress(
                        user_id=user_id,
                        content_id=content.id,
                        completed=True,
                        score=0,
                        total_questions=0,
                        attempt_count=0,
                        completed_at=datetime.now().isoformat()
                    )
                    db.add(new_progress)
                    db.commit()
                    return {"message": "Employee moved to next module."}
            return {"message": "Employee has already completed all modules."}

        elif action == "prev":
            completed_contents = [c for c in all_contents if c.id in completed_ids]
            if not completed_contents:
                return {"message": "No completed modules to revert."}
            last = completed_contents[-1]
            db.query(models.ModuleProgress).filter(
                models.ModuleProgress.user_id == user_id,
                models.ModuleProgress.content_id == last.id
            ).delete()
            db.commit()
            return {"message": "Employee moved back to previous module."}

    raise HTTPException(status_code=400, detail="Invalid action.")


@router.get("/{user_id}/report")
def get_employee_report(
    user_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.require_role([models.RoleEnum.admin, models.RoleEnum.hr]))
):
    """HR gets detailed report for a specific employee."""
    employee = db.query(models.User).filter(models.User.id == user_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    contents = db.query(models.Content).filter(
        models.Content.is_enabled == True
    ).order_by(models.Content.order).all()

    progress_records = db.query(models.ModuleProgress).filter(
        models.ModuleProgress.user_id == user_id
    ).all()
    progress_map = {p.content_id: p for p in progress_records}

    total_score = 0
    max_score = 0
    modules_data = []

    for content in contents:
        p = progress_map.get(content.id)
        if p and p.completed:
            module_score_pct = 100 if p.attempt_count <= 1 else 75
            total_score += module_score_pct
        else:
            module_score_pct = 0
        max_score += 100

        modules_data.append({
            "module_id": content.id,
            "module_title": content.title,
            "is_intro": content.is_intro,
            "completed": p.completed if p else False,
            "score": p.score if p else 0,
            "total_questions": p.total_questions if p else 0,
            "attempt_count": p.attempt_count if p else 0,
            "module_score_pct": module_score_pct,
            "completed_at": p.completed_at if p else None,
            "time_spent_seconds": p.time_spent_seconds if p else 0,
        })

    overall_pct = round((total_score / max_score) * 100) if max_score > 0 else 0

    if overall_pct >= 90:
        rating = "Excellent"
    elif overall_pct >= 75:
        rating = "Good"
    elif overall_pct >= 50:
        rating = "Needs Improvement"
    else:
        rating = "Incomplete"

    acknowledgement = db.query(models.EmployeeSubmission).filter(
        models.EmployeeSubmission.user_id == user_id
    ).first()

    return {
        "employee": {
            "id": employee.id,
            "name": employee.name,
            "email": employee.email,
            "department": employee.department,
            "doj": employee.doj,
            "role": employee.role.value,
        },
        "modules": modules_data,
        "summary": {
            "total_modules": len(contents),
            "completed_modules": sum(1 for m in modules_data if m["completed"]),
            "overall_score_pct": overall_pct,
            "rating": rating,
            "acknowledged_at": acknowledgement.submitted_at if acknowledgement else None,
            "completion_date": max(
                (m["completed_at"] for m in modules_data if m["completed_at"]),
                default=None
            ),
        }
    }


@router.get("/my-report")
def get_my_report(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Employee gets their own completion report."""
    contents = db.query(models.Content).filter(
        models.Content.is_enabled == True
    ).order_by(models.Content.order).all()

    progress_records = db.query(models.ModuleProgress).filter(
        models.ModuleProgress.user_id == current_user.id
    ).all()
    progress_map = {p.content_id: p for p in progress_records}

    total_score = 0
    max_score = 0
    modules_data = []

    for content in contents:
        p = progress_map.get(content.id)
        if p and p.completed:
            module_score_pct = 100 if p.attempt_count <= 1 else 75
            total_score += module_score_pct
        else:
            module_score_pct = 0
        max_score += 100

        modules_data.append({
            "module_title": content.title,
            "is_intro": content.is_intro,
            "completed": p.completed if p else False,
            "score": p.score if p else 0,
            "total_questions": p.total_questions if p else 0,
            "attempt_count": p.attempt_count if p else 0,
            "module_score_pct": module_score_pct,
            "completed_at": p.completed_at if p else None,
            "time_spent_seconds": p.time_spent_seconds if p else 0,
        })

    overall_pct = round((total_score / max_score) * 100) if max_score > 0 else 0

    if overall_pct >= 90:
        rating = "Excellent"
    elif overall_pct >= 75:
        rating = "Good"
    elif overall_pct >= 50:
        rating = "Needs Improvement"
    else:
        rating = "Incomplete"

    return {
        "modules": modules_data,
        "summary": {
            "total_modules": len(contents),
            "completed_modules": sum(1 for m in modules_data if m["completed"]),
            "overall_score_pct": overall_pct,
            "rating": rating,
        }
    }
