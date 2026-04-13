import React from 'react';
import { Card, CardHeader, Button } from '../common';
import { useMissionStore } from '../../stores/missionStore';

interface TemplateSelectorProps {
  onSelect: (templateId: string) => void;
}

export function TemplateSelector({ onSelect }: TemplateSelectorProps) {
  const { templates } = useMissionStore();

  const getDifficultyColor = (totalDv: number) => {
    if (totalDv < 6000) return 'text-emerald-400 bg-emerald-900/20 border-emerald-700/30';
    if (totalDv < 10000) return 'text-yellow-400 bg-yellow-900/20 border-yellow-700/30';
    if (totalDv < 20000) return 'text-orange-400 bg-orange-900/20 border-orange-700/30';
    return 'text-red-400 bg-red-900/20 border-red-700/30';
  };

  const getDifficultyLabel = (totalDv: number) => {
    if (totalDv < 6000) return 'Beginner';
    if (totalDv < 10000) return 'Intermediate';
    if (totalDv < 20000) return 'Advanced';
    return 'Expert';
  };

  return (
    <Card>
      <CardHeader
        title="Mission Templates"
        subtitle="Start from a pre-built mission plan"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((template) => {
          const totalDv = template.phases.reduce(
            (sum, phase) => sum + phase.maneuvers.reduce((mSum, m) => mSum + m.deltaV, 0),
            0
          );
          const phaseCount = template.phases.length;
          const maneuverCount = template.phases.reduce((sum, p) => sum + p.maneuvers.length, 0);

          return (
            <button
              key={template.id}
              onClick={() => onSelect(template.id)}
              className="p-4 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg border border-gray-700/50 hover:border-emerald-700/50 transition-all text-left group"
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-gray-200 group-hover:text-emerald-400 transition-colors">
                  {template.name}
                </h4>
                <span
                  className={`text-xs px-2 py-0.5 rounded border ${getDifficultyColor(totalDv)}`}
                >
                  {getDifficultyLabel(totalDv)}
                </span>
              </div>

              <p className="text-sm text-gray-500 mb-3">{template.description}</p>

              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Phases:</span>
                  <span className="ml-1 text-gray-300">{phaseCount}</span>
                </div>
                <div>
                  <span className="text-gray-500">Maneuvers:</span>
                  <span className="ml-1 text-gray-300">{maneuverCount}</span>
                </div>
                <div>
                  <span className="text-gray-500">Total Δv:</span>
                  <span className="ml-1 text-emerald-400 font-medium">{totalDv} m/s</span>
                </div>
              </div>

              {/* Phase preview */}
              <div className="mt-3 flex gap-1 overflow-hidden">
                {template.phases.slice(0, 5).map((phase, i) => (
                  <div
                    key={i}
                    className="h-1 flex-1 bg-gray-600 rounded-full overflow-hidden"
                    title={phase.name}
                  >
                    <div
                      className="h-full bg-emerald-500"
                      style={{
                        width: `${
                          totalDv > 0
                            ? (phase.maneuvers.reduce((s, m) => s + m.deltaV, 0) / totalDv) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {templates.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          <p>No templates available</p>
        </div>
      )}
    </Card>
  );
}
