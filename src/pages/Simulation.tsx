import { useSimulationStore } from '@/store/simulationStore';
import Header from '@/components/layout/Header';
import InputPanel from '@/components/panels/InputPanel';
import MetricsPanel from '@/components/panels/MetricsPanel';
import ConsolePanel from '@/components/panels/ConsolePanel';
import EarthGlobe from '@/components/simulation/EarthGlobe';

export default function Simulation() {
  const { isFullscreen } = useSimulationStore();

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <div className="scan-line" />
      <Header />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Inputs */}
        {!isFullscreen && (
          <div className="w-72 shrink-0 border-r border-border bg-card overflow-hidden">
            <InputPanel />
          </div>
        )}

        {/* Center - 3D Globe */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 relative">
            <EarthGlobe />
          </div>
          {/* Console at bottom of center */}
          {!isFullscreen && (
            <div className="h-52 border-t border-border bg-card shrink-0">
              <ConsolePanel />
            </div>
          )}
        </div>

        {/* Right Panel - Metrics */}
        {!isFullscreen && (
          <div className="w-64 shrink-0 border-l border-border bg-card overflow-hidden">
            <MetricsPanel />
          </div>
        )}
      </div>
    </div>
  );
}
