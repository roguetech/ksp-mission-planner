import React, { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { TrackedVessel } from '../../types';
import { CelestialBody } from '../../types';
import {
  orbitPoints, vesselEquatorialPos, perifocalToEquatorial,
  orbitPoints as transferOrbitPoints,
} from '../../utils/orbitalMath';
import { celestialBodies } from '../../data/bodies';
import { RendezvousResult } from '../../utils/orbitalMath';
import { PlanetaryBody } from './PlanetaryBody';

const SITUATION_COLORS: Record<string, string> = {
  prelaunch: '#22c55e', landed: '#22c55e', splashed: '#06b6d4',
  flying: '#eab308', subOrbital: '#f97316',
  orbiting: '#3b82f6', escaping: '#a855f7', docked: '#ec4899',
};

const SVG_W = 560;
const SVG_H = 480;
const CX = SVG_W / 2;
const CY = SVG_H / 2;
const PADDING = 40;
const MIN_ZOOM = 0.01;  // low enough to see outermost moons
const MAX_ZOOM = 20;

const NICE_DISTANCES = [
  500, 1e3, 2e3, 5e3, 10e3, 20e3, 50e3, 100e3, 200e3, 500e3,
  1e6, 2e6, 5e6, 10e6, 20e6, 50e6, 100e6, 200e6, 500e6,
];

function fmtDist(m: number): string {
  if (m >= 1e6) return `${(m / 1e6 >= 10 ? Math.round(m / 1e6) : (m / 1e6).toFixed(1))} Mm`;
  if (m >= 1e3) return `${Math.round(m / 1e3)} km`;
  return `${m} m`;
}

// ── Moon / child-body position (Kepler solver) ────────────────────────────────

const DEG = Math.PI / 180;

/**
 * Returns the current equatorial-frame [x, y] position (in metres) of a
 * celestial body orbiting its parent, given wall-clock time `t` in seconds.
 */
function bodyPosition(body: CelestialBody, t: number): [number, number] {
  const { semiMajorAxis: a, eccentricity: e, inclination, longitudeOfAscendingNode,
          argumentOfPeriapsis, meanAnomalyAtEpoch: M0, orbitalPeriod: T } = body.orbital;
  if (!T || T === 0) return [0, 0];

  const n = (2 * Math.PI) / T;
  const M = ((M0 + n * t) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);

  // Newton-Raphson for eccentric anomaly E
  let E = M;
  for (let i = 0; i < 10; i++) {
    E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  }

  // True anomaly
  const nu = 2 * Math.atan2(
    Math.sqrt(1 + e) * Math.sin(E / 2),
    Math.sqrt(1 - e) * Math.cos(E / 2),
  );
  const r = a * (1 - e * Math.cos(E));
  return perifocalToEquatorial(r * Math.cos(nu), r * Math.sin(nu),
    inclination, longitudeOfAscendingNode, argumentOfPeriapsis);
}

// ─────────────────────────────────────────────────────────────────────────────

interface OrbitalMapProps {
  vessels: TrackedVessel[];
  activeVesselName: string | null;
  targetVesselName: string | null;
  bodyId: string;
  rendezvous: RendezvousResult | null;
  onVesselClick: (name: string) => void;
}

export function OrbitalMap({
  vessels, activeVesselName, targetVesselName, bodyId, rendezvous, onVesselClick,
}: OrbitalMapProps) {
  const body = celestialBodies[bodyId];
  const bodyRadius = body?.physical?.radius ?? 600_000;

  // ── Wall-clock time (updates every 10 s so moons animate slowly) ──────────────
  const [wallTime, setWallTime] = useState(() => Date.now() / 1000);
  useEffect(() => {
    const id = setInterval(() => setWallTime(Date.now() / 1000), 10_000);
    return () => clearInterval(id);
  }, []);

  // ── Child bodies (moons / satellites of the current body) ─────────────────────
  const childBodies = useMemo(() =>
    Object.values(celestialBodies).filter(
      b => b.parent === bodyId && b.orbital.orbitalPeriod > 0,
    ),
    [bodyId],
  );

  // Current positions of child bodies in physical metres (equatorial frame)
  const childPositions = useMemo(() =>
    childBodies.map(b => bodyPosition(b, wallTime)),
    [childBodies, wallTime],
  );

  // ── Scale: fit vessel orbits, but never smaller than the outermost moon orbit ─
  const maxVesselR = useMemo(() => {
    const radii = vessels
      .filter(v => v.bodyId.toLowerCase() === bodyId.toLowerCase() && v.semiMajorAxis > 0)
      .map(v => v.semiMajorAxis * (1 + v.eccentricity));
    return radii.length ? Math.max(...radii) : bodyRadius * 3;
  }, [vessels, bodyId, bodyRadius]);

  // Outermost moon apoapsis — used to compute the "system view" zoom
  const maxMoonR = useMemo(() =>
    childBodies.reduce((m, b) =>
      Math.max(m, b.orbital.semiMajorAxis * (1 + b.orbital.eccentricity)), 0),
    [childBodies],
  );

  const baseScale = (Math.min(SVG_W, SVG_H) / 2 - PADDING) / maxVesselR;

  // ── Zoom / pan state ──────────────────────────────────────────────────────────
  const [zoom, setZoom] = useState(1);
  const [viewCenter, setViewCenter] = useState<{ x: number; y: number }>({ x: CX, y: CY });

  const clampZoom = (z: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));

  // Zoom that fits the full moon system with a bit of margin
  const systemZoom = useMemo(() => {
    if (maxMoonR === 0) return 1;
    return clampZoom((Math.min(SVG_W, SVG_H) / 2 - PADDING) / (maxMoonR * baseScale * 1.15));
  }, [maxMoonR, baseScale]);

  const resetView = useCallback(() => {
    setZoom(1);
    setViewCenter({ x: CX, y: CY });
  }, []);

  const zoomToSystem = useCallback(() => {
    setZoom(systemZoom);
    setViewCenter({ x: CX, y: CY });
  }, [systemZoom]);

  const viewBox = useMemo(() => {
    const vw = SVG_W / zoom;
    const vh = SVG_H / zoom;
    return `${viewCenter.x - vw / 2} ${viewCenter.y - vh / 2} ${vw} ${vh}`;
  }, [zoom, viewCenter]);

  // ── Coordinate helpers ────────────────────────────────────────────────────────
  const scale = baseScale;
  const S = 1 / zoom; // screen-space-constant size multiplier

  const toSVG = useCallback(
    (x: number, y: number): [number, number] => [CX + x * scale, CY - y * scale],
    [scale],
  );

  function buildOrbitPath(pts: [number, number][]): string {
    return pts
      .map(([x, y], i) => {
        const [sx, sy] = toSVG(x, y);
        return `${i === 0 ? 'M' : 'L'} ${sx.toFixed(1)} ${sy.toFixed(1)}`;
      })
      .join(' ') + ' Z';
  }

  // ── Scale bar ─────────────────────────────────────────────────────────────────
  const scaleBar = useMemo(() => {
    const targetMetres = SVG_W * 0.18 / (zoom * scale);
    const nice = NICE_DISTANCES.reduce((best, d) =>
      Math.abs(d - targetMetres) < Math.abs(best - targetMetres) ? d : best);
    const barW = nice * scale;
    const vw = SVG_W / zoom;
    const vh = SVG_H / zoom;
    const x1 = viewCenter.x - vw / 2 + 8 * S;
    const y  = viewCenter.y + vh / 2 - 14 * S;
    return { x1, x2: x1 + barW, y, label: fmtDist(nice) };
  }, [zoom, scale, viewCenter, S]);

  // ── Mouse → SVG coordinate ────────────────────────────────────────────────────
  const svgRef = useRef<SVGSVGElement>(null);

  function clientToSVG(clientX: number, clientY: number) {
    const el = svgRef.current;
    if (!el) return { x: CX, y: CY };
    const rect = el.getBoundingClientRect();
    const vw = SVG_W / zoom, vh = SVG_H / zoom;
    return {
      x: viewCenter.x - vw / 2 + (clientX - rect.left) / rect.width  * vw,
      y: viewCenter.y - vh / 2 + (clientY - rect.top)  / rect.height * vh,
    };
  }

  // ── Mouse wheel zoom ──────────────────────────────────────────────────────────
  function onWheel(e: React.WheelEvent<SVGSVGElement>) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const newZoom = clampZoom(zoom * factor);
    const cur = clientToSVG(e.clientX, e.clientY);
    const vw = SVG_W / zoom, vh = SVG_H / zoom;
    const vx = viewCenter.x - vw / 2, vy = viewCenter.y - vh / 2;
    const fx = (cur.x - vx) / vw, fy = (cur.y - vy) / vh;
    const nVW = SVG_W / newZoom, nVH = SVG_H / newZoom;
    setViewCenter({ x: cur.x - fx * nVW + nVW / 2, y: cur.y - fy * nVH + nVH / 2 });
    setZoom(newZoom);
  }

  // ── Drag to pan ───────────────────────────────────────────────────────────────
  const dragRef = useRef<{ startClient: { x: number; y: number }; startCenter: { x: number; y: number } } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  function onMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    if (e.button !== 0) return;
    dragRef.current = { startClient: { x: e.clientX, y: e.clientY }, startCenter: { ...viewCenter } };
    setIsDragging(false);
  }

  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startClient.x;
    const dy = e.clientY - dragRef.current.startClient.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) setIsDragging(true);
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const svgScale = SVG_W / zoom / rect.width;
    setViewCenter({
      x: dragRef.current.startCenter.x - dx * svgScale,
      y: dragRef.current.startCenter.y - dy * svgScale,
    });
  }

  function onMouseUp()    { dragRef.current = null; }
  function onMouseLeave() { dragRef.current = null; }

  function onSVGClick(e: React.MouseEvent<SVGSVGElement>) {
    if (isDragging) { e.stopPropagation(); setIsDragging(false); }
  }

  // ── Vessel / orbit data ───────────────────────────────────────────────────────
  const bodyVessels = vessels.filter(
    v => v.bodyId.toLowerCase() === bodyId.toLowerCase() && v.semiMajorAxis > 0,
  );
  const active = bodyVessels.find(v => v.name === activeVesselName);
  const target = bodyVessels.find(v => v.name === targetVesselName);

  const transferPath = useMemo(() => {
    if (!rendezvous || !active) return null;
    const pts = transferOrbitPoints(
      rendezvous.transferSMA, rendezvous.transferEcc,
      active.inclination, active.longitudeOfAscendingNode,
      active.argumentOfPeriapsis + (rendezvous.ascending ? active.trueAnomaly : active.trueAnomaly + 180),
    );
    return buildOrbitPath(pts);
  }, [rendezvous, active, toSVG]);

  const bodyR_px = bodyRadius * scale;
  const atmR_px  = body?.physical?.atmosphereHeight
    ? (bodyRadius + body.physical.atmosphereHeight) * scale : null;

  // ── Derived viewBox extents for overlay anchoring ─────────────────────────────
  const vw = SVG_W / zoom, vh = SVG_H / zoom;
  const vLeft = viewCenter.x - vw / 2, vTop  = viewCenter.y - vh / 2;
  const vRight = viewCenter.x + vw / 2, vBottom = viewCenter.y + vh / 2;

  // ── Are any moons currently off-screen? (for hint) ────────────────────────────
  const moonsOffScreen = useMemo(() => {
    if (childBodies.length === 0) return false;
    return childBodies.some((b, i) => {
      const [ex, ey] = childPositions[i];
      const [sx, sy] = toSVG(ex, ey);
      return sx < vLeft || sx > vRight || sy < vTop || sy > vBottom;
    });
  }, [childBodies, childPositions, toSVG, vLeft, vRight, vTop, vBottom]);

  return (
    <div className="relative w-full select-none">
      <svg
        ref={svgRef}
        viewBox={viewBox}
        className="w-full rounded-lg overflow-hidden"
        style={{ background: '#060d1a', cursor: isDragging ? 'grabbing' : 'grab' }}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onClick={onSVGClick}
      >
        {/* Star field */}
        {[...Array(60)].map((_, i) => (
          <circle key={i}
            cx={(((i * 137.5) % SVG_W + SVG_W) % SVG_W)}
            cy={(((i * 97.3) % SVG_H + SVG_H) % SVG_H)}
            r={(i % 5 === 0 ? 1.2 : 0.7) * S}
            fill="white" opacity={0.2 + (i % 4) * 0.1}
          />
        ))}

        {/* Atmosphere reference ring */}
        {atmR_px && (
          <circle cx={CX} cy={CY} r={atmR_px}
            fill="none" stroke={body?.color ?? '#3b82f6'}
            strokeWidth={S} strokeDasharray={`${4 * S} ${4 * S}`} opacity="0.15" />
        )}

        {/* ── Child-body (moon) orbits ─────────────────────────────────────────── */}
        {childBodies.map(cb => {
          const pts = orbitPoints(
            cb.orbital.semiMajorAxis, cb.orbital.eccentricity,
            cb.orbital.inclination, cb.orbital.longitudeOfAscendingNode,
            cb.orbital.argumentOfPeriapsis, 120,
          );
          return (
            <path key={`orbit-${cb.id}`} d={buildOrbitPath(pts)}
              fill="none" stroke="#263a50" strokeWidth={S}
              strokeDasharray={`${5 * S} ${5 * S}`} opacity="0.55" />
          );
        })}

        {/* Non-selected vessel orbits */}
        {bodyVessels
          .filter(v => v.name !== activeVesselName && v.name !== targetVesselName)
          .map(v => {
            const pts = orbitPoints(v.semiMajorAxis, v.eccentricity, v.inclination, v.longitudeOfAscendingNode, v.argumentOfPeriapsis);
            return (
              <path key={v.name} d={buildOrbitPath(pts)}
                fill="none" stroke="#1e3a5f" strokeWidth={S} opacity="0.6" />
            );
          })}

        {/* Transfer orbit */}
        {transferPath && (
          <path d={transferPath}
            fill="none" stroke="#f97316" strokeWidth={1.5 * S}
            strokeDasharray={`${6 * S} ${3 * S}`} opacity="0.7" />
        )}

        {/* Target orbit */}
        {target && (() => {
          const pts = orbitPoints(target.semiMajorAxis, target.eccentricity, target.inclination, target.longitudeOfAscendingNode, target.argumentOfPeriapsis);
          return <path d={buildOrbitPath(pts)} fill="none" stroke="#f59e0b" strokeWidth={1.5 * S} opacity="0.85" />;
        })()}

        {/* Active orbit */}
        {active && (() => {
          const pts = orbitPoints(active.semiMajorAxis, active.eccentricity, active.inclination, active.longitudeOfAscendingNode, active.argumentOfPeriapsis);
          return <path d={buildOrbitPath(pts)} fill="none" stroke="#22c55e" strokeWidth={2 * S} opacity="0.9" />;
        })()}

        {/* Central body */}
        <PlanetaryBody bodyId={bodyId} cx={CX} cy={CY} r={bodyR_px} zoom={zoom} />

        {/* ── Child bodies (moons) ─────────────────────────────────────────────── */}
        {childBodies.map((cb, i) => {
          const [ex, ey] = childPositions[i];
          const [sx, sy] = toSVG(ex, ey);

          // Physical radius in SVG units — clamp so it's always at least 4px on screen
          const physR   = cb.physical.radius * scale;
          const minR    = 4 * S;
          const displayR = Math.max(physR, minR);

          // Distance label
          const distM = Math.sqrt(ex * ex + ey * ey);

          return (
            <g key={cb.id}>
              {/* Moon body */}
              <PlanetaryBody bodyId={cb.id} cx={sx} cy={sy} r={displayR} zoom={zoom} />

              {/* Name label */}
              <text x={sx} y={sy - displayR - 5 * S}
                textAnchor="middle" fill="#94a3b8"
                fontSize={9 * S} fontWeight="bold"
                className="pointer-events-none select-none">
                {cb.name}
              </text>

              {/* Distance sub-label (only when small enough to be useful) */}
              <text x={sx} y={sy - displayR - 14 * S}
                textAnchor="middle" fill="#4b5563"
                fontSize={7.5 * S}
                className="pointer-events-none select-none">
                {fmtDist(distM)}
              </text>
            </g>
          );
        })}

        {/* Vessel markers */}
        {bodyVessels.map(v => {
          const [x_eq, y_eq] = vesselEquatorialPos(v);
          const [sx, sy] = toSVG(x_eq, y_eq);
          const isActive = v.name === activeVesselName;
          const isTarget = v.name === targetVesselName;
          const color = isActive ? '#22c55e' : isTarget ? '#f59e0b' : (SITUATION_COLORS[v.situation] ?? '#94a3b8');
          const r = (isActive || isTarget ? 6 : 4) * S;

          return (
            <g key={v.name}
              style={{ cursor: isDragging ? 'grabbing' : 'pointer' }}
              onClick={(e) => { if (!isDragging) { e.stopPropagation(); onVesselClick(v.name); } }}
            >
              {(isActive || isTarget) && (
                <circle cx={sx} cy={sy} r={r + 8 * S}
                  fill="none" stroke={color} strokeWidth={1.5 * S}
                  opacity="0.3" className="animate-ping" />
              )}
              <circle cx={sx} cy={sy} r={r + 4 * S}
                fill="none" stroke={color} strokeWidth={(isActive || isTarget ? 2 : 1) * S} opacity="0.6" />
              <circle cx={sx} cy={sy} r={r} fill={color} stroke="#060d1a" strokeWidth={1.5 * S} />
              <text x={sx} y={sy - r - 6 * S} textAnchor="middle"
                fill={color} fontSize={(isActive || isTarget ? 10 : 8) * S}
                fontWeight={isActive || isTarget ? 'bold' : 'normal'}
                className="pointer-events-none select-none">
                {v.name}
              </text>
              {(isActive || isTarget) && (
                <text x={sx} y={sy + r + 12 * S} textAnchor="middle"
                  fill={color} fontSize={8 * S} opacity="0.8"
                  className="pointer-events-none select-none">
                  {isActive ? 'ACTIVE' : 'TARGET'}
                </text>
              )}
            </g>
          );
        })}

        {/* Phase angle line */}
        {active && target && (() => {
          const [ax, ay] = vesselEquatorialPos(active);
          const [tx, ty] = vesselEquatorialPos(target);
          const [sax, say] = toSVG(ax, ay);
          const [stx, sty] = toSVG(tx, ty);
          return (
            <line x1={sax} y1={say} x2={stx} y2={sty}
              stroke="#94a3b8" strokeWidth={S}
              strokeDasharray={`${3 * S} ${3 * S}`} opacity="0.35" />
          );
        })()}

        {/* Scale bar */}
        <g>
          <line x1={scaleBar.x1} y1={scaleBar.y} x2={scaleBar.x2} y2={scaleBar.y}
            stroke="#4b5563" strokeWidth={1.5 * S} strokeLinecap="round" />
          <line x1={scaleBar.x1} y1={scaleBar.y - 4 * S} x2={scaleBar.x1} y2={scaleBar.y + 4 * S} stroke="#4b5563" strokeWidth={S} />
          <line x1={scaleBar.x2} y1={scaleBar.y - 4 * S} x2={scaleBar.x2} y2={scaleBar.y + 4 * S} stroke="#4b5563" strokeWidth={S} />
          <text x={(scaleBar.x1 + scaleBar.x2) / 2} y={scaleBar.y - 6 * S}
            textAnchor="middle" fill="#6b7280" fontSize={8 * S}
            className="pointer-events-none select-none">
            {scaleBar.label}
          </text>
        </g>

        {/* Phase angle overlay */}
        {rendezvous && (
          <g>
            <rect x={vLeft + 2 * S} y={vTop + 2 * S}
              width={170 * S} height={52 * S} rx={5 * S}
              fill="rgba(6,13,26,0.85)" stroke="#1e3a5f" strokeWidth={S} />
            <text x={vLeft + 8 * S} y={vTop + 16 * S} fill="#94a3b8" fontSize={9 * S}>Phase Angle</text>
            <text x={vLeft + 8 * S} y={vTop + 30 * S} fill="#22c55e" fontSize={12 * S} fontWeight="bold">
              {rendezvous.phaseAngleCurrent.toFixed(1)}°
            </text>
            <text x={vLeft + 89 * S} y={vTop + 16 * S} fill="#94a3b8" fontSize={9 * S}>Required</text>
            <text x={vLeft + 89 * S} y={vTop + 30 * S} fill="#f59e0b" fontSize={12 * S} fontWeight="bold">
              {rendezvous.phaseAngleRequired.toFixed(1)}°
            </text>
            <text x={vLeft + 8 * S} y={vTop + 44 * S} fill="#6b7280" fontSize={8 * S}>
              {rendezvous.ascending ? '↑ Ascending transfer' : '↓ Descending transfer'}
            </text>
          </g>
        )}

        {/* Legend */}
        {[
          { color: '#22c55e', label: 'Active' },
          { color: '#f59e0b', label: 'Target' },
          { color: '#f97316', label: 'Transfer' },
        ].map(({ color, label }, i) => (
          <g key={label} transform={`translate(${vRight - 4 * S}, ${vBottom - (4 + i * 16) * S})`}>
            <line x1={-50 * S} y1={-4 * S} x2={-34 * S} y2={-4 * S}
              stroke={color} strokeWidth={2 * S}
              strokeDasharray={label === 'Transfer' ? `${4 * S} ${2 * S}` : undefined} />
            <text x={-28 * S} y={0} textAnchor="end" fill={color} fontSize={9 * S}>{label}</text>
          </g>
        ))}
      </svg>

      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1">
        <button onClick={() => setZoom(z => clampZoom(z * 1.4))} title="Zoom in"
          className="w-7 h-7 flex items-center justify-center rounded bg-gray-900/80 border border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white text-sm font-mono leading-none transition-colors">
          +
        </button>
        <button onClick={resetView} title="Fit vessel orbits"
          className="w-7 h-7 flex items-center justify-center rounded bg-gray-900/80 border border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 8a6 6 0 1 0 6-6" strokeLinecap="round"/>
            <path d="M2 3v5h5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {childBodies.length > 0 && (
          <button onClick={zoomToSystem}
            title={`View full ${body?.name ?? bodyId} system`}
            className="w-7 h-7 flex items-center justify-center rounded bg-gray-900/80 border border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors text-xs font-mono">
            ⊙
          </button>
        )}
        <button onClick={() => setZoom(z => clampZoom(z / 1.4))} title="Zoom out"
          className="w-7 h-7 flex items-center justify-center rounded bg-gray-900/80 border border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white text-sm font-mono leading-none transition-colors">
          −
        </button>
      </div>

      {/* Zoom level */}
      {zoom !== 1 && (
        <div className="absolute top-3 right-3 text-xs text-gray-500 font-mono bg-gray-900/70 px-1.5 py-0.5 rounded pointer-events-none">
          {zoom < 0.1 ? zoom.toFixed(3) : zoom.toFixed(1)}×
        </div>
      )}

      {/* Hint when moons are off-screen */}
      {moonsOffScreen && childBodies.length > 0 && (
        <div className="absolute top-3 left-3 pointer-events-none">
          <div className="text-xs text-gray-500 bg-gray-900/70 px-2 py-1 rounded flex items-center gap-1.5">
            <span className="opacity-60">⊙</span>
            Zoom out or click ⊙ to see {childBodies.map(b => b.name).join(', ')}
          </div>
        </div>
      )}
    </div>
  );
}
