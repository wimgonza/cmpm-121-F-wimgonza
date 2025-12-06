import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Text } from '@react-three/drei';
import { useGameStore } from '../hooks/useGameStore';
import { useKeyboard } from '../hooks/useKeyboard';
import { useTheme } from '../hooks/useTheme';

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
const SIMON_CONFIG = {
  BUTTON: {
    RADIUS: 0.35,
    HEIGHT: 0.15,
    CYLINDER_HEIGHT: 0.1,
    COLORS: [
      { normal: '#660000', lit: '#ff4444', name: 'red' },
      { normal: '#666600', lit: '#ffff44', name: 'yellow' },
      { normal: '#006600', lit: '#44ff44', name: 'green' },
      { normal: '#000066', lit: '#4444ff', name: 'blue' },
      { normal: '#660066', lit: '#ff44ff', name: 'purple' },
    ] as const,
  },
  GAME: {
    INTERACTION_DISTANCE: 4.5,
    DOT_THRESHOLD: 0.97,
    PROXIMITY_RADIUS: 6,
    PATTERN_DELAY: 500,
    BUTTON_LIGHT_TIME: 600,
    BETWEEN_BUTTON_DELAY: 300,
    NEXT_ROUND_DELAY: 1500,
    INITIAL_PATTERN_DELAY: 1000,
  }
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
const calculateButtonClick = (
  camera: THREE.Camera,
  buttonPositions: [number, number, number][]
): number | null => {
  const cameraDir = new THREE.Vector3();
  camera.getWorldDirection(cameraDir);
  
  for (let i = 0; i < buttonPositions.length; i++) {
    const btnPos = new THREE.Vector3(...buttonPositions[i]);
    btnPos.y += 0.1;
    
    const toButton = btnPos.clone().sub(camera.position);
    const distance = toButton.length();
    toButton.normalize();
    
    const dot = cameraDir.dot(toButton);
    
    if (dot > SIMON_CONFIG.GAME.DOT_THRESHOLD && distance < SIMON_CONFIG.GAME.INTERACTION_DISTANCE) {
      return i;
    }
  }
  
  return null;
};

// ============================================================================
// VISUAL COMPONENTS
// ============================================================================

// Table Component
const SimonTable = React.memo(({ position }: { position: [number, number, number] }) => (
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
));

SimonTable.displayName = 'SimonTable';

// Game UI Component
const SimonGameUI = React.memo(({ 
  tablePosition, 
  patternLength, 
  score, 
  message 
}: { 
  tablePosition: [number, number, number];
  patternLength: number;
  score: number;
  message: string;
}) => (
  <>
    {/* Score display */}
    <Text
      position={[tablePosition[0], tablePosition[1] + 2, tablePosition[2]]}
      fontSize={0.2}
      color="#ffffff"
      anchorX="center"
      anchorY="middle"
    >
      {`Round: ${patternLength} | Score: ${score}`}
    </Text>
    
    {/* Game message */}
    <Text
      position={[tablePosition[0], tablePosition[1] + 1.7, tablePosition[2]]}
      fontSize={0.15}
      color="#ffff00"
      anchorX="center"
      anchorY="middle"
    >
      {message}
    </Text>
  </>
));

SimonGameUI.displayName = 'SimonGameUI';

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
  const colors = SIMON_CONFIG.BUTTON.COLORS[colorIndex];

  return (
    <group position={position}>
      {/* Button base */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[SIMON_CONFIG.BUTTON.RADIUS, SIMON_CONFIG.BUTTON.RADIUS + 0.05, SIMON_CONFIG.BUTTON.CYLINDER_HEIGHT, 32]} />
        <meshBasicMaterial color="#333333" />
      </mesh>
      
      {/* Button top surface */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[SIMON_CONFIG.BUTTON.RADIUS - 0.05, SIMON_CONFIG.BUTTON.RADIUS - 0.05, SIMON_CONFIG.BUTTON.HEIGHT, 32]} />
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

// ============================================================================
// MAIN SIMON GAME COMPONENT
// ============================================================================
export function SimonGame({ position, zoneSize }: SimonGameProps) {
  // HOOKS & EXTERNAL DEPENDENCIES
  // --------------------------------------------------------------------------
  const { camera } = useThree();
  const { keys, resetInteract } = useKeyboard();
  const { isDarkMode } = useTheme();
  
  // GAME STATE REFERENCES
  // --------------------------------------------------------------------------
  const patternShowIndexRef = useRef(0);
  const patternTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Add a ref to store the showPattern function
  const showPatternRef = useRef<(() => void) | null>(null);
  
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
    setSimonGameMessage,
    simonPlayerPattern,
  } = useGameStore();

  // ==========================================================================
  // COMPUTED VALUES
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
  // GAME LOGIC FUNCTIONS
  // ==========================================================================

  // EXIT GAME FUNCTION
  // --------------------------------------------------------------------------
  const handleExitGame = useCallback(() => {
    exitSimonGame();
    setTimeout(() => {
      const canvas = document.querySelector('canvas');
      canvas?.requestPointerLock();
    }, 100);
  }, [exitSimonGame]);

  // PROXIMITY CHECK FUNCTION
  // --------------------------------------------------------------------------
  const handleProximityCheck = useCallback(() => {
    const playerPos = camera.position;
    const zoneCenter = new THREE.Vector3(position[0], position[1], position[2]);
    const distance = playerPos.distanceTo(zoneCenter);

    const isNear = distance < SIMON_CONFIG.GAME.PROXIMITY_RADIUS;
    if (isNear !== isNearSimon) {
      setIsNearSimon(isNear);
      if (!isNear && isSimonActive) {
        handleExitGame();
      }
    }

    // GAME ACTIVATION (Interact key)
    if (isNear && keys.current.interact && isLocked && !isSimonActive) {
      resetInteract();
      setIsSimonActive(true);
      document.exitPointerLock();
    }
  }, [
    camera, 
    position, 
    isNearSimon, 
    isSimonActive, 
    isLocked, 
    keys, 
    resetInteract, 
    setIsNearSimon, 
    setIsSimonActive, 
    handleExitGame
  ]);

  // MOUSE CLICK HANDLER
  // --------------------------------------------------------------------------
  const handleButtonClick = useCallback(() => {
    if (!isSimonActive || !simonBetPlaced || !simonCanClick) return;
    
    const clickedButton = calculateButtonClick(camera, buttonPositions);
    if (clickedButton !== null) {
      // Visual feedback with timeout cleanup
      setSimonLitButton(clickedButton);
      const clearTimeoutId = setTimeout(() => setSimonLitButton(null), 200);
      
      // Game logic
      simonButtonClick(clickedButton);
      
      // Return cleanup function
      return () => clearTimeout(clearTimeoutId);
    }
    return undefined;
  }, [
    isSimonActive, 
    simonBetPlaced, 
    simonCanClick, 
    camera, 
    buttonPositions, 
    simonButtonClick, 
    setSimonLitButton
  ]);

  // PATTERN DISPLAY FUNCTION (Using ref to avoid circular dependency)
  // --------------------------------------------------------------------------
  const showNextPatternButton = useCallback(() => {
    if (patternShowIndexRef.current < simonPattern.length) {
      const buttonIndex = simonPattern[patternShowIndexRef.current];
      setSimonLitButton(buttonIndex);
      
      patternTimerRef.current = setTimeout(() => {
        setSimonLitButton(null);
        patternShowIndexRef.current++;
        
        patternTimerRef.current = setTimeout(() => {
          if (patternShowIndexRef.current < simonPattern.length) {
            // Use the ref to call the function instead of direct recursion
            if (showPatternRef.current) {
              showPatternRef.current();
            }
          } else {
            setSimonShowingPattern(false);
            setSimonCanClick(true);
            setSimonGameMessage('Your turn!');
          }
        }, SIMON_CONFIG.GAME.BETWEEN_BUTTON_DELAY);
      }, SIMON_CONFIG.GAME.BUTTON_LIGHT_TIME);
    }
  }, [
    simonPattern, 
    setSimonLitButton, 
    setSimonShowingPattern, 
    setSimonCanClick, 
    setSimonGameMessage
  ]);

  // Store the function in a ref so it can be called recursively
  useEffect(() => {
    showPatternRef.current = showNextPatternButton;
  }, [showNextPatternButton]);

  // ==========================================================================
  // USE EFFECTS
  // ==========================================================================

  // EXIT GAME HANDLER (Q key)
  // --------------------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyQ' && isSimonActive) {
        e.preventDefault();
        handleExitGame();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSimonActive, handleExitGame]);

  // PATTERN DISPLAY SEQUENCE
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!simonIsShowingPattern || simonPattern.length === 0) return;
    
    patternShowIndexRef.current = 0;
    
    const startTimer = setTimeout(() => {
      if (showPatternRef.current) {
        showPatternRef.current();
      }
    }, SIMON_CONFIG.GAME.PATTERN_DELAY);
    
    return () => {
      if (startTimer) clearTimeout(startTimer);
      if (patternTimerRef.current) {
        clearTimeout(patternTimerRef.current);
        patternTimerRef.current = null;
      }
    };
  }, [simonIsShowingPattern, simonPattern.length]);

  // NEXT ROUND TRIGGER (After player completes pattern)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (simonBetPlaced && !simonIsShowingPattern && !simonCanClick && !simonIsGameOver && simonPattern.length > 0) {
      if (simonPlayerPattern.length === simonPattern.length) {
        const timer = setTimeout(() => {
          addToSimonPattern();
        }, SIMON_CONFIG.GAME.NEXT_ROUND_DELAY);
        return () => clearTimeout(timer);
      }
    }
  }, [
    simonBetPlaced, 
    simonIsShowingPattern, 
    simonCanClick, 
    simonIsGameOver, 
    simonPattern.length, 
    simonPlayerPattern.length, 
    addToSimonPattern
  ]);

  // INITIAL PATTERN GENERATION (Start of game)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (simonBetPlaced && simonPattern.length === 0 && !simonIsGameOver) {
      const timer = setTimeout(() => {
        addToSimonPattern();
      }, SIMON_CONFIG.GAME.INITIAL_PATTERN_DELAY);
      return () => clearTimeout(timer);
    }
  }, [simonBetPlaced, simonPattern.length, simonIsGameOver, addToSimonPattern]);

  // MOUSE CLICK INTERACTION (Button pressing)
  // --------------------------------------------------------------------------
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (e.button !== 0) return;
      handleButtonClick();
    };
    
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [handleButtonClick]);

  // CLEANUP ON UNMOUNT
  // --------------------------------------------------------------------------
  useEffect(() => {
    return () => {
      if (patternTimerRef.current) {
        clearTimeout(patternTimerRef.current);
        patternTimerRef.current = null;
      }
    };
  }, []);

  // ==========================================================================
  // GAME LOOP (useFrame)
  // ==========================================================================
  useFrame(() => {
    if (currentRoom !== 'minigame3') return;
    handleProximityCheck();
  });

  // RENDER GUARD
  if (currentRoom !== 'minigame3') return null;

  // ==========================================================================
  // RENDER
  // ==========================================================================
  return (
    <group>
      {/* TABLE */}
      <SimonTable position={tablePosition} />
      
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
        <SimonGameUI 
          tablePosition={tablePosition}
          patternLength={simonPattern.length}
          score={simonScore}
          message={simonGameMessage}
        />
      )}

      {/* Zone indicator */}
      <mesh position={[position[0], position[1] + 0.01, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[zoneSize[0], zoneSize[2]]} />
        <meshBasicMaterial 
          color={isDarkMode ? "#aa88ff" : "#9966ff"}
          transparent 
          opacity={0.2} 
        />
      </mesh>
    </group>
  );
}