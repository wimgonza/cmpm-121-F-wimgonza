import * as THREE from 'three';
import type { RoomConfig, RoomType } from '../types';

// ============================================================================
// ROOM CONFIGURATIONS
// ============================================================================
export const ROOM_CONFIGS: Record<RoomType, RoomConfig> = {
  main: {
    id: 'main',
    name: 'Main Lobby',
    size: { width: 30, height: 8, depth: 30 },
    floorColor: '#555566',
    wallColor: '#444455',
    portals: [
      {
        id: 'portal-north',
        position: new THREE.Vector3(0, 1.8, -14),
        targetRoom: 'minigame1',
        color: '#ff6b6b',
        label: 'Minigame 1',
      },
      {
        id: 'portal-east',
        position: new THREE.Vector3(14, 1.8, 0),
        targetRoom: 'minigame2',
        color: '#4ecdc4',
        label: 'Minigame 2',
      },
      {
        id: 'portal-south',
        position: new THREE.Vector3(0, 1.8, 14),
        targetRoom: 'minigame3',
        color: '#ffe66d',
        label: 'Minigame 3',
      },
      {
        id: 'portal-west',
        position: new THREE.Vector3(-14, 1.8, 0),
        targetRoom: 'minigame4',
        color: '#a855f7',
        label: 'Minigame 4',
      },
    ],
  },
  minigame1: {
    id: 'minigame1',
    name: 'Minigame 1 - Dice Room',
    size: { width: 20, height: 6, depth: 20 },
    floorColor: '#884444',
    wallColor: '#663333',
    spawnPosition: new THREE.Vector3(0, 0.5, 7),
    portals: [
      {
        id: 'portal-back',
        position: new THREE.Vector3(0, 1.8, 9),
        targetRoom: 'main',
        color: '#ffffff',
        label: 'Back to Lobby',
      },
    ],
  },
  minigame2: {
    id: 'minigame2',
    name: 'Minigame 2 - Basketball',
    size: { width: 20, height: 8, depth: 20 },
    floorColor: '#448888',
    wallColor: '#336666',
    spawnPosition: new THREE.Vector3(0, 0.5, 7),
    portals: [
      {
        id: 'portal-back',
        position: new THREE.Vector3(0, 1.8, 9),
        targetRoom: 'main',
        color: '#ffffff',
        label: 'Back to Lobby',
      },
    ],
  },
  minigame3: {
    id: 'minigame3',
    name: 'Minigame 3 - Gold Zone',
    size: { width: 20, height: 6, depth: 20 },
    floorColor: '#888844',
    wallColor: '#666633',
    spawnPosition: new THREE.Vector3(0, 0.5, 7),
    portals: [
      {
        id: 'portal-back',
        position: new THREE.Vector3(0, 1.8, 9),
        targetRoom: 'main',
        color: '#ffffff',
        label: 'Back to Lobby',
      },
    ],
  },
  minigame4: {
    id: 'minigame4',
    name: 'Minigame 4 - Purple Zone',
    size: { width: 20, height: 6, depth: 20 },
    floorColor: '#664488',
    wallColor: '#553366',
    spawnPosition: new THREE.Vector3(0, 0.5, 7),
    portals: [
      {
        id: 'portal-back',
        position: new THREE.Vector3(0, 1.8, 9),
        targetRoom: 'main',
        color: '#ffffff',
        label: 'Back to Lobby',
      },
    ],
  },
};

// ============================================================================
// MINIGAME ZONE CONFIGURATIONS
// ============================================================================
export const MINIGAME_ZONE_CONFIG = {
  minigame1: {
    position: [0, 0, -4] as [number, number, number],
    size: [4, 0.1, 4] as [number, number, number],
  },
  minigame2: {
    position: [0, 0, -2] as [number, number, number],
    size: [12, 0.1, 10] as [number, number, number],
  },
  minigame3: {
    position: [0, 0, -4] as [number, number, number],
    size: [6, 0.1, 6] as [number, number, number],
  },
  minigame4: {
    position: [0, 0, -4] as [number, number, number],
    size: [6, 0.1, 6] as [number, number, number],
  },
};

// ============================================================================
// PLAYER CONFIGURATION
// ============================================================================
export const PLAYER_CONFIG = {
  // Physical dimensions
  height: 1.8,
  radius: 0.4,
  mass: 80,
  
  // Camera settings
  eyeHeight: 2.5,
  spawnHeight: 0.5,
  
  // Movement settings
  moveSpeed: 15,
  sprintMultiplier: 2,
  jumpForce: 8,
  
  // Input settings
  mouseSensitivity: 0.5,
};

// ============================================================================
// PHYSICS CONFIGURATION
// ============================================================================
export const PHYSICS_CONFIG = {
  // World settings
  gravity: -20,
  
  // Material properties
  groundFriction: 0.5,
  wallFriction: 0,
  groundRestitution: 0,
  wallRestitution: 0,
};

// ============================================================================
// PORTAL CONFIGURATION
// ============================================================================
export const PORTAL_CONFIG = {
  // Dimensions
  width: 2,
  height: 3,
  
  // Interaction
  interactionDistance: 3,
};