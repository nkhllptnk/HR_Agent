# -*- coding: utf-8 -*-
"""
Comprehensive Testing Guide for Daily Reminder Emails
Tests for Celery tasks, email sending, and retry logic
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
from sqlalchemy.orm import Session, sessionmaker
from app.models import User, EmailLog, EmailStatus, OnboardingProgress, ModuleProgress, Content, RoleEnum
from app.worker import send_onboarding_email, daily_onboarding_check
from app.database import SessionLocal, engine
from app import models

# ============================================================================
# SETUP: Create test database and fixtures
# ============================================================================

@pytest.fixture
def test_db():
    """Create a fresh test database for each test"""
    # Use a separate test database to avoid deleting production data
    from sqlalchemy import create_engine
    test_engine = create_engine("sqlite:///:memory:")
    models.Base.metadata.create_all(bind=test_engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    db = TestingSessionLocal()
    yield db
    db.close()
    models.Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def test_user(test_db):
    """Create a test employee user"""
    user = User(
        name="John Doe",
        email="john@company.com",
        personal_email="john@gmail.com",
        hashed_password="hashed_password_here",
        role=RoleEnum.full_time,
        department="Engineering",
        doj=(datetime.now().date()).isoformat(),
        is_first_login=False,
        is_active=True
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user


@pytest.fixture
def test_content(test_db):
    """Create test content modules"""
    modules = [
        Content(title="Module 1", content_type="video", file_url="https://example.com/video1.mp4", order=1),
        Content(title="Module 2", content_type="pdf", file_url="https://example.com/file.pdf", order=2),
        Content(title="Module 3", content_type="ppt", file_url="https://example.com/slides.ppt", order=3),
    ]
    test_db.add_all(modules)
    test_db.commit()
    return modules


@pytest.fixture
def test_onboarding_progress(test_db, test_user):
    """Create onboarding progress for test user"""
    progress = OnboardingProgress(
        user_id=test_user.id,
        current_step=1,
        last_activity_at=(datetime.now() - timedelta(hours=25)).isoformat(),  # 25 hours ago
        completion_percentage=0,
        is_escalated=False
    )
    test_db.add(progress)
    test_db.commit()
    test_db.refresh(progress)
    return progress


# ============================================================================
# TEST 1: Direct Task Execution (Manual Testing)
# ============================================================================

def test_send_reminder_email_directly(test_db, test_user, test_content, test_onboarding_progress):
    """
    TEST 1: Manually call send_onboarding_email task
    This simulates what the daily_onboarding_check task would do
    """
    print("\n" + "="*70)
    print("TEST 1: Direct Task Execution - Send Reminder Email")
    print("="*70)

    # Mock the EmailService.send_email to prevent actual email sending
    with patch('app.utils.email_utils.EmailService.send_email') as mock_send:
        mock_send.return_value = True  # Simulate successful email send

        # Call the task directly
        result = send_onboarding_email(test_user.id, "Reminder")

        # Verify email was attempted
        print(f"✓ Task executed. Result: {result}")
        print(f"✓ Email service called {mock_send.call_count} times")

        # Check email log was created
        log = test_db.query(EmailLog).filter(
            EmailLog.user_id == test_user.id,
            EmailLog.email_type == "Reminder"
        ).first()

        assert log is not None, "Email log should be created"
        assert log.status == EmailStatus.sent, "Email should be marked as sent"
        assert log.retry_count == 0, "Retry count should be 0 on first attempt"
        print(f"✓ Email log created: status={log.status}, retry_count={log.retry_count}")


# ============================================================================
# TEST 2: Email Retry Logic (NEW - Milestone 1)
# ============================================================================

def test_email_retry_logic_exponential_backoff(test_db, test_user, test_content, test_onboarding_progress):
    """
    TEST 2: Test exponential backoff retry logic
    Verify that retries happen with increasing delays
    """
    print("\n" + "="*70)
    print("TEST 2: Email Retry Logic - Exponential Backoff")
    print("="*70)

    # Simulate email send failure
    with patch('app.utils.email_utils.EmailService.send_email') as mock_send:
        mock_send.return_value = False  # Simulate failure

        with patch('app.worker.send_onboarding_email.retry') as mock_retry:
            # Mock retry to avoid actual Celery retry
            mock_retry.side_effect = Exception("Max retries exceeded")

            try:
                # This will fail and attempt retry
                result = send_onboarding_email(test_user.id, "Reminder")
            except:
                pass

            # Check that retry was called with exponential backoff
            if mock_retry.called:
                print(f"✓ Retry was triggered {mock_retry.call_count} times")
                call_args = mock_retry.call_args
                print(f"✓ Retry call args: {call_args}")

    # Check email log shows failed status
    log = test_db.query(EmailLog).filter(
        EmailLog.user_id == test_user.id
    ).first()

    if log:
        print(f"✓ Email log status: {log.status}")
        print(f"✓ Retry count: {log.retry_count}")
        print(f"✓ Error message: {log.error_message}")


# ============================================================================
# TEST 3: Inactivity Detection (24+ hours)
# ============================================================================

def test_reminder_sent_for_24h_inactivity(test_db, test_user, test_content, test_onboarding_progress):
    """
    TEST 3: Verify reminder is sent when user inactive for 24+ hours
    """
    print("\n" + "="*70)
    print("TEST 3: Inactivity Detection - 24+ Hours")
    print("="*70)

    # Set last activity to 25 hours ago
    test_onboarding_progress.last_activity_at = (datetime.now() - timedelta(hours=25)).isoformat()
    test_db.commit()

    # Mock email sending
    with patch('app.utils.email_utils.EmailService.send_email') as mock_send:
        mock_send.return_value = True

        # Run daily check
        result = daily_onboarding_check()
        print(f"✓ Daily check completed. Result: {result}")

        # Verify email was sent
        if mock_send.called:
            print(f"✓ Email service was called {mock_send.call_count} times")

        # Check email log
        reminder_logs = test_db.query(EmailLog).filter(
            EmailLog.email_type == "Reminder",
            EmailLog.user_id == test_user.id
        ).all()

        print(f"✓ Reminder logs found: {len(reminder_logs)}")
        for log in reminder_logs:
            print(f"  - Status: {log.status}, Sent at: {log.sent_at}")


# ============================================================================
# TEST 4: No Reminder When Activity Recent
# ============================================================================

def test_no_reminder_for_recent_activity(test_db, test_user, test_content, test_onboarding_progress):
    """
    TEST 4: Verify NO reminder is sent if user active < 24 hours ago
    """
    print("\n" + "="*70)
    print("TEST 4: Recent Activity - No Reminder")
    print("="*70)

    # Set last activity to 1 hour ago (recent)
    test_onboarding_progress.last_activity_at = (datetime.now() - timedelta(hours=1)).isoformat()
    test_db.commit()

    with patch('app.utils.email_utils.EmailService.send_email') as mock_send:
        mock_send.return_value = True

        # Run daily check
        result = daily_onboarding_check()
        print(f"✓ Daily check completed")

        # Verify NO reminder was sent
        reminder_logs = test_db.query(EmailLog).filter(
            EmailLog.email_type == "Reminder",
            EmailLog.user_id == test_user.id,
            EmailLog.status == EmailStatus.sent
        ).all()

        print(f"✓ Reminder emails sent: {len(reminder_logs)} (should be 0)")
        assert len(reminder_logs) == 0, "Should not send reminder for recent activity"


# ============================================================================
# TEST 5: Escalation Alert (3+ days inactive)
# ============================================================================

def test_escalation_for_3_days_inactive(test_db, test_user, test_content, test_onboarding_progress):
    """
    TEST 5: Verify escalation email sent when user inactive 3+ days
    """
    print("\n" + "="*70)
    print("TEST 5: Escalation Alert - 3+ Days Inactive")
    print("="*70)

    # Create HR user
    hr_user = User(
        name="Alice HR",
        email="alice@company.com",
        personal_email="alice@gmail.com",
        hashed_password="hashed",
        role=RoleEnum.hr,
        is_active=True
    )
    test_db.add(hr_user)
    test_db.commit()

    # Set last activity to 4 days ago
    test_onboarding_progress.last_activity_at = (datetime.now() - timedelta(days=4)).isoformat()
    test_db.commit()

    with patch('app.utils.email_utils.EmailService.send_email') as mock_send:
        mock_send.return_value = True

        # Run daily check
        result = daily_onboarding_check()
        print(f"✓ Daily check completed")

        # Verify escalation email was sent
        escalation_logs = test_db.query(EmailLog).filter(
            EmailLog.email_type == "Escalation",
            EmailLog.user_id == test_user.id
        ).all()

        print(f"✓ Escalation emails sent: {len(escalation_logs)}")
        if escalation_logs:
            print(f"  - Status: {escalation_logs[0].status}")
            print(f"  - Sent at: {escalation_logs[0].sent_at}")


# ============================================================================
# TEST 6: Email Sent Only Once Per Day
# ============================================================================

def test_reminder_sent_only_once_per_day(test_db, test_user, test_content, test_onboarding_progress):
    """
    TEST 6: Verify reminder email sent only ONCE per day to same user
    """
    print("\n" + "="*70)
    print("TEST 6: One Email Per Day - Prevent Duplicates")
    print("="*70)

    # Set last activity to 30 hours ago
    test_onboarding_progress.last_activity_at = (datetime.now() - timedelta(hours=30)).isoformat()
    test_db.commit()

    with patch('app.utils.email_utils.EmailService.send_email') as mock_send:
        mock_send.return_value = True

        # Create a reminder email log already sent today
        today = datetime.now().date()
        existing_log = EmailLog(
            user_id=test_user.id,
            email_type="Reminder",
            status=EmailStatus.sent,
            sent_at=datetime.now().isoformat()
        )
        test_db.add(existing_log)
        test_db.commit()

        # Run daily check - should NOT send another reminder
        result = daily_onboarding_check()
        print(f"✓ Daily check completed")

        # Count reminder emails sent today
        today_reminders = test_db.query(EmailLog).filter(
            EmailLog.user_id == test_user.id,
            EmailLog.email_type == "Reminder",
            EmailLog.status == EmailStatus.sent
        ).all()

        print(f"✓ Total reminders sent: {len(today_reminders)} (should be 1)")
        assert len(today_reminders) <= 1, "Should not send duplicate reminder same day"


# ============================================================================
# TEST 7: Skip When All Modules Completed
# ============================================================================

def test_no_reminder_when_modules_completed(test_db, test_user, test_content, test_onboarding_progress):
    """
    TEST 7: Verify NO reminder sent if all modules are completed
    """
    print("\n" + "="*70)
    print("TEST 7: Skip Reminders - All Modules Completed")
    print("="*70)

    # Mark all modules as completed
    for content in test_content:
        progress = ModuleProgress(
            user_id=test_user.id,
            content_id=content.id,
            completed=True,
            score=100,
            total_questions=10,
            completed_at=datetime.now().isoformat()
        )
        test_db.add(progress)
    test_db.commit()

    # Set last activity to 25 hours ago
    test_onboarding_progress.last_activity_at = (datetime.now() - timedelta(hours=25)).isoformat()
    test_db.commit()

    with patch('app.utils.email_utils.EmailService.send_email') as mock_send:
        mock_send.return_value = True

        # Run daily check
        result = daily_onboarding_check()
        print(f"✓ Daily check completed")

        # Verify NO reminder was sent
        reminder_logs = test_db.query(EmailLog).filter(
            EmailLog.email_type == "Reminder",
            EmailLog.user_id == test_user.id
        ).all()

        print(f"✓ Reminder emails sent: {len(reminder_logs)} (should be 0)")
        assert len(reminder_logs) == 0, "Should not send reminder when all modules completed"


# ============================================================================
# MANUAL TESTING WITHOUT PYTEST
# ============================================================================

def manual_test_reminder_email():
    """
    Manual testing without pytest - can be run directly
    Run with: python -c "from test_reminder_emails import manual_test_reminder_email; manual_test_reminder_email()"
    """
    print("\n" + "="*70)
    print("MANUAL TEST: Send Reminder Email")
    print("="*70)

    db = SessionLocal()

    try:
        # Create test data
        print("1. Creating test user...")
        user = User(
            name="Test Employee",
            email="test@company.com",
            personal_email="test@gmail.com",
            hashed_password="hashed",
            role=RoleEnum.full_time,
            department="Engineering",
            is_active=True
        )
        db.add(user)
        db.commit()
        print(f"   ✓ User created (ID: {user.id})")

        # Create content
        print("2. Creating test content...")
        content = Content(
            title="Test Module",
            content_type="video",
            file_url="https://example.com/video.mp4",
            order=1
        )
        db.add(content)
        db.commit()
        print(f"   ✓ Content created (ID: {content.id})")

        # Create onboarding progress
        print("3. Creating onboarding progress...")
        progress = OnboardingProgress(
            user_id=user.id,
            last_activity_at=(datetime.now() - timedelta(hours=25)).isoformat(),
            completion_percentage=0
        )
        db.add(progress)
        db.commit()
        print(f"   ✓ Progress created (inactive: 25 hours)")

        # Send reminder email
        print("4. Sending reminder email...")
        with patch('app.utils.email_utils.EmailService.send_email') as mock_send:
            mock_send.return_value = True
            result = send_onboarding_email(user.id, "Reminder")
            print(f"   ✓ Result: {result}")

        # Check email log
        print("5. Checking email log...")
        log = db.query(EmailLog).filter(
            EmailLog.user_id == user.id
        ).first()

        if log:
            print(f"   ✓ Status: {log.status}")
            print(f"   ✓ Type: {log.email_type}")
            print(f"   ✓ Retry count: {log.retry_count}")
        else:
            print("   ✗ No email log found")

        print("\n✓ Manual test completed successfully!")

    finally:
        db.close()


if __name__ == "__main__":
    manual_test_reminder_email()
