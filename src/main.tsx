import { createRoot } from 'react-dom/client';
import { App } from './App';
import { LangProvider } from './i18n';
import { StoreProvider } from './store';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <LangProvider>
    <StoreProvider>
      <App />
    </StoreProvider>
  </LangProvider>,
);
