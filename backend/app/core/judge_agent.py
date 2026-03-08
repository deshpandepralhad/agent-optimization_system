import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

from app.services.judge import judge_service
from app.db.repositories import AgentRepository
from app.core.models import AgentEvent, VariantType, TaskType

logger = logging.getLogger(__name__)

class JudgeAgent:
    """
    Agent that evaluates other agents' responses qualitatively
    Adds behavior analysis beyond simple success/failure
    """
    
    def __init__(self, agent_repo: AgentRepository):
        self.repo = agent_repo
        self.judge = judge_service
    
    async def evaluate_test_results(
        self,
        test_id: int,
        prompt: str,
        response_a: str,
        response_b: str
    ) -> Dict[str, Any]:
        """
        Evaluate both variants' responses for a specific test
        Stores results in database for analysis
        """
        try:
            # Pairwise comparison
            pairwise = await self.judge.evaluate_pairwise(
                prompt=prompt,
                response_a=response_a,
                response_b=response_b
            )
            
            # Individual scoring for each variant
            score_a = await self.judge.evaluate_single(prompt, response_a)
            score_b = await self.judge.evaluate_single(prompt, response_b)
            
            # Multi-aspect for deeper analysis
            multi_a = await self.judge.evaluate_multiaspect(prompt, response_a)
            multi_b = await self.judge.evaluate_multiaspect(prompt, response_b)
            
            # Combine results
            evaluation = {
                "test_id": test_id,
                "timestamp": datetime.utcnow().isoformat(),
                "pairwise": pairwise,
                "variant_a": {
                    "single_score": score_a,
                    "multiaspect": multi_a
                },
                "variant_b": {
                    "single_score": score_b,
                    "multiaspect": multi_b
                },
                "summary": self._generate_summary(pairwise, score_a, score_b)
            }
            
            # Store in database (you'll need to add a table for this)
            await self._store_evaluation(evaluation)
            
            return evaluation
            
        except Exception as e:
            logger.error(f"Evaluation failed: {e}")
            return {"error": str(e)}
    
    async def analyze_behavior_patterns(
        self,
        variant: VariantType,
        limit: int = 100
    ) -> Dict[str, Any]:
        """
        Analyze behavior patterns for a variant over time
        """
        events = await self.repo.get_recent(limit=limit, variant=variant)
        
        if not events:
            return {"error": "No events found"}
        
        # Group by task type
        task_scores = {}
        for event in events:
            task = event.task_type.value
            if task not in task_scores:
                task_scores[task] = []
            
            # Get stored judge scores for this event
            scores = await self._get_judge_scores(event.id)
            if scores:
                task_scores[task].append(scores.get("overall_score", 0))
        
        # Calculate averages
        patterns = {}
        for task, scores in task_scores.items():
            if scores:
                patterns[task] = {
                    "avg_score": sum(scores) / len(scores),
                    "sample_size": len(scores),
                    "best_score": max(scores),
                    "worst_score": min(scores)
                }
        
        return {
            "variant": variant.value,
            "total_evaluated": len(events),
            "patterns": patterns,
            "insights": self._generate_insights(patterns)
        }
    
    def _generate_summary(self, pairwise: Dict, score_a: Dict, score_b: Dict) -> str:
        """Generate human-readable summary"""
        winner = pairwise.get("winner", "tie")
        if winner == "A":
            return f"Variant A performed better overall (score: {score_a.get('overall_score', 0):.1f} vs {score_b.get('overall_score', 0):.1f})"
        elif winner == "B":
            return f"Variant B performed better overall (score: {score_b.get('overall_score', 0):.1f} vs {score_a.get('overall_score', 0):.1f})"
        else:
            return "Variants performed equally well"
    
    def _generate_insights(self, patterns: Dict) -> List[str]:
        """Generate insights from patterns"""
        insights = []
        if not patterns:
            return ["Insufficient data for insights"]
        
        best_task = max(patterns.items(), key=lambda x: x[1]["avg_score"])
        worst_task = min(patterns.items(), key=lambda x: x[1]["avg_score"])
        
        insights.append(f"Best performance on: {best_task[0]} ({best_task[1]['avg_score']:.1f}/10)")
        insights.append(f"Needs improvement on: {worst_task[0]} ({worst_task[1]['avg_score']:.1f}/10)")
        
        return insights
    
    async def _store_evaluation(self, evaluation: Dict):
        """Store evaluation results in database"""
        # TODO: Create judge_results table
        logger.info(f"Stored evaluation for test {evaluation.get('test_id')}")
    
    async def _get_judge_scores(self, event_id: int) -> Optional[Dict]:
        """Retrieve stored judge scores for an event"""
        # TODO: Query judge_results table
        return None