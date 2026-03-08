from fastapi import APIRouter, HTTPException, Query
import logging
import math  # Add this
from datetime import datetime

from app.db.repositories import AgentRepository, OptimizationRepository
from app.core.optimizer import UCBOptimizer
from app.core.models import VariantType  # Add this line!

router = APIRouter(prefix="/optimizer", tags=["optimizer"])
logger = logging.getLogger(__name__)

@router.post("/trigger")
async def trigger_optimization():
    """Trigger UCB-based optimization"""
    try:
        agent_repo = AgentRepository()
        opt_repo = OptimizationRepository()
        
        optimizer = UCBOptimizer(agent_repo, opt_repo)
        decision = await optimizer.analyze_and_optimize()
        
        if not decision:
            return {
                "message": "Insufficient data for optimization",
                "status": "skipped"
            }
        
        return {
            "previous_variant": decision.previous_variant.value,
            "new_variant": decision.new_variant.value,
            "reason": decision.reason,
            "confidence": decision.confidence,
            "metrics": decision.metrics,
            "timestamp": decision.timestamp.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Optimization failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history")
async def get_optimization_history(limit: int = 20):
    """Get optimization decision history"""
    try:
        repo = OptimizationRepository()
        history = await repo.get_history(limit=limit)
        
        result = []
        for d in history:
            result.append({
                "previous_variant": d.previous_variant.value,
                "new_variant": d.new_variant.value,
                "reason": d.reason,
                "confidence": d.confidence,
                "metrics": d.metrics,
                "timestamp": d.timestamp.isoformat()
            })
        return result
    except Exception as e:
        logger.error(f"Error fetching history: {e}")
        return []

@router.get("/scores")
async def get_ucb_scores():
    """Get current UCB scores for both variants"""
    try:
        agent_repo = AgentRepository()
        stats_a = await agent_repo.get_stats(variant=VariantType.A)
        stats_b = await agent_repo.get_stats(variant=VariantType.B)
        
        trials_a = stats_a.get('total', 0)
        trials_b = stats_b.get('total', 0)
        total = trials_a + trials_b
        
        success_a = 1 - stats_a.get('error_rate', 0)
        success_b = 1 - stats_b.get('error_rate', 0)
        
        # Calculate UCB scores
        if trials_a > 0:
            explore_a = math.sqrt((2 * math.log(total + 1)) / trials_a)
            score_a = success_a + explore_a
        else:
            score_a = float('inf')
            explore_a = 1.0
            
        if trials_b > 0:
            explore_b = math.sqrt((2 * math.log(total + 1)) / trials_b)
            score_b = success_b + explore_b
        else:
            score_b = float('inf')
            explore_b = 1.0
        
        return {
            "variant_a": {
                "trials": trials_a,
                "success_rate": round(success_a, 3),
                "exploration_bonus": round(explore_a, 3),
                "ucb_score": round(score_a, 3) if score_a != float('inf') else "inf"
            },
            "variant_b": {
                "trials": trials_b,
                "success_rate": round(success_b, 3),
                "exploration_bonus": round(explore_b, 3),
                "ucb_score": round(score_b, 3) if score_b != float('inf') else "inf"
            },
            "recommendation": "A" if score_a > score_b else "B"
        }
    except Exception as e:
        logger.error(f"Error calculating scores: {e}")
        raise HTTPException(status_code=500, detail=str(e))