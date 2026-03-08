import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

export interface MetricsSnapshot {
  total_events: number;
  error_rate: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  variant_distribution: Record<string, number>;
  task_distribution: Record<string, number>;
  time_series?: any[];
  active_alerts?: any[];
  optimization_history?: any[];
}

export interface AgentRunRequest {
  text: string;
  variant?: 'A' | 'B';
  metadata?: Record<string, any>;
}

export interface AgentRunResponse {
  output: string;
  variant: 'A' | 'B';
  latency_ms: number;
  status: 'success' | 'error';
  event_id?: number;
  task_type: string;
}

export interface AgentEvent {
  id: number;
  timestamp: string;
  variant: string;
  status: string;
  latency_ms: number;
  task_type: string;
  input_text?: string;
}

export interface OptimizationDecision {
  previous_variant: 'A' | 'B';
  new_variant: 'A' | 'B';
  reason: string[];
  confidence: number;
  metrics: {
    avg_latency_ms: number;
    error_rate: number;
  };
  timestamp: string;
}

export interface OptimizationConfig {
  active_variant: 'A' | 'B';
  min_samples: number;
  latency_threshold_ms: number;
  error_threshold: number;
  exploration_rate: number;
  last_updated?: string;
}

export interface JudgeScore {
  accuracy: number;
  clarity: number;
  completeness: number;
}

export interface JudgeResponse {
  winner: 'A' | 'B' | 'tie';
  scores: {
    A: JudgeScore;
    B: JudgeScore;
  };
  reasoning: string;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 🔴 Increased from 10000 to 60000 (60 seconds) for Ollama
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use((config) => {
  console.debug(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      console.error('[API Error] Request timeout - Ollama might be taking too long');
    } else {
      console.error('[API Error]', error.response?.data || error.message);
    }
    return Promise.reject(error);
  }
);

export const analyticsApi = {
  getMetrics: async (timeRange: string = '24h'): Promise<MetricsSnapshot> => {
    const response = await api.get(`/analytics/metrics?time_range=${timeRange}`);
    return response.data;
  },
  
  getRecentEvents: async (limit: number = 10): Promise<AgentEvent[]> => {
    const response = await api.get(`/analytics/events?limit=${limit}`);
    return response.data;
  }
};

export const agentApi = {
  runAgent: async (request: AgentRunRequest): Promise<AgentRunResponse> => {
    const response = await api.post('/agent/run', request);
    return response.data;
  },

  getVariants: async () => {
    const response = await api.get('/agent/variants');
    return response.data;
  }
};

export const optimizerApi = {
  getHistory: async (limit: number = 20): Promise<OptimizationDecision[]> => {
    const response = await api.get(`/optimizer/history?limit=${limit}`);
    return response.data;
  },

  getConfig: async (): Promise<OptimizationConfig> => {
    const response = await api.get('/optimizer/config');
    return response.data;
  },

  updateConfig: async (config: Partial<OptimizationConfig>): Promise<OptimizationConfig> => {
    const response = await api.put('/optimizer/config', config);
    return response.data;
  },

  triggerOptimization: async (): Promise<OptimizationDecision> => {
    const response = await api.post('/optimizer/trigger');
    return response.data;
  },

  getVariantComparison: async (timeRange: string = '24h'): Promise<any> => {
    const response = await api.get(`/optimizer/compare?time_range=${timeRange}`);
    return response.data;
  }
};

// 🔴 Judge API with retry capability for slow Ollama responses
export const judgeApi = {
  compareResponses: async (prompt: string, responseA: string, responseB: string): Promise<JudgeResponse> => {
    const params = new URLSearchParams({
      prompt,
      response_a: responseA,
      response_b: responseB,
      mode: 'pairwise'
    });
    
    try {
      const response = await api.post(`/judge/evaluate?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Judge API failed:', error);
      // Return fallback response so UI doesn't break
      return {
        winner: 'tie',
        scores: {
          A: { accuracy: 5, clarity: 5, completeness: 5 },
          B: { accuracy: 5, clarity: 5, completeness: 5 }
        },
        reasoning: 'Unable to evaluate at this time (timeout)'
      };
    }
  },

  getBehaviorPatterns: async (variant: 'A' | 'B', limit: number = 100) => {
    try {
      const response = await api.get(`/judge/patterns/${variant}?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Get behavior patterns failed:', error);
      return { patterns: {}, error: 'Failed to load' };
    }
  },

  evaluateTest: async (testId: number, prompt: string, responseA: string, responseB: string) => {
    try {
      const response = await api.post(`/judge/test/${testId}/evaluate`, {
        prompt,
        response_a: responseA,
        response_b: responseB
      });
      return response.data;
    } catch (error) {
      console.error('Evaluate test failed:', error);
      return { error: 'Failed to evaluate' };
    }
  }
};

export default api;