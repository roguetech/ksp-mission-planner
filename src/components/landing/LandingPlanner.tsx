import React, { useState } from 'react';
import { Card, CardHeader, Button, StatCard } from '../common';
import { BodySurfaceMap } from './BodySurfaceMap';
import { LandingSiteSelector } from './LandingSiteSelector';
import { LandingRequirements } from './LandingRequirements';
import { useLandingStore } from '../../stores/landingStore';
import { celestialBodies, bodiesArray } from '../../data/bodies';
import { bodyBiomeData } from '../../data/biomeCoordinates';

export function LandingPlanner() {
  const {
    selectedBodyId,
    setSelectedBody,
    landingSites,
    exportSites,
    importSites,
    clearAllSites,
  } = useLandingStore();

  const [selectedCoordinate, setSelectedCoordinate] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [selectedBiome, setSelectedBiome] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importError, setImportError] = useState('');

  const body = celestialBodies[selectedBodyId];

  // Calculate statistics
  const totalSites = landingSites.length;
  const bodiesWithSites = new Set(landingSites.map((s) => s.bodyId)).size;
  const uniqueBiomes = new Set(landingSites.map((s) => `${s.bodyId}:${s.biome}`)).size;
  const totalDeltaV = landingSites.reduce((sum, s) => sum + s.landingDeltaV, 0);

  // Handle coordinate selection from map
  const handleCoordinateSelect = (lat: number, lng: number, biome: string | null) => {
    setSelectedCoordinate({ lat, lng });
    setSelectedBiome(biome);
  };

  // Handle export
  const handleExport = () => {
    const json = exportSites();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ksp-landing-sites.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle import
  const handleImport = () => {
    setImportError('');
    if (importSites(importJson)) {
      setImportJson('');
      setShowImport(false);
    } else {
      setImportError('Invalid landing sites data');
    }
  };

  // Count sites per body for the body grid
  const getSiteCount = (bodyId: string) => landingSites.filter((s) => s.bodyId === bodyId).length;

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Landing Sites"
          value={totalSites}
          unit="sites"
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          }
        />
        <StatCard label="Bodies with Sites" value={bodiesWithSites} unit="bodies" />
        <StatCard label="Biomes Covered" value={uniqueBiomes} unit="biomes" />
        <StatCard label="Total Landing dV" value={totalDeltaV} unit="m/s" />
      </div>

      {/* Action buttons */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="text-gray-400">Plan landing sites across the Kerbol system</div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleExport}>
              Export Sites
            </Button>
            <Button variant="secondary" onClick={() => setShowImport(true)}>
              Import Sites
            </Button>
            {totalSites > 0 && (
              <Button
                variant="danger"
                onClick={() => {
                  if (confirm('Clear ALL landing sites? This cannot be undone.')) {
                    clearAllSites();
                  }
                }}
              >
                Clear All
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Surface Map */}
        <div className="lg:col-span-2">
          <BodySurfaceMap
            bodyId={selectedBodyId}
            onBodyChange={setSelectedBody}
            onCoordinateSelect={handleCoordinateSelect}
            selectedCoordinate={selectedCoordinate}
          />
        </div>

        {/* Site Selector */}
        <div>
          <LandingSiteSelector
            bodyId={selectedBodyId}
            selectedCoordinate={selectedCoordinate}
            selectedBiome={selectedBiome}
          />
        </div>
      </div>

      {/* Landing Requirements */}
      <LandingRequirements bodyId={selectedBodyId} />

      {/* Body Grid */}
      <Card>
        <CardHeader title="Landing Sites by Body" />
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {bodiesArray
            .filter((b) => b.id !== 'kerbol' && b.id !== 'jool')
            .sort((a, b) => {
              const order = [
                'moho', 'eve', 'gilly', 'kerbin', 'mun', 'minmus',
                'duna', 'ike', 'dres', 'laythe', 'vall', 'tylo',
                'bop', 'pol', 'eeloo',
              ];
              return order.indexOf(a.id) - order.indexOf(b.id);
            })
            .map((b) => {
              const siteCount = getSiteCount(b.id);
              const hasDetailedBiomes = bodyBiomeData[b.id] !== undefined;
              const isSelected = selectedBodyId === b.id;

              return (
                <button
                  key={b.id}
                  onClick={() => setSelectedBody(b.id)}
                  className={`p-3 rounded-lg transition-all text-center ${
                    isSelected
                      ? 'bg-emerald-900/30 border-2 border-emerald-600'
                      : 'bg-gray-800/50 border-2 border-transparent hover:border-gray-600'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-full mx-auto mb-2"
                    style={{ backgroundColor: b.color }}
                  />
                  <div className="text-xs font-medium text-gray-200">{b.name}</div>
                  <div className="text-xs text-gray-500">
                    {siteCount > 0 ? (
                      <span className="text-emerald-400">{siteCount} site{siteCount !== 1 ? 's' : ''}</span>
                    ) : (
                      <span className="text-gray-600">No sites</span>
                    )}
                  </div>
                  {hasDetailedBiomes && (
                    <div className="mt-1">
                      <span className="text-xs text-blue-400/70 bg-blue-900/30 px-1 rounded">
                        biome map
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
        </div>
      </Card>

      {/* Import modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setShowImport(false)}
          />
          <div className="relative w-full max-w-lg bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-200 mb-4">Import Landing Sites</h3>
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
