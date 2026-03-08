import React from 'react';
import { ClockIcon } from '@heroicons/react/24/outline';
import type { AgentRunResponse } from '../../services/api';

interface HistoryTableProps {
  events: AgentRunResponse[];
}

export const HistoryTable: React.FC<HistoryTableProps> = ({ events }) => {
  if (events.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500">No test history yet</p>
        <p className="text-sm text-gray-400 mt-1">Run your first test to see results here</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variant</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Latency</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Task</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Input</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {events.map((event, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {new Date().toLocaleTimeString()} {/* You'd use actual timestamp */}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  event.variant === 'A' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {event.variant}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  event.status === 'success'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {event.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {event.latency_ms}ms
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">
                {event.task_type}
              </td>
              <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                {event.output.substring(0, 50)}...
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};