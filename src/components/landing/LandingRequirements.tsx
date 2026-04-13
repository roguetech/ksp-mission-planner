import React from 'react';
import { Card, CardHeader, StatCard } from '../common';
import { celestialBodies } from '../../data/bodies';
import { useLandingStore } from '../../stores/landingStore';
import { bodyBiomeData, getRecommendedLandingSites } from '../../data/biomeCoordinates';

interface LandingRequirementsProps {
  bodyId: string;
}

export function LandingRequirements({ bodyId }: LandingRequirementsProps) {
  const { calculateLandingRequirements, landingSites } = useLandingStore();

  const body = celestialBodies[bodyId];
  const biomeData = bodyBiomeData[bodyId];
  const requirements = calculateLandingRequirements(bodyId);
  const bodySites = landingSites.filter((s) => s.bodyId === bodyId);
  const recommendedSites = getRecommendedLandingSites(bodyId, 3);

  if (!body) {
    return (
      <Card>
        <CardHeader title="Landing Requirements" />
        <div className="text-gray-500 text-center py-4">Select a body to view requirements</div>
      </Card>
    );
  }

  // Check if this is a difficult body
  const isHighGravity = body.physical.surfaceGravity > 5;
  const hasThickAtmosphere = body.physical.atmospherePressure && body.physical.atmospherePressure > 1;
  const isVeryLowGravity = body.physical.surfaceGravity < 0.5;

  return (
    <div className="space-y-4">
      {/* Delta-V Requirements */}
      <Card>
        <CardHeader title="Delta-V Requirements" subtitle={`For landing on ${body.name}`} />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Landing"
            value={requirements.landingDeltaV}
            unit="m/s"
          />
          <StatCard
            label="Ascent"
            value={requirements.ascentDeltaV}
            unit="m/s"
          />
          <StatCard
            label="Total Round Trip"
            value={requirements.totalDeltaV}
            unit="m/s"
          />
          <StatCard
            label="Recommended TWR"
            value={requirements.recommendedTWR.toFixed(1)}
            unit="x"
          />
        </div>

        {/* Surface gravity info */}
        <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Surface Gravity:</span>
              <span className="text-white ml-2">{body.physical.surfaceGravity.toFixed(2)} m/s²</span>
            </div>
            <div>
              <span className="text-gray-500">vs Kerbin:</span>
              <span className="text-white ml-2">
                {((body.physical.surfaceGravity / 9.81) * 100).toFixed(0)}%
              </span>
            </div>
            <div>
              <span className="text-gray-500">Escape Velocity:</span>
              <span className="text-white ml-2">{body.physical.escapeVelocity} m/s</span>
            </div>
            <div>
              <span className="text-gray-500">Atmosphere:</span>
              <span className="text-white ml-2">
                {body.physical.hasAtmosphere ? `${body.physical.atmosphereHeight}m` : 'None'}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Warnings/Tips */}
      {(isHighGravity || hasThickAtmosphere || isVeryLowGravity) && (
        <Card>
          <CardHeader title="Landing Considerations" />
          <div className="space-y-2">
            {isHighGravity && (
              <div className="flex items-start gap-2 p-3 bg-red-900/20 border border-red-800 rounded-lg">
                <svg
                  className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div>
                  <div className="font-medium text-red-400">High Gravity Body</div>
                  <div className="text-sm text-red-300/80">
                    {body.name} has strong gravity ({body.physical.surfaceGravity.toFixed(1)} m/s²).
                    Landing requires significant thrust and fuel. Consider using multiple stages.
                  </div>
                </div>
              </div>
            )}

            {hasThickAtmosphere && (
              <div className="flex items-start gap-2 p-3 bg-purple-900/20 border border-purple-800 rounded-lg">
                <svg
                  className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
                  />
                </svg>
                <div>
                  <div className="font-medium text-purple-400">Thick Atmosphere</div>
                  <div className="text-sm text-purple-300/80">
                    {body.name} has a dense atmosphere ({body.physical.atmospherePressure} atm).
                    {bodyId === 'eve'
                      ? ' Ascending from Eve is extremely challenging - plan for high delta-V and land at high elevation if possible.'
                      : ' Use heat shields and parachutes for landing. Watch for overheating.'}
                  </div>
                </div>
              </div>
            )}

            {isVeryLowGravity && (
              <div className="flex items-start gap-2 p-3 bg-yellow-900/20 border border-yellow-800 rounded-lg">
                <svg
                  className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                <div>
                  <div className="font-medium text-yellow-400">Very Low Gravity</div>
                  <div className="text-sm text-yellow-300/80">
                    {body.name} has minimal gravity ({body.physical.surfaceGravity.toFixed(3)} m/s²).
                    Use gentle thrust to avoid bouncing. RCS can help with precise landings.
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Recommended Landing Sites */}
      {recommendedSites.length > 0 && (
        <Card>
          <CardHeader title="Recommended Landing Sites" subtitle="Sorted by landing difficulty" />
          <div className="space-y-2">
            {recommendedSites.map((site, index) => (
              <div
                key={site.name}
                className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg"
              >
                <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-sm font-medium text-gray-400">
                  {index + 1}
                </div>
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: site.color }}
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-200">{site.name}</div>
                  <div className="text-xs text-gray-500">{site.description}</div>
                </div>
                <div className="text-right">
                  <div
                    className={`text-sm font-medium ${
                      site.difficulty === 'easy'
                        ? 'text-green-400'
                        : site.difficulty === 'moderate'
                          ? 'text-yellow-400'
                          : site.difficulty === 'hard'
                            ? 'text-orange-400'
                            : 'text-red-400'
                    }`}
                  >
                    {site.difficulty}
                  </div>
                  <div className="text-xs text-gray-500">
                    Science: {site.scienceValue}/10
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Mission Statistics */}
      {bodySites.length > 0 && (
        <Card>
          <CardHeader title="Mission Statistics" subtitle="Based on saved landing sites" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-800/50 rounded-lg">
              <div className="text-2xl font-bold text-blue-400">{bodySites.length}</div>
              <div className="text-xs text-gray-500">Landing Sites</div>
            </div>
            <div className="text-center p-3 bg-gray-800/50 rounded-lg">
              <div className="text-2xl font-bold text-emerald-400">
                {bodySites.reduce((sum, s) => sum + s.landingDeltaV, 0)}
              </div>
              <div className="text-xs text-gray-500">Total Landing dV (m/s)</div>
            </div>
            <div className="text-center p-3 bg-gray-800/50 rounded-lg">
              <div className="text-2xl font-bold text-purple-400">
                {new Set(bodySites.map((s) => s.biome)).size}
              </div>
              <div className="text-xs text-gray-500">Biomes Covered</div>
            </div>
            <div className="text-center p-3 bg-gray-800/50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-400">
                {bodySites.reduce((sum, s) => sum + s.scienceValue, 0)}
              </div>
              <div className="text-xs text-gray-500">Est. Science Value</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
