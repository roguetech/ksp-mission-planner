import React, { useState } from 'react';
import { Card, CardHeader } from '../common';
import { celestialBodies, bodiesArray } from '../../data/bodies';
import { commonMissions, deltaVConnections } from '../../data/deltaVMap';

interface DeltaVMapProps {
  onBodySelect?: (bodyId: string) => void;
  selectedBody?: string;
}

export function DeltaVMap({ onBodySelect, selectedBody }: DeltaVMapProps) {
  const [hoveredBody, setHoveredBody] = useState<string | null>(null);

  // Solar system layout (simplified positions for visualization)
  const bodyPositions: Record<string, { x: number; y: number; size: number }> = {
    kerbol: { x: 50, y: 300, size: 40 },
    moho: { x: 120, y: 300, size: 8 },
    eve: { x: 180, y: 300, size: 16 },
    gilly: { x: 180, y: 340, size: 4 },
    kerbin: { x: 260, y: 300, size: 14 },
    mun: { x: 260, y: 260, size: 8 },
    minmus: { x: 300, y: 280, size: 5 },
    duna: { x: 360, y: 300, size: 12 },
    ike: { x: 360, y: 340, size: 6 },
    dres: { x: 460, y: 300, size: 8 },
    jool: { x: 560, y: 300, size: 24 },
    laythe: { x: 520, y: 260, size: 8 },
    vall: { x: 540, y: 240, size: 7 },
    tylo: { x: 560, y: 220, size: 10 },
    bop: { x: 600, y: 260, size: 5 },
    pol: { x: 620, y: 280, size: 4 },
    eeloo: { x: 700, y: 300, size: 8 },
  };

  const getBodyInfo = (bodyId: string) => {
    const body = celestialBodies[bodyId];
    if (!body) return null;

    const connections = deltaVConnections.filter(
      (c) => c.from.startsWith(bodyId) || c.to.startsWith(bodyId)
    );

    return { body, connections };
  };

  const hoveredInfo = hoveredBody ? getBodyInfo(hoveredBody) : null;

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Delta-V Map"
        subtitle="Click on a body to see connection details"
      />

      <div className="flex gap-6">
        {/* Map visualization */}
        <div className="flex-1 relative">
          <svg viewBox="0 0 800 400" className="w-full h-80 bg-gray-900/50 rounded-lg">
            {/* Connection lines */}
            {Object.entries(bodyPositions).map(([bodyId, pos]) => {
              const body = celestialBodies[bodyId];
              if (!body || !body.parent || !bodyPositions[body.parent]) return null;

              const parentPos = bodyPositions[body.parent];
              return (
                <line
                  key={`line-${bodyId}`}
                  x1={parentPos.x}
                  y1={parentPos.y}
                  x2={pos.x}
                  y2={pos.y}
                  stroke="rgba(100,100,100,0.3)"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                />
              );
            })}

            {/* Bodies */}
            {Object.entries(bodyPositions).map(([bodyId, pos]) => {
              const body = celestialBodies[bodyId];
              if (!body) return null;

              const isSelected = selectedBody === bodyId;
              const isHovered = hoveredBody === bodyId;

              return (
                <g
                  key={bodyId}
                  onClick={() => onBodySelect?.(bodyId)}
                  onMouseEnter={() => setHoveredBody(bodyId)}
                  onMouseLeave={() => setHoveredBody(null)}
                  className="cursor-pointer"
                >
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={pos.size + (isHovered ? 4 : 0)}
                    fill={body.color}
                    stroke={isSelected ? '#50c878' : isHovered ? '#fff' : 'transparent'}
                    strokeWidth={isSelected ? 3 : 2}
                    className="transition-all duration-200"
                  />
                  <text
                    x={pos.x}
                    y={pos.y + pos.size + 14}
                    textAnchor="middle"
                    fill={isSelected ? '#50c878' : '#9ca3af'}
                    fontSize="10"
                    className="pointer-events-none"
                  >
                    {body.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Info panel */}
        <div className="w-72 space-y-4">
          {hoveredInfo ? (
            <>
              <div
                className="p-3 rounded-lg"
                style={{ backgroundColor: `${hoveredInfo.body.color}20` }}
              >
                <h4 className="font-semibold text-lg" style={{ color: hoveredInfo.body.color }}>
                  {hoveredInfo.body.name}
                </h4>
                <div className="mt-2 space-y-1 text-sm text-gray-400">
                  <p>Surface Gravity: {hoveredInfo.body.physical.surfaceGravity.toFixed(2)} m/s²</p>
                  <p>Escape Velocity: {hoveredInfo.body.physical.escapeVelocity.toLocaleString()} m/s</p>
                  {hoveredInfo.body.physical.hasAtmosphere && (
                    <p>Atmosphere: {hoveredInfo.body.physical.atmosphereHeight! / 1000} km</p>
                  )}
                  <p>Science Multiplier: {hoveredInfo.body.scienceMultiplier}x</p>
                </div>
              </div>

              <div className="text-sm">
                <h5 className="font-medium text-gray-300 mb-2">Delta-V Connections:</h5>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {hoveredInfo.connections.slice(0, 8).map((conn, i) => (
                    <div key={i} className="flex justify-between text-gray-400">
                      <span className="truncate">{conn.from} → {conn.to}</span>
                      <span className="text-emerald-400 ml-2">
                        {conn.isAerobrake ? 'Aero' : `${conn.deltaV} m/s`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <p>Hover over a body to see details</p>
            </div>
          )}
        </div>
      </div>

      {/* Common missions quick reference */}
      <div className="mt-6 pt-4 border-t border-gray-700/50">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Common Missions</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {commonMissions.map((mission) => (
            <div
              key={mission.name}
              className="p-3 bg-gray-800/50 rounded-lg hover:bg-gray-700/50 transition-colors"
            >
              <div className="font-medium text-gray-200">{mission.name}</div>
              <div className="text-emerald-400 text-lg font-bold">
                {mission.totalDeltaV.toLocaleString()} m/s
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
