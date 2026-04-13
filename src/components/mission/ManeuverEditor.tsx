import React, { useState, useEffect } from 'react';
import { Modal, Button, Input, Select, NumberInput } from '../common';
import { Maneuver, ManeuverType } from '../../types';
import { bodiesArray } from '../../data/bodies';

interface ManeuverEditorProps {
  isOpen: boolean;
  onClose: () => void;
  maneuver?: Maneuver;
  onSave: (maneuver: Omit<Maneuver, 'id'>) => void;
  defaultOrigin?: string;
  defaultDestination?: string;
}

const maneuverTypes: { value: ManeuverType; label: string; description: string }[] = [
  { value: 'launch', label: 'Launch', description: 'Lift off from surface to orbit' },
  { value: 'circularize', label: 'Circularize', description: 'Adjust orbit to circular' },
  { value: 'transfer', label: 'Transfer Burn', description: 'Interplanetary/moon transfer' },
  { value: 'correction', label: 'Correction', description: 'Mid-course correction' },
  { value: 'capture', label: 'Capture', description: 'Enter orbit around target' },
  { value: 'aerobrake', label: 'Aerobrake', description: 'Use atmosphere to slow down' },
  { value: 'land', label: 'Landing', description: 'Descend to surface' },
  { value: 'ascent', label: 'Ascent', description: 'Launch from surface' },
  { value: 'rendezvous', label: 'Rendezvous', description: 'Meet another vessel' },
  { value: 'dock', label: 'Dock', description: 'Connect to another vessel' },
  { value: 'return', label: 'Return', description: 'Begin return journey' },
];

export function ManeuverEditor({
  isOpen,
  onClose,
  maneuver,
  onSave,
  defaultOrigin = 'kerbin',
  defaultDestination = 'mun',
}: ManeuverEditorProps) {
  const [type, setType] = useState<ManeuverType>('transfer');
  const [name, setName] = useState('');
  const [deltaV, setDeltaV] = useState(0);
  const [origin, setOrigin] = useState(defaultOrigin);
  const [destination, setDestination] = useState(defaultDestination);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (maneuver) {
      setType(maneuver.type);
      setName(maneuver.name);
      setDeltaV(maneuver.deltaV);
      setOrigin(maneuver.origin || defaultOrigin);
      setDestination(maneuver.destination || defaultDestination);
      setNotes(maneuver.notes || '');
    } else {
      setType('transfer');
      setName('');
      setDeltaV(0);
      setOrigin(defaultOrigin);
      setDestination(defaultDestination);
      setNotes('');
    }
  }, [maneuver, defaultOrigin, defaultDestination]);

  const handleSave = () => {
    onSave({
      type,
      name: name || maneuverTypes.find((t) => t.value === type)?.label || 'Maneuver',
      deltaV,
      origin: origin || undefined,
      destination: destination || undefined,
      notes: notes || undefined,
    });
    onClose();
  };

  const bodyOptions = [
    { value: '', label: 'None' },
    ...bodiesArray.map((b) => ({ value: b.id, label: b.name })),
  ];

  const typeOptions = maneuverTypes.map((t) => ({
    value: t.value,
    label: `${t.label} - ${t.description}`,
  }));

  // Auto-fill name based on type
  const handleTypeChange = (newType: ManeuverType) => {
    setType(newType);
    if (!name || name === maneuverTypes.find((t) => t.value === type)?.label) {
      setName(maneuverTypes.find((t) => t.value === newType)?.label || '');
    }
  };

  // Suggest delta-v based on type
  const suggestDeltaV = () => {
    const suggestions: Partial<Record<ManeuverType, number>> = {
      launch: 3400,
      circularize: 100,
      correction: 50,
      aerobrake: 0,
      dock: 0,
      rendezvous: 100,
    };

    if (suggestions[type] !== undefined) {
      setDeltaV(suggestions[type]!);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={maneuver ? 'Edit Maneuver' : 'Add Maneuver'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {maneuver ? 'Save Changes' : 'Add Maneuver'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select
          label="Maneuver Type"
          options={typeOptions}
          value={type}
          onChange={(e) => handleTypeChange(e.target.value as ManeuverType)}
        />

        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Trans-Munar Injection"
        />

        <div className="flex gap-4">
          <div className="flex-1">
            <NumberInput
              label="Delta-V (m/s)"
              value={deltaV}
              onChange={setDeltaV}
              min={0}
            />
          </div>
          <div className="flex items-end">
            <Button variant="ghost" size="sm" onClick={suggestDeltaV}>
              Suggest
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Origin Body"
            options={bodyOptions}
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
          />
          <Select
            label="Destination Body"
            options={bodyOptions}
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes..."
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-gray-100 h-20"
          />
        </div>

        {/* Quick reference */}
        <div className="p-3 bg-gray-800/50 rounded-lg text-sm text-gray-400">
          <strong>Quick Reference:</strong>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>Kerbin orbit: ~3,400 m/s</div>
            <div>Mun landing: ~5,500 m/s</div>
            <div>Minmus landing: ~5,200 m/s</div>
            <div>Duna transfer: ~1,060 m/s</div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
