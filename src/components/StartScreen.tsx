import { useGameStore } from '../hooks/useGameStore';

// ============================================================================
// START SCREEN COMPONENT
// ============================================================================
export function StartScreen() {
  // GAME STATE
  const { isPlaying, setIsPlaying } = useGameStore();

  // RENDER GUARD
  if (isPlaying) return null;

  // EVENT HANDLER
  const handleStart = () => {
    setIsPlaying(true);
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================
  return (
    <div className="start-screen">
      {/* TITLE SECTION */}
      <h1>🎮 3D Mini Games</h1>
      <p>Explore four different minigame rooms!</p>

      {/* START BUTTON */}
      <button className="start-button" onClick={handleStart}>
        Start Game
      </button>

      {/* CONTROLS INFO */}
      <div className="controls-info">
        <span>WASD - Move | Space - Jump | Shift - Sprint</span>
        <span>Mouse - Look | E - Interact (Portals / Games)</span>
      </div>
    </div>
  );
}