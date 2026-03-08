import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';

interface TaskDistributionProps {
  data: Record<string, number>;
}

export const TaskDistribution: React.FC<TaskDistributionProps> = ({ data }) => {
  const total = Object.values(data).reduce((sum, val) => sum + val, 0);
  
  const colors = [
    'bg-blue-600',
    'bg-green-600',
    'bg-yellow-600',
    'bg-red-600',
    'bg-purple-600',
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Task Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Object.entries(data).map(([task, count], index) => (
            <div key={task}>
              <div className="flex justify-between text-sm mb-1">
                <span className="capitalize">{task}</span>
                <span className="text-gray-600">
                  {count} ({((count / total) * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`${colors[index % colors.length]} h-2 rounded-full`}
                  style={{ width: `${(count / total) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};