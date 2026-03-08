import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { BeakerIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';

import { agentApi, type AgentRunResponse } from '../../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import { Button } from '../common/Button';
import { VariantSelector } from './VariantSelector';
import { TestResults } from './TestResults';

const schema = z.object({
  text: z.string().min(1, 'Input text is required').max(1000, 'Text too long'),
  variant: z.enum(['A', 'B']).optional(),
});

type FormData = z.infer<typeof schema>;

interface AgentTesterProps {
  onTestComplete?: (result: AgentRunResponse) => void;
}

export const AgentTester: React.FC<AgentTesterProps> = ({ onTestComplete }) => {
  const [result, setResult] = useState<AgentRunResponse | null>(null);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      text: '',
      variant: undefined,
    },
  });

  const selectedVariant = watch('variant');

  const mutation = useMutation({
    mutationFn: agentApi.runAgent,
    onSuccess: (data) => {
      setResult(data);
      onTestComplete?.(data);
      toast.success('Agent test completed successfully');
      
      // Invalidate queries to refresh dashboard data
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      queryClient.invalidateQueries({ queryKey: ['recent-events'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to run agent');
    },
  });

  const onSubmit = async (data: FormData) => {
    mutation.mutate(data);
  };

  const handleClear = () => {
    setResult(null);
    reset();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <BeakerIcon className="w-5 h-5 mr-2" />
          A/B Test Console
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Input Text
            </label>
            <textarea
              {...register('text')}
              rows={4}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter text to process..."
              disabled={isSubmitting}
            />
            {errors.text && (
              <p className="mt-1 text-sm text-red-600">
                {errors.text.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Variant (Optional)
            </label>
            <VariantSelector
              selected={selectedVariant}
              onChange={(variant) => setValue('variant', variant)}
              disabled={isSubmitting}
            />
            <p className="mt-1 text-xs text-gray-500">
              Leave empty to let the router decide automatically
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            {result && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleClear}
                disabled={isSubmitting}
              >
                Clear
              </Button>
            )}
            <Button
              type="submit"
              disabled={isSubmitting}
              isLoading={isSubmitting}
              icon={<PaperAirplaneIcon className="w-4 h-4" />}
            >
              Run Test
            </Button>
          </div>
        </form>

        <TestResults result={result} isVisible={!!result} />
      </CardContent>
    </Card>
  );
};