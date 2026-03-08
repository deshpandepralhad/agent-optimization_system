import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import { SparklesIcon } from '@heroicons/react/24/outline';

interface JudgeScoresProps {
  scores: {
    variant_a: {
      accuracy: number;
      clarity: number;
      completeness: number;
    };
    variant_b: {
      accuracy: number;
      clarity: number;
      completeness: number;
    };
    winner: string;
    reasoning: string;
  };
}

export const JudgeScores: React.FC<JudgeScoresProps> = ({ scores }) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <SparklesIcon className="w-5 h-5 mr-2 text-purple-500" />
          LLM-as-a-Judge Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          {/* Variant A Scores */}
          <div className="space-y-3">
            <h3 className="font-semibold text-blue-600">Variant A</h3>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-sm">
                  <span>Accuracy</span>
                  <span className="font-medium">{scores.variant_a.accuracy}/10</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${scores.variant_a.accuracy * 10}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm">
                  <span>Clarity</span>
                  <span className="font-medium">{scores.variant_a.clarity}/10</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${scores.variant_a.clarity * 10}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm">
                  <span>Completeness</span>
                  <span className="font-medium">{scores.variant_a.completeness}/10</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${scores.variant_a.completeness * 10}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Variant B Scores */}
          <div className="space-y-3">
            <h3 className="font-semibold text-red-600">Variant B</h3>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-sm">
                  <span>Accuracy</span>
                  <span className="font-medium">{scores.variant_b.accuracy}/10</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-red-600 h-2 rounded-full" 
                    style={{ width: `${scores.variant_b.accuracy * 10}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm">
                  <span>Clarity</span>
                  <span className="font-medium">{scores.variant_b.clarity}/10</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-red-600 h-2 rounded-full" 
                    style={{ width: `${scores.variant_b.clarity * 10}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm">
                  <span>Completeness</span>
                  <span className="font-medium">{scores.variant_b.completeness}/10</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-red-600 h-2 rounded-full" 
                    style={{ width: `${scores.variant_b.completeness * 10}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Winner and Reasoning */}
        <div className={`mt-4 p-3 rounded-lg ${
          scores.winner === 'A' ? 'bg-blue-50' : 'bg-red-50'
        }`}>
          <p className="text-sm font-medium">
            <span className="font-semibold">Winner:</span>{' '}
            <span className={scores.winner === 'A' ? 'text-blue-600' : 'text-red-600'}>
              Variant {scores.winner}
            </span>
          </p>
          <p className="text-sm text-gray-600 mt-1">{scores.reasoning}</p>
        </div>
      </CardContent>
    </Card>
  );
};