from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
import logging

from app.api.v1 import agent, analytics, optimizer, websocket
from app.db.database import db_manager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up...")
    await db_manager.initialize()
    
    yield
    
    # Shutdown
    logger.info("Shutting down...")
    await db_manager.close()

# Create FastAPI app
app = FastAPI(
    title="Agent Optimization Platform",
    description="Production-grade A/B testing and optimization for AI agents",
    version="1.0.0",
    lifespan=lifespan
)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Include routers
app.include_router(agent.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(optimizer.router, prefix="/api/v1")
app.include_router(websocket.router, prefix="/ws")

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}

@app.get("/")
async def root():
    return {
        "message": "Agent Optimization Platform API",
        "docs": "/docs",
        "version": "1.0.0"
    }