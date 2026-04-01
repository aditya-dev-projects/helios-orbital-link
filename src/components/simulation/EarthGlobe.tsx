import { useRef, useMemo, useState, useEffect } from 'react';
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

/* ─── Sun ─── */
function Sun() {
  const sunRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const raysRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (sunRef.current) {
      sunRef.current.rotation.y = t * 0.02;
    }
    if (glowRef.current) {
      glowRef.current.scale.setScalar(1 + Math.sin(t * 2) * 0.05);
    }
    if (raysRef.current) {
      raysRef.current.rotation.z = t * 0.1;
    }
  });

  return (
    <group ref={sunRef} position={[25, 8, -20]}>
      {/* Core sun sphere */}
      <mesh>
        <sphereGeometry args={[2.5, 32, 32]} />
        <meshBasicMaterial color="#FDB813" />
      </mesh>
      {/* Inner glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[3.2, 32, 32]} />
        <meshBasicMaterial color="#FDB813" transparent opacity={0.3} />
      </mesh>
      {/* Outer glow */}
      <mesh>
        <sphereGeometry args={[4.5, 32, 32]} />
        <meshBasicMaterial color="#FF8C00" transparent opacity={0.08} />
      </mesh>
      {/* Corona rays */}
      <group ref={raysRef}>
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i / 12) * Math.PI * 2;
          return (
            <mesh key={i} rotation={[0, 0, angle]}>
              <planeGeometry args={[0.15, 7]} />
              <meshBasicMaterial color="#FDB813" transparent opacity={0.12} side={THREE.DoubleSide} />
            </mesh>
          );
        })}
      </group>
      {/* Sun point light illuminating the scene */}
      <pointLight color="#FFF5E0" intensity={80} distance={100} decay={2} />
    </group>
  );
}

/* ─── Solar Rays from Sun to Satellite ─── */
function SolarRays({ satellitePos }: { satellitePos: THREE.Vector3 | null }) {
  const raysRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (raysRef.current) {
      raysRef.current.children.forEach((child, i) => {
        const mat = (child as THREE.Line).material as THREE.LineBasicMaterial;
        if (mat) {
          mat.opacity = 0.15 + Math.sin(clock.getElapsedTime() * 4 + i) * 0.1;
        }
      });
    }
  });

  const lines = useMemo(() => {
    if (!satellitePos) return [];
    const sunPos = new THREE.Vector3(25, 8, -20);
    const result: THREE.Vector3[][] = [];
    for (let i = 0; i < 5; i++) {
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3
      );
      const target = satellitePos.clone().add(offset);
      result.push([sunPos.clone(), target]);
    }
    return result;
  }, [satellitePos]);

  if (!satellitePos) return null;

  return (
    <group ref={raysRef}>
      {lines.map((pts, i) => (
        <primitive
          key={i}
          object={new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(pts),
            new THREE.LineBasicMaterial({ color: '#FDB813', transparent: true, opacity: 0.2 })
          )}
        />
      ))}
    </group>
  );
}

/* ─── City Marker ─── */
function CityMarker({ name, lat, lng, isTarget }: { name: string; lat: number; lng: number; isTarget: boolean }) {
  const pos = useMemo(() => latLngToVector3(lat, lng, 2.02), [lat, lng]);

  return (
    <group position={pos}>
      <mesh>
        <sphereGeometry args={[isTarget ? 0.04 : 0.025, 12, 12]} />
        <meshBasicMaterial color={isTarget ? '#f59e0b' : '#38bdf8'} />
      </mesh>
      {isTarget && (
        <>
          <mesh>
            <sphereGeometry args={[0.07, 12, 12]} />
            <meshBasicMaterial color="#f59e0b" transparent opacity={0.25} />
          </mesh>
          {/* Pulsing ring on target */}
          <PulsingRing position={pos} />
        </>
      )}
      <Html distanceFactor={8} style={{ pointerEvents: 'none' }}>
        <div className={`text-[10px] font-mono whitespace-nowrap px-1 py-0.5 rounded ${isTarget ? 'bg-amber-500/80 text-black font-bold' : 'bg-sky-900/70 text-sky-300'}`}>
          {name}
        </div>
      </Html>
    </group>
  );
}

function PulsingRing({ position }: { position: THREE.Vector3 }) {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (ringRef.current) {
      const s = 1 + Math.sin(clock.getElapsedTime() * 3) * 0.3;
      ringRef.current.scale.setScalar(s);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = 0.4 - Math.sin(clock.getElapsedTime() * 3) * 0.2;
    }
  });

  return (
    <mesh ref={ringRef} position={[0, 0, 0]}>
      <ringGeometry args={[0.06, 0.09, 32]} />
      <meshBasicMaterial color="#f59e0b" transparent opacity={0.3} side={THREE.DoubleSide} />
    </mesh>
  );
}

/* ─── Earth ─── */
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
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.03;
    if (cloudRef.current) cloudRef.current.rotation.y += delta * 0.04;
  });

  return (
    <group>
      {/* Earth */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshPhongMaterial
          map={colorMap}
          bumpMap={bumpMap}
          bumpScale={0.03}
          specularMap={specMap}
          specular={new THREE.Color('#222222')}
          emissiveMap={emissiveMap}
          emissive={new THREE.Color('#112244')}
          emissiveIntensity={0.15}
        />
      </mesh>
      {/* Cloud layer */}
      <mesh ref={cloudRef} scale={1.008}>
        <sphereGeometry args={[2, 48, 48]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.06} />
      </mesh>
      {/* Atmosphere glow */}
      <mesh scale={1.03}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshStandardMaterial color="#4488ff" transparent opacity={0.06} side={THREE.BackSide} />
      </mesh>
      {/* City markers */}
      {CITY_MARKERS.map((city) => (
        <CityMarker key={city.name} name={city.name} lat={city.lat} lng={city.lng} isTarget={city.name === targetCity} />
      ))}
    </group>
  );
}

/* ─── Orbit Ring ─── */
function OrbitRing({ altitude, orbitType, locked }: { altitude: number; orbitType: string; locked: boolean }) {
  const scale = 2 + (altitude / 35786) * 2.5;
  const tilt = orbitType === 'SSO' ? Math.PI / 6 : orbitType === 'LEO' ? Math.PI / 12 : 0;

  return (
    <mesh rotation={[Math.PI / 2 + tilt, 0, 0]}>
      <ringGeometry args={[scale - 0.008, scale + 0.008, 256]} />
      <meshBasicMaterial
        color={locked ? '#f59e0b' : '#38bdf8'}
        transparent
        opacity={locked ? 0.5 : 0.2}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/* ─── Satellite ─── */
function Satellite({
  altitude,
  orbitType,
  locked,
  targetCity,
  onPositionUpdate,
}: {
  altitude: number;
  orbitType: string;
  locked: boolean;
  targetCity: string;
  onPositionUpdate: (pos: THREE.Vector3) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const panelRef1 = useRef<THREE.Mesh>(null);
  const panelRef2 = useRef<THREE.Mesh>(null);
  const scale = 2 + (altitude / 35786) * 2.5;
  const tilt = orbitType === 'SSO' ? Math.PI / 6 : orbitType === 'LEO' ? Math.PI / 12 : 0;

  const lockedPos = useMemo(() => {
    if (!locked) return null;
    const coords = getCityCoords(targetCity);
    const dir = latLngToVector3(coords.lat, coords.lng, 1).normalize();
    return dir.multiplyScalar(scale);
  }, [locked, targetCity, scale]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();

    if (locked && lockedPos) {
      // Hover in place above target city with slight oscillation
      groupRef.current.position.x = lockedPos.x + Math.sin(t * 0.5) * 0.02;
      groupRef.current.position.y = lockedPos.y + Math.sin(t * 0.8) * 0.015;
      groupRef.current.position.z = lockedPos.z + Math.cos(t * 0.5) * 0.02;
    } else {
      const speed = orbitType === 'LEO' ? 0.5 : orbitType === 'MEO' ? 0.2 : 0.08;
      const angle = t * speed;
      groupRef.current.position.x = Math.cos(angle) * scale;
      groupRef.current.position.z = Math.sin(angle) * scale * Math.cos(tilt);
      groupRef.current.position.y = Math.sin(angle) * scale * Math.sin(tilt);
    }

    // Solar panel shimmer
    if (panelRef1.current) {
      (panelRef1.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3 + Math.sin(t * 3) * 0.2;
    }
    if (panelRef2.current) {
      (panelRef2.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3 + Math.sin(t * 3 + 1) * 0.2;
    }

    onPositionUpdate(groupRef.current.position.clone());
  });

  return (
    <group ref={groupRef}>
      {/* Satellite body */}
      <mesh>
        <boxGeometry args={[0.1, 0.05, 0.05]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.8} roughness={0.2} emissive="#60a5fa" emissiveIntensity={0.3} />
      </mesh>
      {/* Solar panel left */}
      <mesh ref={panelRef1} position={[0.15, 0, 0]}>
        <boxGeometry args={[0.18, 0.005, 0.1]} />
        <meshStandardMaterial color="#1e3a6e" metalness={0.6} roughness={0.3} emissive="#3b82f6" emissiveIntensity={0.3} />
      </mesh>
      {/* Solar panel right */}
      <mesh ref={panelRef2} position={[-0.15, 0, 0]}>
        <boxGeometry args={[0.18, 0.005, 0.1]} />
        <meshStandardMaterial color="#1e3a6e" metalness={0.6} roughness={0.3} emissive="#3b82f6" emissiveIntensity={0.3} />
      </mesh>
      {/* Antenna dish pointing down */}
      <mesh position={[0, -0.04, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.03, 0.04, 12]} />
        <meshStandardMaterial color="#e0e0e0" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Satellite light */}
      <pointLight color={locked ? '#f59e0b' : '#38bdf8'} intensity={locked ? 4 : 2} distance={2} />
      {/* Label */}
      {locked && (
        <Html distanceFactor={8} style={{ pointerEvents: 'none' }}>
          <div className="text-[9px] font-mono whitespace-nowrap px-1 py-0.5 rounded bg-amber-500/90 text-black font-bold">
            🔒 LOCKED
          </div>
        </Html>
      )}
    </group>
  );
}

/* ─── Beam Line (satellite → city) ─── */
function BeamLine({ targetCity, satellitePos }: { targetCity: string; satellitePos: THREE.Vector3 | null }) {
  const result = useSimulationStore((s) => s.result);
  const lineRef = useRef<any>(null);
  const impactRef = useRef<THREE.Mesh>(null);

  const { points, groundPoint } = useMemo(() => {
    if (!result || !satellitePos) return { points: null, groundPoint: null };
    const coords = getCityCoords(targetCity);
    const gp = latLngToVector3(coords.lat, coords.lng, 2.01);
    const midPoint = gp.clone().add(satellitePos).multiplyScalar(0.5);
    midPoint.multiplyScalar(1.02);
    const curve = new THREE.QuadraticBezierCurve3(satellitePos.clone(), midPoint, gp);
    return { points: curve.getPoints(60), groundPoint: gp };
  }, [result, targetCity, satellitePos]);

  useFrame(({ clock }) => {
    if (lineRef.current) {
      lineRef.current.material.opacity = 0.5 + Math.sin(clock.getElapsedTime() * 4) * 0.3;
    }
    if (impactRef.current) {
      const s = 1 + Math.sin(clock.getElapsedTime() * 5) * 0.4;
      impactRef.current.scale.setScalar(s);
    }
  });

  if (!points || !groundPoint) return null;

  return (
    <group>
      <primitive
        ref={lineRef}
        object={new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(points),
          new THREE.LineBasicMaterial({ color: '#f59e0b', transparent: true, opacity: 0.7, linewidth: 2 })
        )}
      />
      {/* Impact glow at ground */}
      <mesh ref={impactRef} position={groundPoint}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.4} />
      </mesh>
      <mesh position={groundPoint}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.1} />
      </mesh>
    </group>
  );
}

/* ─── Scene (orchestrator) ─── */
function Scene() {
  const { input, result } = useSimulationStore();
  const [satellitePos, setSatellitePos] = useState<THREE.Vector3 | null>(null);
  const isLocked = !!result;

  return (
    <>
      <ambientLight intensity={0.15} />
      <directionalLight position={[25, 8, -20]} intensity={0.8} color="#FFF5E0" />
      <pointLight position={[-10, -5, -10]} intensity={0.1} color="#38bdf8" />

      <Stars radius={200} depth={80} count={8000} factor={4} fade speed={0.5} />
      <Sun />

      <Earth targetCity={input.targetCity} />
      <OrbitRing altitude={input.altitude} orbitType={input.orbitType} locked={isLocked} />
      <Satellite
        altitude={input.altitude}
        orbitType={input.orbitType}
        locked={isLocked}
        targetCity={input.targetCity}
        onPositionUpdate={setSatellitePos}
      />
      <SolarRays satellitePos={satellitePos} />
      <BeamLine targetCity={input.targetCity} satellitePos={isLocked ? satellitePos : null} />

      <OrbitControls enablePan={false} minDistance={4} maxDistance={15} autoRotate autoRotateSpeed={0.2} />
    </>
  );
}

export default function EarthGlobe() {
  return (
    <div className="w-full h-full bg-background rounded-lg overflow-hidden">
      <Canvas camera={{ position: [0, 2, 7], fov: 45 }} gl={{ antialias: true, alpha: true }}>
        <Scene />
      </Canvas>
    </div>
  );
}
