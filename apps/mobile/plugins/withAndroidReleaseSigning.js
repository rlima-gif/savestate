const { withAppBuildGradle } = require('expo/config-plugins');

module.exports = function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes("System.getenv('RELEASE_STORE_FILE')")) {
      const fullSigningBlock = `signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            if (System.getenv('RELEASE_STORE_FILE') != null) {
                storeFile file(System.getenv('RELEASE_STORE_FILE'))
                storePassword System.getenv('RELEASE_STORE_PASSWORD')
                keyAlias System.getenv('RELEASE_KEY_ALIAS')
                keyPassword System.getenv('RELEASE_KEY_PASSWORD')
            }
        }
    }`;

      // Replace default signingConfigs { debug { ... } } with debug and release configs
      config.modResults.contents = config.modResults.contents.replace(
        /signingConfigs\s*\{\s*debug\s*\{[\s\S]*?\}\s*\}/,
        fullSigningBlock
      );

      // Point release buildType signingConfig to release if RELEASE_STORE_FILE is provided, otherwise fallback to debug
      config.modResults.contents = config.modResults.contents.replace(
        /(buildTypes\s*\{[\s\S]*?\n\s*release\s*\{[\s\S]*?)(signingConfig\s+signingConfigs\.debug)/,
        `$1signingConfig (System.getenv('RELEASE_STORE_FILE') != null) ? signingConfigs.release : signingConfigs.debug`
      );
    }
    return config;
  });
};


