import React, { useState, useCallback, useMemo } from 'react';
import { useTelemetryStore } from '../../stores/telemetryStore';
import { Card, CardHeader } from '../common';
import { celestialBodies, bodiesArray } from '../../data/bodies';
import { VesselTelemetry } from '../../types';

const SITUATION_COLORS: Record<string, string> = {
  prelaunch: '#22c55e',
  landed: '#22c55e',
  splashed: '#06b6d4',
  flying: '#eab308',
  subOrbital: '#f97316',
  orbiting: '#3b82f6',
  escaping: '#a855f7',
  docked: '#ec4899',
};

const SITUATION_LABELS: Record<string, string> = {
  prelaunch: 'Pre-Launch',
  landed: 'Landed',
  splashed: 'Splashed',
  flying: 'Flying',
  subOrbital: 'Sub-Orbital',
  orbiting: 'Orbiting',
  escaping: 'Escaping',
  docked: 'Docked',
};

function formatAlt(meters: number): string {
  if (meters >= 1_000_000) return `${(meters / 1_000_000).toFixed(2)} Mm`;
  if (meters >= 1_000) return `${(meters / 1_000).toFixed(1)} km`;
  return `${meters.toFixed(0)} m`;
}

function formatAge(timestamp: number): string {
  const ageMs = Date.now() - timestamp;
  if (ageMs < 10_000) return 'just now';
  if (ageMs < 60_000) return `${Math.floor(ageMs / 1000)}s ago`;
  if (ageMs < 3_600_000) return `${Math.floor(ageMs / 60_000)}m ago`;
  return `${Math.floor(ageMs / 3_600_000)}h ago`;
}

interface TooltipProps {
  vessel: VesselTelemetry;
  x: number;
  y: number;
  svgWidth: number;
}

function VesselTooltip({ vessel, x, y, svgWidth }: TooltipProps) {
  const color = SITUATION_COLORS[vessel.situation] || '#a855f7';
  const W = 120;
  const H = 60;
  // Flip to left side if too close to right edge
  const tx = x + W + 16 > svgWidth ? x - W - 10 : x + 12;
  const ty = Math.max(4, y - H / 2);

  return (
    <g className="pointer-events-none">
      <rect x={tx} y={ty} width={W} height={H} rx="5"
        fill="rgba(17,24,39,0.96)" stroke={color} strokeWidth="1" />
      <text x={tx + 8} y={ty + 16} fill={color} fontSize="10" fontWeight="bold">
        {SITUATION_LABELS[vessel.situation] || vessel.situation}
      </text>
      <text x={tx + 8} y={ty + 30} fill="#9ca3af" fontSize="9">
        Alt: {formatAlt(vessel.altitude)}
      </text>
      <text x={tx + 8} y={ty + 42} fill="#9ca3af" fontSize="9">
        Spd: {vessel.surfaceSpeed.toFixed(0)} m/s
      </text>
      <text x={tx + 8} y={ty + 54} fill="#6b7280" fontSize="9">
        {vessel.latitude.toFixed(2)}°, {vessel.longitude.toFixed(2)}°
      </text>
    </g>
  );
}

export function VehiclePositioningMap() {
  const { telemetry, telemetryHistory, connection, vessels } = useTelemetryStore();
  const [selectedBody, setSelectedBody] = useState<string | null>(null);
  const [hoveredVessel, setHoveredVessel] = useState<string | null>(null);

  const isConnected = connection.status === 'connected';

  // Auto-follow active vessel's body; fall back to Kerbin
  const activeBodyId = telemetry?.bodyId ?? null;
  const displayBodyId = selectedBody ?? activeBodyId ?? 'kerbin';
  const body = celestialBodies[displayBodyId];

  const SVG_W = 800;
  const SVG_H = 380;

  const latLngToSvg = useCallback(
    (lat: number, lng: number) => ({
      x: ((lng + 180) / 360) * SVG_W,
      y: ((90 - lat) / 180) * SVG_H,
    }),
    []
  );

  // Vessels currently on the displayed body
  const vesselsOnBody = useMemo(
    () =>
      Object.values(vessels).filter(
        (v) => v.bodyId.toLowerCase() === displayBodyId.toLowerCase()
      ),
    [vessels, displayBodyId]
  );

  // Flight trail from history for the active vessel on this body
  const trailPoints = useMemo(
    () =>
      telemetryHistory.filter(
        (h) => h.bodyId.toLowerCase() === displayBodyId.toLowerCase()
      ),
    [telemetryHistory, displayBodyId]
  );

  const trailPath = useMemo(() => {
    if (trailPoints.length < 2) return null;
    return trailPoints
      .map((h, i) => {
        const { x, y } = latLngToSvg(h.latitude, h.longitude);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [trailPoints, latLngToSvg]);

  // Only show bodies that are landable (have lat/lng) for the selector
  const landableBodies = bodiesArray.filter(
    (b) => b.id !== 'kerbol' && b.id !== 'jool'
  );

  const vesselCount = Object.keys(vessels).length;
  const hoveredData = hoveredVessel ? vessels[hoveredVessel] : null;

  return (
    <Card>
      <CardHeader
        title="Vehicle Positioning Map"
        subtitle={
          isConnected
            ? vesselCount === 0
              ? 'Waiting for telemetry...'
              : `Tracking ${vesselCount} vessel${vesselCount !== 1 ? 's' : ''}`
            : vesselCount > 0
              ? `Last known positions (offline) · ${vesselCount} vessel${vesselCount !== 1 ? 's' : ''}`
              : 'No stored data — connect to KSP'
        }
      />

      <div className="flex gap-4">
        {/* Left: map */}
        <div className="flex-1 min-w-0">
          {/* Body selector */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-xs text-gray-500 shrink-0">Body:</span>
            {landableBodies.map((b) => {
              const hasVessels = Object.values(vessels).some(
                (v) => v.bodyId.toLowerCase() === b.id.toLowerCase()
              );
              const isActive = b.id === displayBodyId;
              return (
                <button
                  key={b.id}
                  onClick={() => setSelectedBody(b.id)}
                  className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                    isActive
                      ? 'bg-emerald-900 border-emerald-500 text-emerald-300'
                      : hasVessels
                        ? 'bg-blue-900/40 border-blue-600 text-blue-300 hover:bg-blue-900/70'
                        : 'bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-400'
                  }`}
                >
                  {b.name}
                  {hasVessels && (
                    <span className="ml-1 text-blue-400">●</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* SVG Map */}
          <div className="relative">
            <svg
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              className="w-full rounded-lg overflow-hidden"
              style={{ background: '#0f172a' }}
            >
              {/* Body tint */}
              {body && (
                <rect width="100%" height="100%" fill={body.color} opacity="0.08" />
              )}

              {/* Subtle dot grid */}
              <defs>
                <pattern id="posMapGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <circle cx="0" cy="0" r="0.6" fill="rgba(255,255,255,0.12)" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#posMapGrid)" />

              {/* Latitude lines */}
              {[-60, -30, 0, 30, 60].map((lat) => {
                const y = ((90 - lat) / 180) * SVG_H;
                const isEquator = lat === 0;
                return (
                  <g key={`lat-${lat}`}>
                    <line
                      x1="0" y1={y} x2={SVG_W} y2={y}
                      stroke={isEquator ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.07)'}
                      strokeWidth={isEquator ? 1.5 : 1}
                      strokeDasharray={isEquator ? undefined : '4 4'}
                    />
                    <text x="6" y={y - 3} fill="rgba(255,255,255,0.2)" fontSize="9">
                      {lat}°
                    </text>
                  </g>
                );
              })}

              {/* Longitude lines */}
              {[-120, -60, 0, 60, 120].map((lng) => {
                const x = ((lng + 180) / 360) * SVG_W;
                const isPrimeMeridian = lng === 0;
                return (
                  <g key={`lng-${lng}`}>
                    <line
                      x1={x} y1="0" x2={x} y2={SVG_H}
                      stroke={isPrimeMeridian ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.07)'}
                      strokeWidth={isPrimeMeridian ? 1.5 : 1}
                      strokeDasharray={isPrimeMeridian ? undefined : '4 4'}
                    />
                    <text x={x + 3} y="13" fill="rgba(255,255,255,0.2)" fontSize="9">
                      {lng}°
                    </text>
                  </g>
                );
              })}

              {/* Flight trail */}
              {trailPath && (
                <>
                  {/* Glow layer */}
                  <path
                    d={trailPath}
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="4"
                    opacity="0.12"
                    strokeLinecap="round"
                  />
                  {/* Main trail */}
                  <path
                    d={trailPath}
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="1.5"
                    strokeDasharray="5 3"
                    opacity="0.55"
                    strokeLinecap="round"
                  />
                </>
              )}

              {/* Vessel markers */}
              {vesselsOnBody.map((vessel) => {
                const pos = latLngToSvg(vessel.latitude, vessel.longitude);
                const color = SITUATION_COLORS[vessel.situation] || '#a855f7';
                const isActive = vessel.name === telemetry?.name;
                const isHovered = vessel.name === hoveredVessel;
                // A vessel is "stale" if we're offline and it hasn't updated in >5 s
                const isStale = !isConnected && Date.now() - vessel.timestamp > 5_000;
                const r = isActive ? 7 : 5;

                // Heading arrow endpoint
                const heading = vessel.heading ?? 0;
                const arrowLen = r + 14;
                const arrowX = pos.x + Math.sin((heading * Math.PI) / 180) * arrowLen;
                const arrowY = pos.y - Math.cos((heading * Math.PI) / 180) * arrowLen;

                return (
                  <g
                    key={vessel.name}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredVessel(vessel.name)}
                    onMouseLeave={() => setHoveredVessel(null)}
                  >
                    {/* Active vessel pulse ring */}
                    {isActive && (
                      <circle
                        cx={pos.x} cy={pos.y} r={r + 10}
                        fill="none" stroke={color} strokeWidth="1.5"
                        opacity="0.35"
                        className="animate-ping"
                      />
                    )}

                    {/* Outer ring */}
                    <circle
                      cx={pos.x} cy={pos.y} r={r + 4}
                      fill="none"
                      stroke={color}
                      strokeWidth={isActive ? 2 : 1.5}
                      opacity={isHovered || isActive ? 0.9 : 0.5}
                    />

                    {/* Heading indicator */}
                    {vessel.heading !== undefined && (
                      <line
                        x1={pos.x} y1={pos.y}
                        x2={arrowX} y2={arrowY}
                        stroke={color} strokeWidth="2"
                        strokeLinecap="round"
                        opacity={isHovered || isActive ? 0.9 : 0.5}
                      />
                    )}

                    {/* Core dot */}
                    <circle
                      cx={pos.x} cy={pos.y} r={r}
                      fill={isStale ? '#4b5563' : color}
                      stroke="#0f172a"
                      strokeWidth="2"
                      opacity={isStale ? 0.6 : 1}
                    />

                    {/* Vessel name */}
                    <text
                      x={pos.x}
                      y={pos.y - (r + 10)}
                      textAnchor="middle"
                      fill="#f1f5f9"
                      fontSize={isActive ? '11' : '9'}
                      fontWeight={isActive ? 'bold' : 'normal'}
                      className="pointer-events-none select-none"
                    >
                      {vessel.name}
                    </text>
                  </g>
                );
              })}

              {/* Hover tooltip */}
              {hoveredData && (() => {
                const pos = latLngToSvg(hoveredData.latitude, hoveredData.longitude);
                return (
                  <VesselTooltip
                    vessel={hoveredData}
                    x={pos.x}
                    y={pos.y}
                    svgWidth={SVG_W}
                  />
                );
              })()}

              {/* Empty state */}
              {vesselsOnBody.length === 0 && (
                <text
                  x={SVG_W / 2} y={SVG_H / 2}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.18)"
                  fontSize="14"
                  className="select-none"
                >
                  {isConnected
                    ? `No vessels tracked at ${body?.name ?? displayBodyId}`
                    : 'Connect to KSP to track vehicles'}
                </text>
              )}
            </svg>

            {/* Body name badge */}
            <div className="absolute top-2 right-2 bg-gray-900/90 border border-gray-700 rounded px-2 py-1 text-xs text-gray-400 pointer-events-none">
              {body?.name ?? displayBodyId}
            </div>
          </div>

          {/* Situation legend */}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {Object.entries(SITUATION_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: SITUATION_COLORS[key] }}
                />
                <span className="text-gray-500">{label}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <svg width="20" height="8">
                <line x1="0" y1="4" x2="20" y2="4"
                  stroke="#22c55e" strokeWidth="1.5"
                  strokeDasharray="5 3" opacity="0.7" />
              </svg>
              <span className="text-gray-500">Flight trail</span>
            </div>
          </div>
        </div>

        {/* Right: vessel list */}
        {vesselCount > 0 && (
          <div className="w-52 shrink-0">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
              Tracked Vessels
            </div>
            <div className="space-y-2">
              {Object.values(vessels)
                .sort((a, b) => {
                  // Active vessel first
                  if (a.name === telemetry?.name) return -1;
                  if (b.name === telemetry?.name) return 1;
                  return a.name.localeCompare(b.name);
                })
                .map((vessel) => {
                  const color = SITUATION_COLORS[vessel.situation] || '#a855f7';
                  const isActive = vessel.name === telemetry?.name;
                  const isOnDisplay =
                    vessel.bodyId.toLowerCase() === displayBodyId.toLowerCase();
                  return (
                    <div
                      key={vessel.name}
                      className={`p-2.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-gray-800 border-emerald-700'
                          : 'bg-gray-900 border-gray-700 hover:border-gray-500'
                      }`}
                      onClick={() => setSelectedBody(vessel.bodyId)}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-gray-200 font-medium truncate flex-1">
                          {vessel.name}
                        </span>
                        {isActive && (
                          <span className="text-emerald-400 text-xs shrink-0 font-mono">
                            LIVE
                          </span>
                        )}
                      </div>
                      <div className="space-y-0.5 ml-4 text-gray-500">
                        <div>
                          {vessel.bodyName ?? vessel.bodyId}
                          {!isOnDisplay && (
                            <span className="ml-1 text-blue-500 text-xs">→</span>
                          )}
                        </div>
                        <div style={{ color }}>
                          {SITUATION_LABELS[vessel.situation] ?? vessel.situation}
                        </div>
                        <div className="font-mono text-gray-400">
                          {formatAlt(vessel.altitude)}
                        </div>
                        <div className="font-mono text-gray-600">
                          {vessel.latitude.toFixed(1)}°,{' '}
                          {vessel.longitude.toFixed(1)}°
                        </div>
                        {!isActive && (
                          <div className="text-gray-600 italic">
                            {formatAge(vessel.timestamp)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
