from fastapi import APIRouter, Query
from typing import Optional, Dict, Any
import logging
from datetime import datetime, timedelta

router = APIRouter(prefix="/analytics", tags=["analytics"])
logger = logging.getLogger(__name__)

@router.get("/metrics")
async def get_metrics(
    time_range: str = Query("24h", description="Time range (1h, 24h, 7d, 30d)")
):
    """
    Get analytics metrics for the specified time range
    """
    try:
        from app.db.repositories import AgentRepository
        repo = AgentRepository()
        stats = await repo.get_stats(time_range=time_range)
        
        return {
            "total_events": stats.get("total", 0),
            "error_rate": stats.get("error_rate", 0),
            "avg_latency_ms": stats.get("avg_latency_ms", 0),
            "p95_latency_ms": stats.get("p95_latency_ms", 0),
            "p99_latency_ms": stats.get("p99_latency_ms", 0),
            "variant_distribution": stats.get("variant_distribution", {"A": 0, "B": 0}),
            "task_distribution": stats.get("task_distribution", {}),
            "time_series": [],
            "active_alerts": [],
            "optimization_history": []
        }
    except Exception as e:
        logger.error(f"Error getting metrics: {e}")
        # Return empty data instead of sample data
        return {
            "total_events": 0,
            "error_rate": 0,
            "avg_latency_ms": 0,
            "p95_latency_ms": 0,
            "p99_latency_ms": 0,
            "variant_distribution": {"A": 0, "B": 0},
            "task_distribution": {},
            "time_series": [],
            "active_alerts": [],
            "optimization_history": []
        }

@router.get("/events")
async def get_recent_events(limit: int = 10):
    """
    Get recent agent events
    """
    try:
        from app.db.repositories import AgentRepository
        repo = AgentRepository()
        events = await repo.get_recent(limit=limit)
        
        # Convert to JSON-serializable format
        result = []
        for event in events:
            # Safely get string values
            def get_str_value(obj):
                if obj is None:
                    return None
                if hasattr(obj, 'value'):
                    return obj.value
                return str(obj)
            
            result.append({
                "id": event.id,
                "timestamp": event.timestamp.isoformat(),
                "variant": get_str_value(event.variant),
                "status": get_str_value(event.status),
                "latency_ms": event.latency_ms,
                "task_type": get_str_value(event.task_type),
                "input_text": event.input_text[:100] + "..." if len(event.input_text) > 100 else event.input_text
            })
        return result
    except Exception as e:
        logger.error(f"Error fetching events: {e}")
        return []