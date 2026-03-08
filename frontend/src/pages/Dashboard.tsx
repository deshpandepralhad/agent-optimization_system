import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { KPICard } from '../components/dashboard/KPICard';
import { VariantDistribution } from '../components/dashboard/VariantDistribution';
import { TaskDistribution } from '../components/dashboard/TaskDistribution';
import { RealTimeLogs } from '../components/dashboard/RealTimeLogs';
import { ChartBarIcon, ClockIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useAgentMetrics } from '../hooks/useAgentMetrics';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';

export const Dashboard = () => {
  const { data: metrics, isLoading, error: metricsError } = useAgentMetrics();

  // Fetch recent events for latency chart
  const { data: events = [], error: eventsError } = useQuery({
    queryKey: ['recent-events', 20],
    queryFn: () => analyticsApi.getRecentEvents(20),
    refetchInterval: 10000,
  });

  // Generate latency trend data from events
  const generateLatencyData = () => {
    if (!events || events.length === 0) {
      return [];
    }

    // Get last 15 events and reverse to show chronological order
    return events.slice(0, 15).reverse().map((event: any, index: number) => ({
      name: `#${index + 1}`,
      latency: event.latency_ms || 0,
      variant: event.variant,
      time: new Date(event.timestamp).toLocaleTimeString()
    }));
  };

  const latencyData = generateLatencyData();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
          <p className="text-sm text-blue-600">
            Latency: {payload[0].value.toFixed(2)}ms
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {payload[0].payload.time}
          </p>
          <p className="text-xs text-gray-500">
            Variant: {payload[0].payload.variant}
          </p>
        </div>
      );
    }
    return null;
  };

  // Error states
  if (metricsError || eventsError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 m-4">
        <h2 className="text-lg font-semibold text-red-800 mb-2">Connection Error</h2>
        <p className="text-red-600">Failed to connect to backend. Please ensure the server is running.</p>
        <p className="text-sm text-red-500 mt-2">Backend URL: http://localhost:8000</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 m-4">
        <p className="text-yellow-700">No data available. Run some tests to see metrics.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      
      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <KPICard
          title="Total Events"
          value={metrics.total_events.toLocaleString()}
          icon={<ChartBarIcon className="w-6 h-6" />}
          color="primary"
        />
        <KPICard
          title="Error Rate"
          value={`${(metrics.error_rate * 100).toFixed(1)}%`}
          subtitle={`${Math.round(metrics.total_events * metrics.error_rate)} errors`}
          icon={<ExclamationTriangleIcon className="w-6 h-6" />}
          color={metrics.error_rate > 0.25 ? 'error' : 'success'}
          alert={metrics.error_rate > 0.25}
        />
        <KPICard
          title="Avg Latency"
          value={`${metrics.avg_latency_ms}ms`}
          subtitle={`P95: ${metrics.p95_latency_ms}ms`}
          icon={<ClockIcon className="w-6 h-6" />}
          color={metrics.avg_latency_ms > 1000 ? 'warning' : 'primary'}
        />
        <KPICard
          title="Success Rate"
          value={`${((1 - metrics.error_rate) * 100).toFixed(1)}%`}
          icon={<CheckCircleIcon className="w-6 h-6" />}
          color="success"
        />
      </div>

      {/* Latency Trends Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Latency Trends (Last 15 Events)</CardTitle>
        </CardHeader>
        <CardContent>
          {latencyData.length === 0 ? (
            <div className="h-64 bg-gray-50 rounded flex items-center justify-center text-gray-400">
              <div className="text-center">
                <p>📊 No latency data available</p>
                <p className="text-sm mt-2">Run some tests to see trends</p>
              </div>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={latencyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#6B7280" 
                    label={{ 
                      value: 'Recent Events', 
                      position: 'insideBottom', 
                      offset: -5,
                      style: { fill: '#6B7280' }
                    }} 
                  />
                  <YAxis 
                    stroke="#6B7280" 
                    unit="ms"
                    label={{ 
                      value: 'Latency (ms)', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { fill: '#6B7280' }
                    }}
                  />
                  <Tooltip content={CustomTooltip} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="latency"
                    name="Latency"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#3b82f6' }}
                    activeDot={{ r: 6, fill: '#2563eb' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <RealTimeLogs />
        </div>
        <div className="space-y-6">
          <VariantDistribution data={metrics.variant_distribution} />
          <TaskDistribution data={metrics.task_distribution} />
        </div>
      </div>
    </div>
  );
};