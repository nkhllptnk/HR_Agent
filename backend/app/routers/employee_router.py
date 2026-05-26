from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
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
    total_content = db.query(models.Content).count()
    result = []
    for emp in employees:
        completed = db.query(models.ModuleProgress).filter(
            models.ModuleProgress.user_id == emp.id,
            models.ModuleProgress.completed == True
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
    from ..worker import send_onboarding_email, daily_onboarding_check

    # Check if DOJ is today or within 2 days, send immediately
    today = datetime.now().date()
    try:
        doj = datetime.strptime(new_user.doj, "%Y-%m-%d").date() if isinstance(new_user.doj, str) else new_user.doj
    except:
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
    
    return new_user
