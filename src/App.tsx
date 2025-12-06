import { useEffect } from 'react';
import { Game } from './components/Game';
import { UI } from './components/UI';
import { StartScreen } from './components/StartScreen';
import { ThemeProvider } from './components/ThemeProvider.tsx';
import { useI18n } from './hooks/useI18n';
import './index.css';

function App() {
  const { isRTL } = useI18n();
  
  // Set document direction based on language
  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  }, [isRTL]);
  
  return (
    <ThemeProvider>
      <div className="App">
        <StartScreen />
        <Game />
        <UI />
      </div>
    </ThemeProvider>
  );
}

export default App;