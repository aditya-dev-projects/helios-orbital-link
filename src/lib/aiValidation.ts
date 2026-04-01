import type { SimulationInput, AIValidation } from '@/store/simulationStore';

// Client-side AI validation (physics-based heuristics)
// In production, this would call an edge function with Lovable AI
export function validateInputs(input: SimulationInput): AIValidation {
  const warnings: string[] = [];
  const corrected: Partial<SimulationInput> = {};
  const explanations: string[] = [];

  // Altitude validation by orbit type
  const orbitRanges: Record<string, [number, number]> = {
    GEO: [35000, 36000],
    LEO: [200, 2000],
    MEO: [2000, 35000],
    SSO: [600, 800],
  };

  const [min, max] = orbitRanges[input.orbitType];
  if (input.altitude < min || input.altitude > max) {
    const correctedAlt = input.orbitType === 'GEO' ? 35786 :
      input.orbitType === 'LEO' ? 500 :
      input.orbitType === 'MEO' ? 20200 : 700;
    corrected.altitude = correctedAlt;
    warnings.push(`Altitude ${input.altitude}km is outside typical ${input.orbitType} range (${min}-${max}km). Corrected to ${correctedAlt}km.`);
    explanations.push(`${input.orbitType} orbits typically operate between ${min}-${max}km for optimal coverage and stability.`);
  }

  // Frequency validation
  if (input.frequency < 1 || input.frequency > 100) {
    corrected.frequency = 5.8;
    warnings.push(`Frequency ${input.frequency}GHz is outside practical range. Corrected to 5.8GHz (ISM band).`);
    explanations.push('Microwave power transmission typically uses 2.45GHz or 5.8GHz ISM bands.');
  }

  // Panel area validation
  if (input.panelArea < 100) {
    corrected.panelArea = 1000;
    warnings.push(`Panel area of ${input.panelArea}m² is too small for meaningful power generation. Corrected to 1000m².`);
  } else if (input.panelArea > 1e6) {
    corrected.panelArea = 100000;
    warnings.push(`Panel area of ${input.panelArea}m² exceeds current engineering capabilities. Corrected to 100,000m².`);
  }

  if (warnings.length === 0) {
    explanations.push('All parameters are within acceptable ranges for the selected orbit type. Simulation can proceed with confidence.');
  }

  return {
    corrected_values: corrected,
    warnings,
    explanation: explanations.join(' '),
  };
}
