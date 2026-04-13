import React, { useState } from 'react';
import { Card, CardHeader, Input, Button } from '../common';
import { engines, fuelTanks, commandPods, structuralParts, utilityParts } from '../../data/parts';
import { Part, Engine, FuelTank, CommandPod } from '../../types';

interface PartPaletteProps {
  onPartSelect: (partId: string) => void;
}

type PartCategory = 'engines' | 'tanks' | 'command' | 'structural' | 'utility';

export function PartPalette({ onPartSelect }: PartPaletteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<PartCategory>('engines');

  const categories: { id: PartCategory; label: string; count: number }[] = [
    { id: 'engines', label: 'Engines', count: engines.length },
    { id: 'tanks', label: 'Fuel Tanks', count: fuelTanks.length },
    { id: 'command', label: 'Command', count: commandPods.length },
    { id: 'structural', label: 'Structural', count: structuralParts.length },
    { id: 'utility', label: 'Utility', count: utilityParts.length },
  ];

  const getParts = (): Part[] => {
    let parts: Part[];
    switch (activeCategory) {
      case 'engines':
        parts = engines;
        break;
      case 'tanks':
        parts = fuelTanks;
        break;
      case 'command':
        parts = commandPods;
        break;
      case 'structural':
        parts = structuralParts;
        break;
      case 'utility':
        parts = utilityParts;
        break;
      default:
        parts = [];
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return parts.filter((p) => p.name.toLowerCase().includes(query));
    }

    return parts;
  };

  const getPartMass = (part: Part): number => {
    if (part.category === 'fuelTank') {
      return (part as FuelTank).massFull;
    }
    return part.mass;
  };

  const formatPartDetails = (part: Part): string => {
    if (part.category === 'engine') {
      const engine = part as Engine;
      return `${engine.thrustVac} kN | ${engine.ispVac}s Isp`;
    }
    if (part.category === 'fuelTank') {
      const tank = part as FuelTank;
      return `${((tank.massFull - tank.massEmpty) / 1000).toFixed(1)}t fuel`;
    }
    if (part.category === 'command') {
      const cmd = part as CommandPod;
      return `${cmd.crewCapacity} crew | SAS ${cmd.sasLevel}`;
    }
    return `${(part.mass / 1000).toFixed(2)}t`;
  };

  const parts = getParts();

  return (
    <Card className="h-full flex flex-col">
      <CardHeader title="Parts" subtitle="Click to add to selected stage" />

      {/* Search */}
      <div className="mb-4">
        <Input
          placeholder="Search parts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1 mb-4">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeCategory === cat.id
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
            }`}
          >
            {cat.label} ({cat.count})
          </button>
        ))}
      </div>

      {/* Parts list */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {parts.map((part) => (
          <button
            key={part.id}
            onClick={() => onPartSelect(part.id)}
            className="w-full p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg border border-gray-700/50 hover:border-emerald-700/50 transition-all text-left group"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-200 group-hover:text-emerald-400 transition-colors">
                {part.name}
              </span>
              <span className="text-xs text-gray-500">{(getPartMass(part) / 1000).toFixed(2)}t</span>
            </div>
            <div className="text-sm text-gray-500 mt-1">{formatPartDetails(part)}</div>
          </button>
        ))}

        {parts.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <p>No parts found</p>
            {searchQuery && (
              <p className="text-sm mt-1">
                Try a different search term
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
