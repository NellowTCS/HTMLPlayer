import { defineConfig, Plugin } from 'vite';
import commonjs from '@rollup/plugin-commonjs';
import path from 'node:path';

function handleModuleExports(): Plugin {
  return {
    name: 'handle-module-exports',
    transform(code, id) {
      if (id.includes('file-saver')) {
        // Convert the CommonJS module to an ES module by wrapping it
        return {
          code: `
            const moduleExports = {};
            (function(module, exports) {
              ${code}
            })(moduleExports, moduleExports);
            export const { saveAs } = moduleExports;
            export default moduleExports.saveAs;
          `,
          map: null
        };
      }
      if (id.includes('libtess')) {
        // Wrap the CommonJS module and ensure proper binding for libtess
        return {
          code: `
            var moduleExports = {};
            var window = typeof window !== 'undefined' ? window : {};
            (function(exports) {
              var module = { exports: exports };
              var self = this;
              ${code}
              return module.exports;
            }).call(moduleExports, moduleExports);
            if (typeof window !== 'undefined') {
              window.libtess = moduleExports;
            }
            export default moduleExports;
          `,
          map: null
        };
      }
      if (id.includes('omggif')) {
        // Handle GifWriter and GifReader exports
        return {
          code: `
            const moduleExports = {};
            (function(module, exports) {
              ${code}
            })(moduleExports, moduleExports);
            export const { GifWriter, GifReader } = moduleExports;
            export default moduleExports;
          `,
          map: null
        };
      }
      if (id.includes('bezier-path')) {
        // Handle createFromCommands export
        return {
          code: `
            const moduleExports = {};
            (function(module, exports) {
              ${code}
            })(moduleExports, moduleExports);
            export const { createFromCommands } = moduleExports;
            export default moduleExports;
          `,
          map: null
        };
      }
      if (id.includes('unicode-range')) {
        // Handle UnicodeRange export
        return {
          code: `
            const moduleExports = {};
            (function(module, exports) {
              ${code}
            })(moduleExports, moduleExports);
            export const { UnicodeRange } = moduleExports;
            export default moduleExports;
          `,
          map: null
        };
      }
      if (id.includes('escodegen.js')) {
        // Handle escodegen exports
        return {
          code: `
            const moduleExports = {};
            (function(module, exports) {
              var define;
              ${code}
            })(moduleExports, moduleExports);
            const escodegen = moduleExports;
            export default escodegen;
          `,
          map: null
        };
      }
      return null;
    }
  };
}

export default defineConfig({
  resolve: {
    dedupe: ['debug', 'ieee754'],
    alias: {
      'jsmediatags': path.resolve(__dirname, 'node_modules/jsmediatags/dist/jsmediatags.min.js'),
      'libtess': path.resolve(__dirname, 'node_modules/libtess/libtess.min.js'),
      'file-saver': path.resolve(__dirname, 'node_modules/file-saver/FileSaver.js'),
      'omggif': path.resolve(__dirname, 'node_modules/omggif/omggif.js'),
      '@davepagurek/bezier-path': path.resolve(__dirname, 'node_modules/@davepagurek/bezier-path/build/bezier-path.js'),
      '@japont/unicode-range': path.resolve(__dirname, 'node_modules/@japont/unicode-range/lib/index.js'),
      'escodegen': path.resolve(__dirname, 'node_modules/escodegen/escodegen.js')
    }
  },
  optimizeDeps: {
    include: [
      'sanitize-html',
      'howler',
      'file-saver',
      'libtess',
      'p5',
      'debug',
      'ieee754',
      'token-types',
      '@tokenizer/inflate',
      'jsmediatags',
      'omggif',
      '@davepagurek/bezier-path',
      '@japont/unicode-range',
      'escodegen'
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
        /node_modules\/libtess/,
        /node_modules\/file-saver/,
        /node_modules\/omggif/,
        /node_modules\/@davepagurek\/bezier-path/,
        /node_modules\/@japont\/unicode-range/,
        /node_modules\/escodegen/,
      ],
      defaultIsModuleExports: true,
      requireReturnsDefault: 'namespace'
    },
    rollupOptions: {
      input: path.resolve(__dirname, 'src/index.html'),
      output: {
        format: 'es',
        generatedCode: 'es2015',
        interop: 'auto'
      }
    }
  },
  plugins: [
    handleModuleExports(),
    commonjs({
      transformMixedEsModules: true,
      dynamicRequireTargets: [
        'node_modules/jsmediatags/dist/jsmediatags.min.js',
        'node_modules/libtess/libtess.min.js',
        'node_modules/file-saver/FileSaver.js',
        'node_modules/omggif/omggif.js',
        'node_modules/@davepagurek/bezier-path/build/bezier-path.js',
        'node_modules/@japont/unicode-range/lib/index.js',
        'node_modules/escodegen/escodegen.js'
      ],
      ignoreDynamicRequires: false,
      requireReturnsDefault: 'namespace'
    })
  ]
});
