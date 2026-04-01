import { useSimulationStore, type OrbitType } from '@/store/simulationStore';
import { AVAILABLE_CITIES, runSimulation } from '@/lib/simulation';
import { validateInputs } from '@/lib/aiValidation';
import { Zap, Brain, AlertTriangle, CheckCircle } from 'lucide-react';

const ORBIT_TYPES: { value: OrbitType; label: string; desc: string }[] = [
  { value: 'GEO', label: 'GEO', desc: 'Geostationary' },
  { value: 'LEO', label: 'LEO', desc: 'Low Earth' },
  { value: 'MEO', label: 'MEO', desc: 'Medium Earth' },
  { value: 'SSO', label: 'SSO', desc: 'Sun-Synchronous' },
];

export default function InputPanel() {
  const {
    input, setInput, setResult, setAIValidation, addLog, clearLogs,
    isSimulating, isValidating, setSimulating, setValidating, aiValidation,
  } = useSimulationStore();

  const handleValidate = async () => {
    setValidating(true);
    addLog({ step: 'AI', message: '🧠 Running AI validation...', type: 'info' });
    await new Promise((r) => setTimeout(r, 500));
    const result = validateInputs(input);
    setAIValidation(result);

    if (result.warnings.length > 0) {
      result.warnings.forEach((w) =>
        addLog({ step: 'AI', message: `⚠️ ${w}`, type: 'warning' })
      );
      // Apply corrections
      if (Object.keys(result.corrected_values).length > 0) {
        setInput(result.corrected_values);
        addLog({ step: 'AI', message: '✅ Parameters auto-corrected.', type: 'success' });
      }
    } else {
      addLog({ step: 'AI', message: '✅ All parameters validated.', type: 'success' });
    }
    setValidating(false);
  };

  const handleSimulate = async () => {
    clearLogs();
    setResult(null);
    setSimulating(true);
    addLog({ step: 'SYSTEM', message: '🚀 HELIOS-LINK Simulation Engine v1.0', type: 'info' });
    addLog({ step: 'SYSTEM', message: `   Target: ${input.targetCity} | Orbit: ${input.orbitType} @ ${input.altitude}km`, type: 'info' });
    addLog({ step: 'SYSTEM', message: '───────────────────────────────────────', type: 'info' });

    try {
      const result = await runSimulation(input, (log) => addLog(log));
      setResult(result);
    } catch (e) {
      addLog({ step: 'ERROR', message: `Simulation failed: ${e}`, type: 'error' });
    }
    setSimulating(false);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="w-5 h-5 text-primary" />
        <h2 className="font-display text-sm font-bold tracking-wider text-primary glow-text-primary">
          PARAMETERS
        </h2>
      </div>

      {/* Orbit Type */}
      <div>
        <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2 block">
          Orbit Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          {ORBIT_TYPES.map((o) => (
            <button
              key={o.value}
              onClick={() => setInput({ orbitType: o.value })}
              className={`p-2 rounded-md border text-xs font-mono transition-all ${
                input.orbitType === o.value
                  ? 'border-primary bg-primary/10 text-primary glow-primary'
                  : 'border-border bg-secondary/30 text-muted-foreground hover:border-primary/50'
              }`}
            >
              <div className="font-bold">{o.label}</div>
              <div className="text-[10px] opacity-70">{o.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Altitude */}
      <div>
        <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1 block">
          Altitude (km)
        </label>
        <input
          type="number"
          value={input.altitude}
          onChange={(e) => setInput({ altitude: Number(e.target.value) })}
          className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm font-mono text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
        />
      </div>

      {/* Panel Area */}
      <div>
        <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1 block">
          Panel Area (m²)
        </label>
        <input
          type="number"
          value={input.panelArea}
          onChange={(e) => setInput({ panelArea: Number(e.target.value) })}
          className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm font-mono text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
        />
      </div>

      {/* Frequency */}
      <div>
        <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1 block">
          Frequency (GHz)
        </label>
        <input
          type="number"
          step="0.1"
          value={input.frequency}
          onChange={(e) => setInput({ frequency: Number(e.target.value) })}
          className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm font-mono text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
        />
      </div>

      {/* Target City */}
      <div>
        <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1 block">
          Target City
        </label>
        <select
          value={input.targetCity}
          onChange={(e) => setInput({ targetCity: e.target.value })}
          className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm font-mono text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
        >
          {AVAILABLE_CITIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* AI Validation Result */}
      {aiValidation && (
        <div className={`rounded-md p-3 text-xs font-mono border ${
          aiValidation.warnings.length > 0
            ? 'border-glow-warning/30 bg-glow-warning/5'
            : 'border-glow-success/30 bg-glow-success/5'
        }`}>
          <div className="flex items-center gap-1 mb-1">
            {aiValidation.warnings.length > 0 ? (
              <AlertTriangle className="w-3 h-3 text-glow-warning" />
            ) : (
              <CheckCircle className="w-3 h-3 text-glow-success" />
            )}
            <span className={aiValidation.warnings.length > 0 ? 'text-glow-warning' : 'text-glow-success'}>
              {aiValidation.warnings.length > 0 ? 'Corrections Applied' : 'Validated'}
            </span>
          </div>
          <p className="text-muted-foreground text-[10px] leading-relaxed">
            {aiValidation.explanation}
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="space-y-2 pt-2">
        <button
          onClick={handleValidate}
          disabled={isValidating || isSimulating}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border border-accent/50 bg-accent/10 text-accent font-mono text-xs uppercase tracking-wider hover:bg-accent/20 transition-all disabled:opacity-40"
        >
          <Brain className="w-4 h-4" />
          {isValidating ? 'Validating...' : 'AI Validate'}
        </button>
        <button
          onClick={handleSimulate}
          disabled={isSimulating}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md bg-primary text-primary-foreground font-display text-xs uppercase tracking-widest hover:shadow-[0_0_20px_hsl(205_100%_55%/0.4)] transition-all disabled:opacity-40 animate-pulse-glow"
        >
          <Zap className="w-4 h-4" />
          {isSimulating ? 'Simulating...' : 'Run Simulation'}
        </button>
      </div>
    </div>
  );
}
