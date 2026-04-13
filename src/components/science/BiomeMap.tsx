import React, { useState, useMemo } from 'react';
import { Card, CardHeader } from '../common';
import { celestialBodies } from '../../data/bodies';
import { bodyBiomeData, BiomeRegion } from '../../data/biomeCoordinates';
import { useScienceStore } from '../../stores/scienceStore';
import { scienceExperiments } from '../../data/experiments';

interface BiomeMapProps {
  bodyId: string;
  onBiomeSelect?: (biome: string | null) => void;
  selectedBiome?: string | null;
}

export function BiomeMap({ bodyId, onBiomeSelect, selectedBiome }: BiomeMapProps) {
  const { collectedScience } = useScienceStore();
  const [hoveredBiome, setHoveredBiome] = useState<string | null>(null);

  const body = celestialBodies[bodyId];
  const biomeData = bodyBiomeData[bodyId];

  // Calculate science progress for each biome
  const biomeProgress = useMemo(() => {
    const progress: Record<string, { collected: number; total: number }> = {};

    if (!body) return progress;

    const landedExperiments = scienceExperiments.filter(
      (exp) => exp.situations.includes('landed')
    );

    for (const biomeName of body.biomes) {
      const total = landedExperiments.length;
      const collected = collectedScience.filter(
        (s) =>
          s.bodyId === bodyId &&
          s.biome === biomeName &&
          s.situation === 'landed' &&
          s.collected
      ).length;

      progress[biomeName] = { collected, total };
    }

    return progress;
  }, [bodyId, body, collectedScience]);

  // Convert lat/lng to SVG coordinates using equirectangular projection
  const latLngToSvg = (lat: number, lng: number, width: number, height: number) => {
    const x = ((lng + 180) / 360) * width;
    const y = ((90 - lat) / 180) * height;
    return { x, y };
  };

  // Get biome at a coordinate (for checking which biome a point is in)
  const getBiomeAtPoint = (lat: number, lng: number): BiomeRegion | null => {
    if (!biomeData) return null;

    for (const biome of biomeData.biomes) {
      if (biome.center && biome.radius) {
        const distance = Math.sqrt(
          Math.pow(lat - biome.center.lat, 2) + Math.pow(lng - biome.center.lng, 2)
        );
        if (distance <= biome.radius) {
          return biome;
        }
      }
    }
    return null;
  };

  const svgWidth = 600;
  const svgHeight = 300;

  if (!body) {
    return (
      <Card>
        <CardHeader title="Biome Map" subtitle="Select a body to view biomes" />
        <div className="h-64 flex items-center justify-center text-gray-500">
          No body selected
        </div>
      </Card>
    );
  }

  // Check if we have detailed biome data for this body
  const hasDetailedBiomes = biomeData && biomeData.biomes.length > 0;

  return (
    <Card>
      <CardHeader
        title={`${body.name} Biome Map`}
        subtitle={`${body.biomes.length} biomes - Click to explore`}
      />

      {/* SVG Biome Map */}
      <div className="relative">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-64 bg-gray-900/50 rounded-lg overflow-hidden"
        >
          {/* Background grid */}
          <defs>
            <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path
                d="M 30 0 L 0 0 0 30"
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={body.color} opacity="0.2" />
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Equator line */}
          <line
            x1="0"
            y1={svgHeight / 2}
            x2={svgWidth}
            y2={svgHeight / 2}
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />

          {/* Prime meridian */}
          <line
            x1={svgWidth / 2}
            y1="0"
            x2={svgWidth / 2}
            y2={svgHeight}
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />

          {/* Biome regions */}
          {hasDetailedBiomes &&
            biomeData.biomes.map((biome) => {
              if (!biome.center || !biome.radius) return null;

              const pos = latLngToSvg(
                biome.center.lat,
                biome.center.lng,
                svgWidth,
                svgHeight
              );
              const radiusX = (biome.radius / 360) * svgWidth;
              const radiusY = (biome.radius / 180) * svgHeight;

              const isHovered = hoveredBiome === biome.name;
              const isSelected = selectedBiome === biome.name;
              const progress = biomeProgress[biome.name];
              const isComplete = progress && progress.collected === progress.total;

              return (
                <g
                  key={biome.name}
                  onClick={() => onBiomeSelect?.(biome.name)}
                  onMouseEnter={() => setHoveredBiome(biome.name)}
                  onMouseLeave={() => setHoveredBiome(null)}
                  className="cursor-pointer"
                >
                  {/* Biome ellipse */}
                  <ellipse
                    cx={pos.x}
                    cy={pos.y}
                    rx={radiusX}
                    ry={radiusY}
                    fill={biome.color}
                    fillOpacity={isHovered || isSelected ? 0.8 : 0.5}
                    stroke={isSelected ? '#50c878' : isHovered ? '#ffffff' : 'transparent'}
                    strokeWidth={isSelected ? 3 : 2}
                    className="transition-all duration-150"
                  />

                  {/* Completion indicator */}
                  {isComplete && (
                    <text
                      x={pos.x}
                      y={pos.y + 4}
                      textAnchor="middle"
                      fill="#50c878"
                      fontSize="14"
                      fontWeight="bold"
                    >
                      &#10003;
                    </text>
                  )}

                  {/* Biome label on hover */}
                  {(isHovered || isSelected) && (
                    <text
                      x={pos.x}
                      y={pos.y + radiusY + 12}
                      textAnchor="middle"
                      fill="white"
                      fontSize="10"
                      className="pointer-events-none"
                    >
                      {biome.name}
                    </text>
                  )}
                </g>
              );
            })}

          {/* Coordinate labels */}
          <text x="5" y="12" fill="rgba(255,255,255,0.4)" fontSize="8">
            90°N
          </text>
          <text x="5" y={svgHeight - 5} fill="rgba(255,255,255,0.4)" fontSize="8">
            90°S
          </text>
          <text x={svgWidth / 2 - 10} y="12" fill="rgba(255,255,255,0.4)" fontSize="8">
            0°
          </text>
        </svg>

        {/* Hover tooltip */}
        {hoveredBiome && biomeData && (
          <div className="absolute top-2 right-2 bg-gray-800/95 border border-gray-600 rounded-lg p-3 max-w-xs">
            {(() => {
              const biome = biomeData.biomes.find((b) => b.name === hoveredBiome);
              const progress = biomeProgress[hoveredBiome];
              if (!biome) return null;

              return (
                <>
                  <div className="font-semibold text-gray-200 mb-1">{biome.name}</div>
                  <div className="text-xs text-gray-400 mb-2">{biome.description}</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Difficulty:</span>
                      <span
                        className={`ml-1 ${
                          biome.difficulty === 'easy'
                            ? 'text-green-400'
                            : biome.difficulty === 'moderate'
                              ? 'text-yellow-400'
                              : biome.difficulty === 'hard'
                                ? 'text-orange-400'
                                : 'text-red-400'
                        }`}
                      >
                        {biome.difficulty}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Elevation:</span>
                      <span className="ml-1 text-gray-300">{biome.elevation}</span>
                    </div>
                    {progress && (
                      <div className="col-span-2">
                        <span className="text-gray-500">Science:</span>
                        <span className="ml-1 text-emerald-400">
                          {progress.collected}/{progress.total} experiments
                        </span>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* Biome list (fallback and supplementary) */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {body.biomes.map((biomeName) => {
          const progress = biomeProgress[biomeName];
          const isComplete = progress && progress.collected === progress.total;
          const isSelected = selectedBiome === biomeName;
          const biomeInfo = biomeData?.biomes.find((b) => b.name === biomeName);

          return (
            <button
              key={biomeName}
              onClick={() => onBiomeSelect?.(isSelected ? null : biomeName)}
              onMouseEnter={() => setHoveredBiome(biomeName)}
              onMouseLeave={() => setHoveredBiome(null)}
              className={`px-3 py-2 rounded-lg text-xs text-left transition-all ${
                isSelected
                  ? 'bg-emerald-900/50 border-2 border-emerald-600'
                  : isComplete
                    ? 'bg-emerald-900/30 border border-emerald-800'
                    : 'bg-gray-800/50 border border-gray-700 hover:border-gray-500'
              }`}
            >
              <div className="flex items-center gap-2">
                {biomeInfo && (
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: biomeInfo.color }}
                  />
                )}
                <span className="text-gray-200 truncate">{biomeName}</span>
                {isComplete && <span className="text-emerald-400 ml-auto">&#10003;</span>}
              </div>
              {progress && (
                <div className="mt-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${isComplete ? 'bg-emerald-500' : 'bg-blue-500'}`}
                    style={{ width: `${(progress.collected / progress.total) * 100}%` }}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      {hasDetailedBiomes && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="text-xs text-gray-500 mb-2">Landing Difficulty:</div>
          <div className="flex gap-4 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-green-500/50"></span>
              <span className="text-gray-400">Easy</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-yellow-500/50"></span>
              <span className="text-gray-400">Moderate</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-orange-500/50"></span>
              <span className="text-gray-400">Hard</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-red-500/50"></span>
              <span className="text-gray-400">Extreme</span>
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}
