import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import commonjs from '@rollup/plugin-commonjs';

export default defineConfig({
  plugins: [
    tailwindcss(), // Loads Tailwind CSS
  ],
  build: {
    rollupOptions: {
      input: 'src/index.html', // Points to the entry HTML
    },
    commonjsOptions: {
      include: [/jsmediatags/, /node_modules/],
    },
  },
});