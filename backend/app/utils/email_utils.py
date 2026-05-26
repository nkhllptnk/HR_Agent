# -*- coding: utf-8 -*-
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv

# Ensure we reload env vars
load_dotenv()

SMTP_SERVER = os.getenv("SMTP_SERVER")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SENDER_EMAIL = os.getenv("SENDER_EMAIL", SMTP_USER)

class EmailService:
    @staticmethod
    def send_email(to_email: str, subject: str, html_content: str):
        print(f"Attempting to send email to {to_email} via {SMTP_SERVER}...")
        
        if not SMTP_USER or not SMTP_PASSWORD:
            print("ERROR: SMTP credentials missing!")
            return False

        msg = MIMEMultipart()
        msg['From'] = SENDER_EMAIL
        msg['To'] = to_email
        msg['Subject'] = subject

        msg.attach(MIMEText(html_content, 'html'))

        try:
            # For Gmail on port 587, we use standard SMTP + starttls
            server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
            server.set_debuglevel(1) # Enable debug output for Celery logs
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
            server.quit()
            print(f"Email sent successfully to {to_email}")
            return True
        except Exception as e:
            print(f"CRITICAL: Failed to send email to {to_email}: {str(e)}")
            return False

    @staticmethod
    def get_t_minus_2_template(name, doj):
        return f"""
        <html>
            <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1f2937; line-height: 1.6;">
                <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background: #ffffff;">
                    <div style="background: #6366f1; padding: 2rem; text-align: center; color: white;">
                        <h1 style="margin: 0; font-size: 24px;">Welcome to the Team!</h1>
                    </div>
                    <div style="padding: 2rem;">
                        <p>Hi <strong>{name}</strong>,</p>
                        <p>We are absolutely thrilled to have you join us on <strong>{doj}</strong>!</p>
                        <p>Your onboarding journey is just 2 days away. Here's what you can expect:</p>
                        <ul>
                            <li><strong>Day 1:</strong> You'll receive your login credentials via email.</li>
                            <li><strong>Morning Session:</strong> Virtual induction and policy overview.</li>
                            <li><strong>Afternoon Session:</strong> Technical setup and team introduction.</li>
                        </ul>
                        <p>We can't wait to see you!</p>
                        <br>
                        <p>Best regards,<br><span style="color: #6366f1; font-weight: bold;">Accops HR Team</span></p>
                    </div>
                </div>
            </body>
        </html>
        """

    @staticmethod
    def get_day_0_template(name, email, password):
        return f"""
        <html>
            <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1f2937; line-height: 1.6;">
                <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background: #ffffff;">
                    <div style="background: #10b981; padding: 2rem; text-align: center; color: white;">
                        <h1 style="margin: 0; font-size: 24px;">It's Your First Day!</h1>
                    </div>
                    <div style="padding: 2rem;">
                        <p>Hi <strong>{name}</strong>,</p>
                        <p>Welcome to <strong>Accops</strong>! Today is the start of an amazing journey.</p>
                        <p>We've set up your onboarding account. Please use the following credentials to log in and begin your induction:</p>
                        
                        <div style="background: #f9fafb; padding: 1.5rem; border-radius: 8px; border: 1px solid #e5e7eb; margin: 1.5rem 0;">
                            <p style="margin: 0.5rem 0;"><strong>Portal URL:</strong> <a href="http://localhost:5173/login" style="color: #6366f1;">Onboarding Portal</a></p>
                            <p style="margin: 0.5rem 0;"><strong>Username:</strong> {email}</p>
                            <p style="margin: 0.5rem 0;"><strong>Temporary Password:</strong> <code style="background: #eee; padding: 2px 4px; border-radius: 4px;">{password}</code></p>
                        </div>
                        
                        <p style="color: #ef4444; font-size: 0.875rem;"><em>Note: You will be prompted to set a new password upon your first login for security.</em></p>
                        <p>Please complete your Induction Video and Assessment by the end of the day.</p>
                        <br>
                        <p>Best regards,<br><span style="color: #10b981; font-weight: bold;">Accops HR Team</span></p>
                    </div>
                </div>
            </body>
        </html>
        """

    @staticmethod
    def get_reminder_template(name, completed_count, total_count, remaining_modules):
        modules_html = "".join([
            f'<li style="padding: 6px 0; border-bottom: 1px solid #f3f4f6;">&#128216; {m}</li>'
            for m in remaining_modules
        ])
        pct = int((completed_count / total_count) * 100) if total_count > 0 else 0
        return f"""
        <html>
            <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1f2937; line-height: 1.6; background: #f9fafb; margin: 0; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background: #ffffff;">
                    <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 2rem; text-align: center; color: white;">
                        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">&#9200;</div>
                        <h1 style="margin: 0; font-size: 22px;">Onboarding Reminder</h1>
                        <p style="margin: 0.5rem 0 0; opacity: 0.9; font-size: 14px;">You have pending modules to complete</p>
                    </div>
                    <div style="padding: 2rem;">
                        <p>Hi <strong>{name}</strong>,</p>
                        <p>Your onboarding journey is still in progress. Completing it is <strong>mandatory</strong> for your joining formalities.</p>

                        <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 1rem 1.5rem; margin: 1.5rem 0;">
                            <p style="margin: 0 0 0.5rem; font-weight: 600; color: #92400e;">Your Progress</p>
                            <div style="background: #e5e7eb; border-radius: 20px; height: 10px; overflow: hidden;">
                                <div style="width: {pct}%; height: 100%; background: #f59e0b; border-radius: 20px;"></div>
                            </div>
                            <p style="margin: 0.5rem 0 0; font-size: 13px; color: #78350f;">{completed_count} of {total_count} modules completed ({pct}%)</p>
                        </div>

                        <p style="font-weight: 600; margin-bottom: 0.5rem;">&#128203; Remaining Modules:</p>
                        <ul style="list-style: none; padding: 0; margin: 0 0 1.5rem; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                            {modules_html}
                        </ul>

                        <div style="text-align: center; margin-top: 1.5rem;">
                            <a href="http://localhost:5173/onboarding"
                               style="background: #f59e0b; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                                Continue Onboarding ?
                            </a>
                        </div>

                        <p style="margin-top: 2rem; color: #6b7280; font-size: 13px;">
                            If you have any issues, contact your HR team at <a href="mailto:hr@accops.com" style="color: #f59e0b;">hr@accops.com</a>
                        </p>
                        <br>
                        <p>Best regards,<br><span style="color: #f59e0b; font-weight: bold;">Accops HR Team</span></p>
                    </div>
                </div>
            </body>
        </html>
        """

    @staticmethod
    def get_escalation_template(hr_name, employee_name, employee_email, days_inactive, completed_count, total_count, remaining_modules):
        modules_html = "".join([
            f'<li style="padding: 6px 0; border-bottom: 1px solid #f3f4f6; color: #374151;">&#9888; {m}</li>'
            for m in remaining_modules
        ])
        pct = int((completed_count / total_count) * 100) if total_count > 0 else 0
        return f"""
        <html>
            <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1f2937; line-height: 1.6; background: #f9fafb; margin: 0; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background: #ffffff;">
                    <div style="background: linear-gradient(135deg, #ef4444, #b91c1c); padding: 2rem; text-align: center; color: white;">
                        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">&#128680;</div>
                        <h1 style="margin: 0; font-size: 22px;">Onboarding Escalation Alert</h1>
                        <p style="margin: 0.5rem 0 0; opacity: 0.9; font-size: 14px;">Action Required ? Employee Inactive for {days_inactive} Days</p>
                    </div>
                    <div style="padding: 2rem;">
                        <p>Hi <strong>{hr_name}</strong>,</p>
                        <p>This is an automated escalation alert. The following employee has been <strong style="color: #ef4444;">inactive for {days_inactive} days</strong> and has not made any onboarding progress.</p>

                        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 1.25rem 1.5rem; margin: 1.5rem 0;">
                            <p style="margin: 0 0 0.25rem; font-weight: 700; font-size: 16px; color: #991b1b;">&#128100; {employee_name}</p>
                            <p style="margin: 0; color: #b91c1c; font-size: 14px;">{employee_email}</p>
                        </div>

                        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem 1.5rem; margin: 1rem 0;">
                            <p style="margin: 0 0 0.5rem; font-weight: 600; color: #374151;">Progress Status</p>
                            <div style="background: #e5e7eb; border-radius: 20px; height: 10px; overflow: hidden;">
                                <div style="width: {pct}%; height: 100%; background: #ef4444; border-radius: 20px;"></div>
                            </div>
                            <p style="margin: 0.5rem 0 0; font-size: 13px; color: #6b7280;">{completed_count} of {total_count} modules completed ({pct}%)</p>
                        </div>

                        <p style="font-weight: 600; margin-bottom: 0.5rem;">Pending Modules:</p>
                        <ul style="list-style: none; padding: 0; margin: 0 0 1.5rem; border: 1px solid #fecaca; border-radius: 8px; overflow: hidden; background: #fff5f5;">
                            {modules_html}
                        </ul>

                        <p>Please follow up with this employee to ensure they complete their mandatory onboarding.</p>

                        <div style="text-align: center; margin-top: 1.5rem;">
                            <a href="http://localhost:5173/hr-dashboard"
                               style="background: #ef4444; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                                View HR Dashboard ?
                            </a>
                        </div>

                        <br>
                        <p>Best regards,<br><span style="color: #ef4444; font-weight: bold;">Accops HR Onboarding System</span></p>
                    </div>
                </div>
            </body>
        </html>
        """

    @staticmethod
    def get_password_reset_template(name, reset_link):
        return f"""
        <html>
            <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1f2937; line-height: 1.6; background: #f9fafb; margin: 0; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background: #ffffff;">
                    <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 2rem; text-align: center; color: white;">
                        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">&#128272;</div>
                        <h1 style="margin: 0; font-size: 22px;">Password Reset Request</h1>
                        <p style="margin: 0.5rem 0 0; opacity: 0.9; font-size: 14px;">We received a request to reset your password</p>
                    </div>
                    <div style="padding: 2rem;">
                        <p>Hi <strong>{name}</strong>,</p>
                        <p>Click the button below to reset your password. This link is valid for <strong>30 minutes</strong>.</p>

                        <div style="text-align: center; margin: 2rem 0;">
                            <a href="{reset_link}"
                               style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
                                Reset My Password ?
                            </a>
                        </div>

                        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem 1.5rem; font-size: 13px; color: #6b7280;">
                            <strong>Security notice:</strong> If you did not request a password reset, please ignore this email. Your password will not be changed.
                        </div>

                        <p style="margin-top: 1.5rem; font-size: 13px; color: #9ca3af;">
                            Or copy and paste this link into your browser:<br>
                            <a href="{reset_link}" style="color: #6366f1; word-break: break-all;">{reset_link}</a>
                        </p>

                        <br>
                        <p>Best regards,<br><span style="color: #6366f1; font-weight: bold;">Accops HR Team</span></p>
                    </div>
                </div>
            </body>
        </html>
        """
