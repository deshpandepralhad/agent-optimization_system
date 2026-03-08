import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../services/api';

export const useAgentMetrics = (timeRange: string = '24h') => {
  return useQuery({
    queryKey: ['metrics', timeRange],
    queryFn: () => analyticsApi.getMetrics(timeRange),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};