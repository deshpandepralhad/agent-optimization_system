import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { OptimizationPanel } from '../components/optimizer/OptimizationPanel';
import { ThresholdConfig } from '../components/optimizer/ThresholdConfig';
import { ABTestComparison } from '../components/optimizer/ABTestComparison';
import { optimizerApi } from '../services/api';

export const Optimization = () => {
  const { data: config } = useQuery({
    queryKey: ['optimizer-config'],
    queryFn: () => optimizerApi.getConfig(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Optimization Engine</h1>
        <p className="text-gray-600 mt-1">
          Analyze A/B test results and optimize agent behavior
        </p>
      </div>

      {/* Main Optimization Panel */}
      <OptimizationPanel />

      {/* Two-column layout for config and comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {config && <ThresholdConfig config={config} />}
        <ABTestComparison />
      </div>
    </div>
  );
};