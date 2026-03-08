import React, { useState } from 'react';
import { AgentTester } from '../components/agent/AgentTester';
import { HistoryTable } from '../components/agent/HistoryTable';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import type { AgentRunResponse } from '../services/api';

export const AgentTesting = () => {
  const [history, setHistory] = useState<AgentRunResponse[]>([]);

  const handleTestComplete = (result: AgentRunResponse) => {
    setHistory(prev => [result, ...prev].slice(0, 50)); // Keep last 50 tests
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">A/B Testing Console</h1>
        <p className="text-gray-600 mt-1">Test and compare agent variants in real-time</p>
      </div>

      {/* Test Console */}
      <AgentTester onTestComplete={handleTestComplete} />

      {/* Test History */}
      <Card>
        <CardHeader>
          <CardTitle>Test History</CardTitle>
        </CardHeader>
        <CardContent>
          <HistoryTable events={history} />
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Total Tests</div>
            <div className="text-2xl font-bold text-gray-900">{history.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Success Rate</div>
            <div className="text-2xl font-bold text-gray-900">
              {history.length > 0
                ? `${((history.filter(h => h.status === 'success').length / history.length) * 100).toFixed(1)}%`
                : '0%'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Avg Latency</div>
            <div className="text-2xl font-bold text-gray-900">
              {history.length > 0
                ? `${Math.round(history.reduce((acc, h) => acc + h.latency_ms, 0) / history.length)}ms`
                : '0ms'}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};