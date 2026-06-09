from sqlalchemy import Column, Integer, String, Boolean, Enum, DateTime
from datetime import datetime
import enum
from .database import Base

class RoleEnum(str, enum.Enum):
    intern = "intern"
    consultant = "consultant"
    full_time = "full_time"
    hr = "hr"
    admin = "admin"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True) # Company Email
    personal_email = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String)
    role = Column(Enum(RoleEnum), default=RoleEnum.full_time)
    department = Column(String, nullable=True)
    doj = Column(String, nullable=True) # Date of Joining (simplifying as String for now)
    is_first_login = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)

class EmailStatus(str, enum.Enum):
    sent = "sent"
    failed = "failed"
    pending = "pending"

class EmailLog(Base):
    __tablename__ = "email_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    email_type = Column(String) # e.g., "T-2", "Day 0", "Reminder"
    status = Column(Enum(EmailStatus), default=EmailStatus.pending)
    sent_at = Column(String, nullable=True)
    error_message = Column(String, nullable=True)
    retry_count = Column(Integer, default=0)

class OnboardingProgress(Base):
    __tablename__ = "onboarding_progress"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, unique=True, index=True)
    current_step = Column(Integer, default=1)
    last_activity_at = Column(String, nullable=True)
    completion_percentage = Column(Integer, default=0)
    is_escalated = Column(Boolean, default=False)

class ContentType(str, enum.Enum):
    video = "video"
    pdf = "pdf"
    ppt = "ppt"

class Content(Base):
    __tablename__ = "contents"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(String, nullable=True)
    content_type = Column(Enum(ContentType))
    file_url = Column(String, nullable=True)
    order = Column(Integer, default=0)
    is_intro = Column(Boolean, default=False)
    is_enabled = Column(Boolean, default=True)   

class MCQ(Base):
    __tablename__ = "mcqs"
    id = Column(Integer, primary_key=True, index=True)
    content_id = Column(Integer, index=True)
    question = Column(String)
    option_a = Column(String)
    option_b = Column(String)
    option_c = Column(String)
    option_d = Column(String)
    correct_answer = Column(String) # 'A', 'B', 'C', 'D'

class ModuleProgress(Base):
    __tablename__ = "module_progress"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    content_id = Column(Integer, index=True)
    completed = Column(Boolean, default=False)
    score = Column(Integer, default=0)          # correct answers count
    total_questions = Column(Integer, default=0)
    completed_at = Column(String, nullable=True)
    attempt_count = Column(Integer, default=0)   #count log
    started_at = Column(String, nullable=True)      
    time_spent_seconds = Column(Integer, default=0) 

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    token = Column(String, unique=True, index=True)
    expires_at = Column(String)   # ISO string
    used = Column(Boolean, default=False)
class SubmissionStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"

class EmployeeSubmission(Base):
    __tablename__ = "employee_submissions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    full_name = Column(String)
    address = Column(String)
    emergency_contact = Column(String)
    document_url = Column(String, nullable=True)
    status = Column(Enum(SubmissionStatus), default=SubmissionStatus.pending)
    hr_remark = Column(String, nullable=True)
    submitted_at = Column(String, nullable=True)

class ActivityLog(Base):
    __tablename__ = "activity_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    action = Column(String)
    details = Column(String, nullable=True)
    timestamp = Column(String, nullable=True)