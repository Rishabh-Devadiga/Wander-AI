import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.database.connection import engine, Base
from backend.database.config import settings
from backend.api.routes import router as api_router
from database.seed_data.seed import run_seed

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("tourflow_backend")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure DB tables exist and seed initial data if empty
    logger.info("Initializing TourFlow AI Database Tables...")
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialized successfully.")
        # Auto seed if database is brand new
        run_seed()
    except Exception as e:
        logger.warning(f"Database initialization note: {e}")
    yield
    # Shutdown
    logger.info("TourFlow AI Backend shutting down.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="TourFlow AI - AI-Powered Personalized & Dynamic Travel Planning Platform API",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for Frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routes
app.include_router(api_router, prefix="/api")

@app.get("/")
def root():
    return {
        "app": "TourFlow AI",
        "description": "AI-Powered Personalized & Dynamic Travel Planning Platform",
        "docs": "/docs",
        "api": "/api/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
