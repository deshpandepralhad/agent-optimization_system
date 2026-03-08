import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { MetricsSnapshot, Alert } from '../types/agent';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';

export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [metrics, setMetrics] = useState<MetricsSnapshot | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [latestEvent, setLatestEvent] = useState<any>(null);
  
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Connect to WebSocket
    socketRef.current = io(WS_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    socket.on('metrics_update', (data: MetricsSnapshot) => {
      setMetrics(data);
    });

    socket.on('new_alert', (alert: Alert) => {
      setAlerts((prev) => [alert, ...prev].slice(0, 50)); // Keep last 50 alerts
      
      // Show browser notification if supported
      if (Notification.permission === 'granted') {
        new Notification(`Alert: ${alert.level}`, {
          body: alert.message,
          icon: '/alert-icon.png',
        });
      }
    });

    socket.on('new_agent_event', (event: any) => {
      setLatestEvent(event);
    });

    return () => {
      socket.close();
    };
  }, []);

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  return {
    isConnected,
    metrics,
    alerts,
    latestEvent,
    requestNotificationPermission,
  };
};