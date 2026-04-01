import { useRef, useEffect } from 'react';
import { useSimulationStore } from '@/store/simulationStore';
import { Terminal } from 'lucide-react';

const typeColors: Record<string, string> = {
  info: 'text-foreground',
  warning: 'text-glow-warning',
  success: 'text-glow-success',
  error: 'text-destructive',
};

const stepColors: Record<string, string> = {
  SYSTEM: 'text-muted-foreground',
  ORBITAL: 'text-primary',
  POWER: 'text-glow-warning',
  TRANSMISSION: 'text-accent',
  RECTENNA: 'text-glow-success',
  OPTIMIZER: 'text-purple-400',
  RESULT: 'text-primary',
  AI: 'text-accent',
  ERROR: 'text-destructive',
};

export default function ConsolePanel() {
  const { logs } = useSimulationStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Terminal className="w-4 h-4 text-primary" />
        <h2 className="font-display text-xs font-bold tracking-wider text-primary">
          MISSION CONSOLE
        </h2>
        <div className="ml-auto flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${logs.length > 0 ? 'bg-glow-success animate-pulse' : 'bg-muted-foreground/30'}`} />
          <span className="text-[10px] font-mono text-muted-foreground">
            {logs.length > 0 ? 'ACTIVE' : 'STANDBY'}
          </span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed space-y-0.5">
        {logs.length === 0 ? (
          <div className="text-muted-foreground/40 text-center mt-8">
            <pre className="text-[10px] leading-tight">{`
  ╔═══════════════════════════╗
  ║   HELIOS-LINK v1.0       ║
  ║   Mission Console Ready   ║
  ╚═══════════════════════════╝
            `}</pre>
            <p className="mt-2">Run simulation to see output...</p>
          </div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className={`${typeColors[log.type]} flex gap-2`}>
              <span className="text-muted-foreground/40 shrink-0 w-16 text-right">
                {new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false })}
              </span>
              <span className={`${stepColors[log.step] || 'text-muted-foreground'} shrink-0 w-16`}>
                [{log.step}]
              </span>
              <span>{log.message}</span>
            </div>
          ))
        )}
        {logs.length > 0 && (
          <div className="cursor-blink text-muted-foreground/40 mt-1">
            &gt;
          </div>
        )}
      </div>
    </div>
  );
}
