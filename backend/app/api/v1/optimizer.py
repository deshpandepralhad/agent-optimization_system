from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
import logging
from datetime import datetime, timedelta

from app.db.repositories import OptimizationRepository, AgentRepository
from app.core.models import OptimizationDecision, VariantType
from app.core.optimizer import OptimizationEngine

router = APIRouter(prefix="/optimizer", tags=["optimizer"])
logger = logging.getLogger(__name__)

# In-memory config for now (replace with database later)
CONFIG = {
    "active_variant": "A",
    "min_samples": 30,
    "latency_threshold_ms": 1000,
    "error_threshold": 0.25,
    "exploration_rate": 0.10,
    "last_updated": datetime.utcnow().isoformat()
}

@router.get("/history")
async def get_optimization_history(limit: int = Query(20, ge=1, le=100)):
    """Get optimization decision history"""
    try:
        repo = OptimizationRepository()
        history = await repo.get_history(limit=limit)
        
        result = []
        for decision in history:
            result.append({
                "previous_variant": decision.previous_variant.value if hasattr(decision.previous_variant, 'value') else str(decision.previous_variant),
                "new_variant": decision.new_variant.value if hasattr(decision.new_variant, 'value') else str(decision.new_variant),
                "reason": decision.reason,
                "confidence": decision.confidence,
                "metrics": decision.metrics,
                "timestamp": decision.timestamp.isoformat()
            })
        return result
    except Exception as e:
        logger.error(f"Error fetching optimization history: {e}")
        return []

@router.get("/config")
async def get_optimizer_config():
    """Get current optimizer configuration"""
    return CONFIG

@router.put("/config")
async def update_optimizer_config(config: dict):
    """Update optimizer configuration"""
    try:
        # Validate inputs
        if "latency_threshold_ms" in config:
            CONFIG["latency_threshold_ms"] = max(100, min(5000, config["latency_threshold_ms"]))
        
        if "error_threshold" in config:
            CONFIG["error_threshold"] = max(0.01, min(0.5, config["error_threshold"]))
        
        if "min_samples" in config:
            CONFIG["min_samples"] = max(10, min(1000, config["min_samples"]))
        
        if "exploration_rate" in config:
            CONFIG["exploration_rate"] = max(0.01, min(0.5, config["exploration_rate"]))
        
        if "active_variant" in config and config["active_variant"] in ["A", "B"]:
            CONFIG["active_variant"] = config["active_variant"]
        
        CONFIG["last_updated"] = datetime.utcnow().isoformat()
        
        return CONFIG
    except Exception as e:
        logger.error(f"Error updating config: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/trigger")
async def trigger_optimization():
    """Manually trigger optimization"""
    try:
        agent_repo = AgentRepository()
        opt_repo = OptimizationRepository()
        
        # Get current stats
        stats = await agent_repo.get_stats(time_range="24h")
        
        # Simple optimization logic
        reasons = []
        new_variant = CONFIG["active_variant"]
        
        if stats["total"] < CONFIG["min_samples"]:
            reasons.append(f"Insufficient data: {stats['total']} < {CONFIG['min_samples']}")
        else:
            if stats["avg_latency_ms"] > CONFIG["latency_threshold_ms"]:
                new_variant = "B"
                reasons.append(f"High latency detected: {stats['avg_latency_ms']:.0f}ms")
            
            if stats["error_rate"] > CONFIG["error_threshold"]:
                new_variant = "A"
                reasons.append(f"High error rate: {stats['error_rate']*100:.1f}%")
            
            if not reasons:
                reasons.append("Performance within thresholds")
        
        # Create decision
        decision = OptimizationDecision(
            previous_variant=VariantType(CONFIG["active_variant"]),
            new_variant=VariantType(new_variant),
            reason=reasons,
            confidence=0.85 if new_variant != CONFIG["active_variant"] else 0.95,
            metrics={
                "avg_latency_ms": stats["avg_latency_ms"],
                "error_rate": stats["error_rate"]
            },
            timestamp=datetime.utcnow()
        )
        
        # Save decision
        await opt_repo.create(decision)
        
        # Update active variant
        CONFIG["active_variant"] = new_variant
        CONFIG["last_updated"] = datetime.utcnow().isoformat()
        
        return {
            "previous_variant": decision.previous_variant.value,
            "new_variant": decision.new_variant.value,
            "reason": decision.reason,
            "confidence": decision.confidence,
            "metrics": decision.metrics,
            "timestamp": decision.timestamp.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error triggering optimization: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/compare")
async def compare_variants(time_range: str = Query("24h")):
    """Compare performance of variants A and B"""
    try:
        agent_repo = AgentRepository()
        
        # Get stats for both variants
        stats_a = await agent_repo.get_stats(time_range=time_range, variant=VariantType.A)
        stats_b = await agent_repo.get_stats(time_range=time_range, variant=VariantType.B)
        
        return {
            "A": {
                "latency": stats_a.get("avg_latency_ms", 0),
                "error_rate": stats_a.get("error_rate", 0),
                "count": stats_a.get("total", 0)
            },
            "B": {
                "latency": stats_b.get("avg_latency_ms", 0),
                "error_rate": stats_b.get("error_rate", 0),
                "count": stats_b.get("total", 0)
            },
            "significance": {
                "latency": 0.85,  # You can add real statistical testing later
                "error_rate": 0.82
            }
        }
    except Exception as e:
        logger.error(f"Error comparing variants: {e}")
        return {
            "A": {"latency": 0, "error_rate": 0, "count": 0},
            "B": {"latency": 0, "error_rate": 0, "count": 0},
            "significance": {"latency": 0, "error_rate": 0}
        }