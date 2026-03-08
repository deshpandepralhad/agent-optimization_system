import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import { Button } from '../common/Button';
import { optimizerApi, type OptimizationConfig } from '../../services/api';
import toast from 'react-hot-toast';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';

interface ThresholdConfigProps {
  config: OptimizationConfig;
}

export const ThresholdConfig: React.FC<ThresholdConfigProps> = ({ config }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    latency_threshold_ms: config.latency_threshold_ms,
    error_threshold: config.error_threshold * 100, // Convert to percentage
    min_samples: config.min_samples,
    exploration_rate: config.exploration_rate * 100,
  });
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data: any) => optimizerApi.updateConfig(data),
    onSuccess: () => {
      toast.success('Configuration updated');
      queryClient.invalidateQueries({ queryKey: ['optimizer-config'] });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update config');
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      latency_threshold_ms: formData.latency_threshold_ms,
      error_threshold: formData.error_threshold / 100,
      min_samples: formData.min_samples,
      exploration_rate: formData.exploration_rate / 100,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Cog6ToothIcon className="w-5 h-5 mr-2" />
          Optimization Thresholds
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!isEditing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">Latency Threshold</div>
                <div className="text-lg font-semibold">{config.latency_threshold_ms}ms</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Error Threshold</div>
                <div className="text-lg font-semibold">{(config.error_threshold * 100).toFixed(0)}%</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Min Samples</div>
                <div className="text-lg font-semibold">{config.min_samples}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Exploration Rate</div>
                <div className="text-lg font-semibold">{(config.exploration_rate * 100).toFixed(0)}%</div>
              </div>
            </div>
            <Button onClick={() => setIsEditing(true)} variant="secondary">
              Adjust Thresholds
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Latency Threshold (ms)
              </label>
              <input
                type="number"
                value={formData.latency_threshold_ms}
                onChange={(e) => setFormData({
                  ...formData,
                  latency_threshold_ms: parseInt(e.target.value)
                })}
                className="w-full px-3 py-2 border rounded-lg"
                min={100}
                max={5000}
                step={100}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Error Threshold (%)
              </label>
              <input
                type="number"
                value={formData.error_threshold}
                onChange={(e) => setFormData({
                  ...formData,
                  error_threshold: parseFloat(e.target.value)
                })}
                className="w-full px-3 py-2 border rounded-lg"
                min={1}
                max={50}
                step={1}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Samples
              </label>
              <input
                type="number"
                value={formData.min_samples}
                onChange={(e) => setFormData({
                  ...formData,
                  min_samples: parseInt(e.target.value)
                })}
                className="w-full px-3 py-2 border rounded-lg"
                min={10}
                max={1000}
                step={10}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Exploration Rate (%)
              </label>
              <input
                type="number"
                value={formData.exploration_rate}
                onChange={(e) => setFormData({
                  ...formData,
                  exploration_rate: parseFloat(e.target.value)
                })}
                className="w-full px-3 py-2 border rounded-lg"
                min={1}
                max={50}
                step={1}
              />
            </div>
            <div className="flex space-x-3">
              <Button onClick={handleSave} isLoading={updateMutation.isPending}>
                Save Changes
              </Button>
              <Button onClick={() => setIsEditing(false)} variant="secondary">
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};