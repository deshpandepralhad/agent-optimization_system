import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BeakerIcon } from '@heroicons/react/24/outline';
import { OptimizationPanel } from '../components/optimizer/OptimizationPanel';
import { ThresholdConfig } from '../components/optimizer/ThresholdConfig';
import { ABTestComparison } from '../components/optimizer/ABTestComparison';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { optimizerApi } from '../services/api';

export const Optimization = () => {
  const { data: config } = useQuery({
    queryKey: ['optimizer-config'],
    queryFn: () => optimizerApi.getConfig(),
  });

  const { data: scores, isLoading: scoresLoading } = useQuery({
    queryKey: ['ucb-scores'],
    queryFn: async () => {
      const response = await fetch('http://localhost:8000/api/v1/optimizer/scores');
      return response.json();
    },
    refetchInterval: 10000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Optimization Engine</h1>
        <p className="text-gray-600 mt-1">
          Analyze A/B test results and optimize agent behavior
        </p>
      </div>

      {/* UCB Multi-Armed Bandit Scores */}
      {!scoresLoading && scores && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BeakerIcon className="w-5 h-5 mr-2" />
              UCB Multi-Armed Bandit Scores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Variant A */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-800 mb-3">Variant A</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Trials:</span>
                    <span className="font-medium">{scores.variant_a.trials}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Success Rate:</span>
                    <span className="font-medium text-green-600">
                      {(scores.variant_a.success_rate * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Exploration Bonus:</span>
                    <span className="font-medium">{scores.variant_a.exploration_bonus}</span>
                  </div>
                  <div className="pt-2 mt-2 border-t border-blue-200">
                    <div className="flex justify-between font-bold">
                      <span>UCB Score:</span>
                      <span className="text-blue-800">{scores.variant_a.ucb_score}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Variant B */}
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <h3 className="text-lg font-semibold text-red-800 mb-3">Variant B</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Trials:</span>
                    <span className="font-medium">{scores.variant_b.trials}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Success Rate:</span>
                    <span className="font-medium text-yellow-600">
                      {(scores.variant_b.success_rate * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Exploration Bonus:</span>
                    <span className="font-medium">{scores.variant_b.exploration_bonus}</span>
                  </div>
                  <div className="pt-2 mt-2 border-t border-red-200">
                    <div className="flex justify-between font-bold">
                      <span>UCB Score:</span>
                      <span className="text-red-800">{scores.variant_b.ucb_score}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recommendation */}
            <div className="mt-4 p-3 bg-gray-100 rounded-lg text-center">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Algorithm Recommendation:</span>{' '}
                <span className={`text-lg font-bold ${
                  scores.recommendation === 'A' ? 'text-blue-600' : 'text-red-600'
                }`}>
                  Variant {scores.recommendation}
                </span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Based on UCB1 Multi-Armed Bandit algorithm (exploration vs exploitation)
              </p>
            </div>

            {/* Mathematical Explanation */}
            <div className="mt-3 text-xs text-gray-400 text-center">
              <p>UCB Score = Success Rate + √(2·ln(total trials) / variant trials)</p>
            </div>
          </CardContent>
        </Card>
      )}

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