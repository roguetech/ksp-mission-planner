import React, { useMemo, useState } from 'react';
import { useTrackingStore } from '../../stores/trackingStore';
import { useTelemetryStore } from '../../stores/telemetryStore';
import { useKSPTelemetry } from '../../hooks/useKSPTelemetry';
import { OrbitalMap } from './OrbitalMap';
import { RendezvousPanel } from './RendezvousPanel';
import { Card, CardHeader } from '../common';
import { celestialBodies } from '../../data/bodies';
import { calculateRendezvous, formatTime } from '../../utils/orbitalMath';
import { TrackedVessel } from '../../types';

const SIT_COLOR: Record<string, string> = {
  prelaunch: '#22c55e', landed: '#22c55e', splashed: '#06b6d4',
  flying: '#eab308', subOrbital: '#f97316',
  orbiting: '#3b82f6', escaping: '#a855f7', docked: '#ec4899',
};
const SIT_LABEL: Record<string, string> = {
  prelaunch: 'Pre-Launch', landed: 'Landed', splashed: 'Splashed',
  flying: 'Flying', subOrbital: 'Sub-Orbital',
  orbiting: 'Orbiting', escaping: 'Escaping', docked: 'Docked',
};

function fmtAlt(m: number) {
  if (m >= 1_000_000) return `${(m / 1e6).toFixed(2)} Mm`;
  if (m >= 1_000) return `${(m / 1e3).toFixed(1)} km`;
  return `${m.toFixed(0)} m`;
}

function VesselCard({
  vessel, isActive, isTarget, onClick,
}: {
  vessel: TrackedVessel;
  isActive: boolean;
  isTarget: boolean;
  onClick: () => void;
}) {
  const color = SIT_COLOR[vessel.situation] ?? '#94a3b8';
  return (
    <div
      onClick={onClick}
      className={`p-2.5 rounded-lg border cursor-pointer transition-colors select-none ${
        isActive
          ? 'bg-emerald-900/30 border-emerald-600'
          : isTarget
            ? 'bg-amber-900/30 border-amber-600'
            : 'bg-gray-900 border-gray-700 hover:border-gray-500'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="text-sm font-medium text-gray-200 truncate flex-1">{vessel.name}</span>
        {isActive && <span className="text-xs text-emerald-400 font-mono shrink-0">ACTIVE</span>}
        {isTarget && <span className="text-xs text-amber-400 font-mono shrink-0">TARGET</span>}
      </div>
      <div className="ml-4 text-xs space-y-0.5">
        <div className="flex gap-3">
          <span className="text-gray-500">{vessel.bodyName}</span>
          <span style={{ color }}>{SIT_LABEL[vessel.situation] ?? vessel.situation}</span>
        </div>
        <div className="flex gap-3 text-gray-500 font-mono">
          <span>Ap {fmtAlt(vessel.apoapsis)}</span>
          <span>Pe {fmtAlt(vessel.periapsis)}</span>
          <span>i {vessel.inclination.toFixed(1)}°</span>
        </div>
        {vessel.orbitalPeriod > 0 && (
          <div className="text-gray-600 font-mono">T {formatTime(vessel.orbitalPeriod)}</div>
        )}
      </div>
    </div>
  );
}

// Types that are hidden by default (clutter most views)
const DEFAULT_HIDDEN_TYPES = new Set(['Debris', 'SpaceObject', 'DeployedSciencePart', 'DeployedGroundPart', 'Flag', 'EVA']);

const TYPE_LABEL: Record<string, string> = {
  Ship: 'Ship', Station: 'Station', Probe: 'Probe', Rover: 'Rover',
  Lander: 'Lander', Plane: 'Plane', Relay: 'Relay', Base: 'Base',
  EVA: 'EVA', Flag: 'Flag', Debris: 'Debris', SpaceObject: 'Space Object',
  DeployedSciencePart: 'Science', DeployedGroundPart: 'Ground',
};

function normaliseType(raw: string): string {
  // kRPC sometimes returns "VesselType.Ship" — strip the prefix
  const stripped = raw.includes('.') ? raw.split('.').pop()! : raw;
  // Capitalise first letter for consistent keying
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

export function TrackingStationPanel() {
  const { vessels, targetVesselName, setTarget } = useTrackingStore();
  const { telemetry, connection } = useTelemetryStore();
  const { connect, disconnect, isConnecting } = useKSPTelemetry();

  const isConnected = connection.status === 'connected';
  const activeVesselName = telemetry?.name ?? null;

  // Type filter — hidden types are excluded from the list and map
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(DEFAULT_HIDDEN_TYPES);

  const toggleType = (type: string) => {
    setHiddenTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type); else next.add(type);
      return next;
    });
  };

  // Unique types present across all tracked vessels (normalised)
  const presentTypes = useMemo(
    () => [...new Set(vessels.map(v => normaliseType(v.vesselType)))].sort(),
    [vessels],
  );

  // Count per type (for badge on filter buttons)
  const countByType = useMemo(() => {
    const map: Record<string, number> = {};
    for (const v of vessels) {
      const t = normaliseType(v.vesselType);
      map[t] = (map[t] ?? 0) + 1;
    }
    return map;
  }, [vessels]);

  // Active / target vessel are never filtered out so we can still show rendezvous data
  const visibleVessels = useMemo(
    () => vessels.filter(v => {
      const t = normaliseType(v.vesselType);
      if (hiddenTypes.has(t)) return v.name === activeVesselName || v.name === targetVesselName;
      return true;
    }),
    [vessels, hiddenTypes, activeVesselName, targetVesselName],
  );

  // Body filter
  const [selectedBodyId, setSelectedBodyId] = useState<string | null>(null);

  // Unique bodies present in tracking data
  const presentBodies = useMemo(
    () => [...new Set(vessels.map(v => v.bodyId))],
    [vessels],
  );

  const displayBodyId =
    selectedBodyId ??
    (activeVesselName
      ? (vessels.find(v => v.name === activeVesselName)?.bodyId ?? presentBodies[0] ?? 'kerbin')
      : (presentBodies[0] ?? 'kerbin'));

  const bodyVessels = useMemo(
    () => visibleVessels.filter(v => v.bodyId.toLowerCase() === displayBodyId.toLowerCase()),
    [visibleVessels, displayBodyId],
  );

  // Handle vessel click: if clicking active → no-op; if clicking same target → deselect; otherwise set target
  const handleVesselClick = (name: string) => {
    if (name === activeVesselName) return;
    setTarget(name === targetVesselName ? null : name);
  };

  // Rendezvous calculation (uses unfiltered vessels so active/target always work)
  const activeTracked = vessels.find(v => v.name === activeVesselName);
  const targetTracked = vessels.find(v => v.name === targetVesselName);

  const rendezvous = useMemo(() => {
    if (!activeTracked || !targetTracked) return null;
    const body = celestialBodies[activeTracked.bodyId];
    const mu = body?.physical?.gravitationalParameter;
    if (!mu) return null;
    return calculateRendezvous(activeTracked, targetTracked, mu);
  }, [activeTracked, targetTracked]);

  return (
    <div className="space-y-4">
      {/* Status bar */}
      <div className="flex items-center gap-3 text-xs">
        <div className={`w-2 h-2 rounded-full shrink-0 ${
          isConnected ? 'bg-emerald-500' : isConnecting ? 'bg-yellow-500 animate-pulse' : 'bg-gray-500'
        }`} />
        <span className={isConnected ? 'text-emerald-400' : isConnecting ? 'text-yellow-400' : 'text-gray-500'}>
          {isConnected ? 'Live telemetry connected' : isConnecting ? 'Connecting…' : 'Telemetry offline'}
        </span>
        {vessels.length > 0 && (
          <span className="text-gray-500 ml-auto">
            {visibleVessels.length}/{vessels.length} vessel{vessels.length !== 1 ? 's' : ''}
          </span>
        )}
        <button
          onClick={isConnected ? disconnect : connect}
          disabled={isConnecting}
          className={`ml-auto px-2.5 py-1 rounded border text-xs transition-colors disabled:opacity-50 ${
            isConnected
              ? 'bg-gray-800 border-gray-600 text-gray-400 hover:border-red-600 hover:text-red-400'
              : 'bg-emerald-900 border-emerald-600 text-emerald-300 hover:bg-emerald-800'
          }`}
        >
          {isConnected ? 'Disconnect' : isConnecting ? 'Connecting…' : 'Connect to KSP'}
        </button>
      </div>

      {vessels.length === 0 ? (
        <Card>
          <div className="py-12 text-center text-gray-600 text-sm">
            {isConnected
              ? 'Waiting for tracking station data…'
              : isConnecting
                ? 'Connecting to KSP…'
                : 'Press "Connect to KSP" above to load tracking data.'}
          </div>
        </Card>
      ) : (
        <>
          {/* Type filter */}
          {presentTypes.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500 shrink-0">Types:</span>
              {presentTypes.map(type => {
                const hidden = hiddenTypes.has(type);
                const count = countByType[type] ?? 0;
                return (
                  <button
                    key={type}
                    onClick={() => toggleType(type)}
                    title={hidden ? `Show ${TYPE_LABEL[type] ?? type}` : `Hide ${TYPE_LABEL[type] ?? type}`}
                    className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded border transition-colors ${
                      hidden
                        ? 'bg-gray-900 border-gray-800 text-gray-600 line-through'
                        : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {TYPE_LABEL[type] ?? type}
                    <span className={`font-mono ${hidden ? 'text-gray-700' : 'text-gray-500'}`}>{count}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Body selector */}
          {presentBodies.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500">Body:</span>
              {presentBodies.map(bId => {
                const b = celestialBodies[bId];
                const isSelected = bId === displayBodyId;
                return (
                  <button key={bId}
                    onClick={() => setSelectedBodyId(bId)}
                    className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                      isSelected
                        ? 'bg-emerald-900 border-emerald-500 text-emerald-300'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                    }`}>
                    {b?.name ?? bId}
                  </button>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* Vessel list */}
            <div className="xl:col-span-1 space-y-2">
              <Card>
                <CardHeader
                  title="Vessels"
                  subtitle={targetVesselName ? 'Click vessel to change target' : 'Click a vessel to set as rendezvous target'}
                />
                <div className="space-y-2">
                  {[...visibleVessels]
                    .sort((a, b) => {
                      if (a.name === activeVesselName) return -1;
                      if (b.name === activeVesselName) return 1;
                      if (a.name === targetVesselName) return -1;
                      if (b.name === targetVesselName) return 1;
                      return a.name.localeCompare(b.name);
                    })
                    .map(v => (
                      <VesselCard
                        key={v.name}
                        vessel={v}
                        isActive={v.name === activeVesselName}
                        isTarget={v.name === targetVesselName}
                        onClick={() => handleVesselClick(v.name)}
                      />
                    ))}
                  {visibleVessels.length === 0 && (
                    <div className="text-xs text-gray-600 text-center py-3">
                      All vessel types are hidden. Click a type above to show it.
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Map + Rendezvous */}
            <div className="xl:col-span-2 space-y-4">
              <Card>
                <CardHeader
                  title={`Orbital Map — ${celestialBodies[displayBodyId]?.name ?? displayBodyId}`}
                  subtitle={
                    targetVesselName
                      ? `Rendezvous plan: ${activeVesselName ?? 'active'} → ${targetVesselName}`
                      : 'Select a target vessel to plan rendezvous'
                  }
                />
                <OrbitalMap
                  vessels={bodyVessels}
                  activeVesselName={activeVesselName}
                  targetVesselName={targetVesselName}
                  bodyId={displayBodyId}
                  rendezvous={rendezvous}
                  onVesselClick={handleVesselClick}
                />
              </Card>

              {/* Rendezvous panel */}
              {activeTracked && targetTracked && rendezvous && (
                <Card>
                  <CardHeader title="Rendezvous Plan" />
                  <RendezvousPanel
                    active={activeTracked}
                    target={targetTracked}
                    result={rendezvous}
                  />
                </Card>
              )}

              {targetVesselName && !rendezvous && (
                <Card>
                  <div className="text-sm text-gray-500 text-center py-4">
                    {!activeTracked
                      ? 'Active vessel not in tracking data. Connect and fly a vessel to enable rendezvous planning.'
                      : 'Unable to compute rendezvous — missing orbital data.'}
                  </div>
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
