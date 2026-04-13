import React, { useState, useMemo } from 'react';
import { Card, CardHeader, Button, Input, Select, NumberInput } from '../common';
import { tsiolkovsky, effectiveIsp, calculateTWROnBody } from '../../lib/deltaV';
import { celestialBodies, bodiesArray, G0 } from '../../data/bodies';
import { engines } from '../../data/parts';

export function DeltaVCalculator() {
  const [wetMass, setWetMass] = useState(10000);
  const [dryMass, setDryMass] = useState(3000);
  const [ispVac, setIspVac] = useState(345);
  const [ispAtm, setIspAtm] = useState(85);
  const [thrustVac, setThrustVac] = useState(60000);
  const [thrustAtm, setThrustAtm] = useState(14780);
  const [selectedBody, setSelectedBody] = useState('kerbin');
  const [useAtmospheric, setUseAtmospheric] = useState(false);

  // Quick engine presets
  const [selectedEngine, setSelectedEngine] = useState('');

  const handleEngineSelect = (engineId: string) => {
    const engine = engines.find((e) => e.id === engineId);
    if (engine) {
      setSelectedEngine(engineId);
      setIspVac(engine.ispVac);
      setIspAtm(engine.ispAtm);
      setThrustVac(engine.thrustVac * 1000);
      setThrustAtm(engine.thrustAtm * 1000);
    }
  };

  const calculations = useMemo(() => {
    const isp = useAtmospheric ? ispAtm : ispVac;
    const thrust = useAtmospheric ? thrustAtm : thrustVac;
    const body = celestialBodies[selectedBody];

    if (dryMass <= 0 || wetMass <= dryMass || isp <= 0) {
      return {
        deltaV: 0,
        twr: 0,
        twrSurface: 0,
        massRatio: 0,
        burnTime: 0,
        fuelMass: 0,
      };
    }

    const deltaV = tsiolkovsky(isp, wetMass, dryMass);
    const fuelMass = wetMass - dryMass;
    const massRatio = wetMass / dryMass;

    // TWR calculations
    const twr = thrust / (wetMass * G0);
    const twrSurface = body ? calculateTWROnBody(thrust, wetMass, selectedBody) : 0;

    // Burn time
    const massFlowRate = thrust / (isp * G0);
    const burnTime = massFlowRate > 0 ? fuelMass / massFlowRate : 0;

    return {
      deltaV,
      twr,
      twrSurface,
      massRatio,
      burnTime,
      fuelMass,
    };
  }, [wetMass, dryMass, ispVac, ispAtm, thrustVac, thrustAtm, selectedBody, useAtmospheric]);

  const bodyOptions = bodiesArray
    .filter((b) => b.id !== 'kerbol')
    .map((b) => ({ value: b.id, label: b.name }));

  const engineOptions = [
    { value: '', label: 'Select an engine...' },
    ...engines.map((e) => ({ value: e.id, label: e.name })),
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Input panel */}
      <Card>
        <CardHeader title="Stage Parameters" subtitle="Enter your rocket stage data" />

        <div className="space-y-4">
          {/* Engine preset */}
          <Select
            label="Engine Preset"
            options={engineOptions}
            value={selectedEngine}
            onChange={(e) => handleEngineSelect(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <NumberInput
              label="Wet Mass (kg)"
              value={wetMass}
              onChange={setWetMass}
              min={1}
              helper="Total mass with fuel"
            />
            <NumberInput
              label="Dry Mass (kg)"
              value={dryMass}
              onChange={setDryMass}
              min={1}
              helper="Mass without fuel"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <NumberInput
              label="Isp Vacuum (s)"
              value={ispVac}
              onChange={setIspVac}
              min={1}
            />
            <NumberInput
              label="Isp Sea Level (s)"
              value={ispAtm}
              onChange={setIspAtm}
              min={1}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <NumberInput
              label="Thrust Vacuum (N)"
              value={thrustVac}
              onChange={setThrustVac}
              min={1}
            />
            <NumberInput
              label="Thrust Sea Level (N)"
              value={thrustAtm}
              onChange={setThrustAtm}
              min={1}
            />
          </div>

          <div className="flex items-center gap-4">
            <Select
              label="Reference Body"
              options={bodyOptions}
              value={selectedBody}
              onChange={(e) => setSelectedBody(e.target.value)}
              className="flex-1"
            />
            <div className="pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useAtmospheric}
                  onChange={(e) => setUseAtmospheric(e.target.checked)}
                  className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-emerald-500 focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-300">Use Atmospheric Values</span>
              </label>
            </div>
          </div>
        </div>
      </Card>

      {/* Results panel */}
      <Card>
        <CardHeader title="Results" subtitle="Calculated values for your stage" />

        <div className="space-y-6">
          {/* Primary result */}
          <div className="text-center p-6 bg-gradient-to-br from-emerald-900/30 to-emerald-800/20 rounded-xl border border-emerald-700/30">
            <div className="text-sm text-emerald-400 uppercase tracking-wide">Delta-V</div>
            <div className="text-5xl font-bold text-emerald-400 mt-2">
              {calculations.deltaV.toFixed(0)}
            </div>
            <div className="text-emerald-400/70">m/s</div>
          </div>

          {/* Secondary results grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-800/50 rounded-lg">
              <div className="text-sm text-gray-400">TWR (Standard)</div>
              <div className={`text-2xl font-semibold ${calculations.twr >= 1 ? 'text-emerald-400' : 'text-red-400'}`}>
                {calculations.twr.toFixed(2)}
              </div>
            </div>

            <div className="p-4 bg-gray-800/50 rounded-lg">
              <div className="text-sm text-gray-400">TWR ({celestialBodies[selectedBody]?.name})</div>
              <div className={`text-2xl font-semibold ${calculations.twrSurface >= 1 ? 'text-emerald-400' : 'text-red-400'}`}>
                {calculations.twrSurface.toFixed(2)}
              </div>
            </div>

            <div className="p-4 bg-gray-800/50 rounded-lg">
              <div className="text-sm text-gray-400">Mass Ratio</div>
              <div className="text-2xl font-semibold text-gray-200">
                {calculations.massRatio.toFixed(2)}
              </div>
            </div>

            <div className="p-4 bg-gray-800/50 rounded-lg">
              <div className="text-sm text-gray-400">Burn Time</div>
              <div className="text-2xl font-semibold text-gray-200">
                {calculations.burnTime.toFixed(1)}s
              </div>
            </div>

            <div className="p-4 bg-gray-800/50 rounded-lg col-span-2">
              <div className="text-sm text-gray-400">Fuel Mass</div>
              <div className="text-2xl font-semibold text-gray-200">
                {calculations.fuelMass.toLocaleString()} kg
              </div>
            </div>
          </div>

          {/* TWR warnings */}
          {calculations.twrSurface < 1 && calculations.twrSurface > 0 && (
            <div className="p-3 bg-red-900/20 border border-red-700/30 rounded-lg text-red-400 text-sm">
              Warning: TWR is less than 1.0 on {celestialBodies[selectedBody]?.name}. This stage cannot lift off from the surface.
            </div>
          )}
          {calculations.twrSurface >= 1 && calculations.twrSurface < 1.2 && (
            <div className="p-3 bg-yellow-900/20 border border-yellow-700/30 rounded-lg text-yellow-400 text-sm">
              Note: TWR is marginal. Consider a TWR of 1.2+ for efficient launches.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
