import React, { useState, useEffect } from 'react';
import { Card, CardHeader, Button, StatCard } from '../common';
import { ScienceMap } from './ScienceMap';
import { BiomeMap } from './BiomeMap';
import { ExperimentList } from './ExperimentList';
import { ScienceChecklist } from './ScienceChecklist';
import { useScienceStore, kspSituationToScience } from '../../stores/scienceStore';
import { requestAllScienceFromGame } from '../../services/telemetryWs';
import { useTelemetryStore } from '../../stores/telemetryStore';
import { celestialBodies, bodiesArray } from '../../data/bodies';
import { bodyBiomeData } from '../../data/biomeCoordinates';
import { getTotalPossibleScience, getRemainingScience } from '../../lib/science';
import { ScienceHistory } from './ScienceHistory';

const SIT_LABEL: Record<string, string> = {
  landed: 'Landed', splashed: 'Splashed', flying: 'Flying',
  inSpaceLow: 'Space Low', inSpaceHigh: 'Space High',
};

export function SciencePlanner() {
  const { collectedScience, getTotalScience, exportScience, importScience, clearAllScience, syncFromTelemetry } =
    useScienceStore();
  const { telemetry, connection } = useTelemetryStore();

  const [selectedBody, setSelectedBody] = useState('kerbin');
  const [selectedBiome, setSelectedBiome] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showBiomeMap, setShowBiomeMap] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importError, setImportError] = useState('');
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [importingAll, setImportingAll] = useState(false);

  const isConnected = connection.status === 'connected';

  // Derived telemetry state
  const liveBodyId  = telemetry?.bodyId?.toLowerCase() ?? null;
  const liveBiome   = telemetry?.biome ?? null;
  const liveSciSit  = telemetry
    ? kspSituationToScience(telemetry.situation, telemetry.altitude, liveBodyId ?? 'kerbin')
    : null;
  const liveBody    = liveBodyId ? celestialBodies[liveBodyId] : null;

  // Auto-jump to the vessel's current body when it changes
  useEffect(() => {
    if (liveBodyId && liveBodyId !== selectedBody) setSelectedBody(liveBodyId);
  }, [liveBodyId]);

  const handleSync = () => {
    if (!telemetry) return;
    const count = syncFromTelemetry(telemetry);
    setSyncMsg(
      count > 0
        ? `Synced ${count} experiment${count !== 1 ? 's' : ''} from vessel.`
        : 'No new experiments to sync (vessel may have no unreported data).',
    );
    setTimeout(() => setSyncMsg(null), 4000);
  };

  const handleImportAll = () => {
    setImportingAll(true);
    setSyncMsg('Requesting science history from game…');
    requestAllScienceFromGame((newCount, rawCount) => {
      setImportingAll(false);
      if (newCount === -1) {
        setSyncMsg('Not connected — cannot import from game.');
      } else if (rawCount === 0) {
        setSyncMsg('Server returned 0 subjects — kRPC science_subjects may be unavailable. Check bridge logs.');
      } else if (newCount === 0) {
        setSyncMsg(`Server sent ${rawCount} subjects — all already up to date.`);
      } else {
        setSyncMsg(`Imported ${newCount} new experiment${newCount !== 1 ? 's' : ''} (${rawCount} received from R&D).`);
      }
      setTimeout(() => setSyncMsg(null), 7000);
    });
  };

  const totalCollected = getTotalScience();

  // Calculate overall progress
  const calculateOverallProgress = () => {
    let total = 0;
    let collected = 0;

    for (const body of bodiesArray) {
      if (body.id === 'kerbol') continue;
      const bodyTotal = getTotalPossibleScience(body.id);
      const bodyRemaining = getRemainingScience(body.id, collectedScience);
      total += bodyTotal;
      collected += bodyTotal - bodyRemaining;
    }

    return { total, collected, percentage: total > 0 ? (collected / total) * 100 : 0 };
  };

  const overallProgress = calculateOverallProgress();

  // Count completed bodies
  const completedBodies = bodiesArray.filter((body) => {
    if (body.id === 'kerbol') return false;
    const remaining = getRemainingScience(body.id, collectedScience);
    return remaining === 0;
  }).length;

  const handleExport = () => {
    const json = exportScience();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ksp-science-progress.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    setImportError('');
    if (importScience(importJson)) {
      setImportJson('');
      setShowImport(false);
    } else {
      setImportError('Invalid science data JSON');
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Science Collected"
          value={
            isConnected && telemetry?.totalSciencePoints != null
              ? telemetry.totalSciencePoints.toFixed(0)
              : totalCollected.toFixed(0)
          }
          unit={isConnected && telemetry?.totalSciencePoints != null ? 'pts (live)' : 'points'}
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          }
        />
        <StatCard label="Overall Progress" value={overallProgress.percentage.toFixed(1)} unit="%" />
        <StatCard
          label="Bodies Completed"
          value={completedBodies}
          unit={`/ ${bodiesArray.length - 1}`}
        />
        <StatCard
          label="Experiments Logged"
          value={collectedScience.filter((s) => s.collected).length}
          unit="total"
        />
      </div>

      {/* Live telemetry banner — shown only when connected */}
      {isConnected && telemetry && (
        <Card>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="text-sm font-medium text-emerald-400">Live Telemetry</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                {liveBody && (
                  <span className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: liveBody.color }} />
                    {liveBody.name}
                  </span>
                )}
                {liveBiome && (
                  <span className="text-gray-400">· {liveBiome}</span>
                )}
                {liveSciSit && (
                  <span className="px-1.5 py-0.5 rounded text-xs bg-blue-900/40 text-blue-300 border border-blue-700/50">
                    {SIT_LABEL[liveSciSit] ?? liveSciSit}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {syncMsg && (
                <span className="text-sm text-emerald-400">{syncMsg}</span>
              )}
              <Button variant="secondary" onClick={handleSync}>
                Sync from Vessel
              </Button>
              <Button
                variant="secondary"
                onClick={handleImportAll}
                disabled={importingAll}
              >
                {importingAll ? 'Importing…' : 'Import All from Game'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Action buttons */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="text-gray-400 text-sm">
            Track your science collection progress across the Kerbol system
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleExport}>
              Export Progress
            </Button>
            <Button variant="secondary" onClick={() => setShowImport(true)}>
              Import Progress
            </Button>
            {totalCollected > 0 && (
              <Button
                variant="danger"
                onClick={() => {
                  if (confirm('Clear ALL science progress? This cannot be undone.')) {
                    clearAllScience();
                  }
                }}
              >
                Reset All
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map and body selection */}
        <div>
          <ScienceMap selectedBody={selectedBody} onBodySelect={setSelectedBody} />
          {/* Toggle biome map button */}
          {bodyBiomeData[selectedBody] && (
            <Button
              variant="secondary"
              className="w-full mt-3"
              onClick={() => setShowBiomeMap(!showBiomeMap)}
            >
              {showBiomeMap ? 'Hide Biome Map' : 'Show Biome Map'}
            </Button>
          )}
        </div>

        {/* Biome checklist */}
        <div className="h-[600px]">
          <ScienceChecklist bodyId={selectedBody} />
        </div>

        {/* Experiment list */}
        <div className="h-[600px]">
          <ExperimentList bodyId={selectedBody} selectedBiome={selectedBiome || undefined} />
        </div>
      </div>

      {/* Detailed Biome Map */}
      {showBiomeMap && bodyBiomeData[selectedBody] && (
        <BiomeMap
          bodyId={selectedBody}
          selectedBiome={selectedBiome}
          onBiomeSelect={(biome) => setSelectedBiome(biome)}
        />
      )}

      {/* Progress by body */}
      <Card>
        <CardHeader title="Progress by Body" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {bodiesArray
            .filter((b) => b.id !== 'kerbol')
            .sort((a, b) => {
              // Sort by orbital distance (roughly)
              const order = [
                'moho', 'eve', 'gilly', 'kerbin', 'mun', 'minmus',
                'duna', 'ike', 'dres', 'jool', 'laythe', 'vall',
                'tylo', 'bop', 'pol', 'eeloo',
              ];
              return order.indexOf(a.id) - order.indexOf(b.id);
            })
            .map((body) => {
              const total = getTotalPossibleScience(body.id);
              const remaining = getRemainingScience(body.id, collectedScience);
              const collected = total - remaining;
              const percentage = total > 0 ? (collected / total) * 100 : 0;

              return (
                <button
                  key={body.id}
                  onClick={() => setSelectedBody(body.id)}
                  className={`p-3 rounded-lg transition-all ${
                    selectedBody === body.id
                      ? 'bg-emerald-900/30 border-2 border-emerald-600'
                      : 'bg-gray-800/50 border-2 border-transparent hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: body.color }}
                    />
                    <span className="text-sm font-medium text-gray-200 truncate">
                      {body.name}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden mb-1">
                    <div
                      className={`h-full ${percentage === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 text-right">
                    {percentage.toFixed(0)}%
                  </div>
                </button>
              );
            })}
        </div>
      </Card>

      {/* Science history */}
      <ScienceHistory />

      {/* Import modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setShowImport(false)}
          />
          <div className="relative w-full max-w-lg bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-200 mb-4">Import Science Progress</h3>
            <textarea
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              placeholder="Paste exported JSON here..."
              className="w-full h-48 px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-100 font-mono text-sm mb-4"
            />
            {importError && <p className="text-red-400 text-sm mb-4">{importError}</p>}
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowImport(false)}>
                Cancel
              </Button>
              <Button onClick={handleImport}>Import</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
