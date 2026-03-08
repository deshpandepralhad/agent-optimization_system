import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import { analyticsApi } from '../../services/api';

interface Log {
  id: number;
  timestamp: string;
  variant: string;
  status: string;
  latency_ms: number;
  task_type: string;
  input_text?: string;
}

export const RealTimeLogs: React.FC = () => {
  const { data: events = [], isLoading, error } = useQuery({
    queryKey: ['recent-events'],
    queryFn: () => analyticsApi.getRecentEvents(10),
    refetchInterval: 5000, // Refresh every 5 seconds
  });

 const formatTime = (timestamp: string) => {
  try {
    // Parse the UTC timestamp and convert to local
    const utcDate = new Date(timestamp);
    // Get local time components
    const hours = utcDate.getHours();
    const minutes = utcDate.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    
    return `${displayHours}:${displayMinutes} ${ampm}`;
  } catch {
    return '-';
  }
};

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Real-Time Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Real-Time Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-red-500">
            Failed to load events
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Real-Time Events</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto max-h-96">
          {events.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No events yet. Run some tests!
            </div>
          ) : (
            <table className="min-w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Variant</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Latency</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Task</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {events.map((log: Log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {formatTime(log.timestamp)}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        log.variant === 'A' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {log.variant}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        log.status === 'success'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {log.latency_ms?.toFixed(2)}ms
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600 capitalize">
                      {log.task_type}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </CardContent>
    </Card>
  );
};