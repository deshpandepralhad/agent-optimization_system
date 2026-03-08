import math
import logging
from typing import Dict, Any, Optional
from datetime import datetime
from app.core.models import VariantType, OptimizationDecision
from app.db.repositories import AgentRepository, OptimizationRepository

logger = logging.getLogger(__name__)

class UCBOptimizer:
    """
    Upper Confidence Bound (UCB1) Multi-Armed Bandit Algorithm
    For mathematical proof of variant optimization
    """
    
    def __init__(
        self,
        agent_repo: AgentRepository,
        opt_repo: OptimizationRepository
    ):
        self.agent_repo = agent_repo
        self.opt_repo = opt_repo
        self.variants = [VariantType.A, VariantType.B]
        
    async def select_optimal_variant(self, context: Optional[Dict] = None) -> VariantType:
        """
        Select the optimal variant using UCB algorithm
        Returns: Variant with highest UCB score
        """
        # Get current stats for both variants
        stats_a = await self.agent_repo.get_stats(variant=VariantType.A)
        stats_b = await self.agent_repo.get_stats(variant=VariantType.B)
        
        # Extract real data
        trials = {
            VariantType.A: stats_a.get('total', 0),
            VariantType.B: stats_b.get('total', 0)
        }
        
        success_rates = {
            VariantType.A: 1 - stats_a.get('error_rate', 0),
            VariantType.B: 1 - stats_b.get('error_rate', 0)
        }
        
        total_trials = sum(trials.values())
        
        # Calculate UCB scores
        scores = {}
        for variant in self.variants:
            if trials[variant] == 0:
                # Never tried before → high exploration bonus
                scores[variant] = float('inf')
            else:
                # UCB1 formula: exploitation + exploration
                exploitation = success_rates[variant]
                exploration = math.sqrt(
                    (2 * math.log(total_trials + 1)) / trials[variant]
                )
                scores[variant] = exploitation + exploration
                
                logger.debug(f"UCB Score - {variant.value}: {scores[variant]:.3f} "
                           f"(exp={exploitation:.3f}, explore={exploration:.3f})")
        
        # Select variant with highest score
        selected = max(scores, key=scores.get)
        
        # Log the decision
        logger.info(f"UCB selected {selected.value} with score {scores[selected]:.3f}")
        
        return selected
    
    async def analyze_and_optimize(self) -> Optional[OptimizationDecision]:
        """
        Run optimization and record decision
        """
        # Get current stats
        stats = await self.agent_repo.get_stats()
        
        if stats['total'] < 10:
            logger.info(f"Not enough data: {stats['total']} < 10")
            return None
            
        # Get previous active variant (default to A)
        previous = VariantType.A
        
        # Select optimal variant using UCB
        selected = await self.select_optimal_variant()
        
        # Calculate confidence based on score difference
        stats_a = await self.agent_repo.get_stats(variant=VariantType.A)
        stats_b = await self.agent_repo.get_stats(variant=VariantType.B)
        
        trials_a = stats_a.get('total', 0)
        trials_b = stats_b.get('total', 0)
        
        if trials_a > 0 and trials_b > 0:
            total = trials_a + trials_b
            score_a = (1 - stats_a.get('error_rate', 0)) + math.sqrt(2 * math.log(total) / trials_a)
            score_b = (1 - stats_b.get('error_rate', 0)) + math.sqrt(2 * math.log(total) / trials_b)
            
            # Confidence based on score gap
            gap = abs(score_a - score_b)
            confidence = min(0.5 + gap, 0.95)
        else:
            confidence = 0.6
        
        # Generate reasons
        reasons = []
        if selected != previous:
            reasons.append(f"UCB algorithm selected {selected.value} over {previous.value}")
            reasons.append(f"Better exploration/exploitation balance")
        else:
            reasons.append(f"Current variant {selected.value} remains optimal")
        
        # Create decision record
        decision = OptimizationDecision(
            previous_variant=previous,
            new_variant=selected,
            reason=reasons,
            confidence=confidence,
            metrics={
                'avg_latency_ms': stats.get('avg_latency_ms', 0),
                'error_rate': stats.get('error_rate', 0),
                'total_tests': stats.get('total', 0),
                'ucb_score_a': score_a if 'score_a' in locals() else 0,
                'ucb_score_b': score_b if 'score_b' in locals() else 0
            },
            timestamp=datetime.utcnow()
        )
        
        # Save to database
        await self.opt_repo.create(decision)
        
        return decision