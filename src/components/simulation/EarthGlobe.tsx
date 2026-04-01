import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, useLoader, extend } from '@react-three/fiber';
import { OrbitControls, Stars, Html, Sphere } from '@react-three/drei';
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

const SUN_POS = new THREE.Vector3(30, 6, -25);

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

    // Radial gradient for sun surface
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

    // Add some surface noise/spots
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
      {/* Core sun sphere with procedural texture */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[4, 64, 64]} />
        <meshBasicMaterial map={sunTexture} />
      </mesh>

      {/* Inner hot glow */}
      <mesh ref={glow1Ref}>
        <sphereGeometry args={[4.4, 48, 48]} />
        <meshBasicMaterial color="#FFD700" transparent opacity={0.35} />
      </mesh>

      {/* Mid corona glow */}
      <mesh ref={glow2Ref}>
        <sphereGeometry args={[5.5, 48, 48]} />
        <meshBasicMaterial color="#FFA500" transparent opacity={0.15} />
      </mesh>

      {/* Outer corona */}
      <mesh ref={glow3Ref}>
        <sphereGeometry args={[7, 48, 48]} />
        <meshBasicMaterial color="#FF8C00" transparent opacity={0.06} />
      </mesh>

      {/* Faint outermost halo */}
      <mesh>
        <sphereGeometry args={[9, 32, 32]} />
        <meshBasicMaterial color="#FF6600" transparent opacity={0.025} />
      </mesh>

      {/* Corona rays */}
      <group ref={coronaRef}>
        {Array.from({ length: 20 }).map((_, i) => {
          const angle = (i / 20) * Math.PI * 2;
          const len = 5 + Math.random() * 4;
          return (
            <mesh key={i} rotation={[0, 0, angle]} position={[0, 0, 0]}>
              <planeGeometry args={[0.12, len]} />
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

      {/* Sun light – main scene illumination */}
      <pointLight color="#FFF5E0" intensity={150} distance={120} decay={2} />
    </group>
  );
}

/* ─── Solar Rays from Sun to Satellite ─── */
function SolarRays({ satellitePos }: { satellitePos: THREE.Vector3 | null }) {
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
    if (!satellitePos) return [];
    const result: THREE.Vector3[][] = [];
    for (let i = 0; i < 6; i++) {
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2
      );
      result.push([SUN_POS.clone(), satellitePos.clone().add(offset)]);
    }
    return result;
  }, [satellitePos]);

  if (!satellitePos) return null;

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

/* ─── City Marker ─── */
function CityMarker({ name, lat, lng, isTarget }: { name: string; lat: number; lng: number; isTarget: boolean }) {
  const pos = useMemo(() => latLngToVector3(lat, lng, 2.02), [lat, lng]);

  return (
    <group position={pos}>
      <mesh>
        <sphereGeometry args={[isTarget ? 0.04 : 0.02, 12, 12]} />
        <meshBasicMaterial color={isTarget ? '#f59e0b' : '#38bdf8'} />
      </mesh>
      {isTarget && (
        <PulsingRing />
      )}
      <Html distanceFactor={8} style={{ pointerEvents: 'none' }}>
        <div className={`text-[10px] font-mono whitespace-nowrap px-1 py-0.5 rounded ${isTarget ? 'bg-amber-500/80 text-black font-bold' : 'bg-sky-900/70 text-sky-300'}`}>
          {name}
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
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.025;
    if (cloudRef.current) cloudRef.current.rotation.y += delta * 0.035;
  });

  return (
    <group>
      {/* Earth */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshPhongMaterial
          map={colorMap}
          bumpMap={bumpMap}
          bumpScale={0.04}
          specularMap={specMap}
          specular={new THREE.Color('#333333')}
          shininess={15}
          emissiveMap={emissiveMap}
          emissive={new THREE.Color('#0a1628')}
          emissiveIntensity={0.2}
        />
      </mesh>
      {/* Cloud layer */}
      <mesh ref={cloudRef} scale={1.006}>
        <sphereGeometry args={[2, 48, 48]} />
        <meshPhongMaterial color="#ffffff" transparent opacity={0.05} depthWrite={false} />
      </mesh>
      {/* Atmosphere – bright blue rim lit by sun */}
      <mesh scale={1.025}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshBasicMaterial color="#4499ff" transparent opacity={0.07} side={THREE.BackSide} />
      </mesh>
      {/* Second atmosphere layer for depth */}
      <mesh scale={1.05}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshBasicMaterial color="#2266cc" transparent opacity={0.03} side={THREE.BackSide} />
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

/* ─── Satellite ─── */
function Satellite({
  altitude, orbitType, locked, targetCity, onPositionUpdate,
}: {
  altitude: number; orbitType: string; locked: boolean; targetCity: string;
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
    return latLngToVector3(coords.lat, coords.lng, 1).normalize().multiplyScalar(scale);
  }, [locked, targetCity, scale]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();

    if (locked && lockedPos) {
      groupRef.current.position.set(
        lockedPos.x + Math.sin(t * 0.4) * 0.015,
        lockedPos.y + Math.sin(t * 0.7) * 0.01,
        lockedPos.z + Math.cos(t * 0.4) * 0.015
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

    // Orient satellite to face Earth
    groupRef.current.lookAt(0, 0, 0);

    // Panel shimmer from sunlight
    const shimmer = 0.3 + Math.sin(t * 2.5) * 0.15;
    if (panelRef1.current) (panelRef1.current.material as THREE.MeshStandardMaterial).emissiveIntensity = shimmer;
    if (panelRef2.current) (panelRef2.current.material as THREE.MeshStandardMaterial).emissiveIntensity = shimmer;

    onPositionUpdate(groupRef.current.position.clone());
  });

  return (
    <group ref={groupRef}>
      {/* Body */}
      <mesh>
        <boxGeometry args={[0.1, 0.05, 0.05]} />
        <meshStandardMaterial color="#d0d0d0" metalness={0.85} roughness={0.15} emissive="#4488cc" emissiveIntensity={0.15} />
      </mesh>
      {/* Solar panels */}
      <mesh ref={panelRef1} position={[0.16, 0, 0]}>
        <boxGeometry args={[0.2, 0.004, 0.12]} />
        <meshStandardMaterial color="#152d5a" metalness={0.5} roughness={0.25} emissive="#3b82f6" emissiveIntensity={0.3} />
      </mesh>
      <mesh ref={panelRef2} position={[-0.16, 0, 0]}>
        <boxGeometry args={[0.2, 0.004, 0.12]} />
        <meshStandardMaterial color="#152d5a" metalness={0.5} roughness={0.25} emissive="#3b82f6" emissiveIntensity={0.3} />
      </mesh>
      {/* Antenna */}
      <mesh position={[0, -0.045, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.025, 0.04, 12]} />
        <meshStandardMaterial color="#e0e0e0" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Light */}
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

/* ─── Beam Line ─── */
function BeamLine({ targetCity, satellitePos }: { targetCity: string; satellitePos: THREE.Vector3 | null }) {
  const result = useSimulationStore((s) => s.result);
  const lineRef = useRef<any>(null);
  const impactRef = useRef<THREE.Mesh>(null);

  const { points, groundPoint } = useMemo(() => {
    if (!result || !satellitePos) return { points: null, groundPoint: null };
    const coords = getCityCoords(targetCity);
    const gp = latLngToVector3(coords.lat, coords.lng, 2.01);
    const mid = gp.clone().add(satellitePos).multiplyScalar(0.5).multiplyScalar(1.015);
    const curve = new THREE.QuadraticBezierCurve3(satellitePos.clone(), mid, gp);
    return { points: curve.getPoints(60), groundPoint: gp };
  }, [result, targetCity, satellitePos]);

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

/* ─── Sun Lens Flare (billboard sprite) ─── */
function SunFlare() {
  const spriteRef = useRef<THREE.Sprite>(null);
  useFrame(({ clock }) => {
    if (spriteRef.current) {
      const s = 12 + Math.sin(clock.getElapsedTime() * 1.5) * 1;
      spriteRef.current.scale.set(s, s, 1);
    }
  });
  return (
    <sprite ref={spriteRef} position={SUN_POS}>
      <spriteMaterial color="#FFF8DC" transparent opacity={0.04} />
    </sprite>
  );
}

/* ─── Scene ─── */
function Scene() {
  const { input, result } = useSimulationStore();
  const [satellitePos, setSatellitePos] = useState<THREE.Vector3 | null>(null);
  const isLocked = !!result;

  return (
    <>
      {/* Very dim ambient – let the sun be the main light source */}
      <ambientLight intensity={0.08} color="#1a2a4a" />

      {/* Deep space stars */}
      <Stars radius={300} depth={100} count={10000} factor={5} fade speed={0.3} />

      {/* Sun and flare */}
      <Sun />
      <SunFlare />

      {/* Earth system */}
      <Earth targetCity={input.targetCity} />
      <OrbitRing altitude={input.altitude} orbitType={input.orbitType} locked={isLocked} />
      <Satellite
        altitude={input.altitude}
        orbitType={input.orbitType}
        locked={isLocked}
        targetCity={input.targetCity}
        onPositionUpdate={setSatellitePos}
      />

      {/* Energy flow visuals */}
      <SolarRays satellitePos={satellitePos} />
      <BeamLine targetCity={input.targetCity} satellitePos={isLocked ? satellitePos : null} />

      <OrbitControls enablePan={false} minDistance={3.5} maxDistance={18} autoRotate autoRotateSpeed={0.15} />
    </>
  );
}

export default function EarthGlobe() {
  return (
    <div className="w-full h-full bg-background rounded-lg overflow-hidden">
      <Canvas camera={{ position: [0, 2.5, 7], fov: 45 }} gl={{ antialias: true, alpha: true }}>
        <Scene />
      </Canvas>
    </div>
  );
}
