import React, { useEffect } from 'react';
import { ConnectionPanel } from './ConnectionPanel';
import { TelemetryDisplay } from './TelemetryDisplay';
import { LiveScienceTracker, ScienceSummary, VesselScienceStatus } from './LiveScienceTracker';
import { CompactTelemetry } from './VesselTracker';
import { VehiclePositioningMap } from './VehiclePositioningMap';
import { FlightReplayPanel } from './FlightReplayPanel';
import { useTelemetryStore } from '../../stores/telemetryStore';
import { Card, CardHeader, StatCard } from '../common';

export function TelemetryPanel() {
  const {
    telemetry,
    connection,
    telemetryHistory,
    dbSnapshotCount,
    dbVesselCount,
    initFromDb,
    clearDb,
  } = useTelemetryStore();

  // Load last-known vessels from IndexedDB on first mount
  useEffect(() => {
    initFromDb();
  }, []);

  const isConnected = connection.status === 'connected';

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <StatCard
          label="Connection Status"
          value={isConnected ? 'Connected' : 'Disconnected'}
          icon={
            <div
              className={`w-4 h-4 rounded-full ${
                isConnected ? 'bg-emerald-500' : 'bg-gray-500'
              }`}
            />
          }
        />
        <StatCard
          label="Vessel"
          value={telemetry?.name || 'N/A'}
        />
        <StatCard
          label="Current Body"
          value={telemetry?.bodyName || telemetry?.bodyId || 'N/A'}
        />
        <StatCard
          label="Biome"
          value={telemetry?.biome || 'N/A'}
        />
        {/* DB stats card */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 flex flex-col justify-between">
          <div className="text-xs text-gray-500 mb-1">Local DB</div>
          <div className="text-sm font-mono text-gray-200">
            {dbSnapshotCount.toLocaleString()} pts · {dbVesselCount} vessel{dbVesselCount !== 1 ? 's' : ''}
          </div>
          <button
            onClick={() => { if (confirm('Clear all stored telemetry from the local database?')) clearDb(); }}
            className="mt-2 text-xs text-red-500 hover:text-red-400 text-left transition-colors"
          >
            Clear DB
          </button>
        </div>
        <div className="flex items-center justify-center">
          <ScienceSummary />
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Connection panel */}
        <div>
          <ConnectionPanel />

          {/* Quick tips - only show when not connected */}
          {!isConnected && (
            <Card className="mt-4">
              <CardHeader title="Quick Setup" />
              <div className="space-y-3 text-sm">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-900 text-emerald-400 flex items-center justify-center text-xs font-bold">
                    1
                  </div>
                  <div className="flex-1 text-gray-400">
                    Install{' '}
                    <a
                      href="https://github.com/krpc/krpc/releases"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:underline"
                    >
                      kRPC mod
                    </a>{' '}
                    in KSP
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-900 text-emerald-400 flex items-center justify-center text-xs font-bold">
                    2
                  </div>
                  <div className="flex-1 text-gray-400">
                    Start the telemetry bridge server
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-900 text-emerald-400 flex items-center justify-center text-xs font-bold">
                    3
                  </div>
                  <div className="flex-1 text-gray-400">
                    Click "Connect to KSP" above
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Science tracker - show when connected */}
          {isConnected && (
            <div className="mt-4 space-y-4">
              <LiveScienceTracker />
              <VesselScienceStatus />
            </div>
          )}
        </div>

        {/* Telemetry display */}
        <div className="lg:col-span-3">
          <TelemetryDisplay />
        </div>
      </div>

      {/* Vehicle Positioning Map */}
      <VehiclePositioningMap />

      {/* Flight Replay */}
      <FlightReplayPanel />

      {/* Altitude/Speed History Graph (placeholder) */}
      {isConnected && telemetryHistory.length > 10 && (
        <Card>
          <CardHeader title="Flight History" subtitle="Last 60 seconds of telemetry" />
          <div className="h-48">
            <TelemetryGraph history={telemetryHistory} />
          </div>
        </Card>
      )}
    </div>
  );
}

// Simple SVG line graph for telemetry history
interface TelemetryGraphProps {
  history: Array<{
    altitude: number;
    surfaceSpeed: number;
    verticalSpeed: number;
    timestamp: number;
  }>;
}

function TelemetryGraph({ history }: TelemetryGraphProps) {
  if (history.length < 2) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        Collecting data...
      </div>
    );
  }

  const width = 800;
  const height = 180;
  const padding = 40;

  // Get data ranges
  const altitudes = history.map((h) => h.altitude);
  const speeds = history.map((h) => h.surfaceSpeed);
  const maxAlt = Math.max(...altitudes, 1);
  const maxSpeed = Math.max(...speeds, 1);

  // Create path for altitude
  const altPath = history
    .map((h, i) => {
      const x = padding + (i / (history.length - 1)) * (width - padding * 2);
      const y = height - padding - (h.altitude / maxAlt) * (height - padding * 2);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  // Create path for speed
  const speedPath = history
    .map((h, i) => {
      const x = padding + (i / (history.length - 1)) * (width - padding * 2);
      const y = height - padding - (h.surfaceSpeed / maxSpeed) * (height - padding * 2);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
        <line
          key={ratio}
          x1={padding}
          y1={height - padding - ratio * (height - padding * 2)}
          x2={width - padding}
          y2={height - padding - ratio * (height - padding * 2)}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="1"
        />
      ))}

      {/* Altitude line */}
      <path d={altPath} fill="none" stroke="#22c55e" strokeWidth="2" />

      {/* Speed line */}
      <path d={speedPath} fill="none" stroke="#3b82f6" strokeWidth="2" />

      {/* Legend */}
      <g transform={`translate(${padding}, 15)`}>
        <circle cx="0" cy="0" r="4" fill="#22c55e" />
        <text x="10" y="4" fill="#9ca3af" fontSize="10">
          Altitude ({(maxAlt / 1000).toFixed(0)}km max)
        </text>
      </g>
      <g transform={`translate(${padding + 150}, 15)`}>
        <circle cx="0" cy="0" r="4" fill="#3b82f6" />
        <text x="10" y="4" fill="#9ca3af" fontSize="10">
          Speed ({maxSpeed.toFixed(0)} m/s max)
        </text>
      </g>

      {/* Y-axis labels */}
      <text x={padding - 5} y={height - padding + 4} fill="#9ca3af" fontSize="9" textAnchor="end">
        0
      </text>
      <text x={padding - 5} y={padding + 4} fill="#9ca3af" fontSize="9" textAnchor="end">
        max
      </text>
    </svg>
  );
}
