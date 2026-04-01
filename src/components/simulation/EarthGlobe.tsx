import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useSimulationStore } from '@/store/simulationStore';
import { getCityCoords } from '@/lib/simulation';

const CITY_MARKERS: { name: string; lat: number; lng: number }[] = [
  { name: 'Mumbai', lat: 19.076, lng: 72.8777 },
  { name: 'Delhi', lat: 28.6139, lng: 77.209 },
  { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { name: 'New York', lat: 40.7128, lng: -74.006 },
  { name: 'London', lat: 51.5074, lng: -0.1278 },
  { name: 'Tokyo', lat: 35.6762, lng: 139.6503 },
  { name: 'Sydney', lat: -33.8688, lng: 151.2093 },
  { name: 'Dubai', lat: 25.2048, lng: 55.2708 },
];

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

const SUN_POS = new THREE.Vector3(0, 0, 0); // Sun at center of solar system

/* ─── Sun – large, glowing, realistic ─── */
function Sun() {
  const coreRef = useRef<THREE.Mesh>(null);
  const glow1Ref = useRef<THREE.Mesh>(null);
  const glow2Ref = useRef<THREE.Mesh>(null);
  const glow3Ref = useRef<THREE.Mesh>(null);
  const coronaRef = useRef<THREE.Group>(null);

  const sunTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(0.15, '#FFF8DC');
    grad.addColorStop(0.3, '#FFD700');
    grad.addColorStop(0.5, '#FFA500');
    grad.addColorStop(0.7, '#FF8C00');
    grad.addColorStop(0.85, '#FF6600');
    grad.addColorStop(1, '#CC4400');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 200; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const dist = Math.sqrt((x - 256) ** 2 + (y - 256) ** 2);
      if (dist < 240) {
        const r = Math.random() * 12 + 2;
        const spotGrad = ctx.createRadialGradient(x, y, 0, x, y, r);
        spotGrad.addColorStop(0, `rgba(255, ${150 + Math.random() * 100}, 0, ${Math.random() * 0.3})`);
        spotGrad.addColorStop(1, 'rgba(255, 180, 0, 0)');
        ctx.fillStyle = spotGrad;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (coreRef.current) coreRef.current.rotation.y = t * 0.015;
    if (glow1Ref.current) glow1Ref.current.scale.setScalar(1 + Math.sin(t * 1.5) * 0.03);
    if (glow2Ref.current) glow2Ref.current.scale.setScalar(1 + Math.sin(t * 1.2 + 1) * 0.04);
    if (glow3Ref.current) glow3Ref.current.scale.setScalar(1 + Math.sin(t * 0.8 + 2) * 0.05);
    if (coronaRef.current) coronaRef.current.rotation.z = t * 0.03;
  });

  return (
    <group position={SUN_POS}>
      <mesh ref={coreRef}>
        <sphereGeometry args={[3, 64, 64]} />
        <meshBasicMaterial map={sunTexture} />
      </mesh>
      <mesh ref={glow1Ref}>
        <sphereGeometry args={[3.3, 48, 48]} />
        <meshBasicMaterial color="#FFD700" transparent opacity={0.35} />
      </mesh>
      <mesh ref={glow2Ref}>
        <sphereGeometry args={[4.2, 48, 48]} />
        <meshBasicMaterial color="#FFA500" transparent opacity={0.15} />
      </mesh>
      <mesh ref={glow3Ref}>
        <sphereGeometry args={[5.5, 48, 48]} />
        <meshBasicMaterial color="#FF8C00" transparent opacity={0.06} />
      </mesh>
      <mesh>
        <sphereGeometry args={[7, 32, 32]} />
        <meshBasicMaterial color="#FF6600" transparent opacity={0.025} />
      </mesh>
      <group ref={coronaRef}>
        {Array.from({ length: 20 }).map((_, i) => {
          const angle = (i / 20) * Math.PI * 2;
          const len = 4 + Math.random() * 3;
          return (
            <mesh key={i} rotation={[0, 0, angle]}>
              <planeGeometry args={[0.1, len]} />
              <meshBasicMaterial
                color="#FFD700"
                transparent
                opacity={0.06 + Math.random() * 0.04}
                side={THREE.DoubleSide}
              />
            </mesh>
          );
        })}
      </group>
      <pointLight color="#FFF5E0" intensity={200} distance={200} decay={2} />
    </group>
  );
}

/* ─── Sun Lens Flare ─── */
function SunFlare() {
  const spriteRef = useRef<THREE.Sprite>(null);
  useFrame(({ clock }) => {
    if (spriteRef.current) {
      const s = 10 + Math.sin(clock.getElapsedTime() * 1.5) * 1;
      spriteRef.current.scale.set(s, s, 1);
    }
  });
  return (
    <sprite ref={spriteRef} position={SUN_POS}>
      <spriteMaterial color="#FFF8DC" transparent opacity={0.04} />
    </sprite>
  );
}

/* ─── Earth's orbit path ring (around the Sun) ─── */
function EarthOrbitPath() {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[19.97, 20.03, 256]} />
      <meshBasicMaterial color="#334466" transparent opacity={0.15} side={THREE.DoubleSide} />
    </mesh>
  );
}

/* ─── Solar Rays from Sun to Satellite (world-space positions) ─── */
function SolarRays({ satelliteWorldPos }: { satelliteWorldPos: THREE.Vector3 | null }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        const mat = (child as THREE.Line).material as THREE.LineBasicMaterial;
        if (mat && mat.opacity !== undefined) {
          mat.opacity = 0.12 + Math.sin(clock.getElapsedTime() * 3 + i * 0.8) * 0.08;
        }
      });
    }
  });

  const lines = useMemo(() => {
    if (!satelliteWorldPos) return [];
    const result: THREE.Vector3[][] = [];
    for (let i = 0; i < 6; i++) {
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3
      );
      result.push([SUN_POS.clone(), satelliteWorldPos.clone().add(offset)]);
    }
    return result;
  }, [satelliteWorldPos]);

  if (!satelliteWorldPos) return null;

  return (
    <group ref={groupRef}>
      {lines.map((pts, i) => (
        <primitive
          key={i}
          object={new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(pts),
            new THREE.LineBasicMaterial({ color: '#FFD700', transparent: true, opacity: 0.15 })
          )}
        />
      ))}
    </group>
  );
}

/* ─── City Marker – only shows label for selected city ─── */
function CityMarker({ name, lat, lng, isTarget }: { name: string; lat: number; lng: number; isTarget: boolean }) {
  const pos = useMemo(() => latLngToVector3(lat, lng, 2.02), [lat, lng]);

  // Only render marker dot for non-target cities, full label for target
  if (!isTarget) {
    return (
      <group position={pos}>
        <mesh>
          <sphereGeometry args={[0.015, 8, 8]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.4} />
        </mesh>
      </group>
    );
  }

  return (
    <group position={pos}>
      <mesh>
        <sphereGeometry args={[0.04, 12, 12]} />
        <meshBasicMaterial color="#f59e0b" />
      </mesh>
      <PulsingRing />
      <Html distanceFactor={8} style={{ pointerEvents: 'none' }}>
        <div className="text-[10px] font-mono whitespace-nowrap px-1 py-0.5 rounded bg-amber-500/80 text-black font-bold">
          📍 {name}
        </div>
      </Html>
    </group>
  );
}

function PulsingRing() {
  const ringRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ringRef.current) {
      const s = 1 + Math.sin(clock.getElapsedTime() * 3) * 0.35;
      ringRef.current.scale.setScalar(s);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = 0.35 - Math.sin(clock.getElapsedTime() * 3) * 0.15;
    }
  });
  return (
    <mesh ref={ringRef}>
      <ringGeometry args={[0.05, 0.08, 32]} />
      <meshBasicMaterial color="#f59e0b" transparent opacity={0.3} side={THREE.DoubleSide} />
    </mesh>
  );
}

/* ─── Earth (local to EarthSystem group) ─── */
function Earth({ targetCity }: { targetCity: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const cloudRef = useRef<THREE.Mesh>(null);

  const [colorMap, bumpMap, specMap, emissiveMap] = useLoader(THREE.TextureLoader, [
    'https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg',
    'https://unpkg.com/three-globe@2.31.1/example/img/earth-topology.png',
    'https://unpkg.com/three-globe@2.31.1/example/img/earth-water.png',
    'https://unpkg.com/three-globe@2.31.1/example/img/earth-night.jpg',
  ]);

  useFrame((_, delta) => {
    // Earth's axial rotation
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.04;
    if (cloudRef.current) cloudRef.current.rotation.y += delta * 0.055;
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshPhongMaterial
          map={colorMap}
          bumpMap={bumpMap}
          bumpScale={0.04}
          specularMap={specMap}
          specular={new THREE.Color('#444444')}
          shininess={20}
          emissiveMap={emissiveMap}
          emissive={new THREE.Color('#0a1628')}
          emissiveIntensity={0.25}
        />
      </mesh>
      <mesh ref={cloudRef} scale={1.006}>
        <sphereGeometry args={[2, 48, 48]} />
        <meshPhongMaterial color="#ffffff" transparent opacity={0.06} depthWrite={false} />
      </mesh>
      {/* Atmosphere glow */}
      <mesh scale={1.025}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshBasicMaterial color="#4499ff" transparent opacity={0.08} side={THREE.BackSide} />
      </mesh>
      <mesh scale={1.05}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshBasicMaterial color="#2266cc" transparent opacity={0.04} side={THREE.BackSide} />
      </mesh>
      {/* City markers – only selected city shows label */}
      {CITY_MARKERS.map((city) => (
        <CityMarker key={city.name} name={city.name} lat={city.lat} lng={city.lng} isTarget={city.name === targetCity} />
      ))}
    </group>
  );
}

/* ─── Satellite Orbit Ring (local to Earth) ─── */
function SatelliteOrbitRing({ altitude, orbitType, locked }: { altitude: number; orbitType: string; locked: boolean }) {
  const scale = 2 + (altitude / 35786) * 2.5;
  const tilt = orbitType === 'SSO' ? Math.PI / 6 : orbitType === 'LEO' ? Math.PI / 12 : 0;
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (ringRef.current && locked) {
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = 0.35 + Math.sin(clock.getElapsedTime() * 2) * 0.15;
    }
  });

  return (
    <mesh ref={ringRef} rotation={[Math.PI / 2 + tilt, 0, 0]}>
      <ringGeometry args={[scale - 0.006, scale + 0.006, 256]} />
      <meshBasicMaterial
        color={locked ? '#f59e0b' : '#38bdf8'}
        transparent
        opacity={locked ? 0.4 : 0.15}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/* ─── Satellite (local to Earth) ─── */
function Satellite({
  altitude, orbitType, locked, targetCity, onLocalPositionUpdate,
}: {
  altitude: number; orbitType: string; locked: boolean; targetCity: string;
  onLocalPositionUpdate: (pos: THREE.Vector3) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const panelRef1 = useRef<THREE.Mesh>(null);
  const panelRef2 = useRef<THREE.Mesh>(null);
  const scale = 2 + (altitude / 35786) * 2.5;
  const tilt = orbitType === 'SSO' ? Math.PI / 6 : orbitType === 'LEO' ? Math.PI / 12 : 0;

  const lockedDir = useMemo(() => {
    if (!locked) return null;
    const coords = getCityCoords(targetCity);
    return latLngToVector3(coords.lat, coords.lng, 1).normalize();
  }, [locked, targetCity]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();

    if (locked && lockedDir) {
      // Satellite stays above target city at orbit altitude, slight hover
      const pos = lockedDir.clone().multiplyScalar(scale);
      groupRef.current.position.set(
        pos.x + Math.sin(t * 0.4) * 0.015,
        pos.y + Math.sin(t * 0.7) * 0.01,
        pos.z + Math.cos(t * 0.4) * 0.015
      );
    } else {
      const speed = orbitType === 'LEO' ? 0.5 : orbitType === 'MEO' ? 0.2 : 0.08;
      const angle = t * speed;
      groupRef.current.position.set(
        Math.cos(angle) * scale,
        Math.sin(angle) * scale * Math.sin(tilt),
        Math.sin(angle) * scale * Math.cos(tilt)
      );
    }

    groupRef.current.lookAt(0, 0, 0);

    const shimmer = 0.3 + Math.sin(t * 2.5) * 0.15;
    if (panelRef1.current) (panelRef1.current.material as THREE.MeshStandardMaterial).emissiveIntensity = shimmer;
    if (panelRef2.current) (panelRef2.current.material as THREE.MeshStandardMaterial).emissiveIntensity = shimmer;

    onLocalPositionUpdate(groupRef.current.position.clone());
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <boxGeometry args={[0.1, 0.05, 0.05]} />
        <meshStandardMaterial color="#d0d0d0" metalness={0.85} roughness={0.15} emissive="#4488cc" emissiveIntensity={0.15} />
      </mesh>
      <mesh ref={panelRef1} position={[0.16, 0, 0]}>
        <boxGeometry args={[0.2, 0.004, 0.12]} />
        <meshStandardMaterial color="#152d5a" metalness={0.5} roughness={0.25} emissive="#3b82f6" emissiveIntensity={0.3} />
      </mesh>
      <mesh ref={panelRef2} position={[-0.16, 0, 0]}>
        <boxGeometry args={[0.2, 0.004, 0.12]} />
        <meshStandardMaterial color="#152d5a" metalness={0.5} roughness={0.25} emissive="#3b82f6" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0, -0.045, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.025, 0.04, 12]} />
        <meshStandardMaterial color="#e0e0e0" metalness={0.7} roughness={0.3} />
      </mesh>
      <pointLight color={locked ? '#f59e0b' : '#38bdf8'} intensity={locked ? 5 : 2} distance={2} />
      {locked && (
        <Html distanceFactor={8} style={{ pointerEvents: 'none' }}>
          <div className="text-[9px] font-mono whitespace-nowrap px-1.5 py-0.5 rounded bg-amber-500/90 text-black font-bold shadow-lg">
            🔒 LOCKED
          </div>
        </Html>
      )}
    </group>
  );
}

/* ─── Beam Line (local to Earth system) ─── */
function BeamLine({ targetCity, satelliteLocalPos }: { targetCity: string; satelliteLocalPos: THREE.Vector3 | null }) {
  const result = useSimulationStore((s) => s.result);
  const lineRef = useRef<any>(null);
  const impactRef = useRef<THREE.Mesh>(null);

  const { points, groundPoint } = useMemo(() => {
    if (!result || !satelliteLocalPos) return { points: null, groundPoint: null };
    const coords = getCityCoords(targetCity);
    const gp = latLngToVector3(coords.lat, coords.lng, 2.01);
    const mid = gp.clone().add(satelliteLocalPos).multiplyScalar(0.5).multiplyScalar(1.015);
    const curve = new THREE.QuadraticBezierCurve3(satelliteLocalPos.clone(), mid, gp);
    return { points: curve.getPoints(60), groundPoint: gp };
  }, [result, targetCity, satelliteLocalPos]);

  useFrame(({ clock }) => {
    if (lineRef.current) lineRef.current.material.opacity = 0.5 + Math.sin(clock.getElapsedTime() * 4) * 0.3;
    if (impactRef.current) impactRef.current.scale.setScalar(1 + Math.sin(clock.getElapsedTime() * 5) * 0.4);
  });

  if (!points || !groundPoint) return null;

  return (
    <group>
      <primitive
        ref={lineRef}
        object={new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(points),
          new THREE.LineBasicMaterial({ color: '#f59e0b', transparent: true, opacity: 0.7 })
        )}
      />
      <mesh ref={impactRef} position={groundPoint}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.5} />
      </mesh>
      <mesh position={groundPoint}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.12} />
      </mesh>
    </group>
  );
}

/* ─── Earth System – orbits around the Sun ─── */
function EarthSystem() {
  const { input, result } = useSimulationStore();
  const earthSystemRef = useRef<THREE.Group>(null);
  const [satelliteLocalPos, setSatelliteLocalPos] = useState<THREE.Vector3 | null>(null);
  const [satelliteWorldPos, setSatelliteWorldPos] = useState<THREE.Vector3 | null>(null);
  const isLocked = !!result;

  const EARTH_ORBIT_RADIUS = 20;
  const EARTH_ORBIT_SPEED = 0.03; // slow orbital revolution
  const AXIAL_TILT = 23.4 * (Math.PI / 180); // Earth's real axial tilt

  useFrame(({ clock }) => {
    if (!earthSystemRef.current) return;
    const t = clock.getElapsedTime();
    const angle = t * EARTH_ORBIT_SPEED;

    // Earth orbits the Sun in the XZ plane
    earthSystemRef.current.position.set(
      Math.cos(angle) * EARTH_ORBIT_RADIUS,
      0,
      Math.sin(angle) * EARTH_ORBIT_RADIUS
    );

    // Compute satellite world position for solar rays
    if (satelliteLocalPos) {
      const worldPos = satelliteLocalPos.clone();
      earthSystemRef.current.localToWorld(worldPos);
      setSatelliteWorldPos(worldPos);
    }
  });

  return (
    <>
      {/* Solar rays in world space */}
      <SolarRays satelliteWorldPos={satelliteWorldPos} />

      <group ref={earthSystemRef}>
        {/* Axial tilt */}
        <group rotation={[AXIAL_TILT, 0, 0]}>
          <Earth targetCity={input.targetCity} />
          <SatelliteOrbitRing altitude={input.altitude} orbitType={input.orbitType} locked={isLocked} />
          <Satellite
            altitude={input.altitude}
            orbitType={input.orbitType}
            locked={isLocked}
            targetCity={input.targetCity}
            onLocalPositionUpdate={setSatelliteLocalPos}
          />
          <BeamLine targetCity={input.targetCity} satelliteLocalPos={isLocked ? satelliteLocalPos : null} />
        </group>
      </group>
    </>
  );
}

/* ─── Scene ─── */
function Scene() {
  return (
    <>
      <ambientLight intensity={0.06} color="#1a2a4a" />
      <Stars radius={400} depth={150} count={12000} factor={5} fade speed={0.3} />

      {/* Sun at center */}
      <Sun />
      <SunFlare />

      {/* Earth's orbital path */}
      <EarthOrbitPath />

      {/* Earth system orbiting the Sun */}
      <EarthSystem />

      <OrbitControls
        enablePan
        minDistance={4}
        maxDistance={60}
        autoRotate
        autoRotateSpeed={0.08}
        target={[20, 0, 0]} // initial focus on Earth's starting position
      />
    </>
  );
}

export default function EarthGlobe() {
  return (
    <div className="w-full h-full bg-background rounded-lg overflow-hidden">
      <Canvas camera={{ position: [25, 8, 15], fov: 45 }} gl={{ antialias: true, alpha: true }}>
        <Scene />
      </Canvas>
    </div>
  );
}
