from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import numpy as np
from scipy import stats
import logging

from app.core.models import VariantType, OptimizationDecision
from app.db.repositories import AgentRepository, OptimizationRepository

logger = logging.getLogger(__name__)

class OptimizationEngine:
    """Advanced optimization engine with statistical testing"""
    
    def __init__(
        self,
        agent_repo: AgentRepository,
        opt_repo: OptimizationRepository,
        config: Optional[Dict[str, Any]] = None
    ):
        self.agent_repo = agent_repo
        self.opt_repo = opt_repo
        self.config = config or {
            "min_samples": 30,  # Minimum samples for statistical significance
            "latency_threshold_ms": 1000,
            "error_threshold": 0.25,
            "improvement_threshold": 0.15,  # 15% improvement required
            "confidence_level": 0.95,  # 95% confidence for statistical tests
            "exploration_rate": 0.10  # 10% traffic for exploration
        }
        
    async def analyze_and_optimize(
        self,
        time_window: str = "24h"
    ) -> Optional[OptimizationDecision]:
        """
        Analyze recent performance and make optimization decision
        """
        # Get current stats
        stats = await self.agent_repo.get_stats(time_range=time_window)
        
        if stats["total"] < self.config["min_samples"]:
            logger.info(f"Insufficient samples: {stats['total']} < {self.config['min_samples']}")
            return None
            
        # Perform statistical analysis
        variant_stats = await self._get_variant_statistics(time_window)
        
        # Check for significant differences
        if len(variant_stats) < 2:
            return None
            
        # Run statistical tests
        test_results = await self._run_statistical_tests(variant_stats)
        
        # Make optimization decision
        decision = await self._make_decision(stats, test_results)
        
        if decision:
            # Save decision
            await self.opt_repo.create(decision)
            logger.info(f"Optimization decision made: {decision.new_variant} (confidence: {decision.confidence:.2f})")
            
        return decision
    
    async def _get_variant_statistics(
        self,
        time_window: str
    ) -> Dict[VariantType, Dict[str, Any]]:
        """Get detailed statistics per variant"""
        stats = {}
        
        for variant in VariantType:
            variant_stats = await self.agent_repo.get_stats(
                time_range=time_window,
                variant=variant
            )
            stats[variant] = variant_stats
            
        return stats
    
    async def _run_statistical_tests(
        self,
        variant_stats: Dict[VariantType, Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Run statistical tests to compare variants"""
        results = {}
        
        # We need at least A and B
        if VariantType.A not in variant_stats or VariantType.B not in variant_stats:
            return results
            
        a_stats = variant_stats[VariantType.A]
        b_stats = variant_stats[VariantType.B]
        
        # Perform t-test for latency
        # In production, you'd fetch actual distributions, not just means
        t_stat, p_value = stats.ttest_ind_from_stats(
            mean1=a_stats['avg_latency_ms'],
            std1=a_stats.get('latency_std', a_stats['avg_latency_ms'] * 0.3),  # Estimate
            nobs1=a_stats['total'],
            mean2=b_stats['avg_latency_ms'],
            std2=b_stats.get('latency_std', b_stats['avg_latency_ms'] * 0.3),
            nobs2=b_stats['total']
        )
        
        results['latency'] = {
            't_statistic': t_stat,
            'p_value': p_value,
            'significant': p_value < (1 - self.config['confidence_level'])
        }
        
        # Perform chi-square test for error rates
        contingency_table = [
            [a_stats['errors'], a_stats['total'] - a_stats['errors']],
            [b_stats['errors'], b_stats['total'] - b_stats['errors']]
        ]
        chi2, p_value, dof, expected = stats.chi2_contingency(contingency_table)
        
        results['error_rate'] = {
            'chi2': chi2,
            'p_value': p_value,
            'significant': p_value < (1 - self.config['confidence_level'])
        }
        
        return results
    
    async def _make_decision(
        self,
        global_stats: Dict[str, Any],
        test_results: Dict[str, Any]
    ) -> Optional[OptimizationDecision]:
        """Make optimization decision based on analysis"""
        
        reasons = []
        metrics = {
            'avg_latency_ms': global_stats['avg_latency_ms'],
            'error_rate': global_stats['error_rate']
        }
        
        # Check latency threshold
        if global_stats['avg_latency_ms'] > self.config['latency_threshold_ms']:
            reasons.append(f"High latency detected: {global_stats['avg_latency_ms']:.0f}ms")
            
        # Check error threshold
        if global_stats['error_rate'] > self.config['error_threshold']:
            reasons.append(f"High error rate: {global_stats['error_rate']*100:.1f}%")
            
        # Check for significant differences between variants
        if test_results.get('latency', {}).get('significant'):
            if test_results['latency']['t_statistic'] > 0:
                reasons.append("Variant B has significantly lower latency")
            else:
                reasons.append("Variant A has significantly lower latency")
                
        if test_results.get('error_rate', {}).get('significant'):
            # Determine which variant has lower error rate
            pass
            
        # Make decision based on rules
        if not reasons:
            # No issues detected, maybe do exploration
            if global_stats.get('variant_distribution', {}).get('B', 0) / global_stats['total'] < self.config['exploration_rate']:
                return OptimizationDecision(
                    previous_variant=VariantType.A,
                    new_variant=VariantType.B,
                    reason=["Exploration: testing variant B"],
                    confidence=0.6,
                    metrics=metrics,
                    timestamp=datetime.utcnow()
                )
            return None
            
        # Determine new variant
        error_rate_issue = global_stats['error_rate'] > self.config['error_threshold']
        latency_issue = global_stats['avg_latency_ms'] > self.config['latency_threshold_ms']
        
        if error_rate_issue:
            new_variant = VariantType.A  # A is more stable
        elif latency_issue:
            new_variant = VariantType.B  # B might be faster
        else:
            # Use statistical test results
            if test_results.get('latency', {}).get('significant'):
                new_variant = VariantType.B if test_results['latency']['t_statistic'] > 0 else VariantType.A
            else:
                new_variant = VariantType.A  # Default to A
        
        # Calculate confidence
        confidence = 0.7
        if test_results.get('latency', {}).get('significant'):
            confidence += 0.2
        if test_results.get('error_rate', {}).get('significant'):
            confidence += 0.1
            
        return OptimizationDecision(
            previous_variant=VariantType.A,  # Should track actual
            new_variant=new_variant,
            reason=reasons,
            confidence=min(confidence, 0.95),
            metrics=metrics,
            timestamp=datetime.utcnow()
        )