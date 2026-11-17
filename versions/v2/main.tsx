import React from 'react';
import type { Root } from 'react-dom/client';
import App from './App';
import './styles/game.css';
import { VersionBack } from '../VersionBack';

export const mount = (root: Root) => {
  root.render(<><App /><VersionBack /></>);
};
