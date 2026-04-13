import React from 'react';
import { Card, CardHeader } from '../common';
import { StageStats, RocketStats } from '../../types';

interface StagingDiagramProps {
  stats: RocketStats | null;
  stageName?: (index: number) => string;
}

export function StagingDiagram({ stats, stageName }: StagingDiagramProps) {
  if (!stats || stats.stages.length === 0) {
    return (
      <Card>
        <CardHeader title="Staging Diagram" subtitle="Visualize your rocket stages" />
        <div className="text-center text-gray-500 py-8">
          <p>No rocket design loaded</p>
          <p className="text-sm mt-1">Create or select a rocket in the Rocket Builder</p>
        </div>
      </Card>
    );
  }

  const maxDeltaV = Math.max(...stats.stages.map((s) => s.deltaV), 1);
  const maxMass = Math.max(...stats.stages.map((s) => s.wetMass), 1);

  const getStageColor = (index: number) => {
    const colors = [
      'bg-emerald-500',
      'bg-blue-500',
      'bg-purple-500',
      'bg-orange-500',
      'bg-pink-500',
      'bg-cyan-500',
    ];
    return colors[index % colors.length];
  };

  const getTWRColor = (twr: number) => {
    if (twr >= 1.5) return 'text-emerald-400';
    if (twr >= 1.2) return 'text-emerald-300';
    if (twr >= 1.0) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <Card>
      <CardHeader
        title="Staging Diagram"
        subtitle={`Total Delta-V: ${stats.totalDeltaV.toFixed(0)} m/s`}
      />

      {/* Total delta-v bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-gray-400 mb-1">
          <span>Total Delta-V Budget</span>
          <span className="text-emerald-400 font-semibold">
            {stats.totalDeltaV.toFixed(0)} m/s
          </span>
        </div>
        <div className="h-8 bg-gray-700 rounded-lg overflow-hidden flex">
          {stats.stages.map((stage, index) => (
            <div
              key={index}
              className={`${getStageColor(index)} transition-all duration-300`}
              style={{ width: `${(stage.deltaV / stats.totalDeltaV) * 100}%` }}
              title={`Stage ${index + 1}: ${stage.deltaV.toFixed(0)} m/s`}
            />
          ))}
        </div>
      </div>

      {/* Stage details */}
      <div className="space-y-3">
        {stats.stages.map((stage, index) => (
          <div
            key={index}
            className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 hover:border-gray-600/50 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded ${getStageColor(index)}`} />
                <div>
                  <h4 className="font-medium text-gray-200">
                    {stageName ? stageName(index) : `Stage ${stats.stages.length - index}`}
                  </h4>
                  <p className="text-sm text-gray-500">
                    Fires {index === 0 ? 'first' : `after stage ${index}`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-emerald-400">
                  {stage.deltaV.toFixed(0)} m/s
                </div>
                <div className="text-sm text-gray-500">
                  {((stage.deltaV / stats.totalDeltaV) * 100).toFixed(1)}% of total
                </div>
              </div>
            </div>

            {/* Delta-V bar */}
            <div className="mt-3 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${getStageColor(index)} transition-all duration-300`}
                style={{ width: `${(stage.deltaV / maxDeltaV) * 100}%` }}
              />
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-4 gap-4 mt-3 text-sm">
              <div>
                <div className="text-gray-500">Wet Mass</div>
                <div className="text-gray-300">
                  {(stage.wetMass / 1000).toFixed(1)}t
                </div>
              </div>
              <div>
                <div className="text-gray-500">Dry Mass</div>
                <div className="text-gray-300">
                  {(stage.dryMass / 1000).toFixed(1)}t
                </div>
              </div>
              <div>
                <div className="text-gray-500">TWR</div>
                <div className={getTWRColor(stage.twr)}>
                  {stage.twr.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Burn Time</div>
                <div className="text-gray-300">
                  {stage.burnTime.toFixed(1)}s
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-gray-700/50 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-sm text-gray-500">Total Mass</div>
          <div className="text-xl font-semibold text-gray-200">
            {(stats.totalMass / 1000).toFixed(1)}t
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Stage Count</div>
          <div className="text-xl font-semibold text-gray-200">{stats.stages.length}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Avg Δv/Stage</div>
          <div className="text-xl font-semibold text-gray-200">
            {(stats.totalDeltaV / stats.stages.length).toFixed(0)} m/s
          </div>
        </div>
      </div>
    </Card>
  );
}
