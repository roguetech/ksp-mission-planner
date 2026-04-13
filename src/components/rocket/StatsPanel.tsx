import React from 'react';
import { Card, CardHeader, StatCard } from '../common';
import { RocketStats } from '../../types';
import { celestialBodies } from '../../data/bodies';
import { commonMissions } from '../../data/deltaVMap';

interface StatsPanelProps {
  stats: RocketStats | null;
  rocketName?: string;
}

export function StatsPanel({ stats, rocketName }: StatsPanelProps) {
  if (!stats || stats.stages.length === 0) {
    return (
      <Card>
        <CardHeader title="Rocket Stats" />
        <div className="text-center text-gray-500 py-8">
          <p>Add parts to see stats</p>
        </div>
      </Card>
    );
  }

  // Calculate what missions this rocket can do
  const possibleMissions = commonMissions.filter((m) => m.totalDeltaV <= stats.totalDeltaV);

  // Find the first stage TWR (launch stage)
  const launchStage = stats.stages[stats.stages.length - 1];
  const launchTWR = launchStage?.twr || 0;

  // Can reach common destinations?
  const canReachOrbit = stats.totalDeltaV >= 3400;
  const canReachMun = stats.totalDeltaV >= 5500;
  const canReachMinmus = stats.totalDeltaV >= 5200;
  const canReachDuna = stats.totalDeltaV >= 6000;

  return (
    <Card>
      <CardHeader
        title={rocketName || 'Rocket Stats'}
        subtitle={`${stats.stages.length} stage${stats.stages.length > 1 ? 's' : ''}`}
      />

      {/* Primary stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-gradient-to-br from-emerald-900/30 to-emerald-800/20 rounded-xl border border-emerald-700/30 text-center">
          <div className="text-sm text-emerald-400 uppercase tracking-wide">Total Δv</div>
          <div className="text-4xl font-bold text-emerald-400 mt-1">
            {stats.totalDeltaV.toFixed(0)}
          </div>
          <div className="text-emerald-400/70 text-sm">m/s</div>
        </div>

        <div className="p-4 bg-gradient-to-br from-blue-900/30 to-blue-800/20 rounded-xl border border-blue-700/30 text-center">
          <div className="text-sm text-blue-400 uppercase tracking-wide">Total Mass</div>
          <div className="text-4xl font-bold text-blue-400 mt-1">
            {(stats.totalMass / 1000).toFixed(1)}
          </div>
          <div className="text-blue-400/70 text-sm">tonnes</div>
        </div>
      </div>

      {/* Launch capability */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-300 mb-2">Launch Capability</h4>
        <div className={`p-3 rounded-lg ${launchTWR >= 1.2 ? 'bg-emerald-900/20 border-emerald-700/30' : launchTWR >= 1.0 ? 'bg-yellow-900/20 border-yellow-700/30' : 'bg-red-900/20 border-red-700/30'} border`}>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Launch TWR (Kerbin)</span>
            <span className={`font-bold ${launchTWR >= 1.2 ? 'text-emerald-400' : launchTWR >= 1.0 ? 'text-yellow-400' : 'text-red-400'}`}>
              {launchTWR.toFixed(2)}
            </span>
          </div>
          <p className="text-sm mt-1 text-gray-500">
            {launchTWR >= 1.5
              ? 'Excellent launch TWR for efficient ascent'
              : launchTWR >= 1.2
              ? 'Good launch TWR'
              : launchTWR >= 1.0
              ? 'Marginal - may struggle with gravity losses'
              : 'Insufficient - cannot lift off from Kerbin'}
          </p>
        </div>
      </div>

      {/* Destination checklist */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-300 mb-2">Can Reach</h4>
        <div className="grid grid-cols-2 gap-2">
          {[
            { name: 'Kerbin Orbit', can: canReachOrbit, dv: 3400 },
            { name: 'Mun Landing', can: canReachMun, dv: 5500 },
            { name: 'Minmus Landing', can: canReachMinmus, dv: 5200 },
            { name: 'Duna Flyby', can: canReachDuna, dv: 6000 },
          ].map((dest) => (
            <div
              key={dest.name}
              className={`p-2 rounded flex items-center gap-2 ${
                dest.can ? 'bg-emerald-900/20' : 'bg-gray-800/50'
              }`}
            >
              <span className={dest.can ? 'text-emerald-400' : 'text-gray-600'}>
                {dest.can ? '✓' : '✗'}
              </span>
              <span className={dest.can ? 'text-gray-300' : 'text-gray-500'}>
                {dest.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Stage breakdown */}
      <div>
        <h4 className="text-sm font-medium text-gray-300 mb-2">Stage Breakdown</h4>
        <div className="space-y-2">
          {stats.stages.map((stage, index) => (
            <div key={index} className="flex items-center gap-3 text-sm">
              <div className="w-6 h-6 rounded-full bg-gray-700 text-gray-300 flex items-center justify-center text-xs font-bold">
                {stats.stages.length - index}
              </div>
              <div className="flex-1">
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${(stage.deltaV / stats.totalDeltaV) * 100}%` }}
                  />
                </div>
              </div>
              <span className="text-gray-400 w-20 text-right">
                {stage.deltaV.toFixed(0)} m/s
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Possible missions */}
      {possibleMissions.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-700/50">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Possible Missions</h4>
          <div className="flex flex-wrap gap-2">
            {possibleMissions.map((mission) => (
              <span
                key={mission.name}
                className="px-2 py-1 bg-emerald-900/30 text-emerald-400 text-xs rounded"
              >
                {mission.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
