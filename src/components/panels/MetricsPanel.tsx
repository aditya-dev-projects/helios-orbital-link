import { useSimulationStore } from '@/store/simulationStore';
import { Zap, Radio, Battery, Target, Waves, TrendingUp } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string;
  unit: string;
  icon: React.ReactNode;
  color: string;
}

function MetricCard({ label, value, unit, icon, color }: MetricCardProps) {
  return (
    <div className="bg-secondary/30 border border-border rounded-lg p-3 hover:border-primary/30 transition-all">
      <div className="flex items-center gap-2 mb-1">
        <span className={color}>{icon}</span>
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-xl font-display font-bold ${color}`}>
          {value}
        </span>
        <span className="text-xs font-mono text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}

export default function MetricsPanel() {
  const { result, input } = useSimulationStore();

  const metrics = result
    ? [
        { label: 'Power Generated', value: result.power_generated_gw.toFixed(4), unit: 'GW', icon: <Zap className="w-3.5 h-3.5" />, color: 'text-primary' },
        { label: 'Tx Efficiency', value: result.transmission_efficiency.toFixed(1), unit: '%', icon: <Radio className="w-3.5 h-3.5" />, color: 'text-accent' },
        { label: 'Energy Delivered', value: result.energy_delivered_tj.toFixed(4), unit: 'TJ/day', icon: <Battery className="w-3.5 h-3.5" />, color: 'text-glow-success' },
        { label: 'Rectenna Eff.', value: result.rectenna_efficiency.toFixed(1), unit: '%', icon: <Target className="w-3.5 h-3.5" />, color: 'text-glow-warning' },
        { label: 'Optimal Freq', value: result.optimal_frequency.toFixed(1), unit: 'GHz', icon: <Waves className="w-3.5 h-3.5" />, color: 'text-primary' },
        { label: 'Overall Gain', value: ((result.energy_delivered_tj / (result.power_generated_gw * 0.0864)) * 100).toFixed(1), unit: '%', icon: <TrendingUp className="w-3.5 h-3.5" />, color: 'text-accent' },
      ]
    : null;

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-accent" />
        <h2 className="font-display text-sm font-bold tracking-wider text-accent glow-text-accent">
          METRICS
        </h2>
      </div>

      {!metrics ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-muted-foreground/50 font-mono text-xs">
              <div className="mb-2 text-2xl opacity-30">📊</div>
              Awaiting simulation data...
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {metrics.map((m) => (
            <MetricCard key={m.label} {...m} />
          ))}
        </div>
      )}

      {/* Mission info */}
      <div className="mt-auto pt-4 border-t border-border">
        <div className="text-[10px] font-mono text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>ORBIT</span>
            <span className="text-foreground">{input.orbitType} @ {input.altitude}km</span>
          </div>
          <div className="flex justify-between">
            <span>TARGET</span>
            <span className="text-foreground">{input.targetCity}</span>
          </div>
          <div className="flex justify-between">
            <span>PANELS</span>
            <span className="text-foreground">{input.panelArea.toLocaleString()} m²</span>
          </div>
          <div className="flex justify-between">
            <span>FREQ</span>
            <span className="text-foreground">{input.frequency} GHz</span>
          </div>
        </div>
      </div>
    </div>
  );
}
