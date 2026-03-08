import random
from typing import Optional
from app.core.models import TaskType, VariantType

class SmartRouter:
    """Simple router for task classification and variant selection"""
    
    TASKS = ["summarize", "classify", "translate", "chat", "extract"]
    
    async def classify_task(self, text: str) -> TaskType:
        """Classify the task type based on input text"""
        text_lower = text.lower()
        
        if "summar" in text_lower:
            return TaskType.SUMMARIZE
        elif "classif" in text_lower:
            return TaskType.CLASSIFY
        elif "translat" in text_lower:
            return TaskType.TRANSLATE
        elif "extract" in text_lower:
            return TaskType.EXTRACT
        else:
            return TaskType.CHAT
    
    async def get_optimal_variant(self, text: str) -> VariantType:
        """Determine optimal variant (simplified - just returns A)"""
        return VariantType.A