import { useSimulationStore } from '@/store/simulationStore';
import { Maximize, Minimize, Sun } from 'lucide-react';

export default function Header() {
  const { isFullscreen, toggleFullscreen, isSimulating } = useSimulationStore();

  return (
    <header className="h-12 bg-card border-b border-border flex items-center px-4 shrink-0">
      <div className="flex items-center gap-3">
        <Sun className="w-6 h-6 text-primary" />
        <h1 className="font-display text-base font-bold tracking-widest text-primary glow-text-primary">
          HELIOS-LINK
        </h1>
        <span className="text-[10px] font-mono text-muted-foreground border border-border rounded px-1.5 py-0.5">
          SBSP SIM v1.0
        </span>
      </div>

      <div className="ml-auto flex items-center gap-4">
        {isSimulating && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-glow-warning animate-pulse" />
            <span className="text-[10px] font-mono text-glow-warning uppercase tracking-wider">
              Simulating...
            </span>
          </div>
        )}
        <button
          onClick={toggleFullscreen}
          className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
}
