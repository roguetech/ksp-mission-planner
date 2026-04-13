import React, { useState } from 'react';
import { Card, CardHeader, Button, Input, Modal, Select } from '../common';
import { MissionTimeline } from './MissionTimeline';
import { ManeuverEditor } from './ManeuverEditor';
import { TemplateSelector } from './TemplateSelector';
import { useMissionStore } from '../../stores/missionStore';
import { Maneuver, MissionPhase } from '../../types';
import { bodiesArray } from '../../data/bodies';

export function MissionBuilder() {
  const {
    missions,
    currentMission,
    createMission,
    setCurrentMission,
    deleteMission,
    addPhase,
    removePhase,
    addManeuver,
    removeManeuver,
    updateManeuver,
    loadFromTemplate,
    exportMission,
    importMission,
  } = useMissionStore();

  const [showNewModal, setShowNewModal] = useState(false);
  const [showPhaseModal, setShowPhaseModal] = useState(false);
  const [showManeuverModal, setShowManeuverModal] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const [newMissionName, setNewMissionName] = useState('');
  const [newPhaseName, setNewPhaseName] = useState('');
  const [newPhaseStart, setNewPhaseStart] = useState('kerbin');
  const [newPhaseEnd, setNewPhaseEnd] = useState('mun');

  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
  const [editingManeuver, setEditingManeuver] = useState<Maneuver | null>(null);

  const [importJson, setImportJson] = useState('');
  const [importError, setImportError] = useState('');

  const handleCreateMission = () => {
    if (newMissionName.trim()) {
      createMission(newMissionName.trim());
      setNewMissionName('');
      setShowNewModal(false);
    }
  };

  const handleAddPhase = () => {
    if (newPhaseName.trim() && currentMission) {
      addPhase({
        name: newPhaseName.trim(),
        maneuvers: [],
        startBody: newPhaseStart,
        endBody: newPhaseEnd,
      });
      setNewPhaseName('');
      setShowPhaseModal(false);
    }
  };

  const handleSaveManeuver = (maneuver: Omit<Maneuver, 'id'>) => {
    if (!selectedPhaseId || !currentMission) return;

    if (editingManeuver) {
      updateManeuver(selectedPhaseId, editingManeuver.id, maneuver);
    } else {
      addManeuver(selectedPhaseId, maneuver);
    }
    setEditingManeuver(null);
  };

  const handleEditManeuver = (phaseId: string, maneuver: Maneuver) => {
    setSelectedPhaseId(phaseId);
    setEditingManeuver(maneuver);
    setShowManeuverModal(true);
  };

  const handleExport = () => {
    const json = exportMission();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentMission?.name || 'mission'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    setImportError('');
    if (importMission(importJson)) {
      setImportJson('');
      setShowImportModal(false);
    } else {
      setImportError('Invalid mission JSON');
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    loadFromTemplate(templateId);
    setShowTemplates(false);
  };

  const bodyOptions = bodiesArray.map((b) => ({ value: b.id, label: b.name }));

  // Get current phase for context
  const currentPhase = currentMission?.phases.find((p) => p.id === selectedPhaseId);

  return (
    <div className="space-y-6">
      {/* Mission selector */}
      <Card>
        <div className="flex items-center gap-4">
          <select
            value={currentMission?.id || ''}
            onChange={(e) => {
              const mission = missions.find((m) => m.id === e.target.value);
              setCurrentMission(mission || null);
              setSelectedPhaseId(null);
            }}
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-gray-100"
          >
            <option value="">Select a mission...</option>
            {missions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.totalDeltaV.toFixed(0)} m/s)
              </option>
            ))}
          </select>

          <Button onClick={() => setShowNewModal(true)}>New Mission</Button>
          <Button variant="secondary" onClick={() => setShowTemplates(true)}>
            Templates
          </Button>
          <Button variant="secondary" onClick={() => setShowImportModal(true)}>
            Import
          </Button>
          {currentMission && (
            <>
              <Button variant="secondary" onClick={handleExport}>
                Export
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (confirm('Delete this mission?')) {
                    deleteMission(currentMission.id);
                  }
                }}
              >
                Delete
              </Button>
            </>
          )}
        </div>
      </Card>

      {showTemplates ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-200">Choose a Template</h3>
            <Button variant="ghost" onClick={() => setShowTemplates(false)}>
              Cancel
            </Button>
          </div>
          <TemplateSelector onSelect={handleTemplateSelect} />
        </div>
      ) : currentMission ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Timeline */}
          <div className="lg:col-span-2">
            <MissionTimeline
              mission={currentMission}
              onAddPhase={() => setShowPhaseModal(true)}
              onRemovePhase={removePhase}
              onEditManeuver={handleEditManeuver}
              onRemoveManeuver={removeManeuver}
              selectedPhaseId={selectedPhaseId || undefined}
              onSelectPhase={setSelectedPhaseId}
            />
          </div>

          {/* Phase controls */}
          <div>
            <Card>
              <CardHeader
                title="Phase Actions"
                subtitle={currentPhase?.name || 'Select a phase'}
              />

              {selectedPhaseId && currentPhase ? (
                <div className="space-y-4">
                  <Button
                    className="w-full"
                    onClick={() => {
                      setEditingManeuver(null);
                      setShowManeuverModal(true);
                    }}
                  >
                    + Add Maneuver
                  </Button>

                  <div className="p-3 bg-gray-800/50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Phase Info</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Start:</span>
                        <span className="text-gray-300">{currentPhase.startBody}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">End:</span>
                        <span className="text-gray-300">{currentPhase.endBody}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Maneuvers:</span>
                        <span className="text-gray-300">{currentPhase.maneuvers.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Phase Δv:</span>
                        <span className="text-emerald-400">
                          {currentPhase.maneuvers.reduce((s, m) => s + m.deltaV, 0)} m/s
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="danger"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      removePhase(selectedPhaseId);
                      setSelectedPhaseId(null);
                    }}
                  >
                    Delete Phase
                  </Button>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-4">
                  <p>Click on a phase to select it</p>
                  <p className="text-sm mt-1">Then add maneuvers or edit details</p>
                </div>
              )}
            </Card>

            {/* Budget overview */}
            <Card className="mt-4">
              <CardHeader title="Delta-V Budget" />
              <div className="space-y-2">
                {currentMission.phases.map((phase) => {
                  const phaseDv = phase.maneuvers.reduce((s, m) => s + m.deltaV, 0);
                  const percentage =
                    currentMission.totalDeltaV > 0
                      ? (phaseDv / currentMission.totalDeltaV) * 100
                      : 0;

                  return (
                    <div key={phase.id} className="text-sm">
                      <div className="flex justify-between text-gray-400 mb-1">
                        <span className="truncate">{phase.name}</span>
                        <span>{phaseDv} m/s</span>
                      </div>
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}

                <div className="pt-2 mt-2 border-t border-gray-700">
                  <div className="flex justify-between text-gray-200 font-medium">
                    <span>Total</span>
                    <span className="text-emerald-400">
                      {currentMission.totalDeltaV.toFixed(0)} m/s
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <Card>
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No Mission Selected</h3>
            <p className="text-gray-500 mb-4">Create a new mission or choose from templates</p>
            <div className="flex justify-center gap-4">
              <Button onClick={() => setShowNewModal(true)}>Create New Mission</Button>
              <Button variant="secondary" onClick={() => setShowTemplates(true)}>
                Browse Templates
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* New mission modal */}
      <Modal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        title="Create New Mission"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowNewModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateMission} disabled={!newMissionName.trim()}>
              Create
            </Button>
          </>
        }
      >
        <Input
          label="Mission Name"
          value={newMissionName}
          onChange={(e) => setNewMissionName(e.target.value)}
          placeholder="e.g., Mun Landing Mission"
          autoFocus
        />
      </Modal>

      {/* New phase modal */}
      <Modal
        isOpen={showPhaseModal}
        onClose={() => setShowPhaseModal(false)}
        title="Add Mission Phase"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowPhaseModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddPhase} disabled={!newPhaseName.trim()}>
              Add Phase
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Phase Name"
            value={newPhaseName}
            onChange={(e) => setNewPhaseName(e.target.value)}
            placeholder="e.g., Transfer to Mun"
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Start Body"
              options={bodyOptions}
              value={newPhaseStart}
              onChange={(e) => setNewPhaseStart(e.target.value)}
            />
            <Select
              label="End Body"
              options={bodyOptions}
              value={newPhaseEnd}
              onChange={(e) => setNewPhaseEnd(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      {/* Maneuver editor */}
      <ManeuverEditor
        isOpen={showManeuverModal}
        onClose={() => {
          setShowManeuverModal(false);
          setEditingManeuver(null);
        }}
        maneuver={editingManeuver || undefined}
        onSave={handleSaveManeuver}
        defaultOrigin={currentPhase?.startBody}
        defaultDestination={currentPhase?.endBody}
      />

      {/* Import modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false);
          setImportError('');
        }}
        title="Import Mission"
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
            Paste the exported mission JSON below.
          </p>
          <textarea
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
            placeholder='{"id": "...", "name": "...", ...}'
            className="w-full h-48 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-gray-100 font-mono text-sm"
          />
          {importError && <p className="text-red-400 text-sm">{importError}</p>}
        </div>
      </Modal>
    </div>
  );
}
