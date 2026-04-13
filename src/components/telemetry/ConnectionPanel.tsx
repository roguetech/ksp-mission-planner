import React, { useState } from 'react';
import { Card, CardHeader, Button, Input } from '../common';
import { useKSPTelemetry } from '../../hooks/useKSPTelemetry';
import { useTelemetryStore } from '../../stores/telemetryStore';

export function ConnectionPanel() {
  const {
    connect,
    disconnect,
    isConnected,
    isConnecting,
    connectionStatus,
    error,
  } = useKSPTelemetry();

  const {
    serverUrl,
    setServerUrl,
    autoReconnect,
    setAutoReconnect,
    connection,
  } = useTelemetryStore();

  const [editingUrl, setEditingUrl] = useState(false);
  const [tempUrl, setTempUrl] = useState(serverUrl);

  const handleSaveUrl = () => {
    setServerUrl(tempUrl);
    setEditingUrl(false);
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-emerald-500';
      case 'connecting':
        return 'bg-yellow-500 animate-pulse';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected to KSP';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return error || 'Connection error';
      default:
        return 'Disconnected';
    }
  };

  const formatLastUpdate = () => {
    if (!connection.lastUpdate) return 'Never';
    const seconds = Math.floor((Date.now() - connection.lastUpdate) / 1000);
    if (seconds < 1) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.floor(seconds / 60)}m ago`;
  };

  return (
    <Card>
      <CardHeader
        title="KSP Connection"
        subtitle="Connect to live game telemetry"
      />

      {/* Connection status indicator */}
      <div className="flex items-center gap-3 mb-4 p-3 bg-gray-900/50 rounded-lg">
        <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-200">{getStatusText()}</div>
          {isConnected && (
            <div className="text-xs text-gray-500">
              Last update: {formatLastUpdate()}
            </div>
          )}
        </div>
      </div>

      {/* Server URL */}
      <div className="mb-4">
        {editingUrl ? (
          <div className="flex gap-2">
            <Input
              label="Server URL"
              value={tempUrl}
              onChange={(e) => setTempUrl(e.target.value)}
              placeholder="ws://localhost:8080"
            />
            <div className="flex gap-2 mt-6">
              <Button size="sm" onClick={handleSaveUrl}>
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setTempUrl(serverUrl);
                  setEditingUrl(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg">
            <div>
              <div className="text-xs text-gray-500">Server URL</div>
              <div className="text-sm text-gray-300 font-mono">{serverUrl}</div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setEditingUrl(true)}>
              Edit
            </Button>
          </div>
        )}
      </div>

      {/* Auto-reconnect toggle */}
      <div className="flex items-center justify-between mb-4 p-2 bg-gray-800/50 rounded-lg">
        <div>
          <div className="text-sm text-gray-300">Auto-reconnect</div>
          <div className="text-xs text-gray-500">
            Automatically reconnect if connection is lost
          </div>
        </div>
        <button
          onClick={() => setAutoReconnect(!autoReconnect)}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            autoReconnect ? 'bg-emerald-600' : 'bg-gray-600'
          }`}
        >
          <div
            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
              autoReconnect ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Connect/Disconnect button */}
      <div className="flex gap-2">
        {isConnected ? (
          <Button variant="danger" onClick={disconnect} className="flex-1">
            Disconnect
          </Button>
        ) : (
          <Button
            onClick={connect}
            disabled={isConnecting}
            className="flex-1"
          >
            {isConnecting ? 'Connecting...' : 'Connect to KSP'}
          </Button>
        )}
      </div>

      {/* Help text */}
      <div className="mt-4 p-3 bg-blue-900/20 border border-blue-800 rounded-lg">
        <div className="text-xs text-blue-300">
          <strong>Setup required:</strong> Install kRPC mod in KSP and run the
          telemetry bridge server. See the documentation for setup instructions.
        </div>
      </div>
    </Card>
  );
}
