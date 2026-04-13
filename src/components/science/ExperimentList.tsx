import React from 'react';
import { Card, CardHeader } from '../common';
import { scienceExperiments } from '../../data/experiments';
import { celestialBodies } from '../../data/bodies';
import { hasAtmosphere, hasWater, getAvailableSituations } from '../../data/biomes';
import { calculateScienceValue } from '../../lib/science';
import { useScienceStore } from '../../stores/scienceStore';
import { ScienceSituation } from '../../types';

interface ExperimentListProps {
  bodyId: string;
  selectedBiome?: string;
}

const situationLabels: Record<string, string> = {
  landed: 'Landed',
  splashed: 'Splashed',
  flying: 'Flying',
  inSpaceLow: 'Low Space',
  inSpaceHigh: 'High Space',
};

export function ExperimentList({ bodyId, selectedBiome }: ExperimentListProps) {
  const { collectedScience, markCollected, unmarkCollected } = useScienceStore();
  const body = celestialBodies[bodyId];

  if (!body) {
    return (
      <Card>
        <CardHeader title="Experiments" />
        <div className="text-center text-gray-500 py-8">Select a body</div>
      </Card>
    );
  }

  const situations = getAvailableSituations(bodyId);
  const bodyHasAtmosphere = hasAtmosphere(bodyId);
  const bodyHasWater = hasWater(bodyId);

  // Filter experiments based on body characteristics
  const availableExperiments = scienceExperiments.filter((exp) => {
    if (exp.requiresAtmosphere && !bodyHasAtmosphere) return false;
    if (exp.requiresWater && !bodyHasWater) return false;
    return true;
  });

  const isCollected = (
    experimentId: string,
    situation: ScienceSituation,
    biome: string
  ) => {
    return collectedScience.some(
      (s) =>
        s.experimentId === experimentId &&
        s.bodyId === bodyId &&
        s.situation === situation &&
        s.biome === biome &&
        s.collected
    );
  };

  const handleToggle = (
    experimentId: string,
    situation: ScienceSituation,
    biome: string,
    value: number
  ) => {
    if (isCollected(experimentId, situation, biome)) {
      unmarkCollected(experimentId, bodyId, biome, situation);
    } else {
      markCollected(experimentId, bodyId, biome, situation, value);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader
        title="Available Experiments"
        subtitle={`${body.name}${selectedBiome ? ` - ${selectedBiome}` : ''}`}
      />

      <div className="flex-1 overflow-y-auto space-y-4">
        {availableExperiments.map((experiment) => {
          // Get valid situations for this experiment
          const validSituations = situations.filter((sit) =>
            experiment.situations.includes(sit as ScienceSituation)
          );

          if (validSituations.length === 0) return null;

          return (
            <div
              key={experiment.id}
              className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-medium text-gray-200">{experiment.name}</h4>
                  <p className="text-xs text-gray-500">
                    Base: {experiment.baseValue} • Transmit: {(experiment.transmissionValue * 100).toFixed(0)}%
                  </p>
                </div>
              </div>

              {/* Situations */}
              <div className="space-y-2">
                {validSituations.map((situation) => {
                  const sit = situation as ScienceSituation;
                  const biome = selectedBiome || '';
                  const { baseValue } = calculateScienceValue(
                    experiment.id,
                    bodyId,
                    sit,
                    biome
                  );
                  const collected = isCollected(experiment.id, sit, biome);

                  return (
                    <div
                      key={situation}
                      className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                        collected
                          ? 'bg-emerald-900/30 border border-emerald-700/50'
                          : 'bg-gray-700/30 hover:bg-gray-700/50'
                      }`}
                      onClick={() => handleToggle(experiment.id, sit, biome, baseValue)}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={collected}
                          onChange={() => {}}
                          className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-emerald-500 focus:ring-emerald-500"
                        />
                        <span className={collected ? 'text-gray-400' : 'text-gray-300'}>
                          {situationLabels[situation] || situation}
                        </span>
                      </div>
                      <span className={`font-medium ${collected ? 'text-emerald-400' : 'text-gray-400'}`}>
                        {baseValue.toFixed(1)} sci
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {availableExperiments.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <p>No experiments available</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-700/50 text-xs text-gray-500">
        <p>Click to toggle collection status</p>
        <p className="mt-1">
          Transmit % = science received when transmitting vs recovering
        </p>
      </div>
    </Card>
  );
}
