import { Game } from './components/Game';
import { UI } from './components/UI';
import { StartScreen } from './components/StartScreen';
import { ThemeProvider } from './components/ThemeProvider.tsx';
import './index.css';

function App() {
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