import { defineConfig } from 'vite';
import commonjs from '@rollup/plugin-commonjs';
import path from 'node:path';

export default defineConfig({
  resolve: {
    dedupe: ['debug', 'ieee754'],
    alias: {
      'jsmediatags': path.resolve(__dirname, 'node_modules/jsmediatags/dist/jsmediatags.min.js'),
    },
  },
  optimizeDeps: {
    include: [
      'sanitize-html',
      'howler',
      'p5',
      'debug',
      'ieee754',
      'token-types',
      '@tokenizer/inflate',
      'jsmediatags'
    ],
    esbuildOptions: {
      target: 'esnext'
    }
  },
  build: {
    target: 'esnext',
    commonjsOptions: {
      transformMixedEsModules: true,
      include: [
        /node_modules/,
        /node_modules\/debug/,
        /node_modules\/ieee754/,
        /node_modules\/token-types/,
        /node_modules\/@tokenizer/,
      ],
      defaultIsModuleExports: true,
    },
    rollupOptions: {
      input: 'src/index.html',
      output: {
        format: 'es',
        generatedCode: 'es2015',
        interop: 'auto',
      }
    }
  },
  plugins: [
    commonjs()
  ]
});
