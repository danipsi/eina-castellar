import {defineConfig} from 'vite';

export default defineConfig({
  server: {
    // Windows: no mantenir els JSON oberts mentre el capturador els substitueix.
    watch: {ignored: ['**/public/data', '**/public/data/**', '**/dades/**', '**/recerca/**']},
  },
});
