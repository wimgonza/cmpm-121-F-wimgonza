import { useEffect, useRef, useCallback } from 'react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================
interface KeyState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  sprint: boolean;
  interact: boolean;
}

// ============================================================================
// KEYBOARD HOOK
// ============================================================================
export function useKeyboard() {
  // KEY STATE REFERENCES
  const keys = useRef<KeyState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    sprint: false,
    interact: false,
  });

  // INTERACT KEY DEBOUNCE
  const interactPressed = useRef(false);

  // ==========================================================================
  // ACTION FUNCTIONS
  // ==========================================================================

  // RESET INTERACT KEY
  const resetInteract = useCallback(() => {
    keys.current.interact = false;
  }, []);

  // ==========================================================================
  // KEYBOARD EVENT LISTENERS
  // ==========================================================================
  useEffect(() => {
    // KEY DOWN HANDLER
    // ------------------------------------------------------------------------
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        // MOVEMENT KEYS
        case 'KeyW':
          keys.current.forward = true;
          break;
        case 'KeyS':
          keys.current.backward = true;
          break;
        case 'KeyA':
          keys.current.left = true;
          break;
        case 'KeyD':
          keys.current.right = true;
          break;
        
        // ACTION KEYS
        case 'Space':
          keys.current.jump = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          keys.current.sprint = true;
          break;
        
        // INTERACTION KEY (E)
        case 'KeyE':
          if (!interactPressed.current) {
            keys.current.interact = true;
            interactPressed.current = true;
          }
          break;
      }
    };

    // KEY UP HANDLER
    // ------------------------------------------------------------------------
    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        // MOVEMENT KEYS
        case 'KeyW':
          keys.current.forward = false;
          break;
        case 'KeyS':
          keys.current.backward = false;
          break;
        case 'KeyA':
          keys.current.left = false;
          break;
        case 'KeyD':
          keys.current.right = false;
          break;
        
        // ACTION KEYS
        case 'Space':
          keys.current.jump = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          keys.current.sprint = false;
          break;
        
        // INTERACTION KEY (E)
        case 'KeyE':
          keys.current.interact = false;
          interactPressed.current = false;
          break;
      }
    };

    // EVENT LISTENER SETUP
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // CLEANUP
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // RETURN VALUES
  return { keys, resetInteract };
}