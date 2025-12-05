import { Canvas } from '@react-three/fiber';
import { useGameStore } from '../hooks/useGameStore';
import { usePhysics } from '../hooks/usePhysics';
import { ROOM_CONFIGS } from '../config/rooms';
import { Player } from './Player';
import { Room } from './Room';
import { DebugGUI } from './DebugGUI';

// ============================================================================
// GAME SCENE COMPONENT
// ============================================================================
function GameScene() {
  
  // STATE & CONFIGURATION
  const { currentRoom } = useGameStore();
  const roomConfig = ROOM_CONFIGS[currentRoom];
  
  // PHYSICS HOOK
  const { 
    playerBody, 
    groundMaterial, 
    wallMaterial, 
    addBody, 
    removeBody, 
    clearBodies, 
    step 
  } = usePhysics();

  // ==========================================================================
  // RENDER
  // ==========================================================================
  return (
    <>
      {/* ROOM ENVIRONMENT */}
      <Room
        config={roomConfig}
        addBody={addBody}
        removeBody={removeBody}
        clearBodies={clearBodies}
        groundMaterial={groundMaterial}
        wallMaterial={wallMaterial}
      />
      
      {/* PLAYER CHARACTER */}
      <Player playerBody={playerBody} physicsStep={step} />
      
      {/* DEBUG INTERFACE */}
      <DebugGUI />
    </>
  );
}

// ============================================================================
// MAIN GAME COMPONENT
// ============================================================================
export function Game() {
  
  // GAME STATE CHECK
  const { isPlaying } = useGameStore();

  // Guard: Only render when game is active
  if (!isPlaying) return null;

  // RENDER (Canvas + Game Scene)
  return (
    <Canvas
      camera={{ fov: 75, near: 0.1, far: 1000 }}
      style={{ width: '100vw', height: '100vh' }}
    >
      <GameScene />
    </Canvas>
  );
}