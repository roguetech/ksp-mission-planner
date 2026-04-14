import React from 'react';
import { useSettingsStore } from './stores/settingsStore';
import { Layout } from './components/layout';
import { DeltaVMap, DeltaVCalculator } from './components/deltaV';
import { TransferCalculator, WindowList } from './components/transfer';
import { MissionBuilder } from './components/mission';
import { RocketBuilder } from './components/rocket';
import { SciencePlanner } from './components/science';
import { LandingPlanner } from './components/landing';
import { TelemetryPanel } from './components/telemetry';
import { TrackingStationPanel } from './components/tracking';
import './index.css';

// ─── Error boundary ───────────────────────────────────────────────────────────

interface ErrorBoundaryState {
  error: Error | null;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[App] Render error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-8">
          <div className="max-w-lg w-full bg-gray-900 border border-red-700/50 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-red-500 shrink-0" />
              <h2 className="text-lg font-semibold text-red-400">Render Error</h2>
            </div>
            <p className="text-sm text-gray-400">
              A component crashed. Check the browser console for the full stack trace.
            </p>
            <pre className="text-xs text-red-300 bg-gray-950 rounded p-3 overflow-auto max-h-48 whitespace-pre-wrap">
              {this.state.error.message}
            </pre>
            <button
              onClick={() => this.setState({ error: null })}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded-lg transition-colors"
            >
              Dismiss and retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── App ──────────────────────────────────────────────────────────────────────

function App() {
  const { currentTab, setCurrentTab } = useSettingsStore();

  const renderContent = () => {
    switch (currentTab) {
      case 'deltaV':
        return (
          <div className="space-y-6">
            <DeltaVMap />
            <DeltaVCalculator />
          </div>
        );

      case 'transfer':
        return (
          <div className="space-y-6">
            <TransferCalculator />
            <WindowList />
          </div>
        );

      case 'mission':
        return <MissionBuilder />;

      case 'rocket':
        return <RocketBuilder />;

      case 'landing':
        return <LandingPlanner />;

      case 'science':
        return <SciencePlanner />;

      case 'telemetry':
        return <TelemetryPanel />;

      case 'tracking':
        return <TrackingStationPanel />;

      default:
        return (
          <div className="text-center text-gray-500 py-12">
            <p>Select a tab to get started</p>
          </div>
        );
    }
  };

  return (
    <Layout currentTab={currentTab} onTabChange={setCurrentTab}>
      <ErrorBoundary>
        {renderContent()}
      </ErrorBoundary>
    </Layout>
  );
}

export default App;
