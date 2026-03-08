from pydantic import BaseModel, Field, validator
from datetime import datetime
from typing import Optional, Dict, Any, List
from enum import Enum

class VariantType(str, Enum):
    A = "A"
    B = "B"

class AgentStatus(str, Enum):
    SUCCESS = "success"
    ERROR = "error"
    PENDING = "pending"

class TaskType(str, Enum):
    SUMMARIZE = "summarize"
    CLASSIFY = "classify"
    TRANSLATE = "translate"
    CHAT = "chat"
    EXTRACT = "extract"

class AgentEvent(BaseModel):
    """Core agent event model"""
    id: Optional[int] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    variant: VariantType
    status: AgentStatus
    latency_ms: float
    input_text: str
    output_text: str
    task_type: TaskType
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    class Config:
        use_enum_values = True

class OptimizationDecision(BaseModel):
    """Optimization engine decision"""
    previous_variant: VariantType
    new_variant: VariantType
    reason: List[str]
    confidence: float = Field(ge=0, le=1)
    metrics: Dict[str, float]
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class AnalyticsSnapshot(BaseModel):
    """Real-time analytics snapshot"""
    total_events: int
    error_rate: float
    avg_latency_ms: float
    p95_latency_ms: float
    p99_latency_ms: float
    variant_distribution: Dict[VariantType, int]
    task_distribution: Dict[TaskType, int]
    time_series: List[Dict[str, Any]]
    active_alerts: List[Dict[str, Any]]
    optimization_history: List[OptimizationDecision]