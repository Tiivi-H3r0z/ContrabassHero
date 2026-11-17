import React from 'react';
import type { Root } from 'react-dom/client';
import App from './App';
import './v1.css';
import { VersionBack } from '../VersionBack';

// V1 relies on the Tailwind play CDN (as in the original AI Studio build).
const loadTailwind = () => new Promise<void>((resolve) => {
  const s = document.createElement('script');
  s.src = 'https://cdn.tailwindcss.com';
  s.onload = () => resolve();
  s.onerror = () => resolve();
  document.head.appendChild(s);
});

export const mount = async (root: Root) => {
  await loadTailwind();
  root.render(<><App /><VersionBack /></>);
};
