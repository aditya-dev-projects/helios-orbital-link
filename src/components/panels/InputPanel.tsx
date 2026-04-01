import { useSimulationStore, type OrbitType } from '@/store/simulationStore';
import { AVAILABLE_CITIES, runSimulation } from '@/lib/simulation';
import { validateInputs } from '@/lib/aiValidation';
import { Zap, Brain, AlertTriangle, CheckCircle, Upload, Loader2, Edit3, Activity, Cpu, Thermometer, Gauge, PlayCircle } from 'lucide-react';
import React, { useState } from 'react';
import { analyzeComponentImage } from '@/services/aiService';
import { toast } from 'sonner';

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

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [showDetailed, setShowDetailed] = useState(false); // New state for detailed values

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    addLog({ step: 'AI', message: '📸 Analyzing engineering charts...', type: 'info' });

    try {
      const data = await analyzeComponentImage(file);
      
      // Update state with AI extracted values
      setInput({
        ...input,
        ...data
      });
      
      toast.success("AI extraction complete: Parameters updated.");
      addLog({ step: 'AI', message: '✅ Extracted values from terminal/charts.', type: 'success' });
    } catch (error) {
      toast.error("AI analysis failed. Falling back to manual entry.");
      addLog({ step: 'ERROR', message: 'AI failed to parse image data.', type: 'error' });
      setShowManual(true);
    } finally {
      setIsAnalyzing(false);
    }
  };

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
    addLog({ step: 'SYSTEM', message: '🚀 HELIOS-LINK Engine: Initializing with Terminal Data', type: 'info' });
    addLog({ step: 'SYSTEM', message: `   Configuration: ${input.orbitType} @ ${input.altitude}km`, type: 'info' });
    addLog({ step: 'SYSTEM', message: '───────────────────────────────────────', type: 'info' });

    try {
      const result = await runSimulation(input, (log) => addLog(log));
      setResult(result);
    } catch (e) {
      addLog({ step: 'ERROR', message: `Simulation failed: ${e}`, type: 'error' });
    }
    setSimulating(false);
  };

  // New handler for detailed real-time simulation
  const handleDetailedSimulate = async () => {
    clearLogs();
    setResult(null);
    setSimulating(true);
    addLog({ step: 'HARDWARE', message: '🛠️ Establishing Real-Time Hardware Link...', type: 'info' });
    addLog({ step: 'SENSOR', message: `📡 Live Feed: ${input.voltage || 0}V | ${input.current || 0}A | ${input.temperature || 0}°C`, type: 'success' });
    addLog({ step: 'SYSTEM', message: '───────────────────────────────────────', type: 'info' });
    
    try {
      const result = await runSimulation(input, (log) => addLog(log));
      setResult(result);
      toast.success("Real-time simulation synchronized.");
    } catch (e) {
      addLog({ step: 'ERROR', message: `Real-time link failed: ${e}`, type: 'error' });
    }
    setSimulating(false);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 space-y-4 custom-scrollbar bg-background/50">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          <h2 className="font-display text-sm font-bold tracking-wider text-primary glow-text-primary uppercase">
            Simulation Parameters
          </h2>
        </div>
        <button 
          onClick={() => setShowManual(!showManual)}
          className={`p-1.5 rounded border transition-all ${showManual ? 'bg-primary/20 border-primary' : 'border-border'}`}
          title="Toggle Manual Entry"
        >
          <Edit3 className={`w-4 h-4 ${showManual ? 'text-primary' : 'text-muted-foreground'}`} />
        </button>
      </div>

      {/* AI Image Upload Section */}
      <div className="p-4 border-2 border-dashed border-primary/20 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors">
        <input
          type="file"
          id="terminal-upload"
          className="hidden"
          accept="image/*"
          onChange={handleImageUpload}
          disabled={isAnalyzing}
        />
        <label htmlFor="terminal-upload" className="cursor-pointer flex flex-col items-center gap-2">
          {isAnalyzing ? (
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          ) : (
            <Upload className="w-6 h-6 text-primary/60" />
          )}
          <span className="text-[10px] font-mono uppercase tracking-widest text-center text-muted-foreground">
            {isAnalyzing ? "AI Analyzing Terminal..." : "Upload Terminal Screenshot"}
          </span>
        </label>
      </div>

      {/* Manual Entry Form */}
      <div className={`space-y-4 transition-all duration-300 ${showManual ? 'opacity-100 scale-100' : 'opacity-90 scale-[0.98]'}`}>
        {/* Orbit Type */}
        <div>
          <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2 block">
            Orbit Configuration
          </label>
          <div className="grid grid-cols-2 gap-2">
            {ORBIT_TYPES.map((o) => (
              <button
                key={o.value}
                onClick={() => setInput({ orbitType: o.value })}
                className={`p-2 rounded border text-xs font-mono transition-all ${
                  input.orbitType === o.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-secondary/20 text-muted-foreground hover:border-primary/50'
                }`}
              >
                <div className="font-bold">{o.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* System & Terminal Parameters */}
        <div className="space-y-3 p-3 border border-primary/10 rounded bg-secondary/10">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[9px] font-bold text-primary/70 tracking-widest uppercase">Terminal Values</h3>
            <button 
              onClick={() => setShowDetailed(!showDetailed)}
              className="text-[8px] font-mono text-primary border border-primary/30 px-1 rounded hover:bg-primary/10"
            >
              {showDetailed ? "SIMPLE" : "DETAILED"}
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-mono text-muted-foreground uppercase">Altitude (km)</label>
              <input 
                type="number" 
                value={input.altitude} 
                onChange={(e) => setInput({ altitude: Number(e.target.value) })}
                className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs font-mono outline-none focus:border-primary transition-colors"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-mono text-muted-foreground uppercase">Panel Area (m²)</label>
              <input 
                type="number" 
                value={input.panelArea} 
                onChange={(e) => setInput({ panelArea: Number(e.target.value) })}
                className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs font-mono outline-none focus:border-primary transition-colors"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-mono text-muted-foreground uppercase">Frequency (GHz)</label>
              <input 
                type="number" 
                step="0.1"
                value={input.frequency} 
                onChange={(e) => setInput({ frequency: Number(e.target.value) })}
                className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs font-mono outline-none focus:border-primary transition-colors"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-mono text-muted-foreground uppercase">Efficiency (%)</label>
              <input 
                type="number" 
                value={input.efficiency || 20} 
                onChange={(e) => setInput({ efficiency: Number(e.target.value) })}
                className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs font-mono outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* Detailed Terminal Fields from Screenshot */}
            {showDetailed && (
              <>
                <div className="space-y-1 animate-in fade-in slide-in-from-top-1">
                  <label className="flex items-center gap-1 text-[9px] font-mono text-muted-foreground uppercase"><Gauge className="w-2 h-2"/> Voltage (V)</label>
                  <input 
                    type="number" 
                    value={input.voltage || 0} 
                    onChange={(e) => setInput({ voltage: Number(e.target.value) })}
                    className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs font-mono outline-none focus:border-primary" 
                  />
                </div>
                <div className="space-y-1 animate-in fade-in slide-in-from-top-1">
                  <label className="flex items-center gap-1 text-[9px] font-mono text-muted-foreground uppercase"><Zap className="w-2 h-2"/> Current (A)</label>
                  <input 
                    type="number" 
                    value={input.current || 0} 
                    onChange={(e) => setInput({ current: Number(e.target.value) })}
                    className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs font-mono outline-none focus:border-primary" 
                  />
                </div>
                <div className="space-y-1 col-span-2 animate-in fade-in slide-in-from-top-1">
                  <label className="flex items-center gap-1 text-[9px] font-mono text-muted-foreground uppercase"><Thermometer className="w-2 h-2"/> Temperature (°C)</label>
                  <input 
                    type="number" 
                    value={input.temperature || 0} 
                    onChange={(e) => setInput({ temperature: Number(e.target.value) })}
                    className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs font-mono outline-none focus:border-primary" 
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Target Receiving Station */}
        <div>
          <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1 block">
            Target Receiving Station
          </label>
          <select
            value={input.targetCity}
            onChange={(e) => setInput({ targetCity: e.target.value })}
            className="w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm font-mono focus:border-primary outline-none transition-all"
          >
            {AVAILABLE_CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* AI Validation Result */}
      {aiValidation && (
        <div className={`rounded-md p-3 text-[10px] font-mono border ${
          aiValidation.warnings.length > 0 ? 'border-glow-warning/30 bg-glow-warning/5' : 'border-glow-success/30 bg-glow-success/5'
        }`}>
          <div className="flex items-center gap-1 mb-1">
            {aiValidation.warnings.length > 0 ? <AlertTriangle className="w-3 h-3 text-glow-warning" /> : <CheckCircle className="w-3 h-3 text-glow-success" />}
            <span className={aiValidation.warnings.length > 0 ? 'text-glow-warning' : 'text-glow-success uppercase font-bold'}>
              {aiValidation.warnings.length > 0 ? 'Validation Warning' : 'Status: Validated'}
            </span>
          </div>
          <p className="text-muted-foreground leading-relaxed italic">{aiValidation.explanation}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2 pt-2">
        <button
          onClick={handleValidate}
          disabled={isValidating || isSimulating || isAnalyzing}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded border border-accent/50 bg-accent/10 text-accent font-mono text-xs uppercase tracking-wider hover:bg-accent/20 transition-all disabled:opacity-40"
        >
          <Brain className="w-4 h-4" />
          {isValidating ? 'Running Logic...' : 'AI Validate Parameters'}
        </button>
        
        {/* Main Orbit Simulation Button */}
        <button
          onClick={handleSimulate}
          disabled={isSimulating || isAnalyzing}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded bg-secondary text-secondary-foreground font-display text-xs uppercase tracking-widest hover:bg-secondary/80 transition-all disabled:opacity-40"
        >
          <Zap className="w-4 h-4" />
          {isSimulating ? 'Processing...' : 'Run Orbit Simulation'}
        </button>

        {/* New Detailed Real-Time Simulation Button */}
        <button
          onClick={handleDetailedSimulate}
          disabled={isSimulating || isAnalyzing}
          className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded bg-primary text-primary-foreground font-display text-xs uppercase tracking-[0.2em] shadow-glow hover:shadow-primary/50 transition-all disabled:opacity-40 animate-pulse-glow"
        >
          <PlayCircle className="w-5 h-5" />
          {isSimulating ? 'SYNCING...' : 'START REAL-TIME SIM'}
        </button>
      </div>
    </div>
  );
}