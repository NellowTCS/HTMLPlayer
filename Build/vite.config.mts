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
      include: [/node_modules/],
      transformMixedEsModules: true,
      requireReturnsDefault: true,
      dynamicRequireTargets: [
        'node_modules/localforage/dist/localforage.js',
        'node_modules/sanitize-html/index.js',
        'node_modules/howler/dist/howler.js',
        'node_modules/jsmediatags/dist/jsmediatags.min.js'
      ]
    }),
  ],
  optimizeDeps: {
    include: [
      'jsmediatags',
      'localforage',
      'sanitize-html',
      'howler',
    ],
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
      requireReturnsDefault: true
    },
    rollupOptions: {
      input: 'src/index.html',
    },
  },
});
