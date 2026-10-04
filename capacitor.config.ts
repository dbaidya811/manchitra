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
  },
  plugins: {
    SystemBars: {
      // Do not draw the web content under the status bar / navigation bar.
      // Keeps the header and search bar below the time/battery/network area.
      insetsHandling: 'native'
    }
  }
};

export default config;