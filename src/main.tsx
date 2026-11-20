import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MvrtGeneratorApp } from './components/mvrt/MvrtGeneratorApp';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MvrtGeneratorApp />
  </StrictMode>
);
