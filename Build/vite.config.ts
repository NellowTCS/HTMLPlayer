import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    tailwindcss(), // Loads Tailwind CSS
  ],
  build: {
    rollupOptions: {
      input: 'src/index.html', // Points to the entry HTML
    },
  },
});