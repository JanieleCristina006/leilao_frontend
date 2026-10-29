import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { AppProvider } from './store/AppContext';
import { LiveProvider } from './store/LiveContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppProvider>
        <LiveProvider>
          <App />
        </LiveProvider>
      </AppProvider>
    </BrowserRouter>
  </StrictMode>,
);
