# HR Onboarding Portal

A web-based employee onboarding system built for **Accops Systems Pvt. Ltd.** to automate and streamline the onboarding process for new employees.

---

## 🚀 Features

### Employee Side
- Secure login with forced password reset on first login
- Keka document acknowledgement as step 1
- Sequential onboarding flow — cannot skip modules
- Video/PDF/PPT content viewing with completion enforcement
- MCQ quiz after each module (2 attempt limit)
- Score screen with attempt-based deduction (100% for 1 attempt, 75% for 2)
- Resume from last completed step on browser refresh
- Completion report with module breakdown and performance rating

### HR Side
- HR Dashboard with live onboarding stats
- Add/remove employees with automated email triggers (T-2 and Day 0)
- Manage Content — upload videos, PDFs, PPTs and create MCQs
- Locked Introduction module (always first)
- Reorder policy modules with up/down arrows
- Enable/Disable modules (disabled modules hidden from employees)
- Employee controls — move to next/previous module, reset specific module, reset all
- Detailed employee report with scores and ratings
- Preview Employee Portal as demo user
- Activity Logs — track all user actions with timestamps

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Backend | FastAPI (Python) |
| Database | PostgreSQL |
| Auth | JWT (python-jose) |
| Email | Celery + Redis + SMTP |
| Migrations | Alembic |

---
## 📋 Onboarding Flow
Login → Password Reset (first login)
→ Acknowledgement (confirm Keka docs uploaded)
→ Introduction Module (locked, always first)
→ Policy Modules (HR configurable order)
→ Quiz after each (2 attempts max)
→ Score screen (pass/fail with attempt deduction)
→ Completion Report

---

## 📌 Pending / Future Scope

- [ ] AI Chatbot (Ollama — local LLM on VM)
- [ ] VM Deployment on company network
- [ ] Mobile app
- [ ] HRMS integration (Keka)
- [ ] Advanced analytics dashboard

---

## 👨‍💻 Contributors

**Harshal Ingale** & **Nikhil Patnaik**

---

*Built during internship at Accops Systems Pvt. Ltd.*
