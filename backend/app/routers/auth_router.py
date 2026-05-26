from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
import secrets

from .. import schemas, models, auth, database
from ..utils.email_utils import EmailService

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email, "role": user.role.value}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

@router.post("/reset-password", response_model=schemas.UserResponse)
def reset_password(
    data: schemas.PasswordResetConfirm,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """First-login password reset (requires authentication)."""
    if not current_user.is_first_login:
        raise HTTPException(status_code=400, detail="Password already reset")
        
    current_user.hashed_password = auth.get_password_hash(data.new_password)
    current_user.is_first_login = False
    db.commit()
    db.refresh(current_user)
    return current_user

# ── Forgot Password (token-based, no auth required) ───────────────────────────

@router.post("/forgot-password")
def forgot_password(email: str, db: Session = Depends(database.get_db)):
    """Generate a reset token and send it to the user's email."""
    user = db.query(models.User).filter(
        (models.User.email == email) | (models.User.personal_email == email)
    ).first()

    # Always return success to prevent user enumeration
    if not user:
        return {"message": "If this email exists, a reset link will be sent."}

    # Invalidate any existing unused tokens for this user
    db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.user_id == user.id,
        models.PasswordResetToken.used == False
    ).delete()

    # Create a new token (valid 30 minutes)
    token = secrets.token_urlsafe(32)
    expires_at = (datetime.now() + timedelta(minutes=30)).isoformat()
    reset_token = models.PasswordResetToken(
        user_id=user.id,
        token=token,
        expires_at=expires_at,
        used=False
    )
    db.add(reset_token)
    db.commit()

    # Build reset link and send email
    reset_link = f"http://localhost:5173/reset-password?token={token}"
    html = EmailService.get_password_reset_template(user.name, reset_link)
    
    recipients = list(set(filter(None, [user.email, user.personal_email])))
    for recipient in recipients:
        EmailService.send_email(recipient, "🔐 Password Reset Request", html)

    return {"message": "If this email exists, a reset link will be sent."}

@router.get("/verify-reset-token")
def verify_reset_token(token: str, db: Session = Depends(database.get_db)):
    """Validate a reset token (called by frontend to check before showing form)."""
    record = db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.token == token,
        models.PasswordResetToken.used == False
    ).first()
    if not record:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    if datetime.fromisoformat(record.expires_at) < datetime.now():
        raise HTTPException(status_code=400, detail="Reset token has expired")
    return {"valid": True}

@router.post("/reset-password-by-token")
def reset_password_by_token(
    token: str,
    data: schemas.PasswordResetConfirm,
    db: Session = Depends(database.get_db)
):
    """Reset password using the emailed token (no auth required)."""
    record = db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.token == token,
        models.PasswordResetToken.used == False
    ).first()
    if not record:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    if datetime.fromisoformat(record.expires_at) < datetime.now():
        raise HTTPException(status_code=400, detail="Reset token has expired")

    user = db.query(models.User).filter(models.User.id == record.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = auth.get_password_hash(data.new_password)
    user.is_first_login = False
    record.used = True
    db.commit()
    return {"message": "Password reset successfully. You can now log in."}
