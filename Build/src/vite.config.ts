import { defineConfig } from 'vite';
import tailwindcss from 'tailwindcss';

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    rollupOptions: {
      input: '/src/main.ts',
    },
  },
});