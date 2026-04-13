import React from 'react';
import { Card, CardHeader } from '../common';
import { useTelemetryStore } from '../../stores/telemetryStore';
import { celestialBodies } from '../../data/bodies';

export function TelemetryDisplay() {
  const { telemetry, connection, getResourcePercentage } =
    useTelemetryStore();

  if (connection.status !== 'connected' || !telemetry) {
    return (
      <Card>
        <CardHeader title="Live Telemetry" />
        <div className="text-center text-gray-500 py-8">
          <svg
            className="w-16 h-16 mx-auto mb-4 opacity-30"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          <p>Connect to KSP to view live telemetry</p>
        </div>
      </Card>
    );
  }

  const body = telemetry.bodyId ? celestialBodies[telemetry.bodyId.toLowerCase()] : null;

  const formatNumber = (n: number | undefined | null, decimals: number = 0) => {
    const num = n ?? 0;
    if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(1) + 'G';
    if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(1) + 'k';
    return num.toFixed(decimals);
  };

  const formatTime = (seconds: number | undefined | null): string => {
    const secs = seconds ?? 0;
    if (secs < 0) return '-' + formatTime(-secs);
    const d = Math.floor(secs / 86400);
    const h = Math.floor((secs % 86400) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const formatAngle = (deg: number | undefined | null) => {
    return (deg ?? 0).toFixed(1) + '°';
  };

  const getSituationColor = () => {
    switch (telemetry.situation) {
      case 'landed':
      case 'prelaunch':
        return 'text-green-400';
      case 'flying':
      case 'subOrbital':
        return 'text-yellow-400';
      case 'orbiting':
        return 'text-blue-400';
      case 'escaping':
        return 'text-purple-400';
      case 'splashed':
        return 'text-cyan-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-4">
      {/* Vessel Info */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-100">{telemetry.name || 'Unknown Vessel'}</h3>
            <div className="flex items-center gap-2 mt-1">
              {body && (
                <div className="flex items-center gap-1">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: body.color }}
                  />
                  <span className="text-sm text-gray-400">{telemetry.bodyName || body.name}</span>
                </div>
              )}
              <span className={`text-sm font-medium ${getSituationColor()}`}>
                {telemetry.situation?.toUpperCase() || 'UNKNOWN'}
              </span>
              {telemetry.biome && (
                <span className="text-sm text-gray-500">• {telemetry.biome}</span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">Mission Time</div>
            <div className="text-lg font-mono text-gray-200">
              {formatTime(telemetry.missionTime)}
            </div>
          </div>
        </div>

        {/* Control States */}
        <div className="flex flex-wrap gap-2 mb-3">
          <ControlIndicator label="SAS" active={telemetry.sas} />
          <ControlIndicator label="RCS" active={telemetry.rcs} />
          <ControlIndicator label="GEAR" active={telemetry.gear} />
          <ControlIndicator label="LIGHTS" active={telemetry.lights} />
          <ControlIndicator label="BRAKES" active={telemetry.brakes} />
          {telemetry.abort && <span className="px-2 py-0.5 text-xs bg-red-600 text-white rounded">ABORT</span>}
        </div>

        {/* Mass & Crew */}
        <div className="flex items-center gap-4 text-sm">
          {telemetry.mass !== undefined && (
            <span className="text-gray-400">
              Mass: <span className="text-gray-200 font-mono">{formatNumber(telemetry.mass, 0)} kg</span>
            </span>
          )}
          {(telemetry.crewCapacity ?? 0) > 0 && (
            <span className="text-gray-400">
              Crew: <span className="text-gray-200">{telemetry.crewCount ?? 0} / {telemetry.crewCapacity}</span>
            </span>
          )}
          {telemetry.commNetSignal !== undefined && (
            <span className="text-gray-400">
              Signal: <span className={telemetry.commNetSignal > 0.5 ? 'text-green-400' : telemetry.commNetSignal > 0 ? 'text-yellow-400' : 'text-red-400'}>
                {(telemetry.commNetSignal * 100).toFixed(0)}%
              </span>
            </span>
          )}
        </div>
      </Card>

      {/* Attitude */}
      {(telemetry.pitch !== undefined || telemetry.heading !== undefined) && (
        <Card>
          <CardHeader title="Attitude" />
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-gray-500">Pitch</div>
              <div className="text-lg font-mono text-gray-200">{formatAngle(telemetry.pitch)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Heading</div>
              <div className="text-lg font-mono text-gray-200">{formatAngle(telemetry.heading)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Roll</div>
              <div className="text-lg font-mono text-gray-200">{formatAngle(telemetry.roll)}</div>
            </div>
          </div>
        </Card>
      )}

      {/* Position & Velocity */}
      <Card>
        <CardHeader title="Position & Velocity" />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-gray-500">Altitude</div>
            <div className="text-lg font-mono text-gray-200">
              {formatNumber(telemetry.altitude)} m
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Radar Alt</div>
            <div className="text-lg font-mono text-gray-200">
              {formatNumber(telemetry.radarAltitude ?? telemetry.surfaceAltitude)} m
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Latitude</div>
            <div className="text-lg font-mono text-gray-200">
              {telemetry.latitude?.toFixed(4) ?? '0.0000'}°
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Longitude</div>
            <div className="text-lg font-mono text-gray-200">
              {telemetry.longitude?.toFixed(4) ?? '0.0000'}°
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-700">
          <div>
            <div className="text-xs text-gray-500">Surface</div>
            <div className="text-lg font-mono text-blue-400">
              {formatNumber(telemetry.surfaceSpeed, 1)} m/s
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Orbital</div>
            <div className="text-lg font-mono text-purple-400">
              {formatNumber(telemetry.orbitalSpeed, 1)} m/s
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Vertical</div>
            <div
              className={`text-lg font-mono ${
                (telemetry.verticalSpeed ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {(telemetry.verticalSpeed ?? 0) >= 0 ? '+' : ''}
              {formatNumber(telemetry.verticalSpeed, 1)} m/s
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Horizontal</div>
            <div className="text-lg font-mono text-cyan-400">
              {formatNumber(telemetry.horizontalSpeed, 1)} m/s
            </div>
          </div>
        </div>

        {/* G-Force */}
        {telemetry.gForce !== undefined && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">G-Force</span>
              <span className={`text-lg font-mono ${
                telemetry.gForce > 4 ? 'text-red-400' : telemetry.gForce > 2 ? 'text-yellow-400' : 'text-green-400'
              }`}>
                {(telemetry.gForce ?? 0).toFixed(2)} g
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Atmosphere (when applicable) */}
      {telemetry.inAtmosphere && (
        <Card>
          <CardHeader title="Atmosphere" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500">Mach Number</div>
              <div className="text-lg font-mono text-orange-400">
                {(telemetry.machNumber ?? 0).toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Terminal Velocity</div>
              <div className="text-lg font-mono text-gray-200">
                {formatNumber(telemetry.terminalVelocity, 1)} m/s
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Dynamic Pressure</div>
              <div className="text-lg font-mono text-yellow-400">
                {formatNumber(telemetry.dynamicPressure, 0)} Pa
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Static Pressure</div>
              <div className="text-lg font-mono text-gray-200">
                {formatNumber(telemetry.staticPressure, 0)} Pa
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Orbital Parameters */}
      {(telemetry.situation === 'orbiting' || telemetry.situation === 'escaping' || telemetry.situation === 'subOrbital') && (
        <Card>
          <CardHeader title="Orbital Parameters" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500">Apoapsis</div>
              <div className="text-lg font-mono text-orange-400">
                {formatNumber(telemetry.apoapsis)} m
              </div>
              <div className="text-xs text-gray-500">
                T- {formatTime(telemetry.timeToApoapsis)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Periapsis</div>
              <div className="text-lg font-mono text-cyan-400">
                {formatNumber(telemetry.periapsis)} m
              </div>
              <div className="text-xs text-gray-500">
                T- {formatTime(telemetry.timeToPeriapsis)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Inclination</div>
              <div className="text-lg font-mono text-gray-200">
                {formatAngle(telemetry.inclination)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Eccentricity</div>
              <div className="text-lg font-mono text-gray-200">
                {(telemetry.eccentricity ?? 0).toFixed(4)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Orbital Period</div>
              <div className="text-lg font-mono text-gray-200">
                {formatTime(telemetry.orbitalPeriod)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Semi-Major Axis</div>
              <div className="text-lg font-mono text-gray-200">
                {formatNumber(telemetry.semiMajorAxis)} m
              </div>
            </div>
          </div>

          {/* Advanced orbital parameters */}
          <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-700 text-sm">
            <div>
              <div className="text-xs text-gray-500">ArgPe</div>
              <div className="font-mono text-gray-300">{formatAngle(telemetry.argumentOfPeriapsis)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">LAN</div>
              <div className="font-mono text-gray-300">{formatAngle(telemetry.longitudeOfAscendingNode)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Mean Anom.</div>
              <div className="font-mono text-gray-300">{formatAngle(telemetry.meanAnomaly)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">True Anom.</div>
              <div className="font-mono text-gray-300">{formatAngle(telemetry.trueAnomaly)}</div>
            </div>
          </div>

          {/* SOI Change */}
          {telemetry.timeToSOIChange !== undefined && telemetry.nextBodyName && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">SOI Change to {telemetry.nextBodyName}</span>
                <span className="text-purple-400 font-mono">T- {formatTime(telemetry.timeToSOIChange)}</span>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Maneuver Node */}
      {telemetry.maneuverNode && (
        <Card>
          <CardHeader title="Maneuver Node" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500">Delta-V</div>
              <div className="text-lg font-mono text-emerald-400">
                {formatNumber(telemetry.maneuverNode.deltaV, 1)} m/s
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Remaining</div>
              <div className="text-lg font-mono text-yellow-400">
                {formatNumber(telemetry.maneuverNode.remainingDeltaV, 1)} m/s
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Time to Node</div>
              <div className="text-lg font-mono text-blue-400">
                T- {formatTime(telemetry.maneuverNode.timeToNode)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Burn Time</div>
              <div className="text-lg font-mono text-orange-400">
                {formatTime(telemetry.maneuverNode.burnTime)}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-700 text-sm">
            <div>
              <div className="text-xs text-gray-500">Prograde</div>
              <div className="font-mono text-green-400">{formatNumber(telemetry.maneuverNode.prograde, 1)} m/s</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Normal</div>
              <div className="font-mono text-purple-400">{formatNumber(telemetry.maneuverNode.normal, 1)} m/s</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Radial</div>
              <div className="font-mono text-cyan-400">{formatNumber(telemetry.maneuverNode.radial, 1)} m/s</div>
            </div>
          </div>
        </Card>
      )}

      {/* Target */}
      {telemetry.target && (
        <Card>
          <CardHeader title={`Target: ${telemetry.target.name}`} />
          <div className="grid grid-cols-3 gap-4">
            {telemetry.target.distance !== undefined && (
              <div>
                <div className="text-xs text-gray-500">Distance</div>
                <div className="text-lg font-mono text-yellow-400">
                  {formatNumber(telemetry.target.distance)} m
                </div>
              </div>
            )}
            {telemetry.target.relativeSpeed !== undefined && (
              <div>
                <div className="text-xs text-gray-500">Rel. Speed</div>
                <div className="text-lg font-mono text-blue-400">
                  {formatNumber(telemetry.target.relativeSpeed, 1)} m/s
                </div>
              </div>
            )}
            {telemetry.target.timeToClosestApproach !== undefined && (
              <div>
                <div className="text-xs text-gray-500">Closest Approach</div>
                <div className="text-lg font-mono text-green-400">
                  T- {formatTime(telemetry.target.timeToClosestApproach)}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Performance */}
      <Card>
        <CardHeader title="Performance" />
        <div className="space-y-4">
          {/* Throttle */}
          {telemetry.throttle !== undefined && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Throttle</span>
                <span className="text-orange-400 font-mono">{((telemetry.throttle ?? 0) * 100).toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 transition-all"
                  style={{ width: `${(telemetry.throttle ?? 0) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Thrust */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500">Current Thrust</div>
              <div className="text-lg font-mono text-orange-400">
                {formatNumber(telemetry.currentThrust ? telemetry.currentThrust / 1000 : 0, 1)} kN
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Available Thrust</div>
              <div className="text-lg font-mono text-gray-200">
                {formatNumber(telemetry.availableThrust ? telemetry.availableThrust / 1000 : 0, 1)} kN
              </div>
            </div>
          </div>

          {/* TWR */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-gray-500">Current TWR</div>
              <div
                className={`text-lg font-mono ${
                  (telemetry.currentTWR ?? 0) > 1 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {(telemetry.currentTWR ?? 0).toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Max TWR</div>
              <div className="text-lg font-mono text-gray-200">
                {(telemetry.maxTWR ?? 0).toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Isp</div>
              <div className="text-lg font-mono text-blue-400">
                {formatNumber(telemetry.specificImpulse, 0)} s
              </div>
            </div>
          </div>

          {/* Stage */}
          <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-700">
            <span className="text-gray-400">Stage</span>
            <span className="text-gray-200 font-mono">
              {telemetry.currentStage ?? 0} / {telemetry.totalStages ?? 0}
            </span>
          </div>
        </div>
      </Card>

      {/* Resources */}
      <Card>
        <CardHeader title="Resources" />
        <div className="space-y-3">
          <ResourceBar
            label="Liquid Fuel"
            current={telemetry.liquidFuel}
            max={telemetry.liquidFuelMax}
            percentage={getResourcePercentage('liquidFuel')}
            color="bg-amber-500"
          />
          <ResourceBar
            label="Oxidizer"
            current={telemetry.oxidizer}
            max={telemetry.oxidizerMax}
            percentage={getResourcePercentage('oxidizer')}
            color="bg-blue-500"
          />
          {(telemetry.monopropellantMax ?? 0) > 0 && (
            <ResourceBar
              label="Monopropellant"
              current={telemetry.monopropellant}
              max={telemetry.monopropellantMax}
              percentage={getResourcePercentage('monopropellant')}
              color="bg-green-500"
            />
          )}
          <ResourceBar
            label="Electric Charge"
            current={telemetry.electricCharge}
            max={telemetry.electricChargeMax}
            percentage={getResourcePercentage('electricCharge')}
            color="bg-yellow-400"
          />
          {(telemetry.xenonGasMax ?? 0) > 0 && (
            <ResourceBar
              label="Xenon Gas"
              current={telemetry.xenonGas}
              max={telemetry.xenonGasMax}
              percentage={(telemetry.xenonGas ?? 0) / (telemetry.xenonGasMax ?? 1) * 100}
              color="bg-cyan-400"
            />
          )}
          {(telemetry.solidFuelMax ?? 0) > 0 && (
            <ResourceBar
              label="Solid Fuel"
              current={telemetry.solidFuel}
              max={telemetry.solidFuelMax}
              percentage={(telemetry.solidFuel ?? 0) / (telemetry.solidFuelMax ?? 1) * 100}
              color="bg-gray-400"
            />
          )}
          {(telemetry.ablatorMax ?? 0) > 0 && (
            <ResourceBar
              label="Ablator"
              current={telemetry.ablator}
              max={telemetry.ablatorMax}
              percentage={(telemetry.ablator ?? 0) / (telemetry.ablatorMax ?? 1) * 100}
              color="bg-red-400"
            />
          )}
          {(telemetry.oreMax ?? 0) > 0 && (
            <ResourceBar
              label="Ore"
              current={telemetry.ore}
              max={telemetry.oreMax}
              percentage={(telemetry.ore ?? 0) / (telemetry.oreMax ?? 1) * 100}
              color="bg-stone-500"
            />
          )}
        </div>
      </Card>

      {/* Crew List */}
      {telemetry.crewNames && telemetry.crewNames.length > 0 && (
        <Card>
          <CardHeader title="Crew" />
          <div className="flex flex-wrap gap-2">
            {telemetry.crewNames.map((name, idx) => (
              <span key={idx} className="px-2 py-1 bg-gray-700 rounded text-sm text-gray-200">
                {name}
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

interface ControlIndicatorProps {
  label: string;
  active?: boolean;
}

function ControlIndicator({ label, active }: ControlIndicatorProps) {
  return (
    <span
      className={`px-2 py-0.5 text-xs rounded font-medium ${
        active
          ? 'bg-emerald-600 text-white'
          : 'bg-gray-700 text-gray-400'
      }`}
    >
      {label}
    </span>
  );
}

interface ResourceBarProps {
  label: string;
  current?: number;
  max?: number;
  percentage: number;
  color: string;
}

function ResourceBar({ label, current, max, percentage, color }: ResourceBarProps) {
  const formatResource = (n: number | undefined | null) => {
    const num = n ?? 0;
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toFixed(0);
  };

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-300">
          {formatResource(current)} / {formatResource(max)}
        </span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all`}
          style={{ width: `${Math.min(100, percentage || 0)}%` }}
        />
      </div>
    </div>
  );
}
