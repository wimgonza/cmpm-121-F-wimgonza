import { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Text } from '@react-three/drei';
import { useGameStore } from '../hooks/useGameStore';
import { useKeyboard } from '../hooks/useKeyboard';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================
interface SimonGameProps {
  position: [number, number, number];
  zoneSize: [number, number, number];
}

// ============================================================================
// GAME CONSTANTS
// ============================================================================
const BUTTON_COLORS = [
  { normal: '#660000', lit: '#ff4444', name: 'red' },
  { normal: '#666600', lit: '#ffff44', name: 'yellow' },
  { normal: '#006600', lit: '#44ff44', name: 'green' },
  { normal: '#000066', lit: '#4444ff', name: 'blue' },
  { normal: '#660066', lit: '#ff44ff', name: 'purple' },
];

const BUTTON_RADIUS = 0.35;
const BUTTON_HEIGHT = 0.15;
const BUTTON_CYLINDER_HEIGHT = 0.1;
const INTERACTION_DISTANCE = 4.5;
const DOT_THRESHOLD = 0.97;

// ============================================================================
// VISUAL COMPONENTS
// ============================================================================

// SIMON BUTTON COMPONENT
// ----------------------------------------------------------------------------
function SimonButton({
  position,
  colorIndex,
  isLit,
  label,
}: {
  position: [number, number, number];
  colorIndex: number;
  isLit: boolean;
  label: string;
}) {
  const colors = BUTTON_COLORS[colorIndex];

  return (
    <group position={position}>
      {/* Button base */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[BUTTON_RADIUS, BUTTON_RADIUS + 0.05, BUTTON_CYLINDER_HEIGHT, 32]} />
        <meshBasicMaterial color="#333333" />
      </mesh>
      
      {/* Button top surface */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[BUTTON_RADIUS - 0.05, BUTTON_RADIUS - 0.05, BUTTON_HEIGHT, 32]} />
        <meshBasicMaterial 
          color={isLit ? colors.lit : colors.normal} 
          transparent={!isLit}
          opacity={isLit ? 1 : 0.7}
        />
      </mesh>
      
      {/* Button glow effect when lit */}
      {isLit && (
        <pointLight position={[0, 0.3, 0]} color={colors.lit} intensity={2} distance={2} />
      )}
      
      {/* Button label */}
      <Text
        position={[0, 0.25, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.15}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
    </group>
  );
}

// TABLE COMPONENT
// ----------------------------------------------------------------------------
function Table({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Table base */}
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[3.2, 0.06, 1.8]} />
        <meshBasicMaterial color="#222222" />
      </mesh>

      {/* Table surface */}
      <mesh position={[0, 1.04, 0]}>
        <boxGeometry args={[3, 0.02, 1.6]} />
        <meshBasicMaterial color="#f5f5f5" />
      </mesh>

      {/* Table shadow */}
      <mesh position={[0, 0.92, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.4, 2]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.25} />
      </mesh>
    </group>
  );
}

// ============================================================================
// MAIN SIMON GAME COMPONENT
// ============================================================================
export function SimonGame({ position, zoneSize }: SimonGameProps) {
  // HOOKS & EXTERNAL DEPENDENCIES
  // --------------------------------------------------------------------------
  const { camera } = useThree();
  const { keys, resetInteract } = useKeyboard();
  
  // GAME STATE REFERENCES
  // --------------------------------------------------------------------------
  const patternShowIndexRef = useRef(0);
  const patternTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // GAME STORE STATE
  // --------------------------------------------------------------------------
  const {
    currentRoom,
    isLocked,
    isNearSimon,
    setIsNearSimon,
    isSimonActive,
    setIsSimonActive,
    simonBetPlaced,
    simonPattern,
    simonScore,
    simonIsShowingPattern,
    simonCanClick,
    simonLitButton,
    simonIsGameOver,
    simonGameMessage,
    addToSimonPattern,
    simonButtonClick,
    setSimonLitButton,
    setSimonShowingPattern,
    setSimonCanClick,
    exitSimonGame,
  } = useGameStore();

  // ==========================================================================
  // COMPUTED POSITIONS
  // ==========================================================================
  
  // TABLE POSITION
  // --------------------------------------------------------------------------
  const tablePosition: [number, number, number] = useMemo(
    () => [position[0], position[1], position[2] - 2],
    [position]
  );

  // BUTTON POSITIONS (5-button layout)
  // --------------------------------------------------------------------------
  const buttonPositions: [number, number, number][] = useMemo(
    () => [
      // Row 1
      [tablePosition[0] - 0.9,  tablePosition[1] + 1.08, tablePosition[2] - 0.25],
      [tablePosition[0],        tablePosition[1] + 1.08, tablePosition[2] - 0.25],
      [tablePosition[0] + 0.9,  tablePosition[1] + 1.08, tablePosition[2] - 0.25],
      // Row 2
      [tablePosition[0] - 0.45, tablePosition[1] + 1.08, tablePosition[2] + 0.25],
      [tablePosition[0] + 0.45, tablePosition[1] + 1.08, tablePosition[2] + 0.25],
    ],
    [tablePosition]
  );

  // ==========================================================================
  // USE EFFECTS
  // ==========================================================================

  // EXIT GAME HANDLER (Q key)
  // --------------------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyQ' && isSimonActive) {
        exitSimonGame();
        setTimeout(() => {
          const canvas = document.querySelector('canvas');
          canvas?.requestPointerLock();
        }, 100);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSimonActive, exitSimonGame]);

  // PATTERN DISPLAY SEQUENCE
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!simonIsShowingPattern || simonPattern.length === 0) return;
    
    patternShowIndexRef.current = 0;
    
    const showNextButton = () => {
      if (patternShowIndexRef.current < simonPattern.length) {
        const buttonIndex = simonPattern[patternShowIndexRef.current];
        setSimonLitButton(buttonIndex);
        
        patternTimerRef.current = setTimeout(() => {
          setSimonLitButton(null);
          patternShowIndexRef.current++;
          
          patternTimerRef.current = setTimeout(() => {
            if (patternShowIndexRef.current < simonPattern.length) {
              showNextButton();
            } else {
              setSimonShowingPattern(false);
              setSimonCanClick(true);
              useGameStore.getState().setSimonGameMessage('Your turn!');
            }
          }, 300);
        }, 600);
      }
    };
    
    const startTimer = setTimeout(showNextButton, 500);
    
    return () => {
      clearTimeout(startTimer);
      if (patternTimerRef.current) {
        clearTimeout(patternTimerRef.current);
      }
    };
  }, [simonIsShowingPattern, simonPattern, setSimonLitButton, setSimonShowingPattern, setSimonCanClick]);

  // NEXT ROUND TRIGGER (After player completes pattern)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (simonBetPlaced && !simonIsShowingPattern && !simonCanClick && !simonIsGameOver && simonPattern.length > 0) {
      const state = useGameStore.getState();
      if (state.simonPlayerPattern.length === simonPattern.length) {
        const timer = setTimeout(() => {
          addToSimonPattern();
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [simonBetPlaced, simonIsShowingPattern, simonCanClick, simonIsGameOver, simonPattern, addToSimonPattern]);

  // INITIAL PATTERN GENERATION (Start of game)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (simonBetPlaced && simonPattern.length === 0 && !simonIsGameOver) {
      const timer = setTimeout(() => {
        addToSimonPattern();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [simonBetPlaced, simonPattern.length, simonIsGameOver, addToSimonPattern]);

  // MOUSE CLICK INTERACTION (Button pressing)
  // --------------------------------------------------------------------------
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!isSimonActive || !simonBetPlaced || !simonCanClick || e.button !== 0) return;
      
      const cameraDir = new THREE.Vector3();
      camera.getWorldDirection(cameraDir);
      
      // Check each button for click intersection
      for (let i = 0; i < buttonPositions.length; i++) {
        const btnPos = new THREE.Vector3(...buttonPositions[i]);
        btnPos.y += 0.1; // Offset to center of button
        
        const toButton = btnPos.clone().sub(camera.position);
        const distance = toButton.length();
        toButton.normalize();
        
        const dot = cameraDir.dot(toButton);
        
        // Check if looking at button and within range
        if (dot > DOT_THRESHOLD && distance < INTERACTION_DISTANCE) {
          // Visual feedback
          setSimonLitButton(i);
          setTimeout(() => setSimonLitButton(null), 200);
          
          // Game logic
          simonButtonClick(i);
          return;
        }
      }
    };
    
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [isSimonActive, simonBetPlaced, simonCanClick, camera, buttonPositions, simonButtonClick, setSimonLitButton]);

  // GAME LOOP (useFrame)
  // ==========================================================================
  useFrame(() => {
    if (currentRoom !== 'minigame3') return;

    // PROXIMITY CHECK & GAME ENTRY
    // ------------------------------------------------------------------------
    const playerPos = camera.position;
    const zoneCenter = new THREE.Vector3(position[0], position[1], position[2]);
    const distance = playerPos.distanceTo(zoneCenter);

    const isNear = distance < 6;
    if (isNear !== isNearSimon) {
      setIsNearSimon(isNear);
      if (!isNear && isSimonActive) {
        exitSimonGame();
        setTimeout(() => {
          const canvas = document.querySelector('canvas');
          canvas?.requestPointerLock();
        }, 100);
      }
    }

    // GAME ACTIVATION (Interact key)
    // ------------------------------------------------------------------------
    if (isNear && keys.current.interact && isLocked && !isSimonActive) {
      resetInteract();
      setIsSimonActive(true);
      document.exitPointerLock();
    }
  });

  // RENDER GUARD
  if (currentRoom !== 'minigame3') return null;

  // ==========================================================================
  // RENDER
  // ==========================================================================
  return (
    <group>
      {/* TABLE */}
      <Table position={tablePosition} />
      
      {/* BUTTONS */}
      {buttonPositions.map((pos, index) => (
        <SimonButton
          key={index}
          position={pos}
          colorIndex={index}
          isLit={simonLitButton === index}
          label={String(index + 1)}
        />
      ))}

      {/* GAME UI */}
      {isSimonActive && simonBetPlaced && (
        <>
          {/* Score display */}
          <Text
            position={[tablePosition[0], tablePosition[1] + 2, tablePosition[2]]}
            fontSize={0.2}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
          >
            {`Round: ${simonPattern.length} | Score: ${simonScore}`}
          </Text>
          
          {/* Game message */}
          <Text
            position={[tablePosition[0], tablePosition[1] + 1.7, tablePosition[2]]}
            fontSize={0.15}
            color="#ffff00"
            anchorX="center"
            anchorY="middle"
          >
            {simonGameMessage}
          </Text>
        </>
      )}

      {/* ZONE VISUALIZATION */}
      <mesh position={[position[0], position[1] + 0.01, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[zoneSize[0], zoneSize[2]]} />
        <meshBasicMaterial color="#9966ff" transparent opacity={0.2} />
      </mesh>
    </group>
  );
}