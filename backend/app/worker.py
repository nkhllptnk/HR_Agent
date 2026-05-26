# -*- coding: utf-8 -*-
from celery import Celery
from celery.schedules import crontab
from datetime import datetime, timedelta
import os
from .database import SessionLocal
from .models import User, EmailLog, EmailStatus, OnboardingProgress, ModuleProgress, Content, RoleEnum
from .utils.email_utils import EmailService

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "onboarding_tasks",
    broker=REDIS_URL,
    backend=REDIS_URL
)

# Run every day at 9:00 AM IST (3:30 UTC)
celery_app.conf.beat_schedule = {
    'daily-onboarding-check': {
        'task': 'app.worker.daily_onboarding_check',
        'schedule': crontab(hour=3, minute=30),
    },
}
celery_app.conf.timezone = 'UTC'


def _get_module_info(db, user_id):
    """Helper: returns (completed_titles, remaining_titles, total_count, completed_count)."""
    all_content = db.query(Content).order_by(Content.order).all()
    completed_ids = {
        r.content_id
        for r in db.query(ModuleProgress).filter(
            ModuleProgress.user_id == user_id,
            ModuleProgress.completed == True
        ).all()
    }
    completed_titles = [c.title for c in all_content if c.id in completed_ids]
    remaining_titles = [c.title for c in all_content if c.id not in completed_ids]
    return completed_titles, remaining_titles, len(all_content), len(completed_ids)


# ─── Task: send a single email ────────────────────────────────────────────────
@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_onboarding_email(self, user_id: int, email_type: str, context: dict = None):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return f"User {user_id} not found"

        log = EmailLog(user_id=user_id, email_type=email_type, status=EmailStatus.pending)
        db.add(log)
        db.commit()

        subject = ""
        html = ""

        if email_type == "T-2":
            subject = "Welcome Aboard! 2 Days to Go 🎉"
            html = EmailService.get_t_minus_2_template(user.name, user.doj)

        elif email_type == "Day 0":
            subject = "Welcome to Accops! Your Login Details 🔑"
            password = (context or {}).get("password", "Password@123")
            html = EmailService.get_day_0_template(user.name, user.email, password)

        elif email_type == "Reminder":
            _, remaining, total, completed_count = _get_module_info(db, user_id)
            if not remaining:
                return "No pending modules – skipping reminder"
            subject = f"⏰ Reminder: You have {len(remaining)} onboarding module(s) to complete"
            html = EmailService.get_reminder_template(
                user.name, completed_count, total, remaining
            )

        elif email_type == "Escalation":
            # context should contain: hr_name, hr_email, days_inactive
            hr_name = (context or {}).get("hr_name", "HR Team")
            hr_email = (context or {}).get("hr_email")
            days_inactive = (context or {}).get("days_inactive", 3)
            _, remaining, total, completed_count = _get_module_info(db, user_id)
            subject = f"🚨 Escalation: {user.name} inactive for {days_inactive} days"
            html = EmailService.get_escalation_template(
                hr_name, user.name, user.email,
                days_inactive, completed_count, total, remaining
            )
            if hr_email:
                print(f"Sending escalation to HR: {hr_email}")
                EmailService.send_email(hr_email, subject, html)
                log.status = EmailStatus.sent
                log.sent_at = datetime.now().isoformat()
                db.commit()
                return f"Escalation sent to HR {hr_email} about {user.email}"

        if not html:
            return "Unknown email type"

        # Send to both company and personal email
        recipients = list(set(filter(None, [user.email, user.personal_email])))
        success = True
        for recipient in recipients:
            print(f"Sending [{email_type}] to {recipient}")
            if not EmailService.send_email(recipient, subject, html):
                success = False

        log.status = EmailStatus.sent if success else EmailStatus.failed
        log.sent_at = datetime.now().isoformat()
        if not success:
            log.error_message = "Failed to send to one or more recipients"
            log.retry_count = (log.retry_count or 0) + 1
            db.commit()
            if log.retry_count < 3:
                countdown = 60 * (2 ** (log.retry_count - 1))
                raise self.retry(exc=Exception("Email send failed, retrying..."), countdown=countdown)
        db.commit()
        return f"{'Sent' if success else 'Failed'} [{email_type}] to {user.email}"

    except Exception as e:
        if 'log' in locals():
            log.status = EmailStatus.failed
            log.error_message = str(e)
            log.retry_count = (log.retry_count or 0) + 1
            db.commit()
            countdown = 60 * (2 ** (log.retry_count - 1))
        else:
            countdown = 60
        try:
            raise self.retry(exc=e, countdown=countdown)
        except self.MaxRetriesExceededError:
            return f"Max retries exceeded for [{email_type}] to {user_id}"
    finally:
        db.close()


# ─── Task: daily check ───────────────────────────────────────────────────────
@celery_app.task
def daily_onboarding_check():
    db = SessionLocal()
    try:
        today = datetime.now().date()
        t_minus_2_date = today + timedelta(days=2)

        # 1. T-2 emails ── employees joining in 2 days
        t2_users = db.query(User).filter(
            User.doj == str(t_minus_2_date),
            User.role.in_([RoleEnum.full_time, RoleEnum.intern, RoleEnum.consultant])
        ).all()
        for user in t2_users:
            already = db.query(EmailLog).filter(
                EmailLog.user_id == user.id,
                EmailLog.email_type == "T-2",
                EmailLog.status == EmailStatus.sent
            ).first()
            if not already:
                send_onboarding_email.delay(user.id, "T-2")

        # 2. Day-0 emails ── employees joining today
        day0_users = db.query(User).filter(
            User.doj == str(today),
            User.role.in_([RoleEnum.full_time, RoleEnum.intern, RoleEnum.consultant])
        ).all()
        for user in day0_users:
            already = db.query(EmailLog).filter(
                EmailLog.user_id == user.id,
                EmailLog.email_type == "Day 0",
                EmailLog.status == EmailStatus.sent
            ).first()
            if not already:
                send_onboarding_email.delay(user.id, "Day 0", {"password": "Password@123"})

        # 3. Daily Reminder + Escalation for incomplete employees
        all_content_count = db.query(Content).count()
        if all_content_count == 0:
            print("No content modules yet — skipping reminder/escalation checks")
            db.close()
            return

        # Get all HR users to notify on escalation
        hr_users = db.query(User).filter(
            User.role.in_([RoleEnum.hr, RoleEnum.admin])
        ).all()

        # Find employees (non-HR) who have joined but not completed
        employee_users = db.query(User).filter(
            User.role.in_([RoleEnum.full_time, RoleEnum.intern, RoleEnum.consultant]),
            User.is_active == True
        ).all()

        for emp in employee_users:
            completed_count = db.query(ModuleProgress).filter(
                ModuleProgress.user_id == emp.id,
                ModuleProgress.completed == True
            ).count()

            # Skip if fully done
            if completed_count >= all_content_count:
                continue

            # Find last activity time
            onboarding = db.query(OnboardingProgress).filter(
                OnboardingProgress.user_id == emp.id
            ).first()

            if not onboarding or not onboarding.last_activity_at:
                # Never logged any activity — use DOJ as reference
                if not emp.doj:
                    continue
                try:
                    last_activity = datetime.fromisoformat(emp.doj)
                except:
                    continue
            else:
                last_activity = datetime.fromisoformat(onboarding.last_activity_at)

            days_inactive = (datetime.now() - last_activity).days
            hours_inactive = (datetime.now() - last_activity).total_seconds() / 3600

            print(f"[Check] {emp.email}: {completed_count}/{all_content_count} done, {days_inactive}d inactive")

            # ── Escalation: inactive ≥ 3 days ──────────────────────────────
            if days_inactive >= 3:
                # Only escalate once per day (check last escalation sent today)
                today_escalation = db.query(EmailLog).filter(
                    EmailLog.user_id == emp.id,
                    EmailLog.email_type == "Escalation",
                    EmailLog.status == EmailStatus.sent,
                    EmailLog.sent_at >= str(today)
                ).first()

                if not today_escalation:
                    print(f"ESCALATION: {emp.email} inactive {days_inactive}d → notifying HR")
                    if onboarding and not onboarding.is_escalated:
                        onboarding.is_escalated = True
                        db.commit()

                    for hr in hr_users:
                        hr_email = hr.personal_email or hr.email
                        send_onboarding_email.delay(
                            emp.id, "Escalation",
                            {
                                "hr_name": hr.name,
                                "hr_email": hr_email,
                                "days_inactive": days_inactive,
                            }
                        )

            # ── Daily Reminder: joined but hasn't finished ──────────────────
            # Send daily reminder (once per day, after at least 24h since last activity)
            elif hours_inactive >= 24:
                today_reminder = db.query(EmailLog).filter(
                    EmailLog.user_id == emp.id,
                    EmailLog.email_type == "Reminder",
                    EmailLog.status == EmailStatus.sent,
                    EmailLog.sent_at >= str(today)
                ).first()

                if not today_reminder:
                    print(f"REMINDER: sending to {emp.email}")
                    send_onboarding_email.delay(emp.id, "Reminder")

        db.commit()
        print("daily_onboarding_check complete")
    finally:
        db.close()
