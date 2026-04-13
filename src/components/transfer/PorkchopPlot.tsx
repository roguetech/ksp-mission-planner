import React, { useEffect, useRef, useMemo } from 'react';
import { Card, CardHeader } from '../common';
import { PorkchopData } from '../../types';
import { generatePorkchopData, formatKerbinTime } from '../../lib/transfer';

interface PorkchopPlotProps {
  originId: string;
  destinationId: string;
  departureDays?: number;
  durationDays?: number;
  resolution?: number;
}

export function PorkchopPlot({
  originId,
  destinationId,
  departureDays = 400,
  durationDays = 300,
  resolution = 10,
}: PorkchopPlotProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const porkchopData = useMemo(() => {
    return generatePorkchopData(
      originId,
      destinationId,
      departureDays,
      durationDays,
      resolution
    );
  }, [originId, destinationId, departureDays, durationDays, resolution]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || porkchopData.data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 50;

    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    const plotWidth = width - padding * 2;
    const plotHeight = height - padding * 2;

    const rows = porkchopData.data.length;
    const cols = porkchopData.data[0]?.length || 0;

    if (rows === 0 || cols === 0) return;

    const cellWidth = plotWidth / cols;
    const cellHeight = plotHeight / rows;

    // Find min/max delta-v for color scaling
    let minDV = Infinity;
    let maxDV = 0;

    for (const row of porkchopData.data) {
      for (const dv of row) {
        if (dv > 0 && dv < Infinity) {
          minDV = Math.min(minDV, dv);
          maxDV = Math.max(maxDV, dv);
        }
      }
    }

    // Clamp max for visualization
    maxDV = Math.min(maxDV, minDV * 3);

    // Color function (green = low delta-v, red = high)
    const getColor = (dv: number): string => {
      if (dv <= 0 || dv === Infinity) return '#1a1a2e';

      const normalized = Math.min((dv - minDV) / (maxDV - minDV), 1);

      // Green to yellow to red gradient
      if (normalized < 0.5) {
        const t = normalized * 2;
        const r = Math.floor(t * 255);
        const g = 200;
        const b = Math.floor((1 - t) * 100);
        return `rgb(${r}, ${g}, ${b})`;
      } else {
        const t = (normalized - 0.5) * 2;
        const r = 255;
        const g = Math.floor((1 - t) * 200);
        const b = 0;
        return `rgb(${r}, ${g}, ${b})`;
      }
    };

    // Draw cells
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const dv = porkchopData.data[row][col];
        ctx.fillStyle = getColor(dv);
        ctx.fillRect(
          padding + col * cellWidth,
          padding + row * cellHeight,
          cellWidth + 1,
          cellHeight + 1
        );
      }
    }

    // Draw optimal windows
    for (const window of porkchopData.windows) {
      const x = padding + (window.departureTime / departureDays) * plotWidth;
      const y = padding + (window.flightTime / durationDays) * plotHeight;

      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.strokeStyle = '#50c878';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw axes
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 1;

    // X axis
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Y axis
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#9ca3af';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';

    // X axis labels
    for (let i = 0; i <= 4; i++) {
      const day = Math.floor((departureDays * i) / 4);
      const x = padding + (plotWidth * i) / 4;
      ctx.fillText(`Day ${day}`, x, height - padding + 20);
    }

    // Y axis labels
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const day = Math.floor((durationDays * i) / 4);
      const y = padding + (plotHeight * i) / 4;
      ctx.fillText(`${day}d`, padding - 10, y + 4);
    }

    // Axis titles
    ctx.fillStyle = '#e5e7eb';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Departure Date', width / 2, height - 10);

    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Flight Duration', 0, 0);
    ctx.restore();

    // Color legend
    const legendX = width - padding - 20;
    const legendHeight = 100;
    const legendWidth = 15;

    const gradient = ctx.createLinearGradient(0, padding, 0, padding + legendHeight);
    gradient.addColorStop(0, getColor(minDV));
    gradient.addColorStop(0.5, getColor((minDV + maxDV) / 2));
    gradient.addColorStop(1, getColor(maxDV));

    ctx.fillStyle = gradient;
    ctx.fillRect(legendX, padding, legendWidth, legendHeight);
    ctx.strokeStyle = '#4a5568';
    ctx.strokeRect(legendX, padding, legendWidth, legendHeight);

    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${minDV.toFixed(0)}`, legendX + legendWidth + 5, padding + 10);
    ctx.fillText(`${maxDV.toFixed(0)}`, legendX + legendWidth + 5, padding + legendHeight);
    ctx.fillText('m/s', legendX + legendWidth + 5, padding + legendHeight / 2 + 4);
  }, [porkchopData, departureDays, durationDays]);

  return (
    <Card>
      <CardHeader
        title="Porkchop Plot"
        subtitle={`${porkchopData.origin} → ${porkchopData.destination}`}
      />

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={600}
          height={400}
          className="w-full rounded-lg"
        />
      </div>

      {porkchopData.windows.length > 0 && (
        <div className="mt-4 p-3 bg-emerald-900/20 border border-emerald-700/30 rounded-lg">
          <h4 className="text-sm font-medium text-emerald-400 mb-2">Optimal Window</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Departure:</span>
              <span className="ml-2 text-gray-200">
                {formatKerbinTime(porkchopData.windows[0].departureTime)}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Flight Time:</span>
              <span className="ml-2 text-gray-200">
                {porkchopData.windows[0].flightTime.toFixed(0)} days
              </span>
            </div>
            <div>
              <span className="text-gray-400">Total Δv:</span>
              <span className="ml-2 text-emerald-400 font-medium">
                {porkchopData.windows[0].totalDeltaV.toFixed(0)} m/s
              </span>
            </div>
            <div>
              <span className="text-gray-400">Phase Angle:</span>
              <span className="ml-2 text-gray-200">
                {porkchopData.windows[0].phaseAngle.toFixed(1)}°
              </span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
