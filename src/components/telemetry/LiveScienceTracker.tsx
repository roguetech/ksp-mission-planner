import React, { useMemo } from 'react';
import { Card, CardHeader } from '../common';
import { useTelemetryStore } from '../../stores/telemetryStore';
import { useScienceStore } from '../../stores/scienceStore';
import { scienceExperiments, getExperimentsForSituation } from '../../data/experiments';
import { celestialBodies } from '../../data/bodies';
import { ScienceSituation, VesselSituation } from '../../types';

// Map vessel situation to science situation
function mapVesselToScienceSituation(
  vesselSituation: VesselSituation | undefined,
  altitude: number,
  body: { atmosphereHeight?: number; soiRadius: number } | undefined
): ScienceSituation | null {
  if (!vesselSituation) return null;

  switch (vesselSituation) {
    case 'prelaunch':
    case 'landed':
      return 'landed';
    case 'splashed':
      return 'splashed';
    case 'flying':
      return 'flying';
    case 'subOrbital':
    case 'orbiting':
    case 'escaping': {
      // Determine if low or high space based on altitude
      if (!body) return 'inSpaceLow';
      const spaceThreshold = body.atmosphereHeight || body.soiRadius * 0.1;
      return altitude < spaceThreshold * 2 ? 'inSpaceLow' : 'inSpaceHigh';
    }
    default:
      return null;
  }
}

export function LiveScienceTracker() {
  const { telemetry, connection } = useTelemetryStore();
  const { collectedScience, markCollected, unmarkCollected } = useScienceStore();

  const currentScience = useMemo(() => {
    if (!telemetry || connection.status !== 'connected') return null;

    const bodyId = telemetry.bodyId?.toLowerCase();
    const body = bodyId ? celestialBodies[bodyId] : null;
    const biome = telemetry.biome || 'Unknown';
    const situation = mapVesselToScienceSituation(
      telemetry.situation,
      telemetry.altitude ?? 0,
      body ? { atmosphereHeight: body.physical.atmosphereHeight, soiRadius: body.soiRadius } : undefined
    );

    if (!situation || !body) return null;

    const hasAtmosphere = body.physical.hasAtmosphere;
    const hasWater = bodyId === 'kerbin' || bodyId === 'laythe' || bodyId === 'eve';

    const availableExperiments = getExperimentsForSituation(situation, hasAtmosphere, hasWater);

    // Check collection status for each experiment
    const experimentsWithStatus = availableExperiments.map((exp) => {
      const collected = collectedScience.find(
        (s) =>
          s.experimentId === exp.id &&
          s.bodyId === bodyId &&
          s.biome === biome &&
          s.situation === situation
      );

      return {
        experiment: exp,
        collected: !!collected,
        transmitted: collected?.transmitted || false,
        value: exp.baseValue * (body.scienceMultiplier || 1),
      };
    });

    return {
      bodyId,
      bodyName: body.name,
      biome,
      situation,
      experiments: experimentsWithStatus,
      totalAvailable: experimentsWithStatus.filter((e) => !e.collected).length,
      totalCollected: experimentsWithStatus.filter((e) => e.collected).length,
    };
  }, [telemetry, connection.status, collectedScience]);

  if (connection.status !== 'connected' || !telemetry) {
    return (
      <Card>
        <CardHeader title="Science at Location" />
        <div className="text-center text-gray-500 py-4">
          <p className="text-sm">Connect to KSP to track available science</p>
        </div>
      </Card>
    );
  }

  if (!currentScience) {
    return (
      <Card>
        <CardHeader title="Science at Location" />
        <div className="text-center text-gray-500 py-4">
          <p className="text-sm">Unable to determine science situation</p>
        </div>
      </Card>
    );
  }

  const handleToggleCollected = (experimentId: string) => {
    const exp = currentScience.experiments.find((e) => e.experiment.id === experimentId);
    if (!exp) return;

    if (exp.collected) {
      unmarkCollected(experimentId, currentScience.bodyId, currentScience.biome, currentScience.situation);
    } else {
      markCollected(
        experimentId,
        currentScience.bodyId,
        currentScience.biome,
        currentScience.situation,
        exp.value
      );
    }
  };

  const getSituationLabel = (sit: ScienceSituation) => {
    switch (sit) {
      case 'landed':
        return 'Landed';
      case 'splashed':
        return 'Splashed';
      case 'flying':
        return 'Flying';
      case 'inSpaceLow':
        return 'Low Space';
      case 'inSpaceHigh':
        return 'High Space';
      default:
        return sit;
    }
  };

  const getSituationColor = (sit: ScienceSituation) => {
    switch (sit) {
      case 'landed':
        return 'text-green-400';
      case 'splashed':
        return 'text-cyan-400';
      case 'flying':
        return 'text-yellow-400';
      case 'inSpaceLow':
        return 'text-blue-400';
      case 'inSpaceHigh':
        return 'text-purple-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <Card>
      <CardHeader title="Science at Location" />

      {/* Current Location Summary */}
      <div className="mb-4 p-3 bg-gray-800 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-400">Current Location</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-medium text-gray-200">{currentScience.bodyName}</span>
              <span className="text-gray-500">•</span>
              <span className="text-gray-300">{currentScience.biome}</span>
              <span className="text-gray-500">•</span>
              <span className={getSituationColor(currentScience.situation)}>
                {getSituationLabel(currentScience.situation)}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-emerald-400">
              {currentScience.totalAvailable}
            </div>
            <div className="text-xs text-gray-500">available</div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-400">Collection Progress</span>
          <span className="text-gray-300">
            {currentScience.totalCollected} / {currentScience.experiments.length}
          </span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{
              width: `${(currentScience.totalCollected / currentScience.experiments.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Experiments List */}
      <div className="space-y-2">
        {currentScience.experiments.map(({ experiment, collected, transmitted, value }) => (
          <div
            key={experiment.id}
            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
              collected
                ? 'bg-emerald-900/30 border border-emerald-700/50'
                : 'bg-gray-800 hover:bg-gray-700 border border-transparent'
            }`}
            onClick={() => handleToggleCollected(experiment.id)}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                  collected
                    ? 'bg-emerald-500 border-emerald-500'
                    : 'border-gray-500'
                }`}
              >
                {collected && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
              <div>
                <div className={`text-sm ${collected ? 'text-gray-400 line-through' : 'text-gray-200'}`}>
                  {experiment.name}
                </div>
                {transmitted && (
                  <div className="text-xs text-blue-400">Transmitted</div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className={`text-sm font-mono ${collected ? 'text-gray-500' : 'text-emerald-400'}`}>
                {value.toFixed(1)} pts
              </div>
              <div className="text-xs text-gray-500">
                {(experiment.transmissionValue * 100).toFixed(0)}% xmit
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mt-4 pt-4 border-t border-gray-700 flex gap-2">
        <button
          className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded transition-colors"
          onClick={() => {
            currentScience.experiments.forEach(({ experiment, collected, value }) => {
              if (!collected) {
                markCollected(
                  experiment.id,
                  currentScience.bodyId,
                  currentScience.biome,
                  currentScience.situation,
                  value
                );
              }
            });
          }}
        >
          Mark All Collected
        </button>
        <button
          className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded transition-colors"
          onClick={() => {
            currentScience.experiments.forEach(({ experiment, collected }) => {
              if (collected) {
                unmarkCollected(
                  experiment.id,
                  currentScience.bodyId,
                  currentScience.biome,
                  currentScience.situation
                );
              }
            });
          }}
        >
          Clear All
        </button>
      </div>
    </Card>
  );
}

// Summary component for showing total science from current session
export function ScienceSummary() {
  const { collectedScience } = useScienceStore();
  const { telemetry } = useTelemetryStore();
  const trackedScience = collectedScience.reduce((sum, s) => sum + (s.collected ? s.value : 0), 0);
  const gameScience = telemetry?.totalSciencePoints;

  return (
    <div className="flex items-center gap-4">
      {gameScience !== undefined && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-900/30 rounded-lg">
          <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
          </svg>
          <span className="text-sm text-blue-400 font-medium">{gameScience.toFixed(0)} in KSP</span>
        </div>
      )}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-900/30 rounded-lg">
        <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
        </svg>
        <span className="text-sm text-emerald-400 font-medium">{trackedScience.toFixed(0)} tracked</span>
      </div>
    </div>
  );
}

// Component showing science experiments on the vessel
export function VesselScienceStatus() {
  const { telemetry, connection } = useTelemetryStore();

  if (connection.status !== 'connected' || !telemetry?.vesselExperiments) {
    return null;
  }

  const experiments = telemetry.vesselExperiments;
  const withData = experiments.filter(e => e.hasData);
  const canDeploy = experiments.filter(e => e.canDeploy && !e.hasData);

  if (experiments.length === 0) {
    return null;
  }

  // Map experiment IDs to friendly names
  const getExperimentName = (id?: string) => {
    const names: Record<string, string> = {
      'crewReport': 'Crew Report',
      'evaReport': 'EVA Report',
      'surfaceSample': 'Surface Sample',
      'mysteryGoo': 'Mystery Goo',
      'mobileMaterialsLab': 'Sci Jr.',
      'temperatureScan': 'Thermometer',
      'barometerScan': 'Barometer',
      'seismicScan': 'Seismic Scan',
      'gravityScan': 'Gravimeter',
      'atmosphereAnalysis': 'Atmosphere Analysis',
    };
    return id ? names[id] || id : 'Unknown';
  };

  return (
    <Card>
      <CardHeader title="Vessel Science" />

      {/* Data ready to transmit/recover */}
      {withData.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-emerald-400 font-medium mb-2 flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            DATA READY ({withData.length})
          </div>
          <div className="space-y-1">
            {withData.map((exp, idx) => (
              <div key={idx} className="flex items-center justify-between px-2 py-1 bg-emerald-900/20 rounded text-sm">
                <span className="text-gray-300">{getExperimentName(exp.experimentId)}</span>
                <span className="text-xs text-emerald-400">Has Data</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Experiments ready to deploy */}
      {canDeploy.length > 0 && (
        <div>
          <div className="text-xs text-gray-400 font-medium mb-2 flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
            </svg>
            READY TO RUN ({canDeploy.length})
          </div>
          <div className="flex flex-wrap gap-1">
            {canDeploy.map((exp, idx) => (
              <span key={idx} className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300">
                {getExperimentName(exp.experimentId)}
              </span>
            ))}
          </div>
        </div>
      )}

      {withData.length === 0 && canDeploy.length === 0 && (
        <div className="text-sm text-gray-500 text-center py-2">
          No science experiments detected
        </div>
      )}
    </Card>
  );
}
