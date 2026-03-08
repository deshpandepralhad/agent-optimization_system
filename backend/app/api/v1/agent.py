from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import Optional
from pydantic import BaseModel, Field
import logging

from app.core.agent import Agent
from app.core.models import VariantType, AgentEvent
from app.db.repositories import AgentRepository
from app.services.langfuse import LangfuseService
from app.core.router import SmartRouter

router = APIRouter(prefix="/agent", tags=["agent"])
logger = logging.getLogger(__name__)

# Request/Response models
class AgentRunRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000)
    variant: Optional[str] = None  # Change to str instead of VariantType
    metadata: dict = Field(default_factory=dict)

class AgentRunResponse(BaseModel):
    output: str
    variant: str
    latency_ms: float
    status: str
    event_id: Optional[int] = None
    task_type: str

# Dependencies
async def get_agent() -> Agent:
    # In production, use dependency injection
    repo = AgentRepository()
    langfuse = LangfuseService()
    router = SmartRouter()
    return Agent(repo, langfuse, router)

@router.post("/run", response_model=AgentRunResponse)
async def run_agent(
    request: AgentRunRequest,
    background_tasks: BackgroundTasks,
    agent: Agent = Depends(get_agent)
):
    """
    Run the agent with optional variant specification
    """
    try:
        # Convert string variant to VariantType if provided
        variant_enum = None
        if request.variant:
            try:
                variant_enum = VariantType(request.variant.upper())
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid variant: {request.variant}. Must be 'A' or 'B'")
        
        event = await agent.run(
            text=request.text,
            variant=variant_enum,
            metadata=request.metadata
        )
        
        # Safely get string values
        def get_str_value(obj):
            if obj is None:
                return None
            if hasattr(obj, 'value'):
                return obj.value
            return str(obj)
        
        # Add background task for additional processing
        background_tasks.add_task(
            process_agent_result,
            event_id=event.id
        )
        
        return AgentRunResponse(
            output=event.output_text,
            variant=get_str_value(event.variant),
            latency_ms=event.latency_ms,
            status=get_str_value(event.status),
            event_id=event.id,
            task_type=get_str_value(event.task_type)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Agent run failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/variants")
async def get_available_variants():
    """Get available agent variants"""
    return {
        "variants": ["A", "B"],  # Return strings instead of enum values
        "description": {
            "A": "Stable, conservative variant",
            "B": "Experimental, potentially faster but riskier"
        }
    }

async def process_agent_result(event_id: int):
    """Background processing of agent results"""
    # Add additional processing like:
    # - Update analytics
    # - Check for alerts
    # - Trigger optimizations
    pass