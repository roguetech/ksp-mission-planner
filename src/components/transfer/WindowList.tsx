import React, { useMemo } from 'react';
import { Card, CardHeader } from '../common';
import { celestialBodies, bodiesArray, KERBIN_DAY } from '../../data/bodies';
import { findTransferWindows, formatKerbinTime, calculateSynodicPeriod } from '../../lib/transfer';

interface WindowListProps {
  currentTime?: number;
}

export function WindowList({ currentTime = 0 }: WindowListProps) {
  const planets = bodiesArray.filter((b) => b.parent === 'kerbol' && b.id !== 'kerbol');

  const upcomingWindows = useMemo(() => {
    const windows: {
      origin: string;
      destination: string;
      departureDay: number;
      totalDeltaV: number;
      flightTime: number;
    }[] = [];

    // Find windows from Kerbin to all other planets
    for (const dest of planets) {
      if (dest.id === 'kerbin') continue;

      const synodic = calculateSynodicPeriod('kerbin', dest.id);
      const found = findTransferWindows(
        'kerbin',
        dest.id,
        currentTime,
        currentTime + synodic * 1.5,
        KERBIN_DAY
      );

      if (found.length > 0) {
        windows.push({
          origin: 'kerbin',
          destination: dest.id,
          departureDay: found[0].departureTime,
          totalDeltaV: found[0].totalDeltaV,
          flightTime: found[0].flightTime,
        });
      }
    }

    // Sort by departure day
    windows.sort((a, b) => a.departureDay - b.departureDay);

    return windows;
  }, [currentTime]);

  const getDifficultyColor = (deltaV: number) => {
    if (deltaV < 2000) return 'text-emerald-400';
    if (deltaV < 4000) return 'text-yellow-400';
    if (deltaV < 6000) return 'text-orange-400';
    return 'text-red-400';
  };

  const getDifficultyLabel = (deltaV: number) => {
    if (deltaV < 2000) return 'Easy';
    if (deltaV < 4000) return 'Moderate';
    if (deltaV < 6000) return 'Challenging';
    return 'Difficult';
  };

  return (
    <Card>
      <CardHeader
        title="Upcoming Transfer Windows"
        subtitle="From Kerbin to other planets"
      />

      <div className="space-y-3">
        {upcomingWindows.map((window, index) => {
          const dest = celestialBodies[window.destination];
          const daysUntil = window.departureDay - (currentTime / KERBIN_DAY);

          return (
            <div
              key={`${window.destination}-${index}`}
              className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 hover:border-gray-600/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full"
                    style={{ backgroundColor: dest?.color || '#666' }}
                  />
                  <div>
                    <h4 className="font-medium text-gray-200">{dest?.name}</h4>
                    <p className="text-sm text-gray-500">
                      {formatKerbinTime(window.departureDay)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${getDifficultyColor(window.totalDeltaV)}`}>
                    {window.totalDeltaV.toFixed(0)} m/s
                  </div>
                  <div className={`text-xs ${getDifficultyColor(window.totalDeltaV)}`}>
                    {getDifficultyLabel(window.totalDeltaV)}
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">In:</span>
                  <span className="ml-2 text-gray-300">
                    {daysUntil > 0 ? `${daysUntil.toFixed(0)} days` : 'Now!'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Flight:</span>
                  <span className="ml-2 text-gray-300">{window.flightTime.toFixed(0)} days</span>
                </div>
                <div>
                  <span className="text-gray-500">Arrive:</span>
                  <span className="ml-2 text-gray-300">
                    {formatKerbinTime(window.departureDay + window.flightTime)}
                  </span>
                </div>
              </div>

              {/* Progress bar to window */}
              {daysUntil > 0 && (
                <div className="mt-3">
                  <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{
                        width: `${Math.max(0, 100 - (daysUntil / 100) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {upcomingWindows.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <p>No upcoming windows calculated</p>
            <p className="text-sm mt-1">Windows will appear here when calculated</p>
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-gray-500 text-center">
        Delta-v values include ejection and capture burns
      </div>
    </Card>
  );
}
