import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { optimizerApi } from '../../services/api';

export const ABTestComparison: React.FC = () => {
  const { data: comparison, isLoading } = useQuery({
    queryKey: ['variant-comparison'],
    queryFn: () => optimizerApi.getVariantComparison(),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>A/B Test Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sample data if no comparison yet
  const stats = comparison || {
    A: { latency: 345, error_rate: 0.12, count: 845 },
    B: { latency: 567, error_rate: 0.08, count: 389 },
    significance: { latency: 0.95, error_rate: 0.87 }
  };

  const getWinner = (a: number, b: number, lowerIsBetter: boolean) => {
    if (lowerIsBetter) {
      return a < b ? 'A' : 'B';
    }
    return a > b ? 'A' : 'B';
  };

  const latencyWinner = getWinner(stats.A.latency, stats.B.latency, true);
  const errorWinner = getWinner(stats.A.error_rate, stats.B.error_rate, true);

  return (
    <Card>
      <CardHeader>
        <CardTitle>A/B Test Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Header */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div></div>
            <div className="font-semibold text-blue-600">Variant A</div>
            <div className="font-semibold text-red-600">Variant B</div>
          </div>

          {/* Latency Row */}
          <div className="grid grid-cols-3 gap-4 items-center">
            <div className="text-sm font-medium text-gray-600">Latency (ms)</div>
            <div className="text-center">
              <div className="text-lg font-semibold">{stats.A.latency}</div>
              {latencyWinner === 'A' && (
                <CheckCircleIcon className="w-4 h-4 text-green-500 mx-auto mt-1" />
              )}
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">{stats.B.latency}</div>
              {latencyWinner === 'B' && (
                <CheckCircleIcon className="w-4 h-4 text-green-500 mx-auto mt-1" />
              )}
            </div>
          </div>

          {/* Error Rate Row */}
          <div className="grid grid-cols-3 gap-4 items-center">
            <div className="text-sm font-medium text-gray-600">Error Rate</div>
            <div className="text-center">
              <div className="text-lg font-semibold">{(stats.A.error_rate * 100).toFixed(1)}%</div>
              {errorWinner === 'A' && (
                <CheckCircleIcon className="w-4 h-4 text-green-500 mx-auto mt-1" />
              )}
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">{(stats.B.error_rate * 100).toFixed(1)}%</div>
              {errorWinner === 'B' && (
                <CheckCircleIcon className="w-4 h-4 text-green-500 mx-auto mt-1" />
              )}
            </div>
          </div>

          {/* Sample Size Row */}
          <div className="grid grid-cols-3 gap-4 items-center">
            <div className="text-sm font-medium text-gray-600">Sample Size</div>
            <div className="text-center">
              <div className="text-lg font-semibold">{stats.A.count}</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">{stats.B.count}</div>
            </div>
          </div>

          {/* Statistical Significance */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-sm font-medium text-gray-700 mb-2">Statistical Significance</div>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-sm">
                  <span>Latency Difference</span>
                  <span className="font-semibold">
                    {(stats.significance.latency * 100).toFixed(0)}% confident
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${stats.significance.latency * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm">
                  <span>Error Rate Difference</span>
                  <span className="font-semibold">
                    {(stats.significance.error_rate * 100).toFixed(0)}% confident
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${stats.significance.error_rate * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Recommendation */}
          {(stats.significance.latency > 0.95 || stats.significance.error_rate > 0.95) && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                <span className="font-semibold">Recommendation:</span>{' '}
                {stats.significance.latency > 0.95 && stats.A.latency < stats.B.latency && 'Variant A has significantly lower latency. '}
                {stats.significance.latency > 0.95 && stats.B.latency < stats.A.latency && 'Variant B has significantly lower latency. '}
                {stats.significance.error_rate > 0.95 && stats.A.error_rate < stats.B.error_rate && 'Variant A has significantly fewer errors.'}
                {stats.significance.error_rate > 0.95 && stats.B.error_rate < stats.A.error_rate && 'Variant B has significantly fewer errors.'}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};