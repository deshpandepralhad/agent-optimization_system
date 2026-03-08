import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';

interface VariantDistributionProps {
  data: Record<string, number>;
}

export const VariantDistribution: React.FC<VariantDistributionProps> = ({ data }) => {
  const total = Object.values(data).reduce((sum, val) => sum + val, 0);
  
  const getPercentage = (value: number) => {
    return total > 0 ? ((value / total) * 100).toFixed(1) : '0';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>A/B Test Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(data).map(([variant, count]) => (
            <div key={variant}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">Variant {variant}</span>
                <span className="text-gray-600">{count} events ({getPercentage(count)}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    variant === 'A' ? 'bg-blue-600' : 'bg-red-600'
                  }`}
                  style={{ width: `${getPercentage(count)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};