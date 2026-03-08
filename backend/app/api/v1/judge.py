from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
import logging

from app.services.judge import judge_service
from app.core.judge_agent import JudgeAgent
from app.db.repositories import AgentRepository
from app.core.models import VariantType

router = APIRouter(prefix="/judge", tags=["judge"])
logger = logging.getLogger(__name__)

@router.post("/evaluate")
async def evaluate_responses(
    prompt: str,
    response_a: str,
    response_b: str,
    mode: str = Query("pairwise", enum=["pairwise", "single", "reference", "multiaspect"])
):
    """
    Evaluate responses using LLM-as-a-Judge
    Modes: pairwise, single, reference, multiaspect
    """
    try:
        if mode == "pairwise":
            result = await judge_service.evaluate_pairwise(prompt, response_a, response_b)
        elif mode == "single":
            result = await judge_service.evaluate_single(prompt, response_a)
        elif mode == "multiaspect":
            result = await judge_service.evaluate_multiaspect(prompt, response_a)
        else:
            result = {"error": f"Mode {mode} not implemented"}
        
        return result
    except Exception as e:
        logger.error(f"Evaluation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/patterns/{variant}")
async def get_behavior_patterns(
    variant: str,
    limit: int = Query(100, ge=1, le=500)
):
    """
    Analyze behavior patterns for a specific variant
    """
    try:
        repo = AgentRepository()
        judge = JudgeAgent(repo)
        
        variant_type = VariantType(variant.upper())
        patterns = await judge.analyze_behavior_patterns(variant_type, limit)
        
        return patterns
    except Exception as e:
        logger.error(f"Pattern analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/test/{test_id}/evaluate")
async def evaluate_test(
    test_id: int,
    prompt: str,
    response_a: str,
    response_b: str
):
    """
    Evaluate a specific test run with both variants
    """
    try:
        repo = AgentRepository()
        judge = JudgeAgent(repo)
        
        evaluation = await judge.evaluate_test_results(
            test_id=test_id,
            prompt=prompt,
            response_a=response_a,
            response_b=response_b
        )
        
        return evaluation
    except Exception as e:
        logger.error(f"Test evaluation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))