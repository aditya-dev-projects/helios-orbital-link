import { create } from 'zustand';

export type OrbitType = 'GEO' | 'LEO' | 'MEO' | 'SSO';

export interface SimulationInput {
  orbitType: OrbitType;
  altitude: number;
  panelArea: number;
  frequency: number;
  targetCity: string;
}

export interface SimulationResult {
  power_generated_gw: number;
  transmission_efficiency: number;
  energy_delivered_tj: number;
  rectenna_efficiency: number;
  optimal_frequency: number;
  beam_lat: number;
  beam_lng: number;
}

export interface AIValidation {
  corrected_values: Partial<SimulationInput>;
  warnings: string[];
  explanation: string;
}

export interface LogEntry {
  timestamp: string;
  step: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
}

interface SimulationState {
  input: SimulationInput;
  result: SimulationResult | null;
  aiValidation: AIValidation | null;
  logs: LogEntry[];
  isSimulating: boolean;
  isValidating: boolean;
  isFullscreen: boolean;
  setInput: (input: Partial<SimulationInput>) => void;
  setResult: (result: SimulationResult | null) => void;
  setAIValidation: (v: AIValidation | null) => void;
  addLog: (log: Omit<LogEntry, 'timestamp'>) => void;
  clearLogs: () => void;
  setSimulating: (v: boolean) => void;
  setValidating: (v: boolean) => void;
  toggleFullscreen: () => void;
  reset: () => void;
}

const defaultInput: SimulationInput = {
  orbitType: 'GEO',
  altitude: 35786,
  panelArea: 10000,
  frequency: 5.8,
  targetCity: 'Mumbai',
};

export const useSimulationStore = create<SimulationState>((set) => ({
  input: defaultInput,
  result: null,
  aiValidation: null,
  logs: [],
  isSimulating: false,
  isValidating: false,
  isFullscreen: false,
  setInput: (input) => set((s) => ({ input: { ...s.input, ...input } })),
  setResult: (result) => set({ result }),
  setAIValidation: (aiValidation) => set({ aiValidation }),
  addLog: (log) =>
    set((s) => ({
      logs: [...s.logs, { ...log, timestamp: new Date().toISOString() }],
    })),
  clearLogs: () => set({ logs: [] }),
  setSimulating: (isSimulating) => set({ isSimulating }),
  setValidating: (isValidating) => set({ isValidating }),
  toggleFullscreen: () => set((s) => ({ isFullscreen: !s.isFullscreen })),
  reset: () => set({ result: null, aiValidation: null, logs: [] }),
}));
