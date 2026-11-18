import '@fontsource/bungee/400.css';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/600.css';
import '@fontsource/silkscreen/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/vt323/400.css';
import '@lichess-org/chessground/assets/chessground.base.css';
import './styles.css';
import './arcade.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { listenForAppLogin } from './auth';
import { StoreProvider } from './store';

listenForAppLogin();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
);
