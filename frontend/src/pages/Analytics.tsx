import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from 'recharts';
import {
  ChartBarIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  CircleStackIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { analyticsApi } from '../services/api';
import { format, subDays, subHours } from 'date-fns';

export const Analytics = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('line');

  // Fetch metrics
  const { data: metrics, error: metricsError } = useQuery({
    queryKey: ['metrics', timeRange],
    queryFn: () => analyticsApi.getMetrics(timeRange),
  });

  // Fetch events for time series
  const { data: events = [], error: eventsError } = useQuery({
    queryKey: ['recent-events', 200],
    queryFn: () => analyticsApi.getRecentEvents(200),
  });

  // Error state
  if (metricsError || eventsError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 m-4">
        <h2 className="text-lg font-semibold text-red-800 mb-2">Connection Error</h2>
        <p className="text-red-600">Failed to connect to backend. Please ensure the server is running.</p>
      </div>
    );
  }

  // Generate time series data from events
  const generateTimeSeriesData = () => {
    if (!events || events.length === 0) {
      return [];
    }

    const now = new Date();
    let startDate: Date;
    
    switch (timeRange) {
      case '24h':
        startDate = subHours(now, 24);
        break;
      case '7d':
        startDate = subDays(now, 7);
        break;
      case '30d':
        startDate = subDays(now, 30);
        break;
      case '90d':
        startDate = subDays(now, 90);
        break;
      default:
        startDate = subDays(now, 7);
    }

    // Filter events within time range
    const filteredEvents = events.filter((event: any) => {
      const eventDate = new Date(event.timestamp);
      return eventDate >= startDate;
    });

    if (filteredEvents.length === 0) {
      return [];
    }

    // Group events by time interval
    const groupedData = new Map();
    
    filteredEvents.forEach((event: any) => {
      const date = new Date(event.timestamp);
      
      let key: string;
      if (timeRange === '24h') {
        key = format(date, 'HH:00');
      } else {
        key = format(date, 'MMM dd');
      }
      
      if (!groupedData.has(key)) {
        groupedData.set(key, {
          timestamp: key,
          fullDate: date,
          total: 0,
          errors: 0,
          latencySum: 0,
          latencyCount: 0,
          variantA: 0,
          variantB: 0,
        });
      }
      
      const group = groupedData.get(key);
      group.total++;
      if (event.status === 'error') group.errors++;
      if (event.latency_ms) {
        group.latencySum += event.latency_ms;
        group.latencyCount++;
      }
      if (event.variant === 'A') group.variantA++;
      else if (event.variant === 'B') group.variantB++;
    });

    // Calculate averages and sort
    const result = Array.from(groupedData.values())
      .map(group => ({
        timestamp: group.timestamp,
        fullDate: group.fullDate,
        total: group.total,
        errors: group.errors,
        variantA: group.variantA,
        variantB: group.variantB,
        avgLatency: group.latencyCount > 0 
          ? Number((group.latencySum / group.latencyCount).toFixed(2)) 
          : 0,
        errorRate: group.total > 0 
          ? Number(((group.errors / group.total) * 100).toFixed(1)) 
          : 0,
      }))
      .sort((a, b) => a.fullDate.getTime() - b.fullDate.getTime());

    return result;
  };

  const timeSeriesData = generateTimeSeriesData();

  // Calculate trends
  const calculateTrend = (data: any[], key: string) => {
    if (data.length < 2) return { value: '0', direction: 'neutral' as const };
    const first = data[0][key];
    const last = data[data.length - 1][key];
    if (first === 0) return { value: '0', direction: 'neutral' as const };
    const change = ((last - first) / first) * 100;
    return {
      value: Math.abs(change).toFixed(1),
      direction: change > 0.1 ? 'up' : change < -0.1 ? 'down' : 'neutral'
    };
  };

  const latencyTrend = calculateTrend(timeSeriesData, 'avgLatency');
  const errorTrend = calculateTrend(timeSeriesData, 'errorRate');
  const volumeTrend = calculateTrend(timeSeriesData, 'total');

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border dark:border-gray-700">
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">{label}</p>
          {payload.map((entry: any) => (
            <div key={entry.name} className="flex items-center justify-between text-sm">
              <span style={{ color: entry.color }}>{entry.name}:</span>
              <span className="ml-4 font-medium">
                {entry.name.includes('Rate') 
                  ? `${entry.value.toFixed(1)}%`
                  : entry.name.includes('Latency')
                  ? `${entry.value.toFixed(2)}ms`
                  : entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Show no data state
  if (timeSeriesData.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Advanced Analytics</h1>
            <p className="text-gray-600 mt-1">Deep dive into agent performance trends and patterns</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-12">
            <div className="text-center text-gray-400">
              <p className="text-lg">📊 No data available for selected time range</p>
              <p className="text-sm mt-2">Run some tests to see analytics</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Advanced Analytics</h1>
          <p className="text-gray-600 mt-1">Deep dive into agent performance trends and patterns</p>
        </div>
        
        <div className="flex space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          
          <div className="flex rounded-lg border">
            <button
              onClick={() => setChartType('line')}
              className={`px-3 py-2 text-sm ${
                chartType === 'line' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              } rounded-l-lg transition-colors`}
            >
              Line
            </button>
            <button
              onClick={() => setChartType('area')}
              className={`px-3 py-2 text-sm ${
                chartType === 'area' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              } transition-colors`}
            >
              Area
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`px-3 py-2 text-sm ${
                chartType === 'bar' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              } rounded-r-lg transition-colors`}
            >
              Bar
            </button>
          </div>
        </div>
      </div>

      {/* Trend Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Total Events</div>
                <div className="text-2xl font-bold text-gray-900">
                  {metrics?.total_events || 0}
                </div>
              </div>
              <ChartBarIcon className="w-8 h-8 text-blue-500" />
            </div>
            <div className="mt-2 text-sm">
              <span className={`${
                volumeTrend.direction === 'up' ? 'text-green-600' : 
                volumeTrend.direction === 'down' ? 'text-red-600' : 'text-gray-500'
              }`}>
                {volumeTrend.direction === 'up' ? '↑' : volumeTrend.direction === 'down' ? '↓' : '→'}
                {' '}{volumeTrend.value}%
              </span>
              <span className="text-gray-500 ml-1">vs previous period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Avg Latency</div>
                <div className="text-2xl font-bold text-gray-900">
                  {metrics?.avg_latency_ms?.toFixed(2)}ms
                </div>
              </div>
              <ClockIcon className="w-8 h-8 text-purple-500" />
            </div>
            <div className="mt-2 text-sm">
              <span className={`${
                latencyTrend.direction === 'down' ? 'text-green-600' : 
                latencyTrend.direction === 'up' ? 'text-red-600' : 'text-gray-500'
              }`}>
                {latencyTrend.direction === 'down' ? '↓' : latencyTrend.direction === 'up' ? '↑' : '→'}
                {' '}{latencyTrend.value}%
              </span>
              <span className="text-gray-500 ml-1">vs previous period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Error Rate</div>
                <div className="text-2xl font-bold text-gray-900">
                  {((metrics?.error_rate || 0) * 100).toFixed(1)}%
                </div>
              </div>
              <ArrowTrendingUpIcon className="w-8 h-8 text-red-500" />
            </div>
            <div className="mt-2 text-sm">
              <span className={`${
                errorTrend.direction === 'down' ? 'text-green-600' : 
                errorTrend.direction === 'up' ? 'text-red-600' : 'text-gray-500'
              }`}>
                {errorTrend.direction === 'down' ? '↓' : errorTrend.direction === 'up' ? '↑' : '→'}
                {' '}{errorTrend.value}%
              </span>
              <span className="text-gray-500 ml-1">vs previous period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Success Rate</div>
                <div className="text-2xl font-bold text-gray-900">
                  {((1 - (metrics?.error_rate || 0)) * 100).toFixed(1)}%
                </div>
              </div>
              <CircleStackIcon className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Time Series Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CalendarIcon className="w-5 h-5 mr-2" />
            Performance Trends Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'line' ? (
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="timestamp" stroke="#6B7280" />
                  <YAxis yAxisId="left" stroke="#6B7280" />
                  <YAxis yAxisId="right" orientation="right" stroke="#6B7280" />
                  <Tooltip content={CustomTooltip} />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="total"
                    name="Event Volume"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="avgLatency"
                    name="Avg Latency (ms)"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="errorRate"
                    name="Error Rate (%)"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              ) : chartType === 'area' ? (
                <AreaChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="timestamp" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip content={CustomTooltip} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="variantA"
                    name="Variant A"
                    stackId="1"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="variantB"
                    name="Variant B"
                    stackId="1"
                    stroke="#ef4444"
                    fill="#ef4444"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              ) : (
                <BarChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="timestamp" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip content={CustomTooltip} />
                  <Legend />
                  <Bar dataKey="variantA" name="Variant A" fill="#3b82f6" />
                  <Bar dataKey="variantB" name="Variant B" fill="#ef4444" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Two Column Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latency Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Latency Distribution by Variant</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={timeSeriesData.slice(-10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="timestamp" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="variantA" name="Variant A" fill="#3b82f6" />
                  <Bar dataKey="variantB" name="Variant B" fill="#ef4444" />
                  <Line
                    type="monotone"
                    dataKey="avgLatency"
                    name="Overall Avg (ms)"
                    stroke="#10b981"
                    strokeWidth={2}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Error Rate Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Error Rate Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="timestamp" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" unit="%" />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="errorRate"
                    name="Error Rate"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistical Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Statistical Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-3">Variant A Statistics</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Runs:</span>
                  <span className="text-sm font-medium">{metrics?.variant_distribution?.A || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Success Rate:</span>
                  <span className="text-sm font-medium text-green-600">
                    {metrics?.variant_distribution?.A ? '100%' : '0%'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Avg Latency:</span>
                  <span className="text-sm font-medium">
                    {metrics?.avg_latency_ms?.toFixed(2) || '0'}ms
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-3">Variant B Statistics</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Runs:</span>
                  <span className="text-sm font-medium">{metrics?.variant_distribution?.B || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Success Rate:</span>
                  <span className="text-sm font-medium text-yellow-600">
                    {metrics?.variant_distribution?.B 
                      ? `${((1 - (metrics?.error_rate || 0)) * 100).toFixed(1)}%` 
                      : '0%'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Avg Latency:</span>
                  <span className="text-sm font-medium">
                    {metrics?.avg_latency_ms?.toFixed(2) || '0'}ms
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-3">Key Insights</h3>
              <div className="space-y-2">
                {timeSeriesData.length > 0 ? (
                  <>
                    <div className="p-2 bg-green-50 rounded">
                      <p className="text-xs text-green-800">
                        ✓ Variant A has lower error rate
                      </p>
                    </div>
                    <div className="p-2 bg-blue-50 rounded">
                      <p className="text-xs text-blue-800">
                        ℹ Total tests: {metrics?.total_events || 0}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="p-2 bg-gray-50 rounded">
                    <p className="text-xs text-gray-800">
                      Run more tests to see insights
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};