import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Cog6ToothIcon,
  ServerIcon,
  BellIcon,
  PaintBrushIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { optimizerApi } from '../services/api';
import toast from 'react-hot-toast';

export const Settings = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);

  // Fetch current optimizer config
  const { data: config } = useQuery({
    queryKey: ['optimizer-config'],
    queryFn: () => optimizerApi.getConfig(),
  });

  // Local state for settings
  const [settings, setSettings] = useState({
    apiUrl: 'http://localhost:8000/api/v1',
    refreshInterval: 30,
    theme: 'light',
    notifications: true,
    chartAnimations: true,
    defaultTimeRange: '24h',
    itemsPerPage: 50,
    latencyThreshold: config?.latency_threshold_ms || 1000,
    errorThreshold: (config?.error_threshold || 0.25) * 100,
    minSamples: config?.min_samples || 30,
  });

  // Update config mutation
  const updateConfigMutation = useMutation({
    mutationFn: (newConfig: any) => optimizerApi.updateConfig(newConfig),
    onSuccess: () => {
      toast.success('Configuration saved successfully');
      queryClient.invalidateQueries({ queryKey: ['optimizer-config'] });
      setIsSaving(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to save configuration');
      setIsSaving(false);
    },
  });

  const handleSave = () => {
    setIsSaving(true);
    
    // Update optimizer thresholds
    updateConfigMutation.mutate({
      latency_threshold_ms: settings.latencyThreshold,
      error_threshold: settings.errorThreshold / 100,
      min_samples: settings.minSamples,
    });

    // Save frontend settings to localStorage
    localStorage.setItem('app-settings', JSON.stringify({
      refreshInterval: settings.refreshInterval,
      theme: settings.theme,
      notifications: settings.notifications,
      chartAnimations: settings.chartAnimations,
      defaultTimeRange: settings.defaultTimeRange,
      itemsPerPage: settings.itemsPerPage,
    }));

    toast.success('Settings saved locally');
  };

  const resetToDefaults = () => {
    setSettings({
      apiUrl: 'http://localhost:8000/api/v1',
      refreshInterval: 30,
      theme: 'light',
      notifications: true,
      chartAnimations: true,
      defaultTimeRange: '24h',
      itemsPerPage: 50,
      latencyThreshold: 1000,
      errorThreshold: 25,
      minSamples: 30,
    });
    toast.success('Reset to default values');
  };

  const tabs = [
    { id: 'general', name: 'General', icon: Cog6ToothIcon },
    { id: 'api', name: 'API & Server', icon: ServerIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'appearance', name: 'Appearance', icon: PaintBrushIcon },
    { id: 'thresholds', name: 'Thresholds', icon: DocumentTextIcon },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">
          Configure system preferences and optimization thresholds
        </p>
      </div>

      <div className="flex space-x-6">
        {/* Sidebar */}
        <div className="w-64 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <Card>
            <CardHeader>
              <CardTitle>
                {tabs.find(t => t.id === activeTab)?.name || 'Settings'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeTab === 'general' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Refresh Interval (seconds)
                    </label>
                    <input
                      type="number"
                      value={settings.refreshInterval}
                      onChange={(e) => setSettings({
                        ...settings,
                        refreshInterval: parseInt(e.target.value)
                      })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      min={5}
                      max={300}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      How often the dashboard refreshes data
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Default Time Range
                    </label>
                    <select
                      value={settings.defaultTimeRange}
                      onChange={(e) => setSettings({
                        ...settings,
                        defaultTimeRange: e.target.value
                      })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="1h">Last Hour</option>
                      <option value="24h">Last 24 Hours</option>
                      <option value="7d">Last 7 Days</option>
                      <option value="30d">Last 30 Days</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Items Per Page
                    </label>
                    <input
                      type="number"
                      value={settings.itemsPerPage}
                      onChange={(e) => setSettings({
                        ...settings,
                        itemsPerPage: parseInt(e.target.value)
                      })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      min={10}
                      max={200}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'api' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      API Base URL
                    </label>
                    <input
                      type="text"
                      value={settings.apiUrl}
                      onChange={(e) => setSettings({
                        ...settings,
                        apiUrl: e.target.value
                      })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Backend API endpoint (requires restart)
                    </p>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CheckCircleIcon className="w-5 h-5 text-green-500" />
                      <span className="text-sm text-gray-700">
                        Connected to: http://localhost:8000
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-700">Enable Notifications</p>
                      <p className="text-sm text-gray-500">Receive alerts for important events</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications}
                        onChange={(e) => setSettings({
                          ...settings,
                          notifications: e.target.checked
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-700">Error Rate Alerts</p>
                      <p className="text-sm text-gray-500">Get notified when error rate exceeds threshold</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={true}
                        disabled
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-blue-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                    </label>
                  </div>
                </div>
              )}

              {activeTab === 'appearance' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Theme
                    </label>
                    <div className="flex space-x-4">
                      <button
                        onClick={() => setSettings({...settings, theme: 'light'})}
                        className={`px-4 py-2 rounded-lg border ${
                          settings.theme === 'light'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300'
                        }`}
                      >
                        Light
                      </button>
                      <button
                        onClick={() => setSettings({...settings, theme: 'dark'})}
                        className={`px-4 py-2 rounded-lg border ${
                          settings.theme === 'dark'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300'
                        }`}
                      >
                        Dark
                      </button>
                      <button
                        onClick={() => setSettings({...settings, theme: 'system'})}
                        className={`px-4 py-2 rounded-lg border ${
                          settings.theme === 'system'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300'
                        }`}
                      >
                        System
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-700">Chart Animations</p>
                      <p className="text-sm text-gray-500">Enable smooth transitions in charts</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.chartAnimations}
                        onChange={(e) => setSettings({
                          ...settings,
                          chartAnimations: e.target.checked
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              )}

              {activeTab === 'thresholds' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Latency Threshold (ms)
                    </label>
                    <input
                      type="number"
                      value={settings.latencyThreshold}
                      onChange={(e) => setSettings({
                        ...settings,
                        latencyThreshold: parseInt(e.target.value)
                      })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      min={100}
                      max={5000}
                      step={100}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Alert when latency exceeds this value
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Error Threshold (%)
                    </label>
                    <input
                      type="number"
                      value={settings.errorThreshold}
                      onChange={(e) => setSettings({
                        ...settings,
                        errorThreshold: parseFloat(e.target.value)
                      })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
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
                      value={settings.minSamples}
                      onChange={(e) => setSettings({
                        ...settings,
                        minSamples: parseInt(e.target.value)
                      })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      min={10}
                      max={1000}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Minimum samples required before optimization
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
                <Button
                  variant="secondary"
                  onClick={resetToDefaults}
                  icon={<ArrowPathIcon className="w-4 h-4" />}
                >
                  Reset to Defaults
                </Button>
                <Button
                  onClick={handleSave}
                  isLoading={isSaving}
                >
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};