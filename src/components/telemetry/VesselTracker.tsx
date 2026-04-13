import React from 'react';
import { useTelemetryStore } from '../../stores/telemetryStore';

interface VesselMarkerProps {
  svgWidth: number;
  svgHeight: number;
  latLngToSvg: (lat: number, lng: number) => { x: number; y: number };
}

// SVG marker component to overlay on maps
export function VesselMarker({ svgWidth, svgHeight, latLngToSvg }: VesselMarkerProps) {
  const { telemetry, connection } = useTelemetryStore();

  if (connection.status !== 'connected' || !telemetry) {
    return null;
  }

  const pos = latLngToSvg(telemetry.latitude, telemetry.longitude);

  // Determine marker color based on situation
  const getMarkerColor = () => {
    switch (telemetry.situation) {
      case 'landed':
      case 'prelaunch':
        return '#22c55e'; // green
      case 'flying':
      case 'subOrbital':
        return '#eab308'; // yellow
      case 'orbiting':
        return '#3b82f6'; // blue
      case 'splashed':
        return '#06b6d4'; // cyan
      default:
        return '#a855f7'; // purple
    }
  };

  const color = getMarkerColor();

  return (
    <g className="vessel-marker">
      {/* Pulsing outer ring */}
      <circle
        cx={pos.x}
        cy={pos.y}
        r="12"
        fill="none"
        stroke={color}
        strokeWidth="2"
        opacity="0.5"
        className="animate-ping"
      />

      {/* Static outer ring */}
      <circle
        cx={pos.x}
        cy={pos.y}
        r="10"
        fill="none"
        stroke={color}
        strokeWidth="2"
      />

      {/* Inner filled circle */}
      <circle
        cx={pos.x}
        cy={pos.y}
        r="5"
        fill={color}
        stroke="#ffffff"
        strokeWidth="2"
      />

      {/* Vessel name label */}
      <text
        x={pos.x}
        y={pos.y - 16}
        textAnchor="middle"
        fill="#ffffff"
        fontSize="10"
        fontWeight="bold"
        className="drop-shadow"
      >
        {telemetry.name}
      </text>

      {/* Altitude label */}
      <text
        x={pos.x}
        y={pos.y + 22}
        textAnchor="middle"
        fill={color}
        fontSize="8"
      >
        ALT: {(telemetry.altitude / 1000).toFixed(1)}km
      </text>
    </g>
  );
}

// Mini vessel status indicator for header/toolbar
export function VesselStatusIndicator() {
  const { telemetry, connection } = useTelemetryStore();

  if (connection.status !== 'connected') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-full">
        <div className="w-2 h-2 rounded-full bg-gray-500" />
        <span className="text-xs text-gray-500">KSP Offline</span>
      </div>
    );
  }

  if (!telemetry) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-full">
        <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
        <span className="text-xs text-yellow-400">Waiting for data...</span>
      </div>
    );
  }

  const getSituationColor = () => {
    switch (telemetry.situation) {
      case 'landed':
      case 'prelaunch':
        return 'bg-green-500';
      case 'flying':
      case 'subOrbital':
        return 'bg-yellow-500';
      case 'orbiting':
        return 'bg-blue-500';
      default:
        return 'bg-purple-500';
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-full">
      <div className={`w-2 h-2 rounded-full ${getSituationColor()}`} />
      <span className="text-xs text-gray-200 font-medium max-w-24 truncate">
        {telemetry.name}
      </span>
      <span className="text-xs text-gray-500">
        {(telemetry.altitude / 1000).toFixed(1)}km
      </span>
    </div>
  );
}

// Compact telemetry readout for embedding in other components
export function CompactTelemetry() {
  const { telemetry, connection, getDeltaVPercentage } = useTelemetryStore();

  if (connection.status !== 'connected' || !telemetry) {
    return null;
  }

  return (
    <div className="bg-gray-900/80 border border-gray-700 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-200">{telemetry.name}</span>
        <span className="text-xs text-emerald-400">LIVE</span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <div className="text-gray-500">Alt</div>
          <div className="text-gray-200 font-mono">
            {(telemetry.altitude / 1000).toFixed(1)}km
          </div>
        </div>
        <div>
          <div className="text-gray-500">Spd</div>
          <div className="text-gray-200 font-mono">
            {telemetry.surfaceSpeed.toFixed(0)} m/s
          </div>
        </div>
        <div>
          <div className="text-gray-500">dV</div>
          <div className="text-emerald-400 font-mono">
            {telemetry.deltaVRemaining.toFixed(0)} m/s
          </div>
        </div>
      </div>

      {/* Delta-V bar */}
      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500"
          style={{ width: `${getDeltaVPercentage()}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">
          {telemetry.latitude.toFixed(2)}°, {telemetry.longitude.toFixed(2)}°
        </span>
        <span className="text-gray-500">
          TWR: {telemetry.currentTWR.toFixed(1)}
        </span>
      </div>
    </div>
  );
}
