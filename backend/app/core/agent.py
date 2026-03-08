import time
import random
from typing import Optional, Dict, Any, Union
from datetime import datetime
import logging
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.models import AgentEvent, VariantType, AgentStatus, TaskType
from app.db.repositories import AgentRepository
from app.services.langfuse import LangfuseService
from app.core.router import SmartRouter

logger = logging.getLogger(__name__)

class Agent:
    """Production-grade agent with comprehensive error handling"""
    
    def __init__(
        self,
        agent_repo: AgentRepository,
        langfuse_service: LangfuseService,
        router: SmartRouter
    ):
        self.repo = agent_repo
        self.langfuse = langfuse_service
        self.router = router
        self.variant_b_failure_rate = 0.20  # Configurable
    
    def _convert_to_variant_type(self, variant_input: Union[str, VariantType, None]) -> Optional[VariantType]:
        """Safely convert input to VariantType enum"""
        if variant_input is None:
            return None
        if isinstance(variant_input, VariantType):
            return variant_input
        if isinstance(variant_input, str):
            try:
                return VariantType(variant_input.upper())
            except ValueError:
                logger.warning(f"Invalid variant string: {variant_input}, defaulting to A")
                return VariantType.A
        return VariantType.A
    
    def _convert_to_task_type(self, task_input: Union[str, TaskType]) -> TaskType:
        """Safely convert input to TaskType enum"""
        if isinstance(task_input, TaskType):
            return task_input
        if isinstance(task_input, str):
            try:
                return TaskType(task_input.lower())
            except ValueError:
                logger.warning(f"Invalid task string: {task_input}, defaulting to chat")
                return TaskType.CHAT
        return TaskType.CHAT
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10)
    )
    async def run(
        self,
        text: str,
        variant: Optional[Union[str, VariantType]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> AgentEvent:
        """
        Run agent with specified variant
        
        Args:
            text: Input text to process
            variant: Which variant to use (A/B). If None, uses router
            metadata: Additional metadata for tracking
            
        Returns:
            AgentEvent with results
        """
        start_time = time.time()
        
        # Safely convert variant to enum
        variant_enum = self._convert_to_variant_type(variant)
        
        # Determine variant and task type
        if variant_enum is None:
            chosen_variant = await self.router.get_optimal_variant(text)
        else:
            chosen_variant = variant_enum
            
        task_type_enum = await self.router.classify_task(text)
        
        # Prepare metadata with string values (not enums) for JSON serialization
        event_metadata = {
            "variant": chosen_variant.value,  # .value gives the string
            "task_type": task_type_enum.value,  # .value gives the string
            "timestamp": datetime.utcnow().isoformat(),
            **(metadata or {})
        }
        
        # Start Langfuse trace (with error handling)
        trace = None
        try:
            trace = await self.langfuse.start_trace(
                name=f"agent_run_{chosen_variant.value}",
                input=text,
                metadata=event_metadata
            )
        except Exception as e:
            logger.warning(f"Langfuse trace failed (continuing anyway): {e}")
        
        try:
            # Execute variant logic
            if chosen_variant == VariantType.A:
                output = f"[Variant A] Processed: {text}"
                status = AgentStatus.SUCCESS
                
            elif chosen_variant == VariantType.B:
                # Simulate variant B behavior with configurable failure rate
                if random.random() < self.variant_b_failure_rate:
                    raise Exception("Variant B simulated failure")
                output = f"[Variant B] Enhanced processing: {text}"
                status = AgentStatus.SUCCESS
            else:
                raise ValueError(f"Unknown variant: {chosen_variant}")
                
        except Exception as e:
            logger.error(f"Agent execution failed: {e}", exc_info=True)
            output = f"ERROR: {str(e)}"
            status = AgentStatus.ERROR
            
            # Update trace with error if it exists
            if trace:
                try:
                    await trace.update(
                        output=output,
                        metadata={**event_metadata, "error": str(e)}
                    )
                except:
                    pass
        else:
            # Update trace with success if it exists
            if trace:
                try:
                    await trace.update(
                        output=output,
                        metadata=event_metadata
                    )
                except:
                    pass
        
        # Calculate latency
        latency_ms = round((time.time() - start_time) * 1000, 2)
        
        # Create event with enum types (repository will handle conversion)
        event = AgentEvent(
            variant=chosen_variant,
            status=status,
            latency_ms=latency_ms,
            input_text=text,
            output_text=output,
            task_type=task_type_enum,
            metadata=event_metadata
        )
        
        # Save to database
        try:
            event_id = await self.repo.create(event)
            event.id = event_id
            logger.info(f"Agent event saved: {event_id}")
        except Exception as e:
            logger.error(f"Failed to save event to database: {e}")
            # Don't fail the request, just log
        
        return event