import json
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from app.db.database import db_manager
from app.core.models import AgentEvent, OptimizationDecision, VariantType, TaskType, AgentStatus
import logging

logger = logging.getLogger(__name__)

class AgentRepository:
    """Repository for agent events"""
    
    async def create(self, event: AgentEvent) -> int:
        """Insert a new agent event"""
        async with db_manager.get_connection() as conn:
            # Safely get string values - handles both enums and strings
            def get_str_value(obj):
                if obj is None:
                    return None
                if hasattr(obj, 'value'):  # It's an enum
                    return obj.value
                return str(obj)  # It's already a string or other type
            
            variant_value = get_str_value(event.variant)
            status_value = get_str_value(event.status)
            task_type_value = get_str_value(event.task_type)
            
            cursor = await conn.execute("""
                INSERT INTO agent_events 
                (variant, status, latency_ms, input_text, output_text, task_type, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                RETURNING id
            """, (
                variant_value,
                status_value,
                event.latency_ms,
                event.input_text,
                event.output_text,
                task_type_value,
                json.dumps(event.metadata)
            ))
            row = await cursor.fetchone()
            await conn.commit()
            return row['id']
    
    async def get_recent(self, limit: int = 100, offset: int = 0) -> List[AgentEvent]:
        """Get recent events with pagination"""
        async with db_manager.get_connection() as conn:
            cursor = await conn.execute("""
                SELECT * FROM agent_events 
                ORDER BY timestamp DESC 
                LIMIT ? OFFSET ?
            """, (limit, offset))
            rows = await cursor.fetchall()
            return [self._row_to_event(row) for row in rows]
    
    async def get_stats(
        self, 
        time_range: str = "24h",
        variant: Optional[VariantType] = None
    ) -> Dict[str, Any]:
        """Get aggregated statistics"""
        # Parse time range
        hours = int(time_range.replace('h', '')) if 'h' in time_range else 24
        
        async with db_manager.get_connection() as conn:
            # Base query with time filter
            query = """
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors,
                    AVG(latency_ms) as avg_latency,
                    (SELECT latency_ms FROM agent_events 
                     WHERE timestamp >= datetime('now', ?)
                     ORDER BY latency_ms 
                     LIMIT 1 OFFSET (SELECT CAST(COUNT(*) * 0.95 AS INT) - 1 FROM agent_events WHERE timestamp >= datetime('now', ?))
                    ) as p95_latency,
                    (SELECT latency_ms FROM agent_events 
                     WHERE timestamp >= datetime('now', ?)
                     ORDER BY latency_ms 
                     LIMIT 1 OFFSET (SELECT CAST(COUNT(*) * 0.99 AS INT) - 1 FROM agent_events WHERE timestamp >= datetime('now', ?))
                    ) as p99_latency
                FROM agent_events 
                WHERE timestamp >= datetime('now', ?)
            """
            
            params = [f'-{hours} hours', f'-{hours} hours', f'-{hours} hours', f'-{hours} hours', f'-{hours} hours']
            
            if variant:
                query += " AND variant = ?"
                variant_value = variant.value if hasattr(variant, 'value') else str(variant)
                params.append(variant_value)
                
            cursor = await conn.execute(query, params)
            stats = await cursor.fetchone()
            
            # Get variant distribution
            cursor = await conn.execute("""
                SELECT variant, COUNT(*) as count
                FROM agent_events
                WHERE timestamp >= datetime('now', ?)
                GROUP BY variant
            """, (f'-{hours} hours',))
            rows = await cursor.fetchall()
            variant_dist = {}
            for row in rows:
                variant_dist[row['variant']] = row['count']
            
            # Get task distribution
            cursor = await conn.execute("""
                SELECT task_type, COUNT(*) as count
                FROM agent_events
                WHERE timestamp >= datetime('now', ?)
                GROUP BY task_type
            """, (f'-{hours} hours',))
            rows = await cursor.fetchall()
            task_dist = {}
            for row in rows:
                task_dist[row['task_type']] = row['count']
            
            # Handle case when stats is None
            if stats is None:
                return {
                    "total": 0,
                    "errors": 0,
                    "error_rate": 0,
                    "avg_latency_ms": 0,
                    "p95_latency_ms": 0,
                    "p99_latency_ms": 0,
                    "variant_distribution": variant_dist,
                    "task_distribution": task_dist
                }
            
            total = stats[0] or 0
            errors = stats[1] or 0
            
            return {
                "total": total,
                "errors": errors,
                "error_rate": errors / total if total > 0 else 0,
                "avg_latency_ms": round(stats[2] or 0, 2),
                "p95_latency_ms": round(stats[3] or 0, 2),
                "p99_latency_ms": round(stats[4] or 0, 2),
                "variant_distribution": variant_dist,
                "task_distribution": task_dist
            }
    
    def _row_to_event(self, row) -> AgentEvent:
        """Convert DB row to AgentEvent"""
        from app.core.models import AgentStatus, TaskType, VariantType
        
        return AgentEvent(
            id=row['id'],
            timestamp=datetime.fromisoformat(row['timestamp']),
            variant=VariantType(row['variant']),
            status=AgentStatus(row['status']),
            latency_ms=row['latency_ms'],
            input_text=row['input_text'],
            output_text=row['output_text'],
            task_type=TaskType(row['task_type']),
            metadata=json.loads(row['metadata']) if row['metadata'] else {}
        )

class OptimizationRepository:
    """Repository for optimization decisions"""
    
    async def create(self, decision: OptimizationDecision):
        """Save optimization decision"""
        async with db_manager.get_connection() as conn:
            # Safely get string values
            def get_str_value(obj):
                if obj is None:
                    return None
                if hasattr(obj, 'value'):
                    return obj.value
                return str(obj)
            
            previous_value = get_str_value(decision.previous_variant)
            new_value = get_str_value(decision.new_variant)
            
            await conn.execute("""
                INSERT INTO optimization_history
                (previous_variant, new_variant, reason, confidence, avg_latency_ms, error_rate, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                previous_value,
                new_value,
                json.dumps(decision.reason),
                decision.confidence,
                decision.metrics.get('avg_latency_ms'),
                decision.metrics.get('error_rate'),
                json.dumps(decision.metrics)
            ))
            await conn.commit()
    
    async def get_history(self, limit: int = 50) -> List[OptimizationDecision]:
        """Get optimization history"""
        async with db_manager.get_connection() as conn:
            cursor = await conn.execute("""
                SELECT * FROM optimization_history
                ORDER BY timestamp DESC
                LIMIT ?
            """, (limit,))
            rows = await cursor.fetchall()
            return [self._row_to_decision(row) for row in rows]
    
    def _row_to_decision(self, row) -> OptimizationDecision:
        """Convert DB row to OptimizationDecision"""
        from app.core.models import VariantType
        
        return OptimizationDecision(
            previous_variant=VariantType(row['previous_variant']),
            new_variant=VariantType(row['new_variant']),
            reason=json.loads(row['reason']),
            confidence=row['confidence'] or 0.5,
            metrics=json.loads(row['metadata']) if row['metadata'] else {},
            timestamp=datetime.fromisoformat(row['timestamp'])
        )