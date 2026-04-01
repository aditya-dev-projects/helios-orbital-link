import type { SimulationInput, SimulationResult, LogEntry } from '@/store/simulationStore';

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'Mumbai': { lat: 19.076, lng: 72.8777 },
  'Delhi': { lat: 28.6139, lng: 77.209 },
  'Bangalore': { lat: 12.9716, lng: 77.5946 },
  'Chennai': { lat: 13.0827, lng: 80.2707 },
  'Hyderabad': { lat: 17.385, lng: 78.4867 },
  'Kolkata': { lat: 22.5726, lng: 88.3639 },
  'Ahmedabad': { lat: 23.0225, lng: 72.5714 },
  'Pune': { lat: 18.5204, lng: 73.8567 },
  'Jaipur': { lat: 26.9124, lng: 75.7873 },
  'Thiruvananthapuram': { lat: 8.5241, lng: 76.9366 },
  'New York': { lat: 40.7128, lng: -74.006 },
  'London': { lat: 51.5074, lng: -0.1278 },
  'Tokyo': { lat: 35.6762, lng: 139.6503 },
  'Sydney': { lat: -33.8688, lng: 151.2093 },
  'Dubai': { lat: 25.2048, lng: 55.2708 },
};

const SOLAR_CONSTANT = 1361; // W/m²
const EARTH_RADIUS = 6371; // km
const SPEED_OF_LIGHT = 3e8; // m/s
const BOLTZMANN = 1.38e-23;

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export const AVAILABLE_CITIES = Object.keys(CITY_COORDS);

export function getCityCoords(city: string) {
  return CITY_COORDS[city] || CITY_COORDS['Mumbai'];
}

export async function runSimulation(
  input: SimulationInput,
  onLog: (log: Omit<LogEntry, 'timestamp'>) => void
): Promise<SimulationResult> {
  const logs: Omit<LogEntry, 'timestamp'>[] = [];
  const log = (step: string, message: string, type: LogEntry['type'] = 'info') => {
    const entry = { step, message, type };
    logs.push(entry);
    onLog(entry);
  };

  // Step 1: Orbital mechanics
  log('ORBITAL', '▶ Initiating orbital mechanics computation...', 'info');
  await delay(300);

  const altitudeM = input.altitude * 1000;
  const orbitalRadius = EARTH_RADIUS * 1000 + altitudeM;
  const orbitalPeriod = 2 * Math.PI * Math.sqrt(Math.pow(orbitalRadius, 3) / (3.986e14));
  const orbitalVelocity = (2 * Math.PI * orbitalRadius) / orbitalPeriod;
  const sunlightFraction = input.orbitType === 'GEO' ? 0.99 : input.orbitType === 'LEO' ? 0.6 : 0.75;

  log('ORBITAL', `  Orbital radius: ${(orbitalRadius / 1000).toFixed(0)} km`, 'info');
  log('ORBITAL', `  Period: ${(orbitalPeriod / 3600).toFixed(2)} hours`, 'info');
  log('ORBITAL', `  Velocity: ${(orbitalVelocity / 1000).toFixed(2)} km/s`, 'info');
  log('ORBITAL', `  Sunlight fraction: ${(sunlightFraction * 100).toFixed(1)}%`, 'success');

  // Step 2: Power generation
  log('POWER', '▶ Computing solar power generation...', 'info');
  await delay(300);

  const panelEfficiency = 0.30; // 30% efficient panels
  const rawPower = SOLAR_CONSTANT * input.panelArea * panelEfficiency;
  const avgPower = rawPower * sunlightFraction;
  const powerGW = avgPower / 1e9;

  log('POWER', `  Panel efficiency: ${(panelEfficiency * 100).toFixed(0)}%`, 'info');
  log('POWER', `  Raw power: ${(rawPower / 1e6).toFixed(2)} MW`, 'info');
  log('POWER', `  Average power (with eclipse): ${(avgPower / 1e6).toFixed(2)} MW`, 'success');

  // Step 3: Transmission
  log('TRANSMISSION', '▶ Calculating microwave power transmission...', 'info');
  await delay(300);

  const freqHz = input.frequency * 1e9;
  const wavelength = SPEED_OF_LIGHT / freqHz;
  const slantRange = Math.sqrt(Math.pow(altitudeM, 2) + Math.pow(EARTH_RADIUS * 1000 * 0.1, 2));
  const freeSpaceLoss = Math.pow((4 * Math.PI * slantRange) / wavelength, 2);
  const freeSpaceLossDb = 10 * Math.log10(freeSpaceLoss);
  const atmosphericLossDb = 2.0 + (freqHz > 10e9 ? 3.0 : 0.5);
  const pointingLossDb = 0.5;
  const totalLossDb = freeSpaceLossDb + atmosphericLossDb + pointingLossDb;
  const transmissionEfficiency = Math.pow(10, -totalLossDb / 10) * 1e8; // Scaled for demo
  const transmissionEff = Math.min(Math.max(transmissionEfficiency, 0.3), 0.92);

  log('TRANSMISSION', `  Frequency: ${input.frequency} GHz | λ = ${(wavelength * 100).toFixed(2)} cm`, 'info');
  log('TRANSMISSION', `  Free-space loss: ${freeSpaceLossDb.toFixed(1)} dB`, 'warning');
  log('TRANSMISSION', `  Atmospheric loss: ${atmosphericLossDb.toFixed(1)} dB`, 'warning');
  log('TRANSMISSION', `  Transmission efficiency: ${(transmissionEff * 100).toFixed(1)}%`, 'success');

  // Step 4: Rectenna
  log('RECTENNA', '▶ Evaluating rectenna ground station...', 'info');
  await delay(300);

  const coords = getCityCoords(input.targetCity);
  const latFactor = 1 - Math.abs(coords.lat) / 90 * 0.15;
  const rectennaBaseEfficiency = 0.85;
  const rectennaEfficiency = rectennaBaseEfficiency * latFactor;

  log('RECTENNA', `  Target: ${input.targetCity} (${coords.lat.toFixed(2)}°N, ${coords.lng.toFixed(2)}°E)`, 'info');
  log('RECTENNA', `  Latitude correction factor: ${latFactor.toFixed(3)}`, 'info');
  log('RECTENNA', `  Rectenna efficiency: ${(rectennaEfficiency * 100).toFixed(1)}%`, 'success');

  // Step 5: Optimization
  log('OPTIMIZER', '▶ Running greedy optimizer...', 'info');
  await delay(200);

  const optimalFreq = input.altitude > 20000 ? 5.8 : input.altitude > 5000 ? 2.45 : 10.0;
  const optimizationBoost = input.frequency === optimalFreq ? 1.0 : 0.95;

  log('OPTIMIZER', `  Optimal frequency for ${input.altitude}km: ${optimalFreq} GHz`, 'info');
  log('OPTIMIZER', `  Optimization factor: ${(optimizationBoost * 100).toFixed(1)}%`, optimizationBoost < 1 ? 'warning' : 'success');

  // Final calculations
  const deliveredPower = avgPower * transmissionEff * rectennaEfficiency * optimizationBoost;
  const energyTJ = (deliveredPower * 3600 * 24) / 1e12; // per day in TJ
  const finalPowerGW = deliveredPower / 1e9;

  log('RESULT', '═══════════════════════════════════════', 'success');
  log('RESULT', `  ⚡ Power Generated: ${powerGW.toFixed(4)} GW`, 'success');
  log('RESULT', `  📡 Transmission Efficiency: ${(transmissionEff * 100).toFixed(1)}%`, 'success');
  log('RESULT', `  🔋 Energy Delivered: ${energyTJ.toFixed(4)} TJ/day`, 'success');
  log('RESULT', '═══════════════════════════════════════', 'success');
  log('RESULT', '✅ Simulation complete.', 'success');

  return {
    power_generated_gw: powerGW,
    transmission_efficiency: transmissionEff * 100,
    energy_delivered_tj: energyTJ,
    rectenna_efficiency: rectennaEfficiency * 100,
    optimal_frequency: optimalFreq,
    beam_lat: coords.lat,
    beam_lng: coords.lng,
  };
}
