import { defineConfig } from 'vite';
import commonjs from '@rollup/plugin-commonjs';

export default defineConfig({
  resolve: {
    alias: {
      jsmediatags: 'jsmediatags/dist/jsmediatags.min.js',
    },
  },
  plugins: [
    commonjs({
      include: [/node_modules/], // already includes jsmediatags
    }),
  ],
  optimizeDeps: {
    include: ['jsmediatags'], // pre-bundle jsmediatags during dev
  },
  build: {
    rollupOptions: {
      input: 'src/index.html',
    },
    commonjsOptions: {
      include: [/node_modules/, /jsmediatags/], // ensure build treats jsmediatags as CommonJS
    },
  },
});
