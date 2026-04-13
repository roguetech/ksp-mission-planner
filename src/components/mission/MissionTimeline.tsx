import React from 'react';
import { Card, CardHeader, Button } from '../common';
import { Mission, MissionPhase, Maneuver, ManeuverType } from '../../types';
import { celestialBodies } from '../../data/bodies';

interface MissionTimelineProps {
  mission: Mission;
  onAddPhase: () => void;
  onRemovePhase: (phaseId: string) => void;
  onEditManeuver: (phaseId: string, maneuver: Maneuver) => void;
  onRemoveManeuver: (phaseId: string, maneuverId: string) => void;
  selectedPhaseId?: string;
  onSelectPhase?: (phaseId: string) => void;
}

const maneuverIcons: Record<ManeuverType, string> = {
  launch: '🚀',
  circularize: '⭕',
  transfer: '↗️',
  correction: '🎯',
  capture: '🔄',
  aerobrake: '🌡️',
  land: '🛬',
  ascent: '🛫',
  rendezvous: '🤝',
  dock: '🔗',
  return: '🏠',
};

const maneuverColors: Record<ManeuverType, string> = {
  launch: 'bg-orange-500',
  circularize: 'bg-blue-500',
  transfer: 'bg-purple-500',
  correction: 'bg-yellow-500',
  capture: 'bg-cyan-500',
  aerobrake: 'bg-red-500',
  land: 'bg-green-500',
  ascent: 'bg-emerald-500',
  rendezvous: 'bg-pink-500',
  dock: 'bg-indigo-500',
  return: 'bg-teal-500',
};

export function MissionTimeline({
  mission,
  onAddPhase,
  onRemovePhase,
  onEditManeuver,
  onRemoveManeuver,
  selectedPhaseId,
  onSelectPhase,
}: MissionTimelineProps) {
  // Calculate running delta-v budget
  const calculateBudget = () => {
    let running = 0;
    const budgets: { phaseId: string; budget: number; phaseDv: number }[] = [];

    for (const phase of mission.phases) {
      const phaseDv = phase.maneuvers.reduce((sum, m) => sum + m.deltaV, 0);
      budgets.push({ phaseId: phase.id, budget: running, phaseDv });
      running += phaseDv;
    }

    return budgets;
  };

  const budgets = calculateBudget();

  if (mission.phases.length === 0) {
    return (
      <Card>
        <CardHeader
          title={mission.name}
          subtitle="No phases defined"
          action={<Button onClick={onAddPhase}>Add Phase</Button>}
        />
        <div className="text-center py-12 text-gray-500">
          <p className="mb-4">Your mission has no phases yet.</p>
          <p className="text-sm">Add a phase to start planning your mission.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title={mission.name}
        subtitle={`${mission.phases.length} phases • ${mission.totalDeltaV.toFixed(0)} m/s total`}
        action={<Button onClick={onAddPhase}>+ Add Phase</Button>}
      />

      {/* Timeline */}
      <div className="relative">
        {/* Vertical timeline line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-700" />

        <div className="space-y-6">
          {mission.phases.map((phase, phaseIndex) => {
            const budget = budgets.find((b) => b.phaseId === phase.id);
            const startBody = celestialBodies[phase.startBody];
            const endBody = celestialBodies[phase.endBody];
            const isSelected = phase.id === selectedPhaseId;

            return (
              <div
                key={phase.id}
                className={`relative pl-16 pr-4 py-4 rounded-lg transition-colors cursor-pointer ${
                  isSelected ? 'bg-emerald-900/20' : 'hover:bg-gray-800/30'
                }`}
                onClick={() => onSelectPhase?.(phase.id)}
              >
                {/* Phase marker */}
                <div
                  className="absolute left-6 top-6 w-5 h-5 rounded-full border-2 border-gray-700 bg-gray-800"
                  style={{ backgroundColor: startBody?.color }}
                />

                {/* Phase header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-200">{phase.name}</h4>
                    <p className="text-sm text-gray-500">
                      {startBody?.name || phase.startBody}
                      {phase.startBody !== phase.endBody && (
                        <> → {endBody?.name || phase.endBody}</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-emerald-400 font-semibold">
                        {budget?.phaseDv.toFixed(0)} m/s
                      </div>
                      <div className="text-xs text-gray-500">
                        Budget: {budget?.budget.toFixed(0)} m/s
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemovePhase(phase.id);
                      }}
                      className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Maneuvers */}
                <div className="space-y-2">
                  {phase.maneuvers.map((maneuver, maneuverIndex) => (
                    <div
                      key={maneuver.id}
                      className="flex items-center gap-3 p-2 bg-gray-800/50 rounded-lg group"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${maneuverColors[maneuver.type]}`}
                      >
                        {maneuverIcons[maneuver.type]}
                      </span>
                      <div className="flex-1">
                        <div className="text-sm text-gray-300">{maneuver.name}</div>
                        {maneuver.notes && (
                          <div className="text-xs text-gray-500">{maneuver.notes}</div>
                        )}
                      </div>
                      <div className="text-emerald-400 font-medium">
                        {maneuver.deltaV > 0 ? `${maneuver.deltaV} m/s` : 'Free'}
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button
                          onClick={() => onEditManeuver(phase.id, maneuver)}
                          className="p-1 text-gray-400 hover:text-white"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => onRemoveManeuver(phase.id, maneuver.id)}
                          className="p-1 text-gray-400 hover:text-red-400"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}

                  {phase.maneuvers.length === 0 && (
                    <div className="text-center text-gray-500 py-4 text-sm">
                      No maneuvers in this phase
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary bar */}
      <div className="mt-6 pt-4 border-t border-gray-700/50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Total Mission Delta-V:</span>
          <span className="text-xl font-bold text-emerald-400">
            {mission.totalDeltaV.toFixed(0)} m/s
          </span>
        </div>

        {/* Delta-V breakdown bar */}
        <div className="mt-3 h-4 bg-gray-700 rounded-full overflow-hidden flex">
          {mission.phases.map((phase, index) => {
            const phaseDv = phase.maneuvers.reduce((sum, m) => sum + m.deltaV, 0);
            const percentage = mission.totalDeltaV > 0 ? (phaseDv / mission.totalDeltaV) * 100 : 0;
            const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'];

            return (
              <div
                key={phase.id}
                className={`${colors[index % colors.length]} transition-all`}
                style={{ width: `${percentage}%` }}
                title={`${phase.name}: ${phaseDv} m/s`}
              />
            );
          })}
        </div>
      </div>
    </Card>
  );
}
