import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  BeakerIcon, 
  ArrowPathIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import { Button } from '../common/Button';
import { optimizerApi, type OptimizationDecision, type OptimizationConfig } from '../../services/api';

export const OptimizationPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const [isTriggering, setIsTriggering] = useState(false);

  // Fetch optimization history
  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ['optimization-history'],
    queryFn: () => optimizerApi.getHistory(10),
    refetchInterval: 30000,
  });

  // Fetch current config
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['optimizer-config'],
    queryFn: () => optimizerApi.getConfig(),
  });

  // Trigger optimization mutation
  const triggerMutation = useMutation({
    mutationFn: optimizerApi.triggerOptimization,
    onSuccess: (data) => {
      toast.success('Optimization triggered successfully');
      queryClient.invalidateQueries({ queryKey: ['optimization-history'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      setIsTriggering(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to trigger optimization');
      setIsTriggering(false);
    },
  });

  const handleTriggerOptimization = () => {
    setIsTriggering(true);
    triggerMutation.mutate();
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-gray-600';
  };

  if (historyLoading || configLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Optimization Engine</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const latestDecision = history[0];

  return (
    <div className="space-y-6">
      {/* Current Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BeakerIcon className="w-5 h-5 mr-2" />
            Current Optimization Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">Active Variant</div>
              <div className={`text-2xl font-bold ${
                config?.active_variant === 'A' ? 'text-blue-600' : 'text-red-600'
              }`}>
                {config?.active_variant || 'A'}
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">Latency Threshold</div>
              <div className="text-2xl font-bold text-gray-900">
                {config?.latency_threshold_ms}ms
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">Error Threshold</div>
              <div className="text-2xl font-bold text-gray-900">
                {(config?.error_threshold || 0) * 100}%
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">Min Samples</div>
              <div className="text-2xl font-bold text-gray-900">
                {config?.min_samples || 30}
              </div>
            </div>
          </div>

          {/* Always show this section with button */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-blue-800">
                  {latestDecision ? 'Latest Decision' : 'Ready to Optimize'}
                </span>
                {latestDecision ? (
                  <>
                    <p className="text-sm text-blue-600 mt-1">
                      Switched from {latestDecision.previous_variant} to {latestDecision.new_variant}
                    </p>
                    <p className="text-xs text-blue-500 mt-1">
                      {formatDate(latestDecision.timestamp)}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-blue-600 mt-1">
                    Click the button to analyze current data and make optimization decision
                  </p>
                )}
              </div>
              <Button
                onClick={handleTriggerOptimization}
                isLoading={isTriggering}
                icon={<ArrowPathIcon className="w-4 h-4" />}
              >
                Run Optimization
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Decision History */}
      <Card>
        <CardHeader>
          <CardTitle>Optimization History</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No optimization decisions yet
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((decision, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        decision.new_variant === 'A' 
                          ? 'bg-blue-100 text-blue-600' 
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {decision.new_variant}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">
                            {decision.previous_variant} → {decision.new_variant}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            getConfidenceColor(decision.confidence)
                          } bg-gray-100`}>
                            {(decision.confidence * 100).toFixed(0)}% confidence
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {decision.reason.join(', ')}
                        </div>
                        <div className="text-xs text-gray-400 mt-2">
                          {formatDate(decision.timestamp)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="text-gray-600">
                        Latency: {decision.metrics.avg_latency_ms.toFixed(0)}ms
                      </div>
                      <div className="text-gray-600">
                        Error Rate: {(decision.metrics.error_rate * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};