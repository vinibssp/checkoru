import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.checkoru',
  appName: 'Checkoru',
  webDir: 'dist',
  android: {
    // Mantém o app sem nenhuma biblioteca do Google Play Services (exigência do F-Droid).
    allowMixedContent: false,
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
