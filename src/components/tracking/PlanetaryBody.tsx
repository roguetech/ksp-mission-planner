import React from 'react';

/**
 * Renders a detailed SVG representation of a KSP celestial body.
 * All coordinates are in the parent SVG's user-space; cx/cy/r are in SVG units.
 * Uses only inline SVG (no external textures or images).
 */

interface BodyConfig {
  /** Base surface colour */
  surface: string;
  /** Brighter colour for the lit hemisphere highlight */
  highlight: string;
  /** Darker colour for the shadow hemisphere */
  shadow: string;
  /** Colour for atmospheric glow ring (undefined = no atmosphere rendered) */
  atmColor?: string;
  /** How thick the atmosphere halo is, as a fraction of the body radius */
  atmThickness?: number;
  /** Opacity of the atmosphere halo */
  atmOpacity?: number;
  /** Horizontal bands drawn on the surface: y is normalised −1 (top) → +1 (bottom) */
  bands?: Array<{ y: number; h: number; color: string; opacity: number }>;
  /** Show polar caps of this colour covering |y| > poleEdge (normalised) */
  poles?: { color: string; edge: number };
  /** Faint crater circles: cx/cy/r all normalised −1 → +1 */
  craters?: Array<{ cx: number; cy: number; r: number }>;
  /** Draw horizontal stripes (gas giant style) */
  gasStripes?: Array<{ y: number; h: number; color: string }>;
  /** Star: show a corona glow instead of an atmosphere ring */
  isStar?: boolean;
}

const BODY_CONFIGS: Record<string, BodyConfig> = {
  // ── Kerbol ────────────────────────────────────────────────────────────────────
  kerbol: {
    surface: '#ffd000',
    highlight: '#fff5a0',
    shadow: '#e06000',
    isStar: true,
    bands: [
      { y: -0.3, h: 0.12, color: '#ffb800', opacity: 0.35 },
      { y:  0.1, h: 0.15, color: '#ff9000', opacity: 0.3  },
      { y:  0.5, h: 0.1,  color: '#ffcc00', opacity: 0.2  },
    ],
  },

  // ── Kerbin ────────────────────────────────────────────────────────────────────
  kerbin: {
    surface: '#1a6faa',
    highlight: '#6aaddc',
    shadow: '#0a2e50',
    atmColor: '#5ba8e8',
    atmThickness: 0.18,
    atmOpacity: 0.22,
    poles: { color: '#e8eef4', edge: 0.72 },
    bands: [
      { y: -0.55, h: 0.18, color: '#2a7a3a', opacity: 0.75 }, // northern land
      { y: -0.15, h: 0.12, color: '#3d8a4a', opacity: 0.55 }, // equatorial land
      { y:  0.05, h: 0.08, color: '#1a6faa', opacity: 0.0  }, // ocean gap
      { y:  0.25, h: 0.20, color: '#3a6e28', opacity: 0.60 }, // southern land
    ],
  },

  // ── Mun ───────────────────────────────────────────────────────────────────────
  mun: {
    surface: '#5a5a5a',
    highlight: '#8a8a8a',
    shadow: '#1e1e1e',
    craters: [
      { cx: -0.3, cy: -0.4, r: 0.20 },
      { cx:  0.4, cy:  0.2, r: 0.14 },
      { cx: -0.1, cy:  0.5, r: 0.18 },
      { cx:  0.2, cy: -0.2, r: 0.10 },
      { cx: -0.5, cy:  0.1, r: 0.12 },
      { cx:  0.1, cy:  0.3, r: 0.07 },
    ],
    poles: { color: '#7a7a7a', edge: 0.85 },
  },

  // ── Minmus ────────────────────────────────────────────────────────────────────
  minmus: {
    surface: '#6db87a',
    highlight: '#a0d8a8',
    shadow: '#2a5a35',
    poles: { color: '#c8e8cc', edge: 0.80 },
    bands: [
      { y: -0.2, h: 0.1,  color: '#8fd49a', opacity: 0.4 }, // great flats
      { y:  0.1, h: 0.14, color: '#4a9058', opacity: 0.5 }, // lowlands
      { y:  0.4, h: 0.08, color: '#a0d090', opacity: 0.35 },
    ],
  },

  // ── Eve ───────────────────────────────────────────────────────────────────────
  eve: {
    surface: '#6a0dad',
    highlight: '#b060e0',
    shadow: '#2a0050',
    atmColor: '#9030c0',
    atmThickness: 0.30,
    atmOpacity: 0.35,
    bands: [
      { y: -0.3, h: 0.25, color: '#8020c0', opacity: 0.45 },
      { y:  0.1, h: 0.20, color: '#500090', opacity: 0.50 },
      { y:  0.4, h: 0.15, color: '#9040d0', opacity: 0.30 },
    ],
    poles: { color: '#c080f0', edge: 0.78 },
  },

  // ── Gilly ────────────────────────────────────────────────────────────────────
  gilly: {
    surface: '#7a5030',
    highlight: '#a07050',
    shadow: '#3a2010',
    craters: [
      { cx: 0.1,  cy: -0.2, r: 0.30 },
      { cx: -0.2, cy:  0.3, r: 0.22 },
    ],
  },

  // ── Duna ─────────────────────────────────────────────────────────────────────
  duna: {
    surface: '#b04828',
    highlight: '#e07848',
    shadow: '#502010',
    atmColor: '#e06030',
    atmThickness: 0.10,
    atmOpacity: 0.18,
    poles: { color: '#d8c8b8', edge: 0.80 },
    bands: [
      { y: -0.2, h: 0.15, color: '#c05830', opacity: 0.45 },
      { y:  0.2, h: 0.12, color: '#904020', opacity: 0.50 },
    ],
    craters: [
      { cx:  0.3, cy: -0.3, r: 0.16 },
      { cx: -0.4, cy:  0.1, r: 0.12 },
      { cx:  0.0, cy:  0.4, r: 0.10 },
    ],
  },

  // ── Ike ───────────────────────────────────────────────────────────────────────
  ike: {
    surface: '#484848',
    highlight: '#707070',
    shadow: '#181818',
    craters: [
      { cx: -0.2, cy: -0.3, r: 0.28 },
      { cx:  0.35, cy:  0.2, r: 0.18 },
      { cx: -0.3, cy:  0.4, r: 0.14 },
    ],
  },

  // ── Dres ─────────────────────────────────────────────────────────────────────
  dres: {
    surface: '#888888',
    highlight: '#b0b0b0',
    shadow: '#303030',
    craters: [
      { cx: 0.1,  cy: -0.4, r: 0.22 },
      { cx: -0.3, cy:  0.2, r: 0.18 },
      { cx:  0.4, cy:  0.3, r: 0.14 },
      { cx: -0.1, cy:  0.5, r: 0.10 },
    ],
  },

  // ── Jool ─────────────────────────────────────────────────────────────────────
  jool: {
    surface: '#3a8a1a',
    highlight: '#70c040',
    shadow: '#0a4008',
    atmColor: '#60b030',
    atmThickness: 0.08,
    atmOpacity: 0.20,
    gasStripes: [
      { y: -0.75, h: 0.10, color: '#2a7010' },
      { y: -0.55, h: 0.08, color: '#5aaa28' },
      { y: -0.40, h: 0.12, color: '#1e6010' },
      { y: -0.22, h: 0.06, color: '#4a9820' },
      { y: -0.10, h: 0.14, color: '#228b18' },
      { y:  0.10, h: 0.08, color: '#50a020' },
      { y:  0.25, h: 0.12, color: '#1a5c10' },
      { y:  0.44, h: 0.08, color: '#3a8a18' },
      { y:  0.60, h: 0.10, color: '#266014' },
    ],
  },

  // ── Laythe ───────────────────────────────────────────────────────────────────
  laythe: {
    surface: '#1550a0',
    highlight: '#5090e0',
    shadow: '#081828',
    atmColor: '#4070c0',
    atmThickness: 0.14,
    atmOpacity: 0.20,
    poles: { color: '#d0e8f8', edge: 0.82 },
    bands: [
      { y: -0.35, h: 0.14, color: '#305090', opacity: 0.55 }, // land
      { y:  0.15, h: 0.10, color: '#284888', opacity: 0.50 }, // land
    ],
  },

  // ── Vall ─────────────────────────────────────────────────────────────────────
  vall: {
    surface: '#8ab8d0',
    highlight: '#c0dce8',
    shadow: '#2a4858',
    poles: { color: '#e8f4f8', edge: 0.75 },
    bands: [
      { y: -0.2, h: 0.12, color: '#a0c8e0', opacity: 0.40 },
      { y:  0.2, h: 0.14, color: '#6898b8', opacity: 0.45 },
    ],
    craters: [
      { cx:  0.2, cy: -0.3, r: 0.14 },
      { cx: -0.4, cy:  0.2, r: 0.10 },
    ],
  },

  // ── Tylo ─────────────────────────────────────────────────────────────────────
  tylo: {
    surface: '#b8b8b8',
    highlight: '#dcdcdc',
    shadow: '#404040',
    poles: { color: '#e8e8e8', edge: 0.82 },
    craters: [
      { cx: -0.1, cy: -0.5, r: 0.22 },
      { cx:  0.4, cy:  0.0, r: 0.18 },
      { cx: -0.3, cy:  0.3, r: 0.14 },
      { cx:  0.2, cy:  0.4, r: 0.10 },
      { cx: -0.5, cy: -0.2, r: 0.08 },
    ],
  },

  // ── Bop ──────────────────────────────────────────────────────────────────────
  bop: {
    surface: '#5a3a18',
    highlight: '#806040',
    shadow: '#201208',
    craters: [
      { cx:  0.0, cy: -0.3, r: 0.26 },
      { cx: -0.3, cy:  0.3, r: 0.18 },
      { cx:  0.4, cy:  0.2, r: 0.12 },
    ],
  },

  // ── Pol ──────────────────────────────────────────────────────────────────────
  pol: {
    surface: '#c8a840',
    highlight: '#f0d070',
    shadow: '#504010',
    bands: [
      { y: -0.3, h: 0.15, color: '#a09030', opacity: 0.50 },
      { y:  0.2, h: 0.12, color: '#d0c060', opacity: 0.40 },
    ],
    craters: [
      { cx:  0.2, cy: -0.4, r: 0.16 },
      { cx: -0.3, cy:  0.2, r: 0.12 },
    ],
  },

  // ── Eeloo ────────────────────────────────────────────────────────────────────
  eeloo: {
    surface: '#d0d8dc',
    highlight: '#f0f4f6',
    shadow: '#404850',
    poles: { color: '#f4f8fa', edge: 0.70 },
    bands: [
      { y: -0.2, h: 0.12, color: '#808890', opacity: 0.45 }, // dark streaks
      { y:  0.1, h: 0.08, color: '#787e88', opacity: 0.40 },
      { y:  0.35, h: 0.10, color: '#888f98', opacity: 0.35 },
    ],
  },

  // ── Moho ─────────────────────────────────────────────────────────────────────
  moho: {
    surface: '#6a3818',
    highlight: '#a06030',
    shadow: '#280e08',
    poles: { color: '#503020', edge: 0.82 },
    craters: [
      { cx:  0.1, cy: -0.4, r: 0.22 },
      { cx: -0.35, cy:  0.15, r: 0.16 },
      { cx:  0.4, cy:  0.3, r: 0.12 },
      { cx: -0.1, cy:  0.45, r: 0.10 },
      { cx:  0.3, cy: -0.2, r: 0.08 },
    ],
  },
};

/** Fallback for unknown bodies */
const DEFAULT_CONFIG: BodyConfig = {
  surface: '#6688aa',
  highlight: '#99bbcc',
  shadow: '#223344',
};

interface PlanetaryBodyProps {
  bodyId: string;
  cx: number;
  cy: number;
  /** Body radius in SVG user-space units */
  r: number;
  /** Current map zoom level — used to keep overlay elements screen-size-constant */
  zoom: number;
}

export function PlanetaryBody({ bodyId, cx, cy, r, zoom }: PlanetaryBodyProps) {
  const cfg = BODY_CONFIGS[bodyId] ?? DEFAULT_CONFIG;
  const uid = `pb-${bodyId}`; // prefix for gradient / clip IDs

  // Screen-space constant: divide pixel sizes by zoom
  const S = 1 / zoom;

  // Atmosphere halo radius
  const atmR = cfg.atmColor
    ? r * (1 + (cfg.atmThickness ?? 0.15))
    : null;

  // Convert normalised (−1..+1) y to SVG y within the circle
  const ny = (n: number) => cy + n * r;

  return (
    <g>
      <defs>
        {/* Clip to body circle */}
        <clipPath id={`${uid}-clip`}>
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>

        {/* 3D sphere shading: bright top-left → dark bottom-right */}
        <radialGradient id={`${uid}-sphere`}
          cx="35%" cy="32%" r="65%"
          gradientUnits="objectBoundingBox">
          <stop offset="0%"   stopColor={cfg.highlight} stopOpacity="0.9" />
          <stop offset="55%"  stopColor={cfg.surface}   stopOpacity="0" />
          <stop offset="100%" stopColor={cfg.shadow}     stopOpacity="0.75" />
        </radialGradient>

        {/* Terminator: dark gradient on the right half */}
        <radialGradient id={`${uid}-term`}
          cx="75%" cy="50%" r="60%"
          gradientUnits="objectBoundingBox">
          <stop offset="0%"   stopColor={cfg.shadow} stopOpacity="0" />
          <stop offset="100%" stopColor={cfg.shadow} stopOpacity="0.55" />
        </radialGradient>

        {/* Atmosphere gradient (if present) */}
        {cfg.atmColor && atmR && (
          <radialGradient id={`${uid}-atm`}
            cx="50%" cy="50%" r="50%"
            gradientUnits="objectBoundingBox">
            <stop offset={`${(r / atmR * 100).toFixed(1)}%`} stopColor={cfg.atmColor} stopOpacity="0" />
            <stop offset="85%" stopColor={cfg.atmColor} stopOpacity={cfg.atmOpacity ?? 0.2} />
            <stop offset="100%" stopColor={cfg.atmColor} stopOpacity="0" />
          </radialGradient>
        )}

        {/* Star corona gradient */}
        {cfg.isStar && (
          <radialGradient id={`${uid}-corona`}
            cx="50%" cy="50%" r="50%"
            gradientUnits="objectBoundingBox">
            <stop offset="60%"  stopColor={cfg.surface}   stopOpacity="0" />
            <stop offset="80%"  stopColor={cfg.highlight} stopOpacity="0.25" />
            <stop offset="100%" stopColor={cfg.highlight} stopOpacity="0" />
          </radialGradient>
        )}

        {/* Blur filter for atmosphere + star glow */}
        <filter id={`${uid}-blur`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={r * 0.12} />
        </filter>
      </defs>

      {/* ── Star corona ──────────────────────────────────────────────────────── */}
      {cfg.isStar && (
        <>
          <circle cx={cx} cy={cy} r={r * 1.5}
            fill={`url(#${uid}-corona)`}
            filter={`url(#${uid}-blur)`} />
          {/* Subtle radial spikes */}
          {[0, 30, 60, 90, 120, 150].map(angle => {
            const rad = angle * Math.PI / 180;
            return (
              <line key={angle}
                x1={cx + Math.cos(rad) * r * 1.05}
                y1={cy + Math.sin(rad) * r * 1.05}
                x2={cx + Math.cos(rad) * r * 1.45}
                y2={cy + Math.sin(rad) * r * 1.45}
                stroke={cfg.highlight} strokeWidth={r * 0.04}
                opacity="0.12" strokeLinecap="round" />
            );
          })}
        </>
      )}

      {/* ── Atmosphere halo ──────────────────────────────────────────────────── */}
      {cfg.atmColor && atmR && (
        <circle cx={cx} cy={cy} r={atmR}
          fill={`url(#${uid}-atm)`}
          filter={`url(#${uid}-blur)`} />
      )}

      {/* ── Body base colour ─────────────────────────────────────────────────── */}
      <circle cx={cx} cy={cy} r={r} fill={cfg.surface} />

      {/* ── Surface features (all clipped to body) ───────────────────────────── */}
      <g clipPath={`url(#${uid}-clip)`}>

        {/* Gas-giant stripes */}
        {cfg.gasStripes?.map((stripe, i) => (
          <rect key={i}
            x={cx - r} y={ny(stripe.y)}
            width={r * 2} height={Math.abs(stripe.h) * r}
            fill={stripe.color} opacity="0.85" />
        ))}

        {/* Surface bands */}
        {cfg.bands?.map((band, i) => (
          <rect key={i}
            x={cx - r} y={ny(band.y)}
            width={r * 2} height={Math.abs(band.h) * r}
            fill={band.color} opacity={band.opacity} />
        ))}

        {/* Polar caps */}
        {cfg.poles && (() => {
          const halfH = r * (1 - cfg.poles.edge);
          return (
            <>
              <rect x={cx - r} y={cy - r}
                width={r * 2} height={halfH}
                fill={cfg.poles.color} opacity="0.85" />
              <rect x={cx - r} y={cy + r - halfH}
                width={r * 2} height={halfH}
                fill={cfg.poles.color} opacity="0.85" />
            </>
          );
        })()}

        {/* Craters */}
        {cfg.craters?.map((c, i) => (
          <circle key={i}
            cx={cx + c.cx * r} cy={cy + c.cy * r} r={c.r * r}
            fill="none"
            stroke={cfg.shadow} strokeWidth={r * 0.025}
            opacity="0.45" />
        ))}

        {/* Crater floor shadow (inner fill) */}
        {cfg.craters?.map((c, i) => (
          <circle key={`f${i}`}
            cx={cx + c.cx * r} cy={cy + c.cy * r} r={c.r * r * 0.85}
            fill={cfg.shadow} opacity="0.12" />
        ))}
      </g>

      {/* ── 3D lighting overlay ───────────────────────────────────────────────── */}
      <circle cx={cx} cy={cy} r={r} fill={`url(#${uid}-sphere)`} />

      {/* ── Terminator (night-side darkening) ────────────────────────────────── */}
      <circle cx={cx} cy={cy} r={r} fill={`url(#${uid}-term)`} />

      {/* ── Rim / outline ────────────────────────────────────────────────────── */}
      <circle cx={cx} cy={cy} r={r}
        fill="none"
        stroke={cfg.highlight} strokeWidth={1.5 * S} opacity="0.25" />
    </g>
  );
}
