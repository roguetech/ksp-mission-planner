import React, { useState, useEffect } from 'react';
import { Card, CardHeader, Button, Input, Select } from '../common';
import { celestialBodies } from '../../data/bodies';
import { bodyBiomeData, getBiomeByName } from '../../data/biomeCoordinates';
import { useLandingStore, LandingSite } from '../../stores/landingStore';

interface LandingSiteSelectorProps {
  bodyId: string;
  selectedCoordinate: { lat: number; lng: number } | null;
  selectedBiome: string | null;
  onSiteAdded?: (site: LandingSite) => void;
}

export function LandingSiteSelector({
  bodyId,
  selectedCoordinate,
  selectedBiome,
  onSiteAdded,
}: LandingSiteSelectorProps) {
  const { addLandingSite, landingSites, removeLandingSite, setSelectedSite, selectedSiteId } =
    useLandingStore();

  const [siteName, setSiteName] = useState('');
  const [siteNotes, setSiteNotes] = useState('');
  const [manualLat, setManualLat] = useState('0');
  const [manualLng, setManualLng] = useState('0');
  const [manualBiome, setManualBiome] = useState('');

  const body = celestialBodies[bodyId];
  const biomeData = bodyBiomeData[bodyId];
  const bodySites = landingSites.filter((s) => s.bodyId === bodyId);

  // Update manual inputs when coordinate is selected on map
  useEffect(() => {
    if (selectedCoordinate) {
      setManualLat(selectedCoordinate.lat.toFixed(2));
      setManualLng(selectedCoordinate.lng.toFixed(2));
    }
  }, [selectedCoordinate]);

  useEffect(() => {
    if (selectedBiome) {
      setManualBiome(selectedBiome);
    }
  }, [selectedBiome]);

  const handleAddSite = () => {
    if (!body) return;

    const lat = parseFloat(manualLat) || 0;
    const lng = parseFloat(manualLng) || 0;
    const biome = manualBiome || body.biomes[0] || 'Unknown';

    const name = siteName || `${body.name} Site ${bodySites.length + 1}`;

    const siteId = addLandingSite({
      name,
      bodyId,
      biome,
      latitude: lat,
      longitude: lng,
      notes: siteNotes,
    });

    // Find the created site
    const newSite = landingSites.find((s) => s.id === siteId);
    if (newSite && onSiteAdded) {
      onSiteAdded(newSite);
    }

    // Clear form
    setSiteName('');
    setSiteNotes('');
  };

  const selectedSite = selectedSiteId ? landingSites.find((s) => s.id === selectedSiteId) : null;

  if (!body) {
    return (
      <Card>
        <CardHeader title="Landing Site" />
        <div className="text-gray-500 text-center py-4">Select a body first</div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* New Site Form */}
      <Card>
        <CardHeader title="New Landing Site" subtitle="Define a landing site location" />

        <div className="space-y-4">
          {/* Site name */}
          <Input
            label="Site Name"
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            placeholder={`${body.name} Site ${bodySites.length + 1}`}
          />

          {/* Coordinates */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Latitude"
              type="number"
              value={manualLat}
              onChange={(e) => setManualLat(e.target.value)}
              placeholder="0.00"
            />
            <Input
              label="Longitude"
              type="number"
              value={manualLng}
              onChange={(e) => setManualLng(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* Biome selection */}
          <Select
            label="Biome"
            value={manualBiome}
            onChange={(e) => setManualBiome(e.target.value)}
            options={[
              { value: '', label: 'Select biome...' },
              ...body.biomes.map((b) => ({ value: b, label: b })),
            ]}
          />

          {/* Biome info */}
          {manualBiome && biomeData && (
            <div className="p-3 bg-gray-800/50 rounded-lg text-sm">
              {(() => {
                const biome = getBiomeByName(bodyId, manualBiome);
                if (!biome) return <span className="text-gray-500">No data available</span>;

                return (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: biome.color }}
                      />
                      <span className="font-medium text-gray-200">{biome.name}</span>
                    </div>
                    <p className="text-gray-400 text-xs">{biome.description}</p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">Difficulty:</span>
                        <span
                          className={`ml-1 ${
                            biome.difficulty === 'easy'
                              ? 'text-green-400'
                              : biome.difficulty === 'moderate'
                                ? 'text-yellow-400'
                                : biome.difficulty === 'hard'
                                  ? 'text-orange-400'
                                  : 'text-red-400'
                          }`}
                        >
                          {biome.difficulty}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Elevation:</span>
                        <span className="text-gray-300 ml-1">{biome.elevation}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Science:</span>
                        <span className="text-emerald-400 ml-1">{biome.scienceValue}/10</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
            <textarea
              value={siteNotes}
              onChange={(e) => setSiteNotes(e.target.value)}
              placeholder="Landing objectives, terrain notes, etc."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-500 text-sm h-20 resize-none"
            />
          </div>

          {/* Add button */}
          <Button onClick={handleAddSite} className="w-full">
            Add Landing Site
          </Button>
        </div>
      </Card>

      {/* Saved Sites List */}
      <Card>
        <CardHeader
          title="Saved Sites"
          subtitle={`${bodySites.length} site${bodySites.length !== 1 ? 's' : ''} on ${body.name}`}
        />

        {bodySites.length === 0 ? (
          <div className="text-gray-500 text-center py-6">
            <svg
              className="w-12 h-12 mx-auto mb-2 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
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
            <p className="text-sm">No landing sites saved</p>
            <p className="text-xs text-gray-600">Click on the map or fill the form above</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {bodySites.map((site) => {
              const biomeInfo = biomeData?.biomes.find((b) => b.name === site.biome);
              const isSelected = selectedSiteId === site.id;

              return (
                <div
                  key={site.id}
                  onClick={() => setSelectedSite(isSelected ? null : site.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-emerald-900/30 border-2 border-emerald-600'
                      : 'bg-gray-800/50 border border-gray-700 hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {biomeInfo && (
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: biomeInfo.color }}
                          />
                        )}
                        <span className="font-medium text-gray-200">{site.name}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {site.biome} ({site.latitude.toFixed(1)}°, {site.longitude.toFixed(1)}°)
                      </div>
                      {site.notes && (
                        <div className="text-xs text-gray-500 mt-1 line-clamp-2">{site.notes}</div>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeLandingSite(site.id);
                      }}
                      className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                      title="Remove site"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Show requirements when selected */}
                  {isSelected && (
                    <div className="mt-3 pt-3 border-t border-gray-700 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">Landing dV:</span>
                        <span className="text-blue-400 ml-1">{site.landingDeltaV} m/s</span>
                      </div>
                      <div>
                        <span className="text-gray-500">TWR:</span>
                        <span className="text-yellow-400 ml-1">{site.recommendedTWR}x</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Difficulty:</span>
                        <span
                          className={`ml-1 ${
                            site.difficulty === 'easy'
                              ? 'text-green-400'
                              : site.difficulty === 'moderate'
                                ? 'text-yellow-400'
                                : site.difficulty === 'hard'
                                  ? 'text-orange-400'
                                  : 'text-red-400'
                          }`}
                        >
                          {site.difficulty}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
