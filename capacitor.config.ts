import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.manchitra.app',
  appName: 'Manchitra',
  webDir: 'dist',
  android: {
    // The web layer talks to the live HTTPS API, so mixed content stays off.
    allowMixedContent: false,
    webContentsDebuggingEnabled: false
  },
  server: {
    androidScheme: 'https'
  }
};

export default config;