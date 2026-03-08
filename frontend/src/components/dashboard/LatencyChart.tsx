import React, { useState } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import { Button } from '../common/Button';
import { format, parseISO } from 'date-fns';

interface LatencyChartProps {
  data: Array<{
    timestamp: string;
    avg_latency: number;
    p95_latency: number;
    p99_latency: number;
  }>;
  isLoading?: boolean;
}

type ChartType = 'line' | 'area';
type MetricType = 'avg' | 'p95' | 'p99' | 'all';

export const LatencyChart: React.FC<LatencyChartProps> = ({ data, isLoading }) => {
  const [chartType, setChartType] = useState<ChartType>('line');
  const [metrics, setMetrics] = useState<MetricType>('all');

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Latency Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 animate-pulse bg-gray-200 dark:bg-gray-700 rounded" />
        </CardContent>
      </Card>
    );
  }

  const formatXAxis = (timestamp: string) => {
    return format(parseISO(timestamp), 'HH:mm');
  };

  const formatTooltipLabel = (timestamp: string) => {
    return format(parseISO(timestamp), 'MMM d, yyyy HH:mm:ss');
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {formatTooltipLabel(label)}
          </p>
          {payload.map((entry: any) => (
            <p
              key={entry.name}
              className="text-sm"
              style={{ color: entry.color }}
            >
              {entry.name}: {entry.value.toFixed(2)}ms
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const getVisibleMetrics = () => {
    switch (metrics) {
      case 'avg':
        return [{ key: 'avg_latency', color: '#3b82f6', name: 'Avg Latency' }];
      case 'p95':
        return [{ key: 'p95_latency', color: '#ef4444', name: 'P95 Latency' }];
      case 'p99':
        return [{ key: 'p99_latency', color: '#f59e0b', name: 'P99 Latency' }];
      default:
        return [
          { key: 'avg_latency', color: '#3b82f6', name: 'Avg Latency' },
          { key: 'p95_latency', color: '#ef4444', name: 'P95 Latency' },
          { key: 'p99_latency', color: '#f59e0b', name: 'P99 Latency' },
        ];
    }
  };

  const ChartComponent = chartType === 'line' ? LineChart : AreaChart;
  const DataComponent = chartType === 'line' ? Line : Area;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Latency Trends</CardTitle>
          <div className="flex space-x-2">
            <div className="flex rounded-lg border dark:border-gray-700">
              <Button
                variant={chartType === 'line' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setChartType('line')}
                className="rounded-r-none"
              >
                Line
              </Button>
              <Button
                variant={chartType === 'area' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setChartType('area')}
                className="rounded-l-none"
              >
                Area
              </Button>
            </div>
            <select
              value={metrics}
              onChange={(e) => setMetrics(e.target.value as MetricType)}
              className="rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1 text-sm"
            >
              <option value="all">All Metrics</option>
              <option value="avg">Avg Only</option>
              <option value="p95">P95 Only</option>
              <option value="p99">P99 Only</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <ChartComponent data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatXAxis}
                stroke="#6B7280"
              />
              <YAxis stroke="#6B7280" unit="ms" />
              <Tooltip content={CustomTooltip} />
              <Legend />
              {getVisibleMetrics().map((metric) => (
                <DataComponent
                  key={metric.key}
                  type="monotone"
                  dataKey={metric.key}
                  name={metric.name}
                  stroke={metric.color}
                  fill={metric.color}
                  fillOpacity={0.1}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
              ))}
              <Brush
                dataKey="timestamp"
                height={30}
                stroke="#3b82f6"
                tickFormatter={formatXAxis}
              />
            </ChartComponent>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};