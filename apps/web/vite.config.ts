import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Caminhos relativos: o mesmo build serve o site e o app Android (Capacitor).
  base: './',
  build: { target: 'es2022', sourcemap: true },
});
