import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useSimulationStore } from '@/store/simulationStore';
import { getCityCoords } from '@/lib/simulation';

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function Earth() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.05;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[2, 64, 64]} />
      <meshStandardMaterial
        color="#1a3a5c"
        emissive="#0a1628"
        emissiveIntensity={0.3}
        roughness={0.8}
        metalness={0.2}
        wireframe={false}
      />
      {/* Atmosphere glow */}
      <mesh scale={1.02}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshStandardMaterial
          color="#3b82f6"
          transparent
          opacity={0.08}
          side={THREE.BackSide}
        />
      </mesh>
      {/* Grid lines on Earth */}
      <mesh>
        <sphereGeometry args={[2.005, 32, 32]} />
        <meshBasicMaterial color="#1e90ff" wireframe transparent opacity={0.1} />
      </mesh>
    </mesh>
  );
}

function OrbitRing({ altitude, orbitType }: { altitude: number; orbitType: string }) {
  const ringRef = useRef<THREE.Mesh>(null);
  const scale = 2 + (altitude / 35786) * 2.5;

  const tilt = orbitType === 'SSO' ? Math.PI / 6 :
    orbitType === 'LEO' ? Math.PI / 12 : 0;

  return (
    <mesh ref={ringRef} rotation={[Math.PI / 2 + tilt, 0, 0]}>
      <ringGeometry args={[scale - 0.01, scale + 0.01, 128]} />
      <meshBasicMaterial color="#38bdf8" transparent opacity={0.3} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Satellite({ altitude, orbitType }: { altitude: number; orbitType: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const scale = 2 + (altitude / 35786) * 2.5;
  const tilt = orbitType === 'SSO' ? Math.PI / 6 :
    orbitType === 'LEO' ? Math.PI / 12 : 0;

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
      {/* Satellite body */}
      <mesh>
        <boxGeometry args={[0.08, 0.04, 0.04]} />
        <meshStandardMaterial color="#e0e0e0" emissive="#60a5fa" emissiveIntensity={0.5} />
      </mesh>
      {/* Solar panels */}
      <mesh position={[0.12, 0, 0]}>
        <boxGeometry args={[0.15, 0.005, 0.08]} />
        <meshStandardMaterial color="#1e40af" emissive="#3b82f6" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[-0.12, 0, 0]}>
        <boxGeometry args={[0.15, 0.005, 0.08]} />
        <meshStandardMaterial color="#1e40af" emissive="#3b82f6" emissiveIntensity={0.3} />
      </mesh>
      {/* Glow */}
      <pointLight color="#38bdf8" intensity={2} distance={1} />
    </group>
  );
}

function BeamLine({ targetCity, altitude }: { targetCity: string; altitude: number }) {
  const result = useSimulationStore((s) => s.result);
  const beamRef = useRef<THREE.Line>(null);

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

  const lineRef = useRef<any>(null);

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
      {/* Target point glow */}
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
        <ambientLight intensity={0.15} />
        <directionalLight position={[5, 3, 5]} intensity={1.2} color="#fffaf0" />
        <pointLight position={[-5, -3, -5]} intensity={0.3} color="#38bdf8" />

        <Stars radius={100} depth={50} count={5000} factor={4} fade speed={1} />

        <Earth />
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
