from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from dataclasses import dataclass
import httpx
from .. import models, auth
from ..database import get_db
from .logs_router import log_action

router = APIRouter(prefix="/api/chat", tags=["AI Chatbot"])

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "llama3"

SYSTEM_PROMPT = """You are an HR onboarding assistant for Accops Systems Pvt. Ltd.
You help new employees understand company policies, onboarding steps, and answer HR-related questions.
Keep responses concise, friendly and professional.
If you don't know something specific about the company, say so honestly and suggest contacting HR.
Do not answer questions unrelated to work, HR, or company policies."""

class ChatRequest(BaseModel):
    message: str

@router.post("/")
async def chat(
    data: ChatRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Employee sends a message to the AI chatbot."""
    if not data.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    prompt = f"{SYSTEM_PROMPT}\n\nEmployee question: {data.message}"

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(OLLAMA_URL, json={
                "model": MODEL_NAME,
                "prompt": prompt,
                "stream": False
            })
            result = response.json()
            answer = result.get("response", "Sorry, I couldn't process your request.")
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"AI service unavailable: {str(e)}")

    log_action(db, current_user.id, "CHAT", f"Q: {data.message[:100]}")

    return {
        "message": data.message,
        "response": answer,
        "model": MODEL_NAME
    }

@router.get("/history")
def get_chat_history(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Get employee's chat history from activity logs."""
    logs = db.query(models.ActivityLog).filter(
        models.ActivityLog.user_id == current_user.id,
        models.ActivityLog.action == "CHAT"
    ).order_by(models.ActivityLog.id.desc()).limit(50).all()
    return logs