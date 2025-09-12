import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.a9b4a6152ce94ddeb6fdfee5718721a4',
  appName: 'FloorPlan Creator',
  webDir: 'dist',
  server: {
    url: 'https://a9b4a615-2ce9-4dde-b6fd-fee5718721a4.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#3b82f6",
      showSpinner: false
    }
  }
};

export default config;