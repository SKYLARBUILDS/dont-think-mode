import type { CapacitorConfig } from '@capacitor/cli';

// Thin native shell: the WKWebView loads the live /pro site directly, so web
// changes ship without recompiling the .ipa. (For a fully-bundled offline build
// instead, remove `server` and point webDir at the static export — see
// scripts/build-capacitor.sh.)
const config: CapacitorConfig = {
  appId: 'love.skylar.dontthink',
  appName: "Don't Think Mode",
  webDir: 'mobile-shell',
  server: {
    url: 'https://skylar-life-os-pro.vercel.app/pro',
    cleartext: false,
  },
};

export default config;
