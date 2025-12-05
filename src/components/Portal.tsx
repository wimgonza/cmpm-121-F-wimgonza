import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Portal as PortalType } from '../types';
import { PORTAL_CONFIG } from '../config/rooms';
import { useGameStore } from '../hooks/useGameStore';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================
interface PortalProps {
  portal: PortalType;
}

// ============================================================================
// PORTAL COMPONENT
// ============================================================================
export function Portal({ portal }: PortalProps) {
  // REFERENCES
  const glowRef = useRef<THREE.Mesh>(null);
  
  // GAME STATE
  const { nearPortal } = useGameStore();
  const isNear = nearPortal?.id === portal.id;

  // ==========================================================================
  // ANIMATION LOOP (useFrame)
  // ==========================================================================
  useFrame((state) => {
    if (glowRef.current) {
      const pulse = 0.7 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity =
        isNear ? Math.min(pulse + 0.2, 1) : pulse;
    }
  });

  // ==========================================================================
  // HELPER FUNCTIONS
  // ==========================================================================

  // PORTAL ROTATION CALCULATION
  const getRotation = () => {
    const { x, z } = portal.position;
    
    // Determine primary axis based on position
    if (Math.abs(z) > Math.abs(x)) {
      return z < 0 ? 0 : Math.PI;       // North/South walls
    }
    return x > 0 ? -Math.PI / 2 : Math.PI / 2; // East/West walls
  };

  // GLOW OFFSET CALCULATION
  const getGlowOffset = (): [number, number, number] => {
    const { x, z } = portal.position;
    const offset = 0.15; // Small forward offset from wall
    
    if (Math.abs(z) > Math.abs(x)) {
      return z < 0 ? [0, 0, offset] : [0, 0, -offset]; // Z-axis walls
    }
    return x > 0 ? [-offset, 0, 0] : [offset, 0, 0];   // X-axis walls
  };

  // COMPUTED VALUES
  const glowOffset = getGlowOffset();

  // ==========================================================================
  // RENDER
  // ==========================================================================
  return (
    <group position={[portal.position.x, portal.position.y, portal.position.z]}>
      {/* PORTAL FRAME */}
      <mesh rotation={[0, getRotation(), 0]}>
        <boxGeometry args={[PORTAL_CONFIG.width + 0.3, PORTAL_CONFIG.height + 0.2, 0.2]} />
        <meshBasicMaterial color="#111111" />
      </mesh>

      {/* ANIMATED GLOW PANEL */}
      <mesh 
        ref={glowRef} 
        rotation={[0, getRotation(), 0]}
        position={glowOffset}
      >
        <planeGeometry args={[PORTAL_CONFIG.width, PORTAL_CONFIG.height]} />
        <meshBasicMaterial 
          color={portal.color} 
          transparent 
          opacity={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}