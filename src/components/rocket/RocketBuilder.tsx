import React, { useState, useMemo } from 'react';
import { Card, CardHeader, Button, Input, Modal } from '../common';
import { PartPalette } from './PartPalette';
import { StageManager } from './StageManager';
import { StatsPanel } from './StatsPanel';
import { useRocketStore } from '../../stores/rocketStore';
import { calculateRocketStats, calculateStageWetMass } from '../../lib/deltaV';

export function RocketBuilder() {
  const {
    designs,
    currentDesign,
    createDesign,
    setCurrentDesign,
    deleteDesign,
    duplicateDesign,
    addStage,
    removeStage,
    addPartToStage,
    removePartFromStage,
    updatePartQuantity,
    exportDesign,
    importDesign,
  } = useRocketStore();

  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [newRocketName, setNewRocketName] = useState('');
  const [importJson, setImportJson] = useState('');
  const [importError, setImportError] = useState('');

  // Calculate stats for current design
  const stats = useMemo(() => {
    if (!currentDesign) return null;
    return calculateRocketStats(currentDesign);
  }, [currentDesign]);

  // Calculate payload masses for each stage (mass of all stages above)
  const payloadMasses = useMemo(() => {
    if (!currentDesign) return [];

    const masses: number[] = [];
    let cumulativeMass = 0;

    for (let i = 0; i < currentDesign.stages.length; i++) {
      masses.push(cumulativeMass);
      cumulativeMass += calculateStageWetMass(currentDesign.stages[i].parts);
    }

    return masses;
  }, [currentDesign]);

  // Auto-select first stage when design changes
  React.useEffect(() => {
    if (currentDesign && currentDesign.stages.length > 0 && !selectedStageId) {
      setSelectedStageId(currentDesign.stages[0].id);
    }
  }, [currentDesign, selectedStageId]);

  const handleCreateRocket = () => {
    if (newRocketName.trim()) {
      createDesign(newRocketName.trim());
      setNewRocketName('');
      setShowNewModal(false);
      setSelectedStageId(null);
    }
  };

  const handleImport = () => {
    setImportError('');
    if (importDesign(importJson)) {
      setImportJson('');
      setShowImportModal(false);
    } else {
      setImportError('Invalid rocket design JSON');
    }
  };

  const handleExport = () => {
    const json = exportDesign();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentDesign?.name || 'rocket'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePartSelect = (partId: string) => {
    if (selectedStageId && currentDesign) {
      addPartToStage(selectedStageId, partId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Rocket selector */}
      <Card>
        <div className="flex items-center gap-4">
          <select
            value={currentDesign?.id || ''}
            onChange={(e) => {
              const design = designs.find((d) => d.id === e.target.value);
              setCurrentDesign(design || null);
              setSelectedStageId(null);
            }}
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-gray-100"
          >
            <option value="">Select a rocket design...</option>
            {designs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <Button onClick={() => setShowNewModal(true)}>New Rocket</Button>
          <Button variant="secondary" onClick={() => setShowImportModal(true)}>
            Import
          </Button>
          {currentDesign && (
            <>
              <Button variant="secondary" onClick={handleExport}>
                Export
              </Button>
              <Button variant="secondary" onClick={() => duplicateDesign(currentDesign.id)}>
                Duplicate
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (confirm('Delete this rocket design?')) {
                    deleteDesign(currentDesign.id);
                  }
                }}
              >
                Delete
              </Button>
            </>
          )}
        </div>
      </Card>

      {currentDesign ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Parts palette */}
          <div className="lg:col-span-1 h-[600px]">
            <PartPalette onPartSelect={handlePartSelect} />
          </div>

          {/* Stage manager */}
          <div className="lg:col-span-2 h-[600px]">
            <StageManager
              stages={currentDesign.stages}
              selectedStageId={selectedStageId}
              onStageSelect={setSelectedStageId}
              onAddStage={addStage}
              onRemoveStage={removeStage}
              onRemovePart={removePartFromStage}
              onUpdateQuantity={updatePartQuantity}
              payloadMasses={payloadMasses}
            />
          </div>

          {/* Stats panel */}
          <div className="lg:col-span-1">
            <StatsPanel stats={stats} rocketName={currentDesign.name} />
          </div>
        </div>
      ) : (
        <Card>
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No Rocket Selected</h3>
            <p className="text-gray-500 mb-4">Create a new rocket or select an existing design</p>
            <Button onClick={() => setShowNewModal(true)}>Create New Rocket</Button>
          </div>
        </Card>
      )}

      {/* New rocket modal */}
      <Modal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        title="Create New Rocket"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowNewModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRocket} disabled={!newRocketName.trim()}>
              Create
            </Button>
          </>
        }
      >
        <Input
          label="Rocket Name"
          value={newRocketName}
          onChange={(e) => setNewRocketName(e.target.value)}
          placeholder="Enter rocket name..."
          autoFocus
        />
      </Modal>

      {/* Import modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false);
          setImportError('');
        }}
        title="Import Rocket Design"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowImportModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport}>Import</Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">
            Paste the exported JSON data below to import a rocket design.
          </p>
          <textarea
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
            placeholder='{"design": {...}}'
            className="w-full h-48 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-gray-100 font-mono text-sm"
          />
          {importError && <p className="text-red-400 text-sm">{importError}</p>}
        </div>
      </Modal>
    </div>
  );
}
