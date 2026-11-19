import fs from 'fs';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Dev-only API for the music studio (design/music-studio.html): lists assets/music and saves game/audio/tracks.json.
const musicStudio = (): Plugin => ({
  name: 'music-studio',
  apply: 'serve',
  configureServer(server) {
    const musicDir = path.resolve(__dirname, 'assets/music');
    const dataFile = path.resolve(__dirname, 'game/audio/tracks.json');
    server.middlewares.use('/__music/state', (_req, res) => {
      const files = fs.existsSync(musicDir) ? fs.readdirSync(musicDir).filter((f) => /\.(mp3|ogg|wav|m4a)$/i.test(f)).sort() : [];
      const data = fs.existsSync(dataFile) ? JSON.parse(fs.readFileSync(dataFile, 'utf8')) : { version: 1, slots: {}, tracks: {} };
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ files, data }));
    });
    server.middlewares.use('/__music/save', (req, res) => {
      if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
      let body = '';
      req.on('data', (c) => { body += c; });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (!data || typeof data.tracks !== 'object' || typeof data.slots !== 'object') throw new Error('bad payload');
          fs.writeFileSync(dataFile, JSON.stringify(data, null, 1) + '\n');
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true }));
        } catch (e) {
          res.statusCode = 400;
          res.end(JSON.stringify({ ok: false, error: String(e) }));
        }
      });
    });
  },
});

export default defineConfig({
  server: {
    port: 5555,
    host: '0.0.0.0',
  },
  plugins: [react(), musicStudio()],
  build: {
    rollupOptions: {
      output: {
        // no spaces / accents in asset URLs (music files are named by hand)
        assetFileNames: (a) => {
          const name = (a.names?.[0] ?? 'asset').replace(/\.[^.]+$/, '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '-').replace(/-+/g, '-').toLowerCase();
          return `assets/${name}-[hash][extname]`;
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});
