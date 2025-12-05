import { useRef, useEffect } from 'react';
import * as CANNON from 'cannon-es';
import { PHYSICS_CONFIG, PLAYER_CONFIG } from '../config/rooms';

// ============================================================================
// PHYSICS HOOK
// ============================================================================
export function usePhysics() {
  
  // PHYSICS WORLD REFERENCES
  const worldRef = useRef<CANNON.World | null>(null);
  const playerBodyRef = useRef<CANNON.Body | null>(null);
  const groundMaterialRef = useRef<CANNON.Material | null>(null);
  const wallMaterialRef = useRef<CANNON.Material | null>(null);
  const bodiesRef = useRef<CANNON.Body[]>([]);

  // ==========================================================================
  // PHYSICS WORLD INITIALIZATION
  // ==========================================================================
  useEffect(() => {
  
    // WORLD CREATION
    const world = new CANNON.World();
    world.gravity.set(0, PHYSICS_CONFIG.gravity, 0);
    world.broadphase = new CANNON.NaiveBroadphase();
    
    // MATERIAL CREATION
    const groundMaterial = new CANNON.Material('ground');
    const wallMaterial = new CANNON.Material('wall');
    const playerMaterial = new CANNON.Material('player');

    // CONTACT MATERIALS (PLAYER-GROUND)
    const playerGroundContact = new CANNON.ContactMaterial(
      playerMaterial,
      groundMaterial,
      {
        friction: PHYSICS_CONFIG.groundFriction,
        restitution: PHYSICS_CONFIG.groundRestitution,
      }
    );
    world.addContactMaterial(playerGroundContact);

    // CONTACT MATERIALS (PLAYER-WALL)
    const playerWallContact = new CANNON.ContactMaterial(
      playerMaterial,
      wallMaterial,
      {
        friction: PHYSICS_CONFIG.wallFriction,
        restitution: PHYSICS_CONFIG.wallRestitution,
      }
    );
    world.addContactMaterial(playerWallContact);

    // PLAYER BODY CREATION
    const playerShape = new CANNON.Sphere(PLAYER_CONFIG.radius);
    const playerBody = new CANNON.Body({
      mass: PLAYER_CONFIG.mass,
      position: new CANNON.Vec3(0, PLAYER_CONFIG.spawnHeight, 0),
      shape: playerShape,
      material: playerMaterial,
      fixedRotation: true,
      linearDamping: 0,
      angularDamping: 1,
    });
    world.addBody(playerBody);

    // STORE REFERENCES
    worldRef.current = world;
    playerBodyRef.current = playerBody;
    groundMaterialRef.current = groundMaterial;
    wallMaterialRef.current = wallMaterial;

    // CLEANUP FUNCTION
    return () => {
      bodiesRef.current.forEach(body => world.removeBody(body));
      bodiesRef.current = [];
    };
  }, []);

  // ==========================================================================
  // PHYSICS WORLD ACTIONS
  // ==========================================================================

  // ADD BODY TO WORLD
  const addBody = (body: CANNON.Body) => {
    if (worldRef.current) {
      worldRef.current.addBody(body);
      bodiesRef.current.push(body);
    }
  };

  // REMOVE BODY FROM WORLD
  const removeBody = (body: CANNON.Body) => {
    if (worldRef.current) {
      worldRef.current.removeBody(body);
      bodiesRef.current = bodiesRef.current.filter(b => b !== body);
    }
  };

  // CLEAR ALL BODIES (Except player)
  const clearBodies = () => {
    if (worldRef.current) {
      bodiesRef.current.forEach(body => worldRef.current!.removeBody(body));
      bodiesRef.current = [];
    }
  };

  // STEP PHYSICS SIMULATION
  const step = (delta: number) => {
    if (worldRef.current) {
      worldRef.current.step(1 / 60, delta, 3);
    }
  };

  // ==========================================================================
  // RETURN VALUES
  // ==========================================================================
  return {
    world: worldRef,
    playerBody: playerBodyRef,
    groundMaterial: groundMaterialRef,
    wallMaterial: wallMaterialRef,
    addBody,
    removeBody,
    clearBodies,
    step,
  };
}