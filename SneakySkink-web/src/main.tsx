import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Suppress harmless React 19 + MUI v5 console warnings regarding unknown props forwarded to the DOM
const originalError = console.error;
console.error = (...args: any[]) => {
  if (
    args[0] && 
    typeof args[0] === 'string' && 
    (args[0].includes('React does not recognize') || 
     args[0].includes('non-boolean attribute') ||
     args[0].includes('item'))
  ) {
    return;
  }
  originalError(...args);
};

const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  if (
    args[0] && 
    typeof args[0] === 'string' && 
    (args[0].includes('React does not recognize') || 
     args[0].includes('non-boolean attribute') ||
     args[0].includes('item'))
  ) {
    return;
  }
  originalWarn(...args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
