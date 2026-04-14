import React, { useEffect, useCallback, useMemo, useState, useRef } from 'react';
import { useReplayStore, REPLAY_SPEEDS } from '../../stores/replayStore';
import { Card, CardHeader } from '../common';
import { celestialBodies } from '../../data/bodies';
import { VesselTelemetry } from '../../types';

// ─── Formatting helpers ───────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  const totalS = Math.floor(ms / 1000);
  const h = Math.floor(totalS / 3600);
  const m = Math.floor((totalS % 3600) / 60);
  const s = totalS % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatMissionTime(seconds: number): string {
  const abs = Math.abs(Math.floor(seconds));
  const s = abs % 60;
  const m = Math.floor(abs / 60) % 60;
  const h = Math.floor(abs / 3600) % 6;
  const d = Math.floor(abs / 21600); // Kerbin day = 6 h
  const sign = seconds < 0 ? 'T-' : 'T+';
  if (d > 0) return `${sign}${d}d ${h}h ${m}m ${s}s`;
  if (h > 0) return `${sign}${h}h ${m}m ${s}s`;
  if (m > 0) return `${sign}${m}m ${s}s`;
  return `${sign}${s}s`;
}

function formatAlt(m: number): string {
  if (m >= 1_000_000) return `${(m / 1_000_000).toFixed(2)} Mm`;
  if (m >= 1_000) return `${(m / 1_000).toFixed(1)} km`;
  return `${m.toFixed(0)} m`;
}

function formatTS(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const SITUATION_COLORS: Record<string, string> = {
  prelaunch: '#22c55e', landed: '#22c55e', splashed: '#06b6d4',
  flying: '#eab308', subOrbital: '#f97316',
  orbiting: '#3b82f6', escaping: '#a855f7', docked: '#ec4899',
};

// ─── Replay map ───────────────────────────────────────────────────────────────

interface ReplayMapProps {
  snapshots: VesselTelemetry[];
  currentIndex: number;
  bodyId: string;
}

function ReplayMap({ snapshots, currentIndex, bodyId }: ReplayMapProps) {
  const SVG_W = 700;
  const SVG_H = 320;
  const body = celestialBodies[bodyId];

  const latLngToSvg = useCallback(
    (lat: number, lng: number) => ({
      x: ((lng + 180) / 360) * SVG_W,
      y: ((90 - lat) / 180) * SVG_H,
    }),
    []
  );

  // Filter snapshots to this body and sort
  const bodySnaps = useMemo(
    () => snapshots.filter((s) => s.bodyId.toLowerCase() === bodyId.toLowerCase()),
    [snapshots, bodyId]
  );

  // Current index within bodySnaps based on global index
  const currentSnap = snapshots[currentIndex];
  const bodyCurrentIdx = useMemo(() => {
    if (!currentSnap || currentSnap.bodyId.toLowerCase() !== bodyId.toLowerCase()) return -1;
    // Find last bodySnap whose timestamp <= currentSnap.timestamp
    for (let i = bodySnaps.length - 1; i >= 0; i--) {
      if (bodySnaps[i].timestamp <= currentSnap.timestamp) return i;
    }
    return -1;
  }, [bodySnaps, currentSnap, bodyId]);

  // Build full path, splitting on longitude wrap (>270° jump = anti-meridian crossing)
  const pathSegments = useMemo(() => {
    const segments: string[][] = [];
    let current: string[] = [];
    let prevLng: number | null = null;

    for (const snap of bodySnaps) {
      if (prevLng !== null && Math.abs(snap.longitude - prevLng) > 270) {
        segments.push(current);
        current = [];
      }
      const { x, y } = latLngToSvg(snap.latitude, snap.longitude);
      current.push(`${current.length === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
      prevLng = snap.longitude;
    }
    if (current.length > 0) segments.push(current);
    return segments;
  }, [bodySnaps, latLngToSvg]);

  // Active portion path (up to current index)
  const activeSegments = useMemo(() => {
    const active = bodyCurrentIdx >= 0 ? bodySnaps.slice(0, bodyCurrentIdx + 1) : [];
    const segments: string[][] = [];
    let current: string[] = [];
    let prevLng: number | null = null;
    for (const snap of active) {
      if (prevLng !== null && Math.abs(snap.longitude - prevLng) > 270) {
        segments.push(current);
        current = [];
      }
      const { x, y } = latLngToSvg(snap.latitude, snap.longitude);
      current.push(`${current.length === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
      prevLng = snap.longitude;
    }
    if (current.length > 0) segments.push(current);
    return segments;
  }, [bodySnaps, bodyCurrentIdx, latLngToSvg]);

  const markerSnap = bodyCurrentIdx >= 0 ? bodySnaps[bodyCurrentIdx] : null;
  const markerPos = markerSnap ? latLngToSvg(markerSnap.latitude, markerSnap.longitude) : null;
  const markerColor = markerSnap ? (SITUATION_COLORS[markerSnap.situation] ?? '#a855f7') : '#3b82f6';
  const heading = markerSnap?.heading ?? 0;

  if (bodySnaps.length === 0) {
    return (
      <div className="h-44 flex items-center justify-center text-gray-600 text-sm bg-gray-900 rounded-lg">
        No data for {body?.name ?? bodyId}
      </div>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      className="w-full rounded-lg overflow-hidden"
      style={{ background: '#0f172a' }}
    >
      {body && <rect width="100%" height="100%" fill={body.color} opacity="0.07" />}

      {/* Grid */}
      {[-60, -30, 0, 30, 60].map((lat) => {
        const y = ((90 - lat) / 180) * SVG_H;
        return (
          <line key={`lat-${lat}`} x1="0" y1={y} x2={SVG_W} y2={y}
            stroke={lat === 0 ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)'}
            strokeWidth={lat === 0 ? 1.5 : 1}
            strokeDasharray={lat === 0 ? undefined : '4 4'}
          />
        );
      })}
      {[-120, -60, 0, 60, 120].map((lng) => {
        const x = ((lng + 180) / 360) * SVG_W;
        return (
          <line key={`lng-${lng}`} x1={x} y1="0" x2={x} y2={SVG_H}
            stroke={lng === 0 ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)'}
            strokeWidth={lng === 0 ? 1.5 : 1}
            strokeDasharray={lng === 0 ? undefined : '4 4'}
          />
        );
      })}

      {/* Full path (dim) */}
      {pathSegments.map((seg, i) => (
        <path key={`full-${i}`} d={seg.join(' ')}
          fill="none" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      ))}

      {/* Active path (bright) */}
      {activeSegments.map((seg, i) => (
        <path key={`active-${i}`} d={seg.join(' ')}
          fill="none" stroke="#22c55e" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
      ))}

      {/* Start marker */}
      {bodySnaps.length > 0 && (() => {
        const p = latLngToSvg(bodySnaps[0].latitude, bodySnaps[0].longitude);
        return (
          <g>
            <circle cx={p.x} cy={p.y} r="5" fill="#22c55e" stroke="#0f172a" strokeWidth="2" />
            <text x={p.x + 8} y={p.y + 4} fill="#22c55e" fontSize="9">START</text>
          </g>
        );
      })()}

      {/* End marker */}
      {bodySnaps.length > 1 && (() => {
        const last = bodySnaps[bodySnaps.length - 1];
        const p = latLngToSvg(last.latitude, last.longitude);
        return (
          <g>
            <circle cx={p.x} cy={p.y} r="5" fill="#ef4444" stroke="#0f172a" strokeWidth="2" />
            <text x={p.x + 8} y={p.y + 4} fill="#ef4444" fontSize="9">END</text>
          </g>
        );
      })()}

      {/* Current position */}
      {markerPos && (
        <g>
          <circle cx={markerPos.x} cy={markerPos.y} r={14}
            fill="none" stroke={markerColor} strokeWidth="1.5" opacity="0.35"
            className="animate-ping" />
          <line
            x1={markerPos.x} y1={markerPos.y}
            x2={markerPos.x + Math.sin((heading * Math.PI) / 180) * 16}
            y2={markerPos.y - Math.cos((heading * Math.PI) / 180) * 16}
            stroke={markerColor} strokeWidth="2.5" strokeLinecap="round"
          />
          <circle cx={markerPos.x} cy={markerPos.y} r="6"
            fill={markerColor} stroke="#0f172a" strokeWidth="2" />
        </g>
      )}

      {/* Body label */}
      <text x={SVG_W - 8} y={SVG_H - 8} textAnchor="end"
        fill="rgba(255,255,255,0.2)" fontSize="11">
        {body?.name ?? bodyId}
      </text>
    </svg>
  );
}

// ─── Compact telemetry readout ─────────────────────────────────────────────────

function ReplayTelemetry({ snap }: { snap: VesselTelemetry }) {
  const color = SITUATION_COLORS[snap.situation] ?? '#a855f7';
  const rows: [string, string][] = [
    ['Situation', snap.situation],
    ['Body', snap.bodyName ?? snap.bodyId],
    ['Altitude', formatAlt(snap.altitude)],
    ['Surf. Speed', `${snap.surfaceSpeed.toFixed(0)} m/s`],
    ['Orbital Spd', `${snap.orbitalSpeed.toFixed(0)} m/s`],
    ['Vert. Speed', `${snap.verticalSpeed.toFixed(1)} m/s`],
    ['Heading', snap.heading !== undefined ? `${snap.heading.toFixed(1)}°` : '—'],
    ['Latitude', `${snap.latitude.toFixed(3)}°`],
    ['Longitude', `${snap.longitude.toFixed(3)}°`],
    ['Mission T', formatMissionTime(snap.missionTime)],
    ['TWR', `${snap.currentTWR.toFixed(2)}`],
    ['ΔV left', `${snap.deltaVRemaining.toFixed(0)} m/s`],
  ];
  if (snap.apoapsis !== undefined)
    rows.push(['Apoapsis', formatAlt(snap.apoapsis)]);
  if (snap.periapsis !== undefined)
    rows.push(['Periapsis', formatAlt(snap.periapsis)]);

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 space-y-1">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-sm font-medium text-gray-200 truncate">{snap.name}</span>
      </div>
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-2 text-xs">
          <span className="text-gray-500 shrink-0">{label}</span>
          <span className="text-gray-200 font-mono text-right">{value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function FlightReplayPanel() {
  const {
    isActive, isPlaying, isLoading, snapshots, currentIndex,
    speed, selectedVessel, dataSource,
    vesselStats: vessels, vesselStatsLoading: loadingVessels,
    loadVesselStats, loadVessel, play, pause, stop, seek,
    stepForward, stepBack, setSpeed, advance,
  } = useReplayStore();

  const [displayBodyId, setDisplayBodyId] = useState<string | null>(null);

  // Load vessel list (tries server first, falls back to IndexedDB)
  useEffect(() => {
    loadVesselStats();
  }, []);

  // Playback interval — one frame per tick, tick rate = 500ms / speed
  const advanceRef = useRef(advance);
  advanceRef.current = advance;
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(
      () => advanceRef.current(),
      Math.max(16, Math.round(500 / speed)),
    );
    return () => clearInterval(interval);
  }, [isPlaying, speed]);

  // Auto-follow body from current snapshot
  const currentSnap = snapshots[currentIndex] ?? null;
  useEffect(() => {
    if (currentSnap) setDisplayBodyId(currentSnap.bodyId);
  }, [currentSnap?.bodyId]);

  // Unique bodies in this vessel's flight
  const flightBodies = useMemo(
    () => [...new Set(snapshots.map((s) => s.bodyId))],
    [snapshots],
  );

  const activeBodyId = displayBodyId ?? flightBodies[0] ?? 'kerbin';

  const totalDuration =
    snapshots.length > 1
      ? snapshots[snapshots.length - 1].timestamp - snapshots[0].timestamp
      : 0;
  const elapsed =
    snapshots.length > 0 && currentSnap
      ? currentSnap.timestamp - snapshots[0].timestamp
      : 0;

  return (
    <Card>
      <CardHeader title="Flight Replay" subtitle="Replay recorded flights from the local database" />

      <div className="space-y-4">
        {/* Vessel selector */}
        <div>
          <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">
            Recorded Vessels
          </div>
          {loadingVessels ? (
            <div className="text-sm text-gray-500 animate-pulse">Loading…</div>
          ) : vessels.length === 0 ? (
            <div className="text-sm text-gray-600 italic">
              No recorded flights yet — connect to KSP to start recording.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {vessels.map((v) => {
                const isSelected = v.name === selectedVessel;
                const dur = v.lastTimestamp - v.firstTimestamp;
                return (
                  <button
                    key={v.name}
                    onClick={() => loadVessel(v.name)}
                    className={`px-3 py-2 rounded-lg border text-left transition-colors text-xs ${
                      isSelected
                        ? 'bg-emerald-900 border-emerald-500 text-emerald-200'
                        : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <div className="font-medium text-sm mb-0.5">{v.name}</div>
                    <div className="text-gray-500">
                      {v.snapshotCount.toLocaleString()} pts · {formatDuration(dur)}
                    </div>
                    <div className="text-gray-600">{formatTS(v.lastTimestamp)}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Replay area */}
        {isLoading && (
          <div className="text-sm text-gray-500 animate-pulse">Loading flight data…</div>
        )}

        {isActive && !isLoading && (
          <div className="flex gap-4">
            {/* Map + controls */}
            <div className="flex-1 min-w-0 space-y-3">
              {/* Body tabs */}
              {flightBodies.length > 1 && (
                <div className="flex gap-1">
                  {flightBodies.map((bodyId) => {
                    const body = celestialBodies[bodyId];
                    const isActive = bodyId === activeBodyId;
                    return (
                      <button
                        key={bodyId}
                        onClick={() => setDisplayBodyId(bodyId)}
                        className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                          isActive
                            ? 'bg-emerald-900 border-emerald-500 text-emerald-300'
                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                        }`}
                      >
                        {body?.name ?? bodyId}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Map */}
              <ReplayMap
                snapshots={snapshots}
                currentIndex={currentIndex}
                bodyId={activeBodyId}
              />

              {/* Timeline scrubber */}
              <div className="space-y-1">
                <input
                  type="range"
                  min={0}
                  max={snapshots.length - 1}
                  value={currentIndex}
                  onChange={(e) => seek(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 font-mono">
                  <span>
                    {snapshots.length > 0
                      ? formatMissionTime(snapshots[0].missionTime)
                      : '—'}
                  </span>
                  <span className="text-emerald-400">
                    {currentSnap ? formatMissionTime(currentSnap.missionTime) : '—'}
                    {' · '}
                    {formatDuration(elapsed)}
                    {' / '}
                    {formatDuration(totalDuration)}
                  </span>
                  <span>
                    {snapshots.length > 0
                      ? formatMissionTime(snapshots[snapshots.length - 1].missionTime)
                      : '—'}
                  </span>
                </div>
              </div>

              {/* Playback controls */}
              <div className="flex items-center gap-3">
                {/* Transport buttons */}
                <div className="flex items-center gap-1">
                  <CtrlBtn onClick={stop} title="Go to start">⏮</CtrlBtn>
                  <CtrlBtn onClick={stepBack} title="Step back">◀</CtrlBtn>
                  <CtrlBtn
                    onClick={isPlaying ? pause : play}
                    title={isPlaying ? 'Pause' : 'Play'}
                    primary
                  >
                    {isPlaying ? '⏸' : '▶'}
                  </CtrlBtn>
                  <CtrlBtn onClick={stepForward} title="Step forward">▶</CtrlBtn>
                  <CtrlBtn
                    onClick={() => seek(snapshots.length - 1)}
                    title="Go to end"
                  >
                    ⏭
                  </CtrlBtn>
                </div>

                {/* Speed selector */}
                <div className="flex items-center gap-1 ml-2">
                  {REPLAY_SPEEDS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      className={`px-2 py-1 text-xs rounded border transition-colors ${
                        speed === s
                          ? 'bg-emerald-900 border-emerald-500 text-emerald-300'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      {s}×
                    </button>
                  ))}
                </div>

                {/* Frame counter + data source */}
                <div className="ml-auto flex items-center gap-2">
                  {dataSource && (
                    <span className={`text-xs px-1.5 py-0.5 rounded border font-mono ${
                      dataSource === 'server'
                        ? 'bg-emerald-900/50 border-emerald-700 text-emerald-400'
                        : 'bg-gray-800 border-gray-600 text-gray-500'
                    }`}>
                      {dataSource === 'server' ? 'SQLite' : 'IndexedDB'}
                    </span>
                  )}
                  <span className="text-xs text-gray-600 font-mono">
                    {currentIndex + 1} / {snapshots.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Telemetry readout */}
            {currentSnap && (
              <div className="w-48 shrink-0">
                <ReplayTelemetry snap={currentSnap} />
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Small button helper ───────────────────────────────────────────────────────

function CtrlBtn({
  children,
  onClick,
  title,
  primary,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-9 h-9 rounded-lg border text-sm flex items-center justify-center transition-colors ${
        primary
          ? 'bg-emerald-800 border-emerald-500 text-emerald-200 hover:bg-emerald-700'
          : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
      }`}
    >
      {children}
    </button>
  );
}
