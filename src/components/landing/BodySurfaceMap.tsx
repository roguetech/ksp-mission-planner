import React, { useState, useCallback } from 'react';
import { Card, CardHeader, Select } from '../common';
import { celestialBodies, bodiesArray } from '../../data/bodies';
import { bodyBiomeData, BiomeRegion } from '../../data/biomeCoordinates';
import { useLandingStore } from '../../stores/landingStore';
import { useTelemetryStore } from '../../stores/telemetryStore';
import { VesselMarker } from '../telemetry/VesselTracker';

interface BodySurfaceMapProps {
  bodyId: string;
  onBodyChange: (bodyId: string) => void;
  onCoordinateSelect?: (lat: number, lng: number, biome: string | null) => void;
  selectedCoordinate?: { lat: number; lng: number } | null;
}

export function BodySurfaceMap({
  bodyId,
  onBodyChange,
  onCoordinateSelect,
  selectedCoordinate,
}: BodySurfaceMapProps) {
  const { landingSites } = useLandingStore();
  const { telemetry, connection } = useTelemetryStore();
  const [hoveredBiome, setHoveredBiome] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState<{ lat: number; lng: number } | null>(null);

  const body = celestialBodies[bodyId];

  // Check if vessel is at this body
  const vesselAtBody = connection.status === 'connected' &&
    telemetry?.bodyId.toLowerCase() === bodyId.toLowerCase();
  const biomeData = bodyBiomeData[bodyId];

  const svgWidth = 600;
  const svgHeight = 300;

  // Filter to landable bodies only
  const landableBodies = bodiesArray.filter(
    (b) => b.id !== 'kerbol' && b.id !== 'jool'
  );

  // Convert SVG coordinates to lat/lng
  const svgToLatLng = useCallback((x: number, y: number) => {
    const lng = (x / svgWidth) * 360 - 180;
    const lat = 90 - (y / svgHeight) * 180;
    return { lat, lng };
  }, []);

  // Convert lat/lng to SVG coordinates
  const latLngToSvg = useCallback((lat: number, lng: number) => {
    const x = ((lng + 180) / 360) * svgWidth;
    const y = ((90 - lat) / 180) * svgHeight;
    return { x, y };
  }, []);

  // Find biome at a coordinate
  const getBiomeAtCoordinate = useCallback(
    (lat: number, lng: number): BiomeRegion | null => {
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
    },
    [biomeData]
  );

  // Handle mouse move on map
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * svgWidth;
    const y = ((e.clientY - rect.top) / rect.height) * svgHeight;
    const coords = svgToLatLng(x, y);
    setMousePosition(coords);

    const biome = getBiomeAtCoordinate(coords.lat, coords.lng);
    setHoveredBiome(biome?.name || null);
  };

  // Handle click on map
  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * svgWidth;
    const y = ((e.clientY - rect.top) / rect.height) * svgHeight;
    const coords = svgToLatLng(x, y);

    const biome = getBiomeAtCoordinate(coords.lat, coords.lng);
    onCoordinateSelect?.(coords.lat, coords.lng, biome?.name || null);
  };

  // Get sites for current body
  const bodySites = landingSites.filter((s) => s.bodyId === bodyId);

  if (!body) {
    return (
      <Card>
        <CardHeader title="Surface Map" />
        <div className="h-64 flex items-center justify-center text-gray-500">
          Select a body to view surface map
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Surface Map"
        subtitle="Click to select landing coordinates"
      />

      {/* Body selector */}
      <div className="mb-4">
        <Select
          label="Select Body"
          options={landableBodies.map((b) => ({ value: b.id, label: b.name }))}
          value={bodyId}
          onChange={(e) => onBodyChange(e.target.value)}
        />
      </div>

      {/* Surface map */}
      <div className="relative">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-64 bg-gray-900/50 rounded-lg overflow-hidden cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => {
            setMousePosition(null);
            setHoveredBiome(null);
          }}
          onClick={handleClick}
        >
          {/* Background with body color */}
          <rect width="100%" height="100%" fill={body.color} opacity="0.15" />

          {/* Grid pattern */}
          <defs>
            <pattern id="surfaceGrid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path
                d="M 50 0 L 0 0 0 50"
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#surfaceGrid)" />

          {/* Latitude lines */}
          {[-60, -30, 0, 30, 60].map((lat) => {
            const y = ((90 - lat) / 180) * svgHeight;
            return (
              <g key={`lat-${lat}`}>
                <line
                  x1="0"
                  y1={y}
                  x2={svgWidth}
                  y2={y}
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth="1"
                  strokeDasharray={lat === 0 ? '0' : '4 4'}
                />
                <text x="5" y={y - 3} fill="rgba(255,255,255,0.3)" fontSize="8">
                  {lat}°
                </text>
              </g>
            );
          })}

          {/* Longitude lines */}
          {[-120, -60, 0, 60, 120].map((lng) => {
            const x = ((lng + 180) / 360) * svgWidth;
            return (
              <g key={`lng-${lng}`}>
                <line
                  x1={x}
                  y1="0"
                  x2={x}
                  y2={svgHeight}
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth="1"
                  strokeDasharray={lng === 0 ? '0' : '4 4'}
                />
                <text x={x + 3} y="12" fill="rgba(255,255,255,0.3)" fontSize="8">
                  {lng}°
                </text>
              </g>
            );
          })}

          {/* Biome regions */}
          {biomeData?.biomes.map((biome) => {
            if (!biome.center || !biome.radius) return null;

            const pos = latLngToSvg(biome.center.lat, biome.center.lng);
            const radiusX = (biome.radius / 360) * svgWidth;
            const radiusY = (biome.radius / 180) * svgHeight;
            const isHovered = hoveredBiome === biome.name;

            return (
              <ellipse
                key={biome.name}
                cx={pos.x}
                cy={pos.y}
                rx={radiusX}
                ry={radiusY}
                fill={biome.color}
                fillOpacity={isHovered ? 0.6 : 0.35}
                stroke={isHovered ? '#ffffff' : 'transparent'}
                strokeWidth="1"
                className="transition-all duration-100 pointer-events-none"
              />
            );
          })}

          {/* Existing landing sites */}
          {bodySites.map((site) => {
            const pos = latLngToSvg(site.latitude, site.longitude);
            return (
              <g key={site.id}>
                {/* Site marker */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="6"
                  fill="#f59e0b"
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="pointer-events-none"
                />
                {/* Site label */}
                <text
                  x={pos.x}
                  y={pos.y - 10}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="9"
                  className="pointer-events-none"
                >
                  {site.name}
                </text>
              </g>
            );
          })}

          {/* Selected coordinate marker */}
          {selectedCoordinate && (
            <g>
              <circle
                cx={latLngToSvg(selectedCoordinate.lat, selectedCoordinate.lng).x}
                cy={latLngToSvg(selectedCoordinate.lat, selectedCoordinate.lng).y}
                r="8"
                fill="#50c878"
                stroke="#ffffff"
                strokeWidth="3"
              />
              <circle
                cx={latLngToSvg(selectedCoordinate.lat, selectedCoordinate.lng).x}
                cy={latLngToSvg(selectedCoordinate.lat, selectedCoordinate.lng).y}
                r="15"
                fill="none"
                stroke="#50c878"
                strokeWidth="2"
                strokeDasharray="4 4"
                className="animate-pulse"
              />
            </g>
          )}

          {/* Mouse crosshair */}
          {mousePosition && (
            <g className="pointer-events-none">
              <line
                x1={latLngToSvg(mousePosition.lat, mousePosition.lng).x}
                y1="0"
                x2={latLngToSvg(mousePosition.lat, mousePosition.lng).x}
                y2={svgHeight}
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <line
                x1="0"
                y1={latLngToSvg(mousePosition.lat, mousePosition.lng).y}
                x2={svgWidth}
                y2={latLngToSvg(mousePosition.lat, mousePosition.lng).y}
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
            </g>
          )}

          {/* Live vessel marker */}
          {vesselAtBody && (
            <VesselMarker
              svgWidth={svgWidth}
              svgHeight={svgHeight}
              latLngToSvg={latLngToSvg}
            />
          )}
        </svg>

        {/* Coordinate display */}
        {mousePosition && (
          <div className="absolute bottom-2 left-2 bg-gray-800/90 border border-gray-600 rounded px-2 py-1 text-xs">
            <span className="text-gray-400">Lat:</span>{' '}
            <span className="text-white">{mousePosition.lat.toFixed(1)}°</span>
            <span className="text-gray-400 ml-2">Lng:</span>{' '}
            <span className="text-white">{mousePosition.lng.toFixed(1)}°</span>
            {hoveredBiome && (
              <>
                <span className="text-gray-400 ml-2">Biome:</span>{' '}
                <span className="text-emerald-400">{hoveredBiome}</span>
              </>
            )}
          </div>
        )}

        {/* Biome info on hover */}
        {hoveredBiome && biomeData && (
          <div className="absolute top-2 right-2 bg-gray-800/95 border border-gray-600 rounded-lg p-2 max-w-xs">
            {(() => {
              const biome = biomeData.biomes.find((b) => b.name === hoveredBiome);
              if (!biome) return null;

              return (
                <div className="text-xs">
                  <div className="font-semibold text-gray-200 flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: biome.color }}
                    />
                    {biome.name}
                  </div>
                  <div className="text-gray-400 mt-1">{biome.description}</div>
                  <div className="flex gap-3 mt-1">
                    <span>
                      <span className="text-gray-500">Difficulty: </span>
                      <span
                        className={
                          biome.difficulty === 'easy'
                            ? 'text-green-400'
                            : biome.difficulty === 'moderate'
                              ? 'text-yellow-400'
                              : biome.difficulty === 'hard'
                                ? 'text-orange-400'
                                : 'text-red-400'
                        }
                      >
                        {biome.difficulty}
                      </span>
                    </span>
                    <span>
                      <span className="text-gray-500">Elev: </span>
                      <span className="text-gray-300">{biome.elevation}</span>
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Live vessel indicator */}
        {vesselAtBody && telemetry && (
          <div className="absolute top-2 left-2 bg-emerald-900/90 border border-emerald-600 rounded-lg px-3 py-1.5 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-300 font-medium">
              {telemetry.name} - LIVE
            </span>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-amber-500 border-2 border-white"></div>
          <span className="text-gray-400">Saved Site</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white"></div>
          <span className="text-gray-400">Selected</span>
        </div>
        {vesselAtBody && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white"></div>
            <span className="text-gray-400">Live Vessel</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded border border-gray-400 bg-gray-600/50"></div>
          <span className="text-gray-400">Biome Region</span>
        </div>
      </div>
    </Card>
  );
}
