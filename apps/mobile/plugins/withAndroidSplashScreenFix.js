const { withAppBuildGradle } = require('expo/config-plugins');

module.exports = function withAndroidSplashScreenFix(config) {
  return withAppBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes('androidx.core:core-splashscreen')) {
      config.modResults.contents = config.modResults.contents.replace(
        /dependencies\s*\{/,
        `dependencies {\n    implementation("androidx.core:core-splashscreen:1.0.1")`
      );
    }
    return config;
  });
};
