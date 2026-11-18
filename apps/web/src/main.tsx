import '@fontsource/alegreya/500.css';
import '@fontsource/alegreya/500-italic.css';
import '@fontsource/alegreya/800.css';
import '@fontsource/alegreya-sans/500.css';
import '@fontsource/alegreya-sans/700.css';
import '@fontsource/alegreya-sans/800.css';
import '@lichess-org/chessground/assets/chessground.base.css';
import './styles.css';
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
