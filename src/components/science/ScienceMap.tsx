import React, { useState } from 'react';
import { Card, CardHeader, Select } from '../common';
import { celestialBodies, bodiesArray } from '../../data/bodies';
import { useScienceStore } from '../../stores/scienceStore';
import { getTotalPossibleScience, getRemainingScience } from '../../lib/science';

interface ScienceMapProps {
  selectedBody: string;
  onBodySelect: (bodyId: string) => void;
}

export function ScienceMap({ selectedBody, onBodySelect }: ScienceMapProps) {
  const { collectedScience } = useScienceStore();

  // Calculate progress for each body
  const getBodyProgress = (bodyId: string) => {
    const total = getTotalPossibleScience(bodyId);
    const remaining = getRemainingScience(bodyId, collectedScience);
    const collected = total - remaining;
    return { total, collected, percentage: total > 0 ? (collected / total) * 100 : 0 };
  };

  // Solar system layout
  const bodyPositions: Record<string, { x: number; y: number; size: number }> = {
    kerbol: { x: 100, y: 200, size: 35 },
    moho: { x: 160, y: 200, size: 8 },
    eve: { x: 210, y: 200, size: 14 },
    gilly: { x: 210, y: 235, size: 4 },
    kerbin: { x: 280, y: 200, size: 12 },
    mun: { x: 280, y: 165, size: 7 },
    minmus: { x: 310, y: 180, size: 5 },
    duna: { x: 360, y: 200, size: 10 },
    ike: { x: 360, y: 235, size: 6 },
    dres: { x: 440, y: 200, size: 7 },
    jool: { x: 520, y: 200, size: 22 },
    laythe: { x: 490, y: 165, size: 7 },
    vall: { x: 505, y: 150, size: 6 },
    tylo: { x: 520, y: 135, size: 9 },
    bop: { x: 550, y: 165, size: 4 },
    pol: { x: 565, y: 180, size: 4 },
    eeloo: { x: 620, y: 200, size: 7 },
  };

  const bodyOptions = bodiesArray
    .filter((b) => b.id !== 'kerbol')
    .map((b) => ({ value: b.id, label: b.name }));

  const selected = celestialBodies[selectedBody];
  const progress = getBodyProgress(selectedBody);

  return (
    <Card>
      <CardHeader
        title="Science Map"
        subtitle="Track your science collection progress"
      />

      {/* Visual map */}
      <div className="mb-6">
        <svg viewBox="0 0 700 300" className="w-full h-48 bg-gray-900/50 rounded-lg">
          {/* Stars background */}
          {Array.from({ length: 50 }).map((_, i) => (
            <circle
              key={`star-${i}`}
              cx={Math.random() * 700}
              cy={Math.random() * 300}
              r={Math.random() * 1.5}
              fill="white"
              opacity={Math.random() * 0.5 + 0.2}
            />
          ))}

          {/* Bodies */}
          {Object.entries(bodyPositions).map(([bodyId, pos]) => {
            const body = celestialBodies[bodyId];
            if (!body) return null;

            const bodyProgress = getBodyProgress(bodyId);
            const isSelected = bodyId === selectedBody;

            return (
              <g
                key={bodyId}
                onClick={() => bodyId !== 'kerbol' && onBodySelect(bodyId)}
                className={bodyId !== 'kerbol' ? 'cursor-pointer' : ''}
              >
                {/* Progress ring */}
                {bodyId !== 'kerbol' && bodyProgress.total > 0 && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={pos.size + 4}
                    fill="none"
                    stroke={bodyProgress.percentage === 100 ? '#50c878' : '#374151'}
                    strokeWidth="2"
                    strokeDasharray={`${(bodyProgress.percentage / 100) * Math.PI * 2 * (pos.size + 4)} ${Math.PI * 2 * (pos.size + 4)}`}
                    transform={`rotate(-90 ${pos.x} ${pos.y})`}
                  />
                )}

                {/* Body */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={pos.size}
                  fill={body.color}
                  stroke={isSelected ? '#50c878' : 'transparent'}
                  strokeWidth={3}
                  className="transition-all duration-200"
                />

                {/* Label */}
                <text
                  x={pos.x}
                  y={pos.y + pos.size + 12}
                  textAnchor="middle"
                  fill={isSelected ? '#50c878' : '#9ca3af'}
                  fontSize="9"
                >
                  {body.name}
                </text>

                {/* Completion indicator */}
                {bodyId !== 'kerbol' && bodyProgress.percentage === 100 && (
                  <text
                    x={pos.x}
                    y={pos.y + 4}
                    textAnchor="middle"
                    fill="white"
                    fontSize="10"
                  >
                    ✓
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Body selector dropdown */}
      <Select
        label="Select Body"
        options={bodyOptions}
        value={selectedBody}
        onChange={(e) => onBodySelect(e.target.value)}
      />

      {/* Selected body details */}
      {selected && (
        <div className="mt-4 p-4 bg-gray-800/50 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-8 h-8 rounded-full"
              style={{ backgroundColor: selected.color }}
            />
            <div>
              <h4 className="font-semibold text-gray-200">{selected.name}</h4>
              <p className="text-sm text-gray-500">
                Science Multiplier: {selected.scienceMultiplier}x
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-2">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">Science Collected</span>
              <span className="text-emerald-400">
                {progress.collected.toFixed(0)} / {progress.total.toFixed(0)}
              </span>
            </div>
            <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  progress.percentage === 100 ? 'bg-emerald-500' : 'bg-blue-500'
                }`}
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <div className="text-right text-xs text-gray-500 mt-1">
              {progress.percentage.toFixed(1)}% complete
            </div>
          </div>

          {/* Biome count */}
          <div className="text-sm text-gray-400">
            {selected.biomes.length} biomes available
          </div>
        </div>
      )}
    </Card>
  );
}
