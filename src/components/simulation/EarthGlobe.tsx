import { useRef, useMemo } from 'react';
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

function CityMarker({ name, lat, lng, isTarget }: { name: string; lat: number; lng: number; isTarget: boolean }) {
  const pos = useMemo(() => latLngToVector3(lat, lng, 2.02), [lat, lng]);

  return (
    <group position={pos}>
      <mesh>
        <sphereGeometry args={[isTarget ? 0.04 : 0.025, 12, 12]} />
        <meshBasicMaterial color={isTarget ? '#f59e0b' : '#38bdf8'} />
      </mesh>
      {isTarget && (
        <mesh>
          <sphereGeometry args={[0.07, 12, 12]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.25} />
        </mesh>
      )}
      <Html distanceFactor={8} style={{ pointerEvents: 'none' }}>
        <div className={`text-[10px] font-mono whitespace-nowrap px-1 py-0.5 rounded ${isTarget ? 'bg-amber-500/80 text-black font-bold' : 'bg-sky-900/70 text-sky-300'}`}>
          {name}
        </div>
      </Html>
    </group>
  );
}

function Earth({ targetCity }: { targetCity: string }) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Load Earth textures from public CDN
  const [colorMap, bumpMap, specMap, emissiveMap] = useLoader(THREE.TextureLoader, [
    'https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg',
    'https://unpkg.com/three-globe@2.31.1/example/img/earth-topology.png',
    'https://unpkg.com/three-globe@2.31.1/example/img/earth-water.png',
    'https://unpkg.com/three-globe@2.31.1/example/img/earth-night.jpg',
  ]);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.05;
    }
  });

  return (
    <group>
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
      {/* Atmosphere glow */}
      <mesh scale={1.025}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshStandardMaterial
          color="#4488ff"
          transparent
          opacity={0.07}
          side={THREE.BackSide}
        />
      </mesh>
      {/* City markers */}
      {CITY_MARKERS.map((city) => (
        <CityMarker
          key={city.name}
          name={city.name}
          lat={city.lat}
          lng={city.lng}
          isTarget={city.name === targetCity}
        />
      ))}
    </group>
  );
}

function OrbitRing({ altitude, orbitType }: { altitude: number; orbitType: string }) {
  const scale = 2 + (altitude / 35786) * 2.5;
  const tilt = orbitType === 'SSO' ? Math.PI / 6 : orbitType === 'LEO' ? Math.PI / 12 : 0;

  return (
    <mesh rotation={[Math.PI / 2 + tilt, 0, 0]}>
      <ringGeometry args={[scale - 0.01, scale + 0.01, 128]} />
      <meshBasicMaterial color="#38bdf8" transparent opacity={0.3} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Satellite({ altitude, orbitType }: { altitude: number; orbitType: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const scale = 2 + (altitude / 35786) * 2.5;
  const tilt = orbitType === 'SSO' ? Math.PI / 6 : orbitType === 'LEO' ? Math.PI / 12 : 0;

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const speed = orbitType === 'LEO' ? 0.5 : orbitType === 'MEO' ? 0.2 : 0.08;
      const t = clock.getElapsedTime() * speed;
      groupRef.current.position.x = Math.cos(t) * scale;
      groupRef.current.position.z = Math.sin(t) * scale * Math.cos(tilt);
      groupRef.current.position.y = Math.sin(t) * scale * Math.sin(tilt);
    }
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <boxGeometry args={[0.08, 0.04, 0.04]} />
        <meshStandardMaterial color="#e0e0e0" emissive="#60a5fa" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0.12, 0, 0]}>
        <boxGeometry args={[0.15, 0.005, 0.08]} />
        <meshStandardMaterial color="#1e40af" emissive="#3b82f6" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[-0.12, 0, 0]}>
        <boxGeometry args={[0.15, 0.005, 0.08]} />
        <meshStandardMaterial color="#1e40af" emissive="#3b82f6" emissiveIntensity={0.3} />
      </mesh>
      <pointLight color="#38bdf8" intensity={2} distance={1} />
    </group>
  );
}

function BeamLine({ targetCity, altitude }: { targetCity: string; altitude: number }) {
  const result = useSimulationStore((s) => s.result);
  const lineRef = useRef<any>(null);

  const points = useMemo(() => {
    if (!result) return null;
    const coords = getCityCoords(targetCity);
    const groundPoint = latLngToVector3(coords.lat, coords.lng, 2.01);
    const satHeight = 2 + (altitude / 35786) * 2.5;
    const satPoint = groundPoint.clone().normalize().multiplyScalar(satHeight);
    const midPoint = groundPoint.clone().add(satPoint).multiplyScalar(0.5);
    midPoint.multiplyScalar(1.05);
    const curve = new THREE.QuadraticBezierCurve3(satPoint, midPoint, groundPoint);
    return curve.getPoints(50);
  }, [result, targetCity, altitude]);

  useFrame(({ clock }) => {
    if (lineRef.current) {
      lineRef.current.material.opacity = 0.4 + Math.sin(clock.getElapsedTime() * 3) * 0.3;
    }
  });

  if (!points) return null;

  return (
    <group>
      <primitive
        ref={lineRef}
        object={new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(points),
          new THREE.LineBasicMaterial({ color: '#f59e0b', transparent: true, opacity: 0.7 })
        )}
      />
      <mesh position={points[points.length - 1]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.8} />
      </mesh>
      <mesh position={points[points.length - 1]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.2} />
      </mesh>
    </group>
  );
}

export default function EarthGlobe() {
  const { input } = useSimulationStore();

  return (
    <div className="w-full h-full bg-background rounded-lg overflow-hidden">
      <Canvas
        camera={{ position: [0, 2, 6], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 3, 5]} intensity={1.5} color="#fffaf0" />
        <pointLight position={[-5, -3, -5]} intensity={0.3} color="#38bdf8" />

        <Stars radius={100} depth={50} count={5000} factor={4} fade speed={1} />

        <Earth targetCity={input.targetCity} />
        <OrbitRing altitude={input.altitude} orbitType={input.orbitType} />
        <Satellite altitude={input.altitude} orbitType={input.orbitType} />
        <BeamLine targetCity={input.targetCity} altitude={input.altitude} />

        <OrbitControls
          enablePan={false}
          minDistance={4}
          maxDistance={12}
          autoRotate
          autoRotateSpeed={0.3}
        />
      </Canvas>
    </div>
  );
}
