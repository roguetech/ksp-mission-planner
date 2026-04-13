import React, { useState, useMemo } from 'react';
import { Card, CardHeader, Select, Button, StatCard } from '../common';
import { celestialBodies, bodiesArray, KERBIN_DAY } from '../../data/bodies';
import {
  calculateTransferWindow,
  calculateSynodicPeriod,
  formatKerbinTime,
  getNextTransferWindow,
} from '../../lib/transfer';
import { hohmannTransfer, phaseAngle } from '../../lib/orbital';
import { PorkchopPlot } from './PorkchopPlot';

export function TransferCalculator() {
  const [originId, setOriginId] = useState('kerbin');
  const [destinationId, setDestinationId] = useState('duna');
  const [currentDay, setCurrentDay] = useState(0);

  // Get planets only (bodies that orbit Kerbol)
  const planetOptions = bodiesArray
    .filter((b) => b.parent === 'kerbol')
    .map((b) => ({ value: b.id, label: b.name }));

  const transferInfo = useMemo(() => {
    const origin = celestialBodies[originId];
    const destination = celestialBodies[destinationId];

    if (!origin || !destination || origin.parent !== destination.parent) {
      return null;
    }

    const parentId = origin.parent || 'kerbol';
    const parent = celestialBodies[parentId];
    if (!parent) return null;

    const mu = parent.physical.gravitationalParameter;
    const r1 = origin.orbital.semiMajorAxis;
    const r2 = destination.orbital.semiMajorAxis;

    // Basic Hohmann transfer
    const hohmann = hohmannTransfer(mu, r1, r2);

    // Phase angle
    const idealPhase = phaseAngle(r1, r2);

    // Synodic period
    const synodic = calculateSynodicPeriod(originId, destinationId);

    // Next window
    const nextWindow = getNextTransferWindow(originId, destinationId, currentDay * KERBIN_DAY);

    return {
      hohmann,
      idealPhase,
      synodic,
      nextWindow,
      isInward: r2 < r1,
    };
  }, [originId, destinationId, currentDay]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader
          title="Transfer Window Calculator"
          subtitle="Plan interplanetary transfers"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label="Origin"
            options={planetOptions}
            value={originId}
            onChange={(e) => setOriginId(e.target.value)}
          />
          <div className="flex items-end justify-center">
            <div className="text-2xl text-gray-500">→</div>
          </div>
          <Select
            label="Destination"
            options={planetOptions}
            value={destinationId}
            onChange={(e) => setDestinationId(e.target.value)}
          />
        </div>

        {originId === destinationId && (
          <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-700/30 rounded-lg text-yellow-400 text-sm">
            Please select different origin and destination bodies.
          </div>
        )}
      </Card>

      {transferInfo && originId !== destinationId && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Departure Δv"
              value={transferInfo.hohmann.deltaV1.toFixed(0)}
              unit="m/s"
            />
            <StatCard
              label="Arrival Δv"
              value={transferInfo.hohmann.deltaV2.toFixed(0)}
              unit="m/s"
            />
            <StatCard
              label="Total Δv"
              value={transferInfo.hohmann.totalDeltaV.toFixed(0)}
              unit="m/s"
              trend="neutral"
            />
            <StatCard
              label="Transfer Time"
              value={(transferInfo.hohmann.transferTime / KERBIN_DAY).toFixed(0)}
              unit="days"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Transfer details */}
            <Card>
              <CardHeader title="Transfer Details" />

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-800/50 rounded-lg">
                    <div className="text-sm text-gray-400">Phase Angle</div>
                    <div className="text-2xl font-semibold text-emerald-400">
                      {transferInfo.idealPhase.toFixed(1)}°
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {transferInfo.isInward ? 'Leading' : 'Trailing'} target
                    </div>
                  </div>

                  <div className="p-4 bg-gray-800/50 rounded-lg">
                    <div className="text-sm text-gray-400">Synodic Period</div>
                    <div className="text-2xl font-semibold text-blue-400">
                      {(transferInfo.synodic / KERBIN_DAY).toFixed(0)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Kerbin days between windows
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <div className="text-sm text-gray-400 mb-2">Transfer Type</div>
                  <div className="text-lg text-gray-200">
                    {transferInfo.isInward ? 'Inward' : 'Outward'} Hohmann Transfer
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    {transferInfo.isInward
                      ? 'Burn retrograde at departure, then retrograde again at arrival.'
                      : 'Burn prograde at departure, then retrograde at arrival to capture.'}
                  </p>
                </div>

                {transferInfo.nextWindow && (
                  <div className="p-4 bg-emerald-900/20 border border-emerald-700/30 rounded-lg">
                    <div className="text-sm text-emerald-400 mb-2">Next Transfer Window</div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Depart:</span>
                        <span className="ml-2 text-gray-200">
                          {formatKerbinTime(transferInfo.nextWindow.departureTime)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Arrive:</span>
                        <span className="ml-2 text-gray-200">
                          {formatKerbinTime(transferInfo.nextWindow.arrivalTime)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Flight:</span>
                        <span className="ml-2 text-gray-200">
                          {transferInfo.nextWindow.flightTime.toFixed(0)} days
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Total Δv:</span>
                        <span className="ml-2 text-emerald-400 font-medium">
                          {transferInfo.nextWindow.totalDeltaV.toFixed(0)} m/s
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-sm text-gray-500 p-3 bg-gray-800/30 rounded-lg">
                  <strong>Tip:</strong> Wait for the correct phase angle before burning.
                  The ejection burn should be performed when{' '}
                  {transferInfo.isInward ? 'the target leads you' : 'you lead the target'} by{' '}
                  {Math.abs(transferInfo.idealPhase).toFixed(0)}°.
                </div>
              </div>
            </Card>

            {/* Porkchop plot */}
            <PorkchopPlot
              originId={originId}
              destinationId={destinationId}
              departureDays={Math.ceil(transferInfo.synodic / KERBIN_DAY)}
              durationDays={Math.ceil((transferInfo.hohmann.transferTime * 2) / KERBIN_DAY)}
              resolution={10}
            />
          </div>
        </>
      )}
    </div>
  );
}
