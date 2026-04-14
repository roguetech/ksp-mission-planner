import React, { useMemo, useState } from 'react';
import { Card, CardHeader } from '../common';
import { useScienceStore } from '../../stores/scienceStore';
import { scienceExperiments } from '../../data/experiments';
import { celestialBodies, bodiesArray } from '../../data/bodies';

const SIT_LABEL: Record<string, string> = {
  landed: 'Landed',
  splashed: 'Splashed',
  flying: 'Flying',
  inSpaceLow: 'Space Low',
  inSpaceHigh: 'Space High',
};

const BODY_ORDER = [
  'moho', 'eve', 'gilly', 'kerbin', 'mun', 'minmus',
  'duna', 'ike', 'dres', 'jool', 'laythe', 'vall',
  'tylo', 'bop', 'pol', 'eeloo',
];

export function ScienceHistory() {
  const { collectedScience } = useScienceStore();
  const [search, setSearch] = useState('');
  const [expandedBodies, setExpandedBodies] = useState<Set<string>>(new Set());

  const collected = useMemo(
    () => collectedScience.filter((s) => s.collected),
    [collectedScience],
  );

  // Group by body
  const byBody = useMemo(() => {
    const map: Record<string, typeof collected> = {};
    for (const entry of collected) {
      (map[entry.bodyId] ??= []).push(entry);
    }
    return map;
  }, [collected]);

  const sortedBodyIds = useMemo(
    () =>
      Object.keys(byBody).sort(
        (a, b) => (BODY_ORDER.indexOf(a) ?? 99) - (BODY_ORDER.indexOf(b) ?? 99),
      ),
    [byBody],
  );

  const toggleBody = (bodyId: string) =>
    setExpandedBodies((prev) => {
      const next = new Set(prev);
      if (next.has(bodyId)) next.delete(bodyId); else next.add(bodyId);
      return next;
    });

  const lcSearch = search.toLowerCase();

  if (collected.length === 0) {
    return (
      <Card>
        <CardHeader title="Science History" subtitle="All collected experiments" />
        <div className="py-8 text-center text-sm text-gray-600">
          No science collected yet. Mark experiments as collected or sync from a live vessel.
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4 gap-4">
        <CardHeader title="Science History" subtitle={`${collected.length} experiment${collected.length !== 1 ? 's' : ''} collected`} />
        <input
          type="text"
          placeholder="Filter…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-gray-500 w-48 shrink-0"
        />
      </div>

      <div className="space-y-2">
        {sortedBodyIds.map((bodyId) => {
          const body = celestialBodies[bodyId];
          const entries = byBody[bodyId];
          const bodyTotal = entries.reduce((s, e) => s + e.value, 0);
          const isExpanded = expandedBodies.has(bodyId);

          // Filter rows by search
          const filtered = lcSearch
            ? entries.filter((e) => {
                const expName = scienceExperiments.find((x) => x.id === e.experimentId)?.name ?? e.experimentId;
                return (
                  expName.toLowerCase().includes(lcSearch) ||
                  (e.biome || '').toLowerCase().includes(lcSearch) ||
                  SIT_LABEL[e.situation]?.toLowerCase().includes(lcSearch) ||
                  (body?.name ?? bodyId).toLowerCase().includes(lcSearch)
                );
              })
            : entries;

          if (lcSearch && filtered.length === 0) return null;

          // Auto-expand when searching
          const showRows = isExpanded || lcSearch.length > 0;

          return (
            <div key={bodyId} className="rounded-lg border border-gray-700/50 overflow-hidden">
              {/* Body header */}
              <button
                onClick={() => toggleBody(bodyId)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-800/60 hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: body?.color ?? '#888' }}
                  />
                  <span className="text-sm font-medium text-gray-200">
                    {body?.name ?? bodyId}
                  </span>
                  <span className="text-xs text-gray-500 font-mono">
                    {filtered.length} exp
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-emerald-400 font-mono">
                    {bodyTotal.toFixed(1)} sci
                  </span>
                  <svg
                    className={`w-4 h-4 text-gray-500 transition-transform ${showRows ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Experiment rows */}
              {showRows && (
                <div className="divide-y divide-gray-800">
                  {filtered
                    .slice()
                    .sort((a, b) => b.value - a.value)
                    .map((entry, i) => {
                      const exp = scienceExperiments.find((x) => x.id === entry.experimentId);
                      return (
                        <div
                          key={i}
                          className="flex items-center justify-between px-4 py-2 bg-gray-900/40 text-sm"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-gray-300 truncate">
                              {exp?.name ?? entry.experimentId}
                            </span>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-800/50 shrink-0">
                              {SIT_LABEL[entry.situation] ?? entry.situation}
                            </span>
                            {entry.biome && (
                              <span className="text-xs text-gray-500 truncate shrink-0">
                                {entry.biome}
                              </span>
                            )}
                          </div>
                          <span className="text-emerald-400 font-mono text-xs shrink-0 ml-3">
                            {entry.value.toFixed(1)}
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Grand total */}
      <div className="mt-4 pt-3 border-t border-gray-700/50 flex justify-between text-sm">
        <span className="text-gray-500">Total collected</span>
        <span className="text-emerald-400 font-mono font-medium">
          {collected.reduce((s, e) => s + e.value, 0).toFixed(1)} science
        </span>
      </div>
    </Card>
  );
}
