import React, { useRef, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Text } from '@react-three/drei';
import { useGameStore } from '../hooks/useGameStore';
import { useKeyboard } from '../hooks/useKeyboard';
import { useTheme } from '../hooks/useTheme';


// ============================================================================
// TYPES & INTERFACES
// ============================================================================
interface DiceGameProps {
  position: [number, number, number];
  zoneSize: [number, number, number];
}

interface DiceState {
  body: CANNON.Body;
  mesh: THREE.Group | null;
  value: number;
}

// ============================================================================
// GAME CONSTANTS
// ============================================================================
const DICE_CONFIG = {
  SIZE: 0.5,
  HALF_SIZE: 0.251, // SIZE / 2 + 0.001
  PHYSICS: {
    WALL_HEIGHT: 2,
    WALL_THICKNESS: 0.2,
    SETTLE_THRESHOLD: 0.1,
    PROXIMITY_RADIUS: 6,
  },
  TIMING: {
    MAX_ROLL_TIME: 5,
  }
} as const;

const DICE_FACES = [
  { normal: new THREE.Vector3(0, 1, 0), value: 1 },   // Top
  { normal: new THREE.Vector3(0, -1, 0), value: 6 },  // Bottom
  { normal: new THREE.Vector3(1, 0, 0), value: 3 },   // Right
  { normal: new THREE.Vector3(-1, 0, 0), value: 4 },  // Left
  { normal: new THREE.Vector3(0, 0, 1), value: 2 },   // Front
  { normal: new THREE.Vector3(0, 0, -1), value: 5 },  // Back
] as const;

const DICE_FACE_NUMBERS = [
  { position: [0, DICE_CONFIG.HALF_SIZE, 0] as [number, number, number], rotation: [-Math.PI / 2, 0, 0] as [number, number, number], value: "1" },
  { position: [0, -DICE_CONFIG.HALF_SIZE, 0] as [number, number, number], rotation: [Math.PI / 2, 0, 0] as [number, number, number], value: "6" },
  { position: [DICE_CONFIG.HALF_SIZE, 0, 0] as [number, number, number], rotation: [0, Math.PI / 2, 0] as [number, number, number], value: "3" },
  { position: [-DICE_CONFIG.HALF_SIZE, 0, 0] as [number, number, number], rotation: [0, -Math.PI / 2, 0] as [number, number, number], value: "4" },
  { position: [0, 0, DICE_CONFIG.HALF_SIZE] as [number, number, number], rotation: [0, 0, 0] as [number, number, number], value: "2" },
  { position: [0, 0, -DICE_CONFIG.HALF_SIZE] as [number, number, number], rotation: [0, Math.PI, 0] as [number, number, number], value: "5" },
] as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
const getDiceValue = (quaternion: THREE.Quaternion): number => {
  const up = new THREE.Vector3(0, 1, 0);
  let maxDot = -Infinity;
  let value = 1;

  for (const face of DICE_FACES) {
    const rotatedNormal = face.normal.clone().applyQuaternion(quaternion);
    const dot = rotatedNormal.dot(up);
    if (dot > maxDot) {
      maxDot = dot;
      value = face.value;
    }
  }

  return value;
};

const createDiceBodies = (
  world: CANNON.World, 
  position: [number, number, number],
  diceMaterial: CANNON.Material
): DiceState[] => {
  const diceStates: DiceState[] = [];
  const diceShape = new CANNON.Box(new CANNON.Vec3(DICE_CONFIG.SIZE / 2, DICE_CONFIG.SIZE / 2, DICE_CONFIG.SIZE / 2));
  const offsets = [[-0.6, 0], [0.6, 0]] as const;
  
  for (let i = 0; i < 2; i++) {
    const diceBody = new CANNON.Body({
      mass: 1,
      position: new CANNON.Vec3(position[0] + offsets[i][0], position[1] + 0.5, position[2]),
      shape: diceShape,
      material: diceMaterial,
    });
    world.addBody(diceBody);
    
    diceStates.push({
      body: diceBody,
      mesh: null,
      value: 1,
    });
  }
  
  return diceStates;
};

// ============================================================================
// VISUAL COMPONENTS
// ============================================================================

// Dice Table Walls Component
const DiceTableWalls = React.memo(({ 
  position, 
  zoneSize 
}: { 
  position: [number, number, number]; 
  zoneSize: [number, number, number] 
}) => (
  <>
    <mesh position={[position[0], position[1] + 1, position[2] - zoneSize[2] / 2]}>
      <boxGeometry args={[zoneSize[0], 2, 0.05]} />
      <meshBasicMaterial color="#ff4444" transparent opacity={0.15} />
    </mesh>
    <mesh position={[position[0], position[1] + 1, position[2] + zoneSize[2] / 2]}>
      <boxGeometry args={[zoneSize[0], 2, 0.05]} />
      <meshBasicMaterial color="#ff4444" transparent opacity={0.15} />
    </mesh>
    <mesh position={[position[0] + zoneSize[0] / 2, position[1] + 1, position[2]]}>
      <boxGeometry args={[0.05, 2, zoneSize[2]]} />
      <meshBasicMaterial color="#ff4444" transparent opacity={0.15} />
    </mesh>
    <mesh position={[position[0] - zoneSize[0] / 2, position[1] + 1, position[2]]}>
      <boxGeometry args={[0.05, 2, zoneSize[2]]} />
      <meshBasicMaterial color="#ff4444" transparent opacity={0.15} />
    </mesh>
  </>
));

DiceTableWalls.displayName = 'DiceTableWalls';

// Dice Visual Component
function Dice({ diceRef, initialPosition }: { 
  diceRef: (group: THREE.Group | null) => void;
  initialPosition: [number, number, number];
}) {
  const { colors, isDarkMode } = useTheme();

  return (
    <group ref={diceRef} position={initialPosition}>
      {/* Dice cube body */}
      <mesh>
        <boxGeometry args={[DICE_CONFIG.SIZE, DICE_CONFIG.SIZE, DICE_CONFIG.SIZE]} />
        <meshBasicMaterial color={colors.diceColor} />
      </mesh>

      {/* Dice edges */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(DICE_CONFIG.SIZE, DICE_CONFIG.SIZE, DICE_CONFIG.SIZE)]} />
        <lineBasicMaterial 
          color={isDarkMode ? "#aa0000" : "#880000"}
        />
      </lineSegments>

      {/* Face numbers */}
      {DICE_FACE_NUMBERS.map((face, i) => (
        <Text
          key={i}
          position={face.position}
          rotation={face.rotation}
          fontSize={0.25}
          color="white"
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
        >
          {face.value}
        </Text>
      ))}
    </group>
  );
}

// ============================================================================
// MAIN DICE GAME COMPONENT
// ============================================================================
export function DiceGame({ position, zoneSize }: DiceGameProps) {
  
  // HOOKS & EXTERNAL DEPENDENCIES
  // --------------------------------------------------------------------------
  const { camera, gl } = useThree();
  const { keys, resetInteract } = useKeyboard();
  const { isDarkMode } = useTheme();
  
  // PHYSICS & GAME STATE REFERENCES
  // --------------------------------------------------------------------------
  const worldRef = useRef<CANNON.World | null>(null);
  const diceStatesRef = useRef<DiceState[]>([]);
  const rollTimeRef = useRef(0);
  const hasSettledRef = useRef(false);
  
  // GAME STORE STATE
  // --------------------------------------------------------------------------
  const { 
    currentRoom,
    isNearMiniGame,
    setIsNearMiniGame,
    isRolling,
    setIsRolling,
    setDiceResult,
    isLocked,
    currentBet,
    betAmount,
    addMoney,
    setCurrentBet,
    setBetAmount,
    isMiniGameActive,
    setIsMiniGameActive,
    shouldTriggerRoll,
    clearTriggerRoll,
    lastBetForResult,
    lastBetAmountForResult,
  } = useGameStore();

  // ==========================================================================
  // GAME LOGIC FUNCTIONS
  // ==========================================================================
  
  // DICE ROLL EXECUTION
  // --------------------------------------------------------------------------
  const executeRoll = useCallback(() => {
    if (!worldRef.current || diceStatesRef.current.length === 0) return;
    
    // Reset roll state
    setIsRolling(true);
    hasSettledRef.current = false;
    rollTimeRef.current = 0;
    setDiceResult(null);
    
    // Dice starting offsets (two dice side by side)
    const offsets = [[-0.8, 0], [0.8, 0]];
    
    // Apply physics to each dice
    diceStatesRef.current.forEach((dice, i) => {
      // Position above the table
      dice.body.position.set(position[0] + offsets[i][0], position[1] + 2.5, position[2]);
      
      // Random initial rotation
      dice.body.quaternion.setFromEuler(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );
      
      // Apply initial velocity and spin
      dice.body.velocity.set(
        (Math.random() - 0.5) * 5,
        -5,
        (Math.random() - 0.5) * 5
      );
      
      dice.body.angularVelocity.set(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20
      );
    });
  }, [position, setDiceResult, setIsRolling]);

  // RESULT PROCESSING
  // --------------------------------------------------------------------------
  const processRollResult = useCallback((newValues: number[]) => {
    hasSettledRef.current = true;
    setIsRolling(false);
    
    // Calculate and store result
    const total = newValues[0] + newValues[1];
    const result = {
      dice1: newValues[0],
      dice2: newValues[1],
      dice3: 0, // For compatibility with craps
      total,
    };
    
    setDiceResult(result);
    
    // Check bet result
    const bet = lastBetForResult;
    const amount = lastBetAmountForResult;
    
    if (bet === total) {
      const winnings = amount * 2;
      addMoney(winnings);
    }
    
    // Clear bet
    setCurrentBet(null);
    setBetAmount(0);
  }, [setDiceResult, setIsRolling, addMoney, lastBetForResult, lastBetAmountForResult, setCurrentBet, setBetAmount]);

  // PROXIMITY CHECK LOGIC
  // --------------------------------------------------------------------------
  const handleProximityCheck = useCallback(() => {
    const playerPos = camera.position;
    const zoneCenter = new THREE.Vector3(position[0], position[1], position[2]);
    const distance = playerPos.distanceTo(zoneCenter);
    
    const isNear = distance < DICE_CONFIG.PHYSICS.PROXIMITY_RADIUS;
    if (isNear !== isNearMiniGame) {
      setIsNearMiniGame(isNear);
      if (!isNear) {
        setIsMiniGameActive(false);
        setCurrentBet(null);
        setBetAmount(0);
      }
    }
    
    // Add isMiniGameActive to the condition
    if (isNear && keys.current.interact && isLocked && !isMiniGameActive) {
      resetInteract();
      setIsMiniGameActive(true);
      document.exitPointerLock();
    }
  }, [
    camera, 
    position, 
    isNearMiniGame, 
    isLocked, 
    keys, 
    resetInteract, 
    setIsNearMiniGame, 
    setIsMiniGameActive, 
    setCurrentBet, 
    setBetAmount,
    isMiniGameActive
  ]);

  // ROLLING PHYSICS UPDATE
  // --------------------------------------------------------------------------
  const handleRollingPhysics = useCallback((delta: number) => {
    if (!isRolling) return;
    
    rollTimeRef.current += delta;
    let allSettled = true;
    const newValues: number[] = [];

    diceStatesRef.current.forEach((dice) => {
      // Update mesh position
      if (dice.mesh) {
        dice.mesh.position.copy(dice.body.position as unknown as THREE.Vector3);
        dice.mesh.quaternion.copy(dice.body.quaternion as unknown as THREE.Quaternion);
      }

      // Check if dice has settled
      const speed = dice.body.velocity.length();
      const angularSpeed = dice.body.angularVelocity.length();
      
      if (speed > DICE_CONFIG.PHYSICS.SETTLE_THRESHOLD || angularSpeed > DICE_CONFIG.PHYSICS.SETTLE_THRESHOLD) {
        allSettled = false;
      }

      // Calculate current face value
      const quat = new THREE.Quaternion(
        dice.body.quaternion.x,
        dice.body.quaternion.y,
        dice.body.quaternion.z,
        dice.body.quaternion.w
      );
      newValues.push(getDiceValue(quat));
    });

    // Settle detection
    if ((allSettled || rollTimeRef.current > DICE_CONFIG.TIMING.MAX_ROLL_TIME) && !hasSettledRef.current) {
      processRollResult(newValues);
    }
  }, [isRolling, processRollResult]);

  // UPDATE DICE MESHES HELPER
  // --------------------------------------------------------------------------
  const updateDiceMeshes = useCallback(() => {
    diceStatesRef.current.forEach((dice) => {
      if (dice.mesh) {
        dice.mesh.position.copy(dice.body.position as unknown as THREE.Vector3);
        dice.mesh.quaternion.copy(dice.body.quaternion as unknown as THREE.Quaternion);
      }
    });
  }, []);

  // ==========================================================================
  // USE EFFECTS
  // ==========================================================================
  
  // EXIT GAME HANDLER (Q key)
  // --------------------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyQ' && isMiniGameActive) {
        setIsMiniGameActive(false);
        
        // Refund any active bet
        if (currentBet !== null && betAmount > 0) {
          addMoney(betAmount);
          setCurrentBet(null);
          setBetAmount(0);
        }
        
        gl.domElement.requestPointerLock();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMiniGameActive, currentBet, betAmount, addMoney, setCurrentBet, setBetAmount, setIsMiniGameActive, gl]);

  // PHYSICS WORLD INITIALIZATION
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (currentRoom !== 'minigame1') return;

    const world = new CANNON.World();
    world.gravity.set(0, -30, 0);
    world.broadphase = new CANNON.NaiveBroadphase();
    
    // Materials
    const diceMaterial = new CANNON.Material('dice');
    const groundMaterial = new CANNON.Material('ground');
    const wallMaterial = new CANNON.Material('wall');
    
    // Contact materials
    const diceGroundContact = new CANNON.ContactMaterial(diceMaterial, groundMaterial, {
      friction: 0.5,
      restitution: 0.3,
    });
    world.addContactMaterial(diceGroundContact);
    
    const diceWallContact = new CANNON.ContactMaterial(diceMaterial, wallMaterial, {
      friction: 0.1,
      restitution: 0.5,
    });
    world.addContactMaterial(diceWallContact);

    // ENVIRONMENT BODIES
    // Ground
    const groundBody = new CANNON.Body({
      mass: 0,
      position: new CANNON.Vec3(position[0], position[1] + 0.05, position[2]),
      shape: new CANNON.Box(new CANNON.Vec3(zoneSize[0] / 2, 0.1, zoneSize[2] / 2)),
      material: groundMaterial,
    });
    world.addBody(groundBody);

    // Walls (containment)
    const northWall = new CANNON.Body({
      mass: 0,
      position: new CANNON.Vec3(position[0], position[1] + DICE_CONFIG.PHYSICS.WALL_HEIGHT / 2, position[2] - zoneSize[2] / 2),
      shape: new CANNON.Box(new CANNON.Vec3(zoneSize[0] / 2, DICE_CONFIG.PHYSICS.WALL_HEIGHT / 2, DICE_CONFIG.PHYSICS.WALL_THICKNESS / 2)),
      material: wallMaterial,
    });
    world.addBody(northWall);
    
    const southWall = new CANNON.Body({
      mass: 0,
      position: new CANNON.Vec3(position[0], position[1] + DICE_CONFIG.PHYSICS.WALL_HEIGHT / 2, position[2] + zoneSize[2] / 2),
      shape: new CANNON.Box(new CANNON.Vec3(zoneSize[0] / 2, DICE_CONFIG.PHYSICS.WALL_HEIGHT / 2, DICE_CONFIG.PHYSICS.WALL_THICKNESS / 2)),
      material: wallMaterial,
    });
    world.addBody(southWall);
    
    const eastWall = new CANNON.Body({
      mass: 0,
      position: new CANNON.Vec3(position[0] + zoneSize[0] / 2, position[1] + DICE_CONFIG.PHYSICS.WALL_HEIGHT / 2, position[2]),
      shape: new CANNON.Box(new CANNON.Vec3(DICE_CONFIG.PHYSICS.WALL_THICKNESS / 2, DICE_CONFIG.PHYSICS.WALL_HEIGHT / 2, zoneSize[2] / 2)),
      material: wallMaterial,
    });
    world.addBody(eastWall);
    
    const westWall = new CANNON.Body({
      mass: 0,
      position: new CANNON.Vec3(position[0] - zoneSize[0] / 2, position[1] + DICE_CONFIG.PHYSICS.WALL_HEIGHT / 2, position[2]),
      shape: new CANNON.Box(new CANNON.Vec3(DICE_CONFIG.PHYSICS.WALL_THICKNESS / 2, DICE_CONFIG.PHYSICS.WALL_HEIGHT / 2, zoneSize[2] / 2)),
      material: wallMaterial,
    });
    world.addBody(westWall);

    // DICE BODIES
    const diceStates = createDiceBodies(world, position, diceMaterial);

    // Store references
    worldRef.current = world;
    diceStatesRef.current = diceStates;

    // Cleanup
    return () => {
      worldRef.current = null;
      diceStatesRef.current = [];
    };
  }, [currentRoom, position, zoneSize]);

  // ROLL TRIGGER HANDLER
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (shouldTriggerRoll && !isRolling) {
      clearTriggerRoll();
      executeRoll();
    }
  }, [shouldTriggerRoll, isRolling, clearTriggerRoll, executeRoll]);

  // ==========================================================================
  // GAME LOOP (useFrame)
  // ==========================================================================
  useFrame((_, delta) => {
    if (currentRoom !== 'minigame1') return;
    
    // PROXIMITY CHECK & GAME ENTRY
    handleProximityCheck();
    
    // PHYSICS SIMULATION
    if (worldRef.current) {
      worldRef.current.step(1 / 60, delta, 3);
      
      if (isRolling) {
        handleRollingPhysics(delta);
      } else {
        updateDiceMeshes();
      }
    }
  });

  // REF HANDLER
  const setDiceMeshRef = (index: number) => (group: THREE.Group | null) => {
    if (group && diceStatesRef.current[index]) {
      diceStatesRef.current[index].mesh = group;
    }
  };

  // RENDER GUARD
  if (currentRoom !== 'minigame1') return null;

  // ==========================================================================
  // RENDER
  // ==========================================================================
  return (
    <group>
      {/* Table Surface */}
      <mesh position={[position[0], position[1] + 0.01, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[zoneSize[0], zoneSize[2]]} />
        <meshBasicMaterial 
          color={isDarkMode ? "#ff8888" : "#ff6666"} 
          transparent 
          opacity={0.2} 
        />
      </mesh>

      {/* Containment Walls */}
      <DiceTableWalls position={position} zoneSize={zoneSize} />

      {/* Dice */}
      {[0, 1].map((i) => (
        <Dice 
          key={i} 
          diceRef={setDiceMeshRef(i)}
          initialPosition={[
            position[0] + (i === 0 ? -0.6 : 0.6),
            position[1] + 0.5,
            position[2]
          ]}
        />
      ))}
    </group>
  );
}
