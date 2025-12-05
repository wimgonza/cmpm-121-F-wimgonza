import * as THREE from 'three';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================
interface MiniGameZoneProps {
  position: [number, number, number];
  size?: [number, number, number];
  color?: string;
  label?: string;
}

// ============================================================================
// MINI GAME ZONE COMPONENT
// ============================================================================
export function MiniGameZone({ 
  position, 
  size = [6, 0.1, 6], 
  color = '#ff4444',
}: MiniGameZoneProps) {
  
  // GEOMETRY CALCULATIONS
  const borderGeometry = new THREE.BufferGeometry();
  const halfWidth = size[0] / 2;
  const halfDepth = size[2] / 2;
  
  // BORDER VERTICES (Rectangle Outline)
  const vertices = new Float32Array([
    // Top edge
    -halfWidth, 0.02, -halfDepth,
     halfWidth, 0.02, -halfDepth,
    
    // Right edge
     halfWidth, 0.02, -halfDepth,
     halfWidth, 0.02,  halfDepth,
    
    // Bottom edge
     halfWidth, 0.02,  halfDepth,
    -halfWidth, 0.02,  halfDepth,
    
    // Left edge
    -halfWidth, 0.02,  halfDepth,
    -halfWidth, 0.02, -halfDepth,
  ]);
  
  // SETUP GEOMETRY ATTRIBUTES
  borderGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

  // ==========================================================================
  // RENDER
  // ==========================================================================
  return (
    <group position={position}>
      <lineSegments geometry={borderGeometry}>
        <lineBasicMaterial 
          color={color} 
          linewidth={2} 
        />
      </lineSegments>
    </group>
  );
}