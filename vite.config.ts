import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cvApiPlugin } from './server/cvApiPlugin.ts';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/cv-studio/' : '/',
  plugins: [react(), cvApiPlugin()],
}));
