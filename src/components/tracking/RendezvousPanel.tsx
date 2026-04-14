import React from 'react';
import { TrackedVessel } from '../../types';
import { RendezvousResult, formatTime } from '../../utils/orbitalMath';

interface Props {
  active: TrackedVessel;
  target: TrackedVessel;
  result: RendezvousResult;
}

function Row({ label, value, sub, highlight }: {
  label: string; value: string; sub?: string; highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-800 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <div className="text-right">
        <span className={`text-sm font-mono ${highlight ? 'text-emerald-400' : 'text-gray-200'}`}>
          {value}
        </span>
        {sub && <div className="text-xs text-gray-600">{sub}</div>}
      </div>
    </div>
  );
}

function PhaseGauge({ current, required }: { current: number; required: number }) {
  const R = 44;
  const cx = 60, cy = 60;
  const toXY = (deg: number) => {
    const r = deg * Math.PI / 180;
    return [cx + R * Math.cos(r - Math.PI / 2), cy + R * Math.sin(r - Math.PI / 2)];
  };
  const [acx, acy] = toXY(0);
  const [tgx, tgy] = toXY(current);
  const [rqx, rqy] = toXY(required);

  const arcDeg = ((current % 360) + 360) % 360;
  const largeArc = arcDeg > 180 ? 1 : 0;
  const [arcEx, arcEy] = toXY(arcDeg);

  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
      {/* Background circle */}
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="#1e293b" strokeWidth="6" />

      {/* Phase arc */}
      <path
        d={`M ${acx.toFixed(1)} ${acy.toFixed(1)} A ${R} ${R} 0 ${largeArc} 1 ${arcEx.toFixed(1)} ${arcEy.toFixed(1)}`}
        fill="none" stroke="#3b82f6" strokeWidth="6" opacity="0.6" />

      {/* Active vessel (0°) */}
      <circle cx={acx} cy={acy} r="5" fill="#22c55e" />
      <text x={acx} y={acy - 8} textAnchor="middle" fill="#22c55e" fontSize="8">ACT</text>

      {/* Target vessel */}
      <circle cx={tgx} cy={tgy} r="5" fill="#f59e0b" />
      <text x={tgx} y={tgy - 8} textAnchor="middle" fill="#f59e0b" fontSize="8">TGT</text>

      {/* Required phase */}
      <circle cx={rqx} cy={rqy} r="4" fill="none" stroke="#f97316" strokeWidth="2" />
      <text x={rqx} y={rqy - 8} textAnchor="middle" fill="#f97316" fontSize="8">REQ</text>

      {/* Centre label */}
      <text x={cx} y={cy + 4} textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="bold">
        {current.toFixed(0)}°
      </text>
    </svg>
  );
}

export function RendezvousPanel({ active, target, result }: Props) {
  const {
    phaseAngleCurrent, phaseAngleRequired,
    timeToWindow, transferTime,
    deltaV1, deltaV2, totalDeltaV,
    relativeInclination, planeChangeDeltaV,
    ascending,
  } = result;

  const sameBody = active.bodyId === target.bodyId;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-500">From</div>
          <div className="text-sm font-medium text-emerald-400 truncate max-w-36">{active.name}</div>
        </div>
        <div className="text-gray-600 text-lg">→</div>
        <div className="text-right">
          <div className="text-xs text-gray-500">To</div>
          <div className="text-sm font-medium text-amber-400 truncate max-w-36">{target.name}</div>
        </div>
      </div>

      {!sameBody ? (
        <div className="text-xs text-yellow-500 bg-yellow-900/30 border border-yellow-700/50 rounded p-2">
          Vessels are in different SOIs. Inter-body rendezvous calculations not supported here — use the Transfer Calculator.
        </div>
      ) : (
        <>
          {/* Phase gauge */}
          <div className="flex items-center gap-4">
            <PhaseGauge current={phaseAngleCurrent} required={phaseAngleRequired} />
            <div className="space-y-1 text-xs">
              <div>
                <span className="text-gray-500">Current phase  </span>
                <span className="text-blue-400 font-mono">{phaseAngleCurrent.toFixed(2)}°</span>
              </div>
              <div>
                <span className="text-gray-500">Required phase </span>
                <span className="text-orange-400 font-mono">{phaseAngleRequired.toFixed(2)}°</span>
              </div>
              <div className="mt-2 text-gray-600">
                {ascending ? '↑ Chasing higher orbit' : '↓ Chasing lower orbit'}
              </div>
            </div>
          </div>

          {/* Transfer data */}
          <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1">
            <Row
              label="Time to window"
              value={formatTime(timeToWindow)}
              highlight
            />
            <Row
              label="Transfer time"
              value={formatTime(transferTime)}
              sub="half Hohmann ellipse"
            />
            <Row
              label="Departure ΔV"
              value={`${deltaV1.toFixed(1)} m/s`}
              sub={ascending ? 'prograde burn' : 'retrograde burn'}
            />
            <Row
              label="Arrival ΔV"
              value={`${deltaV2.toFixed(1)} m/s`}
              sub={ascending ? 'retrograde at Ap' : 'prograde at Pe'}
            />
            <Row
              label="Total Hohmann ΔV"
              value={`${totalDeltaV.toFixed(1)} m/s`}
              highlight
            />
          </div>

          {/* Plane change */}
          {relativeInclination > 0.1 && (
            <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-lg px-3 py-2">
              <div className="text-xs text-yellow-400 font-medium mb-1">Plane Change Required</div>
              <Row
                label="Relative inclination"
                value={`${relativeInclination.toFixed(2)}°`}
              />
              <Row
                label="Plane-change ΔV est."
                value={`${planeChangeDeltaV.toFixed(1)} m/s`}
                sub="at mid-transfer — add to total"
              />
            </div>
          )}

          {/* Step-by-step */}
          <div className="text-xs space-y-1 text-gray-500">
            <div className="font-medium text-gray-400 mb-1">Manoeuvre sequence</div>
            <div className="flex gap-2">
              <span className="text-emerald-500 font-bold">1</span>
              <span>Wait for window — T−{formatTime(timeToWindow)}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-emerald-500 font-bold">2</span>
              <span>
                Burn {ascending ? 'prograde' : 'retrograde'}{' '}
                <span className="text-gray-300 font-mono">{deltaV1.toFixed(1)} m/s</span>
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-emerald-500 font-bold">3</span>
              <span>Coast {formatTime(transferTime)}</span>
            </div>
            {relativeInclination > 0.1 && (
              <div className="flex gap-2">
                <span className="text-emerald-500 font-bold">4</span>
                <span>
                  Plane change at AN/DN{' '}
                  <span className="text-gray-300 font-mono">{planeChangeDeltaV.toFixed(1)} m/s</span>
                </span>
              </div>
            )}
            <div className="flex gap-2">
              <span className="text-emerald-500 font-bold">{relativeInclination > 0.1 ? '5' : '4'}</span>
              <span>
                Burn {ascending ? 'retrograde' : 'prograde'} at arrival{' '}
                <span className="text-gray-300 font-mono">{deltaV2.toFixed(1)} m/s</span>
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
