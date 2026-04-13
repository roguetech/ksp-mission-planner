import React from 'react';
import { Card, CardHeader, Button } from '../common';
import { Stage } from '../../types';
import { getPartById } from '../../data/parts';
import { calculateStageStats } from '../../lib/deltaV';

interface StageManagerProps {
  stages: Stage[];
  selectedStageId: string | null;
  onStageSelect: (stageId: string) => void;
  onAddStage: () => void;
  onRemoveStage: (stageId: string) => void;
  onRemovePart: (stageId: string, partId: string) => void;
  onUpdateQuantity: (stageId: string, partId: string, quantity: number) => void;
  payloadMasses: number[];
}

export function StageManager({
  stages,
  selectedStageId,
  onStageSelect,
  onAddStage,
  onRemoveStage,
  onRemovePart,
  onUpdateQuantity,
  payloadMasses,
}: StageManagerProps) {
  const getStageStats = (stage: Stage, index: number) => {
    const payloadMass = payloadMasses[index] || 0;
    return calculateStageStats(stage.parts, payloadMass, false);
  };

  const getTWRColor = (twr: number) => {
    if (twr >= 1.5) return 'text-emerald-400';
    if (twr >= 1.2) return 'text-emerald-300';
    if (twr >= 1.0) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader
        title="Stages"
        subtitle="Build your rocket from top to bottom"
        action={
          <Button size="sm" onClick={onAddStage}>
            + Add Stage
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto space-y-4">
        {stages.map((stage, index) => {
          const stats = getStageStats(stage, index);
          const isSelected = stage.id === selectedStageId;
          const stageNumber = stages.length - index;

          return (
            <div
              key={stage.id}
              onClick={() => onStageSelect(stage.id)}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                isSelected
                  ? 'bg-emerald-900/20 border-emerald-600'
                  : 'bg-gray-800/50 border-gray-700/50 hover:border-gray-600'
              }`}
            >
              {/* Stage header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-sm font-bold flex items-center justify-center">
                    {stageNumber}
                  </span>
                  <span className="font-medium text-gray-200">Stage {stageNumber}</span>
                  {index === stages.length - 1 && (
                    <span className="text-xs bg-blue-600/30 text-blue-300 px-2 py-0.5 rounded">
                      First to fire
                    </span>
                  )}
                </div>
                {stages.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveStage(stage.id);
                    }}
                    className="text-gray-500 hover:text-red-400 transition-colors"
                    title="Remove stage"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Stage stats */}
              <div className="grid grid-cols-3 gap-2 mb-3 text-sm">
                <div className="text-center p-2 bg-gray-800/50 rounded">
                  <div className="text-gray-500 text-xs">Δv</div>
                  <div className="text-emerald-400 font-semibold">{stats.deltaV.toFixed(0)}</div>
                </div>
                <div className="text-center p-2 bg-gray-800/50 rounded">
                  <div className="text-gray-500 text-xs">TWR</div>
                  <div className={`font-semibold ${getTWRColor(stats.twr)}`}>
                    {stats.twr.toFixed(2)}
                  </div>
                </div>
                <div className="text-center p-2 bg-gray-800/50 rounded">
                  <div className="text-gray-500 text-xs">Mass</div>
                  <div className="text-gray-300 font-semibold">
                    {(stats.wetMass / 1000).toFixed(1)}t
                  </div>
                </div>
              </div>

              {/* Parts list */}
              {stage.parts.length > 0 ? (
                <div className="space-y-1">
                  {stage.parts.map(({ partId, quantity }) => {
                    const part = getPartById(partId);
                    if (!part) return null;

                    return (
                      <div
                        key={partId}
                        className="flex items-center justify-between p-2 bg-gray-900/50 rounded text-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-gray-300 truncate flex-1">{part.name}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onUpdateQuantity(stage.id, partId, quantity - 1)}
                            className="w-6 h-6 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 flex items-center justify-center"
                          >
                            -
                          </button>
                          <span className="w-6 text-center text-gray-400">{quantity}</span>
                          <button
                            onClick={() => onUpdateQuantity(stage.id, partId, quantity + 1)}
                            className="w-6 h-6 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 flex items-center justify-center"
                          >
                            +
                          </button>
                          <button
                            onClick={() => onRemovePart(stage.id, partId)}
                            className="w-6 h-6 rounded bg-gray-700 hover:bg-red-600 text-gray-400 hover:text-white flex items-center justify-center ml-1"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-4 text-sm">
                  {isSelected ? 'Click parts to add them' : 'No parts - click to select'}
                </div>
              )}
            </div>
          );
        })}

        {stages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <p>No stages yet</p>
            <Button size="sm" onClick={onAddStage} className="mt-2">
              Add First Stage
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
