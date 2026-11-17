import type { Game } from '../Game';
import type { BossId } from '../data/dialogues';
import { Boss } from './Boss';
import { Directeur } from './Directeur';
import { Aigle } from './Aigle';
import { Kawik } from './Kawik';
import { Tatoo } from './Tatoo';
import { Taupe } from './Taupe';
import { NinjaPain } from './NinjaPain';
import { Serpent } from './Serpent';

type Factory = (g: Game) => Boss;

const FACTORIES: Partial<Record<BossId, Factory>> = {
  directeur: (g) => new Directeur(g),
  aigle: (g) => new Aigle(g),
  kawik: (g) => new Kawik(g),
  tatoo: (g) => new Tatoo(g),
  taupe: (g) => new Taupe(g),
  ninja_pain: (g) => new NinjaPain(g),
  serpent: (g) => new Serpent(g),
};

export const createBoss = (g: Game, id: BossId): Boss => (FACTORIES[id] ?? FACTORIES.directeur!)(g);
