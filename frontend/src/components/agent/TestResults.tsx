import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import type { AgentRunResponse } from '../../services/api';

interface TestResultsProps {
  result: AgentRunResponse | null;
  isVisible: boolean;
}

export const TestResults: React.FC<TestResultsProps> = ({ result, isVisible }) => {
  if (!result || !isVisible) return null;

  const isSuccess = result.status === 'success';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="mt-6"
      >
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className={`px-6 py-4 ${
            isSuccess ? 'bg-green-50' : 'bg-red-50'
          } border-b border-gray-200`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {isSuccess ? (
                  <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2" />
                ) : (
                  <XCircleIcon className="w-5 h-5 text-red-600 mr-2" />
                )}
                <span className={`font-semibold ${
                  isSuccess ? 'text-green-700' : 'text-red-700'
                }`}>
                  {isSuccess ? 'Success' : 'Error'}
                </span>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                result.variant === 'A' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                Variant {result.variant}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Metrics */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Latency</div>
                <div className="font-semibold text-gray-900">
                  {result.latency_ms}ms
                </div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Task Type</div>
                <div className="font-semibold text-gray-900 capitalize">
                  {result.task_type}
                </div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Event ID</div>
                <div className="font-semibold text-gray-900">
                  {result.event_id || '-'}
                </div>
              </div>
            </div>

            {/* Input/Output */}
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Input</div>
                <div className="bg-gray-50 rounded-lg p-3 text-gray-600 text-sm">
                  {result.output.includes('ERROR') ? 
                    result.output.split('ERROR: ')[1] : 
                    'Request processed successfully'}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Output</div>
                <div className="bg-gray-50 rounded-lg p-3 text-gray-600 text-sm font-mono">
                  {result.output}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};