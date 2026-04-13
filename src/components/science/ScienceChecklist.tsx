import React, { useState } from 'react';
import { Card, CardHeader, Button } from '../common';
import { celestialBodies } from '../../data/bodies';
import { useScienceStore } from '../../stores/scienceStore';
import { getTotalPossibleScience, getRemainingScience, getRecommendedExperiments } from '../../lib/science';
import { scienceExperiments } from '../../data/experiments';

interface ScienceChecklistProps {
  bodyId: string;
}

const situationLabels: Record<string, string> = {
  landed: 'Landed',
  splashed: 'Splashed',
  flying: 'Flying',
  inSpaceLow: 'Low Space',
  inSpaceHigh: 'High Space',
};

export function ScienceChecklist({ bodyId }: ScienceChecklistProps) {
  const { collectedScience, clearBodyScience } = useScienceStore();
  const [selectedBiome, setSelectedBiome] = useState<string | null>(null);

  const body = celestialBodies[bodyId];

  if (!body) {
    return (
      <Card>
        <CardHeader title="Biome Checklist" />
        <div className="text-center text-gray-500 py-8">Select a body</div>
      </Card>
    );
  }

  // Get science collected per biome
  const getBiomeProgress = (biome: string) => {
    const biomeScience = collectedScience.filter(
      (s) => s.bodyId === bodyId && s.biome === biome && s.collected
    );
    return {
      count: biomeScience.length,
      total: biomeScience.reduce((sum, s) => sum + s.value, 0),
    };
  };

  // Get recommended experiments
  const recommended = getRecommendedExperiments(bodyId, collectedScience, 5);

  const totalScience = getTotalPossibleScience(bodyId);
  const remaining = getRemainingScience(bodyId, collectedScience);
  const collected = totalScience - remaining;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader
        title="Biome Checklist"
        subtitle={body.name}
        action={
          collected > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm(`Clear all collected science for ${body.name}?`)) {
                  clearBodyScience(bodyId);
                }
              }}
            >
              Reset
            </Button>
          )
        }
      />

      {/* Overall progress */}
      <div className="mb-4 p-3 bg-gray-800/50 rounded-lg">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-400">Total Progress</span>
          <span className="text-emerald-400">
            {collected.toFixed(0)} / {totalScience.toFixed(0)} science
          </span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${totalScience > 0 ? (collected / totalScience) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Recommended experiments */}
      {recommended.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Recommended Next</h4>
          <div className="space-y-1">
            {recommended.slice(0, 3).map((rec, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 bg-emerald-900/20 rounded text-sm"
              >
                <div className="flex-1 truncate">
                  <span className="text-gray-300">{rec.experiment.name}</span>
                  <span className="text-gray-500 ml-2">
                    ({situationLabels[rec.situation]})
                  </span>
                </div>
                <span className="text-emerald-400 ml-2">{rec.value.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Biome list */}
      <div className="flex-1 overflow-y-auto">
        <h4 className="text-sm font-medium text-gray-300 mb-2">Biomes</h4>
        <div className="space-y-2">
          {body.biomes.map((biome) => {
            const progress = getBiomeProgress(biome);
            const isSelected = selectedBiome === biome;

            return (
              <button
                key={biome}
                onClick={() => setSelectedBiome(isSelected ? null : biome)}
                className={`w-full p-3 rounded-lg text-left transition-all ${
                  isSelected
                    ? 'bg-emerald-900/30 border border-emerald-700/50'
                    : 'bg-gray-800/50 hover:bg-gray-700/50 border border-transparent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={isSelected ? 'text-emerald-400' : 'text-gray-300'}>
                    {biome}
                  </span>
                  <div className="flex items-center gap-2">
                    {progress.count > 0 && (
                      <span className="text-xs px-2 py-0.5 bg-emerald-900/50 text-emerald-400 rounded">
                        {progress.count} exp
                      </span>
                    )}
                    <span className="text-sm text-gray-500">
                      {progress.total.toFixed(0)} sci
                    </span>
                  </div>
                </div>

                {/* Expanded view */}
                {isSelected && progress.count > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-700/50 space-y-1">
                    {collectedScience
                      .filter((s) => s.bodyId === bodyId && s.biome === biome && s.collected)
                      .map((s, i) => {
                        const exp = scienceExperiments.find((e) => e.id === s.experimentId);
                        return (
                          <div key={i} className="flex justify-between text-xs text-gray-500">
                            <span>{exp?.name || s.experimentId}</span>
                            <span>{s.value.toFixed(1)}</span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-gray-700/50 grid grid-cols-3 gap-4 text-center text-sm">
        <div>
          <div className="text-gray-500">Biomes</div>
          <div className="text-gray-200 font-medium">{body.biomes.length}</div>
        </div>
        <div>
          <div className="text-gray-500">Multiplier</div>
          <div className="text-gray-200 font-medium">{body.scienceMultiplier}x</div>
        </div>
        <div>
          <div className="text-gray-500">Remaining</div>
          <div className="text-emerald-400 font-medium">{remaining.toFixed(0)}</div>
        </div>
      </div>
    </Card>
  );
}
