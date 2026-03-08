export type Variant = 'A' | 'B';
export type Status = 'success' | 'error' | 'pending';
export type TaskType = 'summarize' | 'classify' | 'translate' | 'chat' | 'extract';

export interface AgentEvent {
  id: number;
  timestamp: string;
  variant: Variant;
  status: Status;
  latency_ms: number;
  input_text: string;
  output_text: string;
  task_type: TaskType;
  metadata?: Record<string, any>;
}

export interface OptimizationDecision {
  previous_variant: Variant;
  new_variant: Variant;
  reason: string[];
  confidence: number;
  metrics: {
    avg_latency_ms: number;
    error_rate: number;
  };
  timestamp: string;
}

export interface MetricsSnapshot {
  total_events: number;
  error_rate: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  variant_distribution: Record<Variant, number>;
  task_distribution: Record<TaskType, number>;
  time_series: Array<{
    timestamp: string;
    latency: number;
    error_rate: number;
    volume: number;
  }>;
  active_alerts: Alert[];
}

export interface Alert {
  id: string;
  level: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
  resolved: boolean;
  metric_value?: number;
  threshold?: number;
}

export interface AgentRunRequest {
  text: string;
  variant?: Variant;
  metadata?: Record<string, any>;
}

export interface AgentRunResponse {
  output: string;
  variant: Variant;
  latency_ms: number;
  status: Status;
  event_id?: number;
  task_type: TaskType;
}