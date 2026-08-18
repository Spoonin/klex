import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  // GitHub Pages serves this project under https://spoonin.github.io/klex/.
  base: command === 'build' ? '/klex/' : '/',
  plugins: [svelte()],
  worker: { format: 'es' },
}));
