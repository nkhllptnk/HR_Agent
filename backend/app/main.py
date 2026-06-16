from fastapi import FastAPI  
from fastapi.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles 
from . import models, database
from .routers import auth_router, employee_router, content_router, data_router, logs_router, chat_router
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="HR Onboarding Portal", version="1.0.0")

# Mount static files for uploads
app.mount("/static", StaticFiles(directory="static"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Update for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(employee_router.router)
app.include_router(content_router.router)
app.include_router(data_router.router)
app.include_router(logs_router.router)
app.include_router(chat_router.router)

@app.get("/")
def root():
    return {"message": "Employee Portal Backend Running"}
