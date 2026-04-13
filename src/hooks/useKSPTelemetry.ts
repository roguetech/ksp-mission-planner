import { useEffect, useRef, useCallback } from 'react';
import { useTelemetryStore } from '../stores/telemetryStore';
import { VesselTelemetry } from '../types';

export function useKSPTelemetry() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const {
    serverUrl,
    autoReconnect,
    connection,
    setConnectionStatus,
    updateTelemetry,
    clearTelemetry,
  } = useTelemetryStore();

  const connect = useCallback(() => {
    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Clear any pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setConnectionStatus('connecting');

    try {
      // Normalize URL to ensure ws:// or wss:// prefix
      let wsUrl = serverUrl.trim();
      if (!wsUrl.startsWith('ws://') && !wsUrl.startsWith('wss://')) {
        // If it starts with http/https, convert to ws/wss
        if (wsUrl.startsWith('https://')) {
          wsUrl = 'wss://' + wsUrl.slice(8);
        } else if (wsUrl.startsWith('http://')) {
          wsUrl = 'ws://' + wsUrl.slice(7);
        } else {
          // Default to ws://
          wsUrl = 'ws://' + wsUrl;
        }
      }

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus('connected');
        console.log('[KSP Telemetry] Connected to', serverUrl);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as VesselTelemetry;
          updateTelemetry({
            ...data,
            timestamp: Date.now(),
          });
        } catch (err) {
          console.error('[KSP Telemetry] Failed to parse message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('[KSP Telemetry] WebSocket error:', error);
        setConnectionStatus('error', 'Connection error');
      };

      ws.onclose = (event) => {
        console.log('[KSP Telemetry] Disconnected:', event.code, event.reason);
        wsRef.current = null;

        if (event.code !== 1000) {
          // Abnormal close
          setConnectionStatus('error', `Disconnected: ${event.reason || 'Connection lost'}`);

          // Auto reconnect
          if (autoReconnect) {
            reconnectTimeoutRef.current = window.setTimeout(() => {
              console.log('[KSP Telemetry] Attempting to reconnect...');
              connect();
            }, 3000);
          }
        } else {
          setConnectionStatus('disconnected');
        }
      };
    } catch (err) {
      console.error('[KSP Telemetry] Failed to connect:', err);
      setConnectionStatus('error', 'Failed to connect');
    }
  }, [serverUrl, autoReconnect, setConnectionStatus, updateTelemetry]);

  const disconnect = useCallback(() => {
    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }

    setConnectionStatus('disconnected');
    clearTelemetry();
  }, [setConnectionStatus, clearTelemetry]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted');
      }
    };
  }, []);

  return {
    connect,
    disconnect,
    isConnected: connection.status === 'connected',
    isConnecting: connection.status === 'connecting',
    connectionStatus: connection.status,
    error: connection.error,
  };
}

// Hook for subscribing to telemetry updates with a specific interval
export function useTelemetryUpdates(intervalMs: number = 500) {
  const { telemetry, telemetryHistory } = useTelemetryStore();

  // You could add throttling/debouncing here if needed
  return {
    telemetry,
    history: telemetryHistory,
    hasData: telemetry !== null,
  };
}
