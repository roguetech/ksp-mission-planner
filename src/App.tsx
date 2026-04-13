import { useSettingsStore } from './stores/settingsStore';
import { Layout } from './components/layout';
import { DeltaVMap, DeltaVCalculator } from './components/deltaV';
import { TransferCalculator, WindowList } from './components/transfer';
import { MissionBuilder } from './components/mission';
import { RocketBuilder } from './components/rocket';
import { SciencePlanner } from './components/science';
import { LandingPlanner } from './components/landing';
import { TelemetryPanel } from './components/telemetry';
import './index.css';

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
      {renderContent()}
    </Layout>
  );
}

export default App;
