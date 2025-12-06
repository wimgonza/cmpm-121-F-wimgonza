import { useGameStore } from '../hooks/useGameStore';
import { useI18n } from '../hooks/useI18n';

// ============================================================================
// START SCREEN COMPONENT
// ============================================================================
export function StartScreen() {
  // GAME STATE
  const { isPlaying, setIsPlaying } = useGameStore();
  const { t } = useI18n();

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
      <h1>{t('ui.startScreen.title')}</h1>
      <p>{t('ui.startScreen.subtitle')}</p>

      {/* START BUTTON */}
      <button className="start-button" onClick={handleStart}>
        {t('ui.startScreen.startButton')}
      </button>

      {/* CONTROLS INFO */}
      <div className="controls-info">
        <span>{t('ui.startScreen.controls')}</span>
        <span>{t('ui.startScreen.controls2')}</span>
      </div>
    </div>
  );
}