'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, MeshTransmissionMaterial, Grid, Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { ThermoState } from '@/utils/thermodynamics/properties';
import { SystemInputs } from '@/utils/thermodynamics/balances';
import type { RankineOutputs } from '@/utils/thermodynamics/rankine';
import { Eye, RotateCcw } from 'lucide-react';

interface CanvasProps {
  outletState: ThermoState;
  inletTemp: number;
  inputs: SystemInputs;
  rankineOutputs?: RankineOutputs;
}

const TUBE_LENGTH = 12;
const TUBE_RADIUS = 0.18;
const GLASS_RADIUS = 0.32;
const MIRROR_COUNT = 11;
const MIRROR_SPACING = 1.4;
const MIRROR_WIDTH = 1.1;

// ─── Parabolic Mirror Geometry (Procedural) ───
function createParabolicGeometry(width: number, depth: number, segments: number): THREE.BufferGeometry {
  const vertices: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const lengthSegments = 6;

  for (let j = 0; j <= lengthSegments; j++) {
    const v = j / lengthSegments;
    const z = (v - 0.5) * TUBE_LENGTH;
    for (let i = 0; i <= segments; i++) {
      const u = i / segments;
      const x = (u - 0.5) * width;
      const y = -(x * x) / (4 * depth);
      vertices.push(x, y, z);
      const dx = 1;
      const dy = -x / (2 * depth);
      const normal = new THREE.Vector3(-dy, dx, 0).normalize();
      normals.push(normal.x, normal.y, normal.z);
      uvs.push(u, v);
    }
  }
  for (let j = 0; j < lengthSegments; j++) {
    for (let i = 0; i < segments; i++) {
      const a = j * (segments + 1) + i;
      const b = a + 1;
      const c = a + (segments + 1);
      const d = c + 1;
      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}

// ─── Sun Light Rays ───
function SunRays({ dni, mirrorPositions }: { dni: number; mirrorPositions: number[] }) {
  const groupRef = useRef<THREE.Group>(null);
  const intensity = Math.min(1, dni / 1000);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child) => {
        if (child instanceof THREE.Mesh) {
          const mat = child.material as THREE.MeshBasicMaterial;
          mat.opacity = 0.06 + Math.sin(state.clock.elapsedTime * 2 + child.position.x * 3) * 0.03;
        }
      });
    }
  });

  if (intensity < 0.05) return null;

  return (
    <group ref={groupRef}>
      {mirrorPositions.map((xPos, idx) => {
        const dist = Math.sqrt(xPos * xPos + 2.25);
        const angle = Math.atan2(1.5, -xPos);
        return (
          <group key={`ray-${idx}`}>
            {/* Incoming sunlight */}
            <mesh position={[xPos, 3, 0]}>
              <planeGeometry args={[0.05, 6]} />
              <meshBasicMaterial
                color={new THREE.Color().setHSL(0.13, 1, 0.7)}
                transparent
                opacity={0.05 * intensity}
                side={THREE.DoubleSide}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
            {/* Reflected ray to receiver */}
            <mesh
              position={[xPos * 0.5, -0.75 + Math.abs(xPos) * 0.05, 0]}
              rotation={[0, 0, angle - Math.PI / 2]}
            >
              <planeGeometry args={[0.035, dist]} />
              <meshBasicMaterial
                color={new THREE.Color().setHSL(0.08, 1, 0.8)}
                transparent
                opacity={0.08 * intensity}
                side={THREE.DoubleSide}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// ─── Mirror Support Structure ───
function MirrorSupport({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, -0.5, 0]}>
        <boxGeometry args={[0.05, 1.0, 0.05]} />
        <meshStandardMaterial color="#555" metalness={0.9} roughness={0.3} />
      </mesh>
      <mesh position={[0, -1.0, 0]}>
        <boxGeometry args={[0.25, 0.03, 0.25]} />
        <meshStandardMaterial color="#444" metalness={0.8} roughness={0.4} />
      </mesh>
    </group>
  );
}

// ─── Parabolic Mirror Field ───
function ParabolicMirrorField({ dni }: { dni: number }) {
  const mirrorsRef = useRef<THREE.Group>(null);
  const parabolicGeom = useMemo(() => createParabolicGeometry(MIRROR_WIDTH, 0.3, 20), []);

  const mirrorPositions = useMemo(() => {
    const positions: number[] = [];
    for (let i = 0; i < MIRROR_COUNT; i++) {
      positions.push((i - (MIRROR_COUNT - 1) / 2) * MIRROR_SPACING);
    }
    return positions;
  }, []);

  useFrame((state) => {
    if (mirrorsRef.current) {
      mirrorsRef.current.children.forEach((child, idx) => {
        if (child instanceof THREE.Group) {
          const targetAngle = Math.atan2(1, mirrorPositions[idx]) * 0.12;
          child.rotation.z = THREE.MathUtils.lerp(
            child.rotation.z,
            targetAngle + Math.sin(state.clock.elapsedTime * 0.2 + idx * 0.4) * 0.008,
            0.015
          );
        }
      });
    }
  });

  return (
    <group ref={mirrorsRef} position={[0, -1.5, 0]}>
      {mirrorPositions.map((xPos, idx) => (
        <group key={`mirror-${idx}`} position={[xPos, 0, 0]}>
          <mesh geometry={parabolicGeom} rotation={[Math.PI / 2, 0, 0]}>
            <meshStandardMaterial
              color="#dde4ed"
              metalness={1}
              roughness={0.02}
              envMapIntensity={2.5}
              side={THREE.DoubleSide}
            />
          </mesh>
          <MirrorSupport position={[0, 0, TUBE_LENGTH * 0.38]} />
          <MirrorSupport position={[0, 0, -TUBE_LENGTH * 0.38]} />
          <MirrorSupport position={[0, 0, 0]} />
        </group>
      ))}
      <SunRays dni={dni} mirrorPositions={mirrorPositions} />
    </group>
  );
}

// ─── Heat Glow around Receiver ───
function HeatGlow({ intensity, color }: { intensity: number; color: THREE.Color }) {
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.06 + Math.sin(state.clock.elapsedTime * 3) * 0.025 * intensity;
      glowRef.current.scale.x = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.04 * intensity;
      glowRef.current.scale.y = 1 + Math.cos(state.clock.elapsedTime * 2.5) * 0.04 * intensity;
    }
  });

  return (
    <mesh ref={glowRef} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[GLASS_RADIUS * 2.2, GLASS_RADIUS * 2.2, TUBE_LENGTH * 0.9, 16]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.06 * intensity}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// ─── Steam/Vapor Rising Effect ───
function SteamEffect({ quality, phase }: { quality: number; phase: string }) {
  const steamRef = useRef<THREE.InstancedMesh>(null);
  const particleCount = 60;
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    return Array.from({ length: particleCount }).map(() => ({
      position: new THREE.Vector3(
        (Math.random() - 0.5) * TUBE_LENGTH * 0.7,
        0,
        (Math.random() - 0.5) * 0.4
      ),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.2,
        Math.random() * 1.5 + 0.8,
        (Math.random() - 0.5) * 0.2
      ),
      life: Math.random(),
      scale: Math.random() * 0.25 + 0.08,
    }));
  }, []);

  useFrame((_, delta) => {
    if (!steamRef.current) return;
    const showSteam = phase === 'saturated_mixture' || phase === 'superheated';
    const steamIntensity = phase === 'superheated' ? 1 : quality;

    particles.forEach((p, i) => {
      if (showSteam && steamIntensity > 0.01) {
        p.life += delta * 0.4;
        p.position.y += p.velocity.y * delta * steamIntensity;
        p.position.x += p.velocity.x * delta;
        p.position.z += p.velocity.z * delta;

        if (p.life > 1) {
          p.life = 0;
          p.position.set(
            (Math.random() - 0.5) * TUBE_LENGTH * 0.5,
            0,
            (Math.random() - 0.5) * 0.4
          );
        }

        const scale = p.scale * (1 - p.life * 0.6) * steamIntensity;
        dummy.position.copy(p.position);
        dummy.scale.setScalar(Math.max(0.005, scale));
      } else {
        dummy.scale.setScalar(0.001);
        dummy.position.set(0, -50, 0);
      }
      dummy.updateMatrix();
      steamRef.current!.setMatrixAt(i, dummy.matrix);
    });
    steamRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={steamRef} args={[undefined, undefined, particleCount]}>
      <sphereGeometry args={[0.12, 6, 6]} />
      <meshBasicMaterial
        color="#ffffff"
        transparent
        opacity={0.12}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

// ─── Fluid Particles Enhanced ───
function FluidParticles({ outletState, massFlowRate }: { outletState: ThermoState; massFlowRate: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const particleCount = 500;
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    return Array.from({ length: particleCount }).map(() => {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * TUBE_RADIUS * 0.82;
      return {
        position: new THREE.Vector3(
          Math.cos(angle) * radius,
          Math.sin(angle) * radius,
          (Math.random() - 0.5) * TUBE_LENGTH
        ),
        velocity: Math.random() * 0.5 + 0.3,
        phase: Math.random() * Math.PI * 2,
      };
    });
  }, []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const speed = Math.max(0.5, massFlowRate * 0.7);
    const time = state.clock.elapsedTime;

    particles.forEach((p, i) => {
      // Flow along tube
      p.position.z += p.velocity * speed * delta * 3.5;
      if (p.position.z > TUBE_LENGTH / 2) p.position.z = -TUBE_LENGTH / 2;

      // Turbulence
      if (outletState.phase === 'saturated_mixture') {
        const q = outletState.quality || 0;
        p.position.x += Math.sin(time * 5 + p.phase) * q * 0.015;
        p.position.y += Math.cos(time * 5 + p.phase + 1) * q * 0.015;
      } else if (outletState.phase === 'superheated') {
        p.position.x += Math.sin(time * 8 + p.phase) * 0.025;
        p.position.y += Math.cos(time * 8 + p.phase + 2) * 0.025;
      }

      // Constrain within tube
      const dist = Math.sqrt(p.position.x ** 2 + p.position.y ** 2);
      if (dist > TUBE_RADIUS * 0.82) {
        const a = Math.atan2(p.position.y, p.position.x);
        p.position.x = Math.cos(a) * TUBE_RADIUS * 0.78;
        p.position.y = Math.sin(a) * TUBE_RADIUS * 0.78;
      }

      const baseScale =
        outletState.phase === 'superheated'
          ? 0.032
          : outletState.phase === 'saturated_mixture'
            ? 0.022 + (outletState.quality || 0) * 0.012
            : 0.018;

      dummy.position.copy(p.position);
      dummy.scale.setScalar(baseScale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  const fluidColor = useMemo(() => {
    const liquid = new THREE.Color('#2196F3');
    const mix = new THREE.Color('#FF6B35');
    const vapor = new THREE.Color('#FF1744');
    if (outletState.phase === 'superheated') return vapor;
    if (outletState.phase === 'saturated_mixture')
      return liquid.clone().lerp(mix, outletState.quality || 0);
    return liquid;
  }, [outletState.phase, outletState.quality]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, particleCount]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color={fluidColor} transparent opacity={0.85} />
    </instancedMesh>
  );
}

// ─── Receiver Tube Assembly ───
function ReceiverTubeAssembly({
  outletState,
  massFlowRate,
  dni,
}: {
  outletState: ThermoState;
  massFlowRate: number;
  dni: number;
}) {
  const glowColor = useMemo(() => {
    if (outletState.phase === 'superheated') return new THREE.Color('#ff4400');
    if (outletState.phase === 'saturated_mixture') return new THREE.Color('#ff8800');
    return new THREE.Color('#ffbb00');
  }, [outletState.phase]);

  const heatIntensity = useMemo(() => Math.min(1, dni / 1000), [dni]);

  return (
    <group>
      {/* Support pylons */}
      {[-TUBE_LENGTH * 0.42, -TUBE_LENGTH * 0.14, TUBE_LENGTH * 0.14, TUBE_LENGTH * 0.42].map(
        (zPos, idx) => (
          <group key={`pylon-${idx}`} position={[0, 0, zPos]}>
            <mesh position={[0, 0.55, 0]}>
              <boxGeometry args={[0.04, 1.1, 0.04]} />
              <meshStandardMaterial color="#666" metalness={0.9} roughness={0.2} />
            </mesh>
            <mesh position={[0, 1.1, 0]}>
              <boxGeometry args={[0.45, 0.025, 0.025]} />
              <meshStandardMaterial color="#555" metalness={0.9} roughness={0.2} />
            </mesh>
          </group>
        )
      )}

      {/* Outer Glass Envelope */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[GLASS_RADIUS, GLASS_RADIUS, TUBE_LENGTH, 48, 1, true]} />
        <MeshTransmissionMaterial
          transmission={0.92}
          opacity={1}
          transparent
          roughness={0.05}
          ior={1.5}
          thickness={0.03}
          color="#b0e0ff"
          chromaticAberration={0.01}
        />
      </mesh>

      {/* Glass end caps */}
      <mesh position={[0, 0, TUBE_LENGTH / 2]}>
        <ringGeometry args={[TUBE_RADIUS + 0.02, GLASS_RADIUS, 32]} />
        <meshStandardMaterial color="#88bbdd" transparent opacity={0.3} metalness={0.5} roughness={0.1} />
      </mesh>
      <mesh position={[0, 0, -TUBE_LENGTH / 2]}>
        <ringGeometry args={[TUBE_RADIUS + 0.02, GLASS_RADIUS, 32]} />
        <meshStandardMaterial color="#88bbdd" transparent opacity={0.3} metalness={0.5} roughness={0.1} />
      </mesh>

      {/* Inner Absorber Tube (dark selective coating) */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[TUBE_RADIUS, TUBE_RADIUS, TUBE_LENGTH, 48]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.95} roughness={0.15} transparent opacity={0.5} />
      </mesh>

      {/* Fluid Particles */}
      <FluidParticles outletState={outletState} massFlowRate={massFlowRate} />

      {/* Heat Glow */}
      <HeatGlow intensity={heatIntensity} color={glowColor} />

      {/* Steam Effect */}
      <SteamEffect quality={outletState.quality || 0} phase={outletState.phase} />

      {/* Inlet pipe (blue) */}
      <group position={[0, 0, -TUBE_LENGTH / 2 - 0.5]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[TUBE_RADIUS * 1.2, TUBE_RADIUS * 1.2, 1, 16]} />
          <meshStandardMaterial color="#3d5a80" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.3]}>
          <torusGeometry args={[TUBE_RADIUS * 1.3, 0.025, 8, 16]} />
          <meshStandardMaterial color="#4a6fa5" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>
      {/* Outlet pipe (red) */}
      <group position={[0, 0, TUBE_LENGTH / 2 + 0.5]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[TUBE_RADIUS * 1.2, TUBE_RADIUS * 1.2, 1, 16]} />
          <meshStandardMaterial color="#e63946" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.3]}>
          <torusGeometry args={[TUBE_RADIUS * 1.3, 0.025, 8, 16]} />
          <meshStandardMaterial color="#ff6b6b" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>
    </group>
  );
}

// ─── Desert Floor ───
function DesertGround() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.7, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#c2956b" roughness={0.95} metalness={0.0} />
      </mesh>
      <Grid
        position={[0, -2.69, 0]}
        infiniteGrid
        fadeDistance={30}
        fadeStrength={3}
        cellThickness={0.4}
        cellColor="#967555"
        sectionThickness={0.8}
        sectionColor="#7a5e43"
        cellSize={2}
        sectionSize={10}
      />
    </group>
  );
}

// ─── Dynamic Lighting ───
function DynamicLighting({ dni }: { dni: number }) {
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const intensity = Math.max(0.3, dni / 400);

  useFrame((state) => {
    if (sunRef.current) {
      const t = state.clock.elapsedTime * 0.04;
      sunRef.current.position.set(Math.cos(t) * 15, 12 + Math.sin(t * 0.5) * 2, Math.sin(t) * 15);
    }
  });

  return (
    <>
      <ambientLight intensity={0.2 + dni / 3000} color="#ffeedd" />
      <directionalLight
        ref={sunRef}
        position={[10, 12, 5]}
        intensity={intensity}
        color="#fff5e0"
        castShadow
      />
      <pointLight position={[0, 0, 0]} intensity={Math.min(1.5, dni / 600)} color="#ff8844" distance={6} />
      <hemisphereLight args={['#87CEEB', '#c2956b', 0.25]} />
    </>
  );
}

// ─── Main Scene ───
function Scene({ outletState, inputs }: { outletState: ThermoState; inputs: SystemInputs }) {
  return (
    <>
      <DynamicLighting dni={inputs.dni} />

      <group>
        <ReceiverTubeAssembly outletState={outletState} massFlowRate={inputs.massFlowRate} dni={inputs.dni} />
        <ParabolicMirrorField dni={inputs.dni} />
      </group>

      <DesertGround />

      <Sparkles count={80} scale={[25, 12, 25]} size={1.2} speed={0.25} opacity={0.12} color="#ffd700" />

      <Environment preset="sunset" backgroundBlurriness={0.8} backgroundIntensity={0.15} />

      <EffectComposer>
        <Bloom intensity={0.5} luminanceThreshold={0.65} luminanceSmoothing={0.4} mipmapBlur />
        <Vignette offset={0.3} darkness={0.5} />
      </EffectComposer>

      <OrbitControls
        enablePan
        minDistance={4}
        maxDistance={35}
        maxPolarAngle={Math.PI / 2 + 0.05}
        autoRotate
        autoRotateSpeed={0.3}
        enableDamping
        dampingFactor={0.05}
        target={[0, -0.5, 0]}
      />
    </>
  );
}

// ─── Phase Badge Component ───
function PhaseBadge({ phase, quality }: { phase: string; quality?: number }) {
  const config: Record<string, { label: string; color: string; bg: string }> = {
    subcooled: { label: 'LÍQUIDO', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
    saturated_mixture: {
      label: `MEZCLA ${quality !== undefined ? (quality * 100).toFixed(0) + '%' : ''}`,
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.15)',
    },
    superheated: { label: 'VAPOR', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  };
  const c = config[phase] || config.subcooled;

  return (
    <div
      style={{
        background: c.bg,
        border: `1px solid ${c.color}30`,
        color: c.color,
        padding: '4px 10px',
        borderRadius: '8px',
        fontSize: '10px',
        fontWeight: 800,
        letterSpacing: '0.08em',
        backdropFilter: 'blur(8px)',
      }}
    >
      {c.label}
    </div>
  );
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string | CanvasGradient,
  stroke?: string
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function drawRankineDiagram(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  outputs: RankineOutputs,
  inputs: SystemInputs,
  t: number
) {
  ctx.clearRect(0, 0, w, h);

  const leftW = w * 0.45;
  const rightX = leftW + 20;

  const dniFactor = Math.max(0, Math.min(1, inputs.dni / 1000));
  const mirrorRows = Math.max(6, Math.min(18, Math.round(outputs.area_campo_m2 / 1000)));

  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, 'rgba(240,165,0,0.10)');
  sky.addColorStop(1, 'rgba(13,17,23,0.0)');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, leftW, h);

  const receptorY = h * 0.23;
  const receptorGlow = 0.5 + 0.5 * Math.sin(t * 2.3);
  ctx.strokeStyle = `rgba(217,79,61,${0.65 + receptorGlow * 0.25 * dniFactor})`;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(36, receptorY);
  ctx.lineTo(leftW - 28, receptorY);
  ctx.stroke();

  for (let i = 0; i < mirrorRows; i += 1) {
    const y = h * 0.38 + (i % 9) * 22;
    const x = 28 + Math.floor(i / 9) * 95;
    const mirrorW = 78;
    const mirrorH = 8;

    const angle = Math.sin(t * 1.2 + i * 0.45) * 0.3;
    const grad = ctx.createLinearGradient(x, y, x + mirrorW, y + mirrorH);
    grad.addColorStop(0, `rgba(88,166,255,${0.35 + 0.18 * Math.cos(angle)})`);
    grad.addColorStop(1, `rgba(230,237,243,${0.38 + 0.22 * Math.sin(angle)})`);

    ctx.fillStyle = grad;
    drawRoundedRect(ctx, x, y, mirrorW, mirrorH, 3, grad);

    const centerX = x + mirrorW / 2;
    const centerY = y + mirrorH / 2;
    ctx.strokeStyle = `rgba(240,165,0,${0.15 + 0.45 * dniFactor})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(leftW * 0.52, receptorY);
    ctx.stroke();

    ctx.strokeStyle = `rgba(255,226,122,${0.10 + 0.40 * dniFactor})`;
    ctx.beginPath();
    ctx.moveTo(centerX, 20);
    ctx.lineTo(centerX, y - 2);
    ctx.stroke();
  }

  const equipos = [
    { key: 'caldera', label: 'Caldera', x: rightX + 16, y: h * 0.14, color: '#e07b39' },
    { key: 'turbina', label: 'Turbina', x: rightX + 220, y: h * 0.14, color: '#d94f3d' },
    { key: 'condensador', label: 'Condensador', x: rightX + 220, y: h * 0.55, color: '#1a6b9a' },
    { key: 'bomba', label: 'Bomba', x: rightX + 16, y: h * 0.55, color: '#58a6ff' },
  ];

  const boxW = 140;
  const boxH = 62;

  equipos.forEach((eq) => {
    drawRoundedRect(ctx, eq.x, eq.y, boxW, boxH, 10, 'rgba(22,27,34,0.78)', `rgba(48,54,61,0.9)`);
    ctx.fillStyle = eq.color;
    ctx.font = 'bold 14px Space Grotesk';
    ctx.fillText(eq.label, eq.x + 12, eq.y + 23);
  });

  const p1 = { x: equipos[3].x + boxW, y: equipos[3].y + boxH / 2 };
  const p2 = { x: equipos[0].x, y: equipos[0].y + boxH / 2 };
  const p3 = { x: equipos[0].x + boxW, y: equipos[0].y + boxH / 2 };
  const p4 = { x: equipos[1].x, y: equipos[1].y + boxH / 2 };
  const p5 = { x: equipos[1].x + boxW / 2, y: equipos[1].y + boxH };
  const p6 = { x: equipos[2].x + boxW / 2, y: equipos[2].y };
  const p7 = { x: equipos[2].x, y: equipos[2].y + boxH / 2 };
  const p8 = { x: equipos[3].x + boxW, y: equipos[3].y + boxH / 2 };

  ctx.strokeStyle = 'rgba(240,165,0,0.65)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.lineTo(p3.x, p3.y);
  ctx.lineTo(p4.x, p4.y);
  ctx.lineTo(p5.x, p5.y);
  ctx.lineTo(p6.x, p6.y);
  ctx.lineTo(p7.x, p7.y);
  ctx.lineTo(p8.x, p8.y);
  ctx.stroke();

  const particleCount = 22;
  for (let i = 0; i < particleCount; i += 1) {
    const phase = (t * (0.2 + inputs.massFlowRate * 0.02) + i / particleCount) % 1;
    const seg = Math.floor(phase * 4);
    let x = 0;
    let y = 0;
    let color = '#58a6ff';

    if (seg === 0) {
      const f = (phase * 4) % 1;
      x = p1.x + (p4.x - p1.x) * f;
      y = p1.y;
      color = '#d94f3d';
    } else if (seg === 1) {
      const f = (phase * 4) % 1;
      x = p5.x;
      y = p5.y + (p6.y - p5.y) * f;
      color = '#f5a623';
    } else if (seg === 2) {
      const f = (phase * 4) % 1;
      x = p7.x + (p8.x - p7.x) * f;
      y = p7.y;
      color = '#1a6b9a';
    } else {
      const f = (phase * 4) % 1;
      x = p2.x;
      y = p2.y + (p1.y - p2.y) * f;
      color = '#58a6ff';
    }

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }

  const stateBubbles = [
    { n: 1, x: p1.x - 70, y: p1.y + 15, st: outputs.estado_1, c: '#58a6ff' },
    { n: 2, x: p4.x - 30, y: p4.y - 70, st: outputs.estado_2, c: '#d94f3d' },
    { n: 3, x: p6.x + 10, y: p6.y - 8, st: outputs.estado_3, c: '#f5a623' },
    { n: 4, x: p7.x - 80, y: p7.y - 70, st: outputs.estado_4, c: '#1a6b9a' },
  ];

  stateBubbles.forEach((b) => {
    drawRoundedRect(ctx, b.x, b.y, 150, 54, 8, 'rgba(13,17,23,0.72)', `${b.c}`);
    ctx.fillStyle = '#e6edf3';
    ctx.font = '600 11px JetBrains Mono';
    ctx.fillText(`E${b.n}  T=${b.st.T.toFixed(1)}°C`, b.x + 8, b.y + 18);
    ctx.fillText(`P=${b.st.P_bar.toFixed(2)} bar`, b.x + 8, b.y + 32);
    ctx.fillText(`Ĥ=${b.st.H.toFixed(1)} kJ/kg`, b.x + 8, b.y + 46);
  });
}

export default function SimulationCanvas({ outletState, inputs, rankineOutputs }: CanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!rankineOutputs) return;

    const canvas = overlayRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;

    let raf = 0;
    const resize = () => {
      const rect = host.getBoundingClientRect();
      canvas.width = Math.floor(rect.width);
      canvas.height = Math.floor(rect.height);
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(host);

    const tick = (time: number) => {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        drawRankineDiagram(ctx, canvas.width, canvas.height, rankineOutputs, inputs, time * 0.001);
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [inputs, rankineOutputs]);

  return (
    <div
      ref={hostRef}
      className="w-full h-full min-h-[600px] relative rounded-2xl overflow-hidden border border-white/10"
      style={{ background: 'linear-gradient(135deg, #0c0c14 0%, #0a0f1a 50%, #0d0d16 100%)' }}
    >
      {/* ─── Top HUD ─── */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2 pointer-events-none">
        <div
          style={{
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#22c55e',
              boxShadow: '0 0 8px #22c55e',
            }}
          />
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: 'rgba(255,255,255,0.8)',
              letterSpacing: '0.06em',
            }}
          >
            3D WebGL • Fresnel CSP
          </span>
        </div>
        <PhaseBadge phase={outletState.phase} quality={outletState.quality} />
      </div>

      {/* ─── Temperature widget ─── */}
      <div
        className="absolute top-4 right-4 z-10 pointer-events-none"
        style={{
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          minWidth: '110px',
        }}
      >
        <span
          style={{
            fontSize: '9px',
            fontWeight: 700,
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          T. Salida
        </span>
        <span
          style={{ fontSize: '22px', fontWeight: 900, color: '#fff', fontFamily: 'monospace', lineHeight: 1 }}
        >
          {outletState.temp.toFixed(1)}
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginLeft: '2px' }}>°C</span>
        </span>
        <div style={{ width: '100%', height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.1)', marginTop: 2 }}>
          <div
            style={{
              width: `${Math.min(100, (outletState.temp / 400) * 100)}%`,
              height: '100%',
              borderRadius: 2,
              background:
                outletState.phase === 'superheated'
                  ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                  : outletState.phase === 'saturated_mixture'
                    ? 'linear-gradient(90deg, #3b82f6, #f59e0b)'
                    : 'linear-gradient(90deg, #3b82f6, #60a5fa)',
              transition: 'width 0.5s ease',
            }}
          />
        </div>
      </div>

      {/* ─── DNI Widget ─── */}
      <div
        className="absolute bottom-4 right-4 z-10 pointer-events-none"
        style={{
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '12px',
          padding: '8px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}
      >
        <span
          style={{
            fontSize: '9px',
            fontWeight: 700,
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          ☀ Radiación DNI
        </span>
        <span
          style={{ fontSize: '18px', fontWeight: 900, color: '#fbbf24', fontFamily: 'monospace', lineHeight: 1 }}
        >
          {inputs.dni.toFixed(0)}
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginLeft: '3px' }}>W/m²</span>
        </span>
      </div>

      {/* ─── Bottom hints ─── */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none flex gap-3">
        <div
          style={{
            background: 'rgba(0,0,0,0.35)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '10px',
            padding: '5px 11px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <RotateCcw size={11} style={{ color: 'rgba(255,255,255,0.35)' }} />
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
            Arrastra para rotar
          </span>
        </div>
        <div
          style={{
            background: 'rgba(0,0,0,0.35)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '10px',
            padding: '5px 11px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <Eye size={11} style={{ color: 'rgba(255,255,255,0.35)' }} />
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
            Scroll para zoom
          </span>
        </div>
      </div>

      {/* ─── WebGL Canvas ─── */}
      <Canvas
        gl={{
          alpha: true,
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
          powerPreference: 'high-performance',
        }}
        camera={{ position: [12, 6, 12], fov: 40 }}
        shadows
        dpr={[1, 2]}
      >
        <Scene outletState={outletState} inputs={inputs} />
      </Canvas>

      {rankineOutputs && (
        <canvas
          ref={overlayRef}
          className="pointer-events-none absolute inset-0"
          style={{ mixBlendMode: 'screen', opacity: 0.85 }}
        />
      )}
    </div>
  );
}