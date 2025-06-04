import { defineConfig } from 'vite';
import commonjs from '@rollup/plugin-commonjs';

export default defineConfig({
  optimizeDeps: {
    include: [
      'sanitize-html',
      'howler',
      'p5',
      'debug',
      'ieee754',
      'token-types',
      '@tokenizer/inflate'
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
      defaultIsModuleExports: true
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
  resolve: {
    dedupe: ['debug', 'ieee754']
  },
  plugins: [
    commonjs()
  ]
});
