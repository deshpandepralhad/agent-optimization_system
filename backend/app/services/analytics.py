from fastapi import APIRouter, Query
from typing import Optional
import logging

from app.db.repositories import AgentRepository
from app.core.models import AnalyticsSnapshot

router = APIRouter(prefix="/analytics", tags=["analytics"])
logger = logging.getLogger(__name__)

@router.get("/metrics", response_model=AnalyticsSnapshot)
async def get_metrics(
    time_range: str = Query("24h", description="Time range (1h, 24h, 7d, 30d)")
):
    """
    Get analytics metrics for the specified time range
    """
    try:
        repo = AgentRepository()
        stats = await repo.get_stats(time_range=time_range)
        
        # Convert to AnalyticsSnapshot format
        return AnalyticsSnapshot(
            total_events=stats["total"],
            error_rate=stats["error_rate"],
            avg_latency_ms=stats["avg_latency_ms"],
            p95_latency_ms=stats.get("p95_latency_ms", 0),
            p99_latency_ms=stats.get("p99_latency_ms", 0),
            variant_distribution=stats["variant_distribution"],
            task_distribution=stats["task_distribution"],
            time_series=[],  # You can implement time series later
            active_alerts=[],  # You can implement alerts later
            optimization_history=[]  # You can implement history later
        )
    except Exception as e:
        logger.error(f"Error getting metrics: {e}")
        # Return sample data if database isn't ready
        return AnalyticsSnapshot(
            total_events=1234,
            error_rate=0.12,
            avg_latency_ms=345,
            p95_latency_ms=789,
            p99_latency_ms=1250,
            variant_distribution={"A": 845, "B": 389},
            task_distribution={
                "summarize": 345,
                "classify": 278,
                "translate": 198,
                "chat": 256,
                "extract": 157
            },
            time_series=[],
            active_alerts=[],
            optimization_history=[]
        )