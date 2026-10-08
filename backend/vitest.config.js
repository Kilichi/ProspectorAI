import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Las pruebas no deben cambiar de orquestador por el .env del ordenador.
    env: { NODE_ENV: 'test', ORCHESTRATOR: 'backend' },
  },
});
