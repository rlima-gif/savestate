import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const isPreview =
    process.env.APP_VARIANT === 'preview' ||
    process.env.EAS_BUILD_PROFILE === 'preview';

  const versionCode = process.env.ANDROID_VERSION_CODE
    ? parseInt(process.env.ANDROID_VERSION_CODE, 10)
    : (config.android?.versionCode ?? 1);

  const packageName = isPreview ? 'com.savestate.app.preview' : 'com.savestate.app';
  const appName = isPreview ? 'SaveState (Preview)' : 'SaveState';

  return {
    ...config,
    name: appName,
    slug: 'savestate',
    version: config.version || '0.1.0',
    android: {
      ...config.android,
      package: packageName,
      versionCode,
    },
    extra: {
      ...config.extra,
      ...(process.env.EAS_PROJECT_ID
        ? { eas: { projectId: process.env.EAS_PROJECT_ID } }
        : {}),
    },
  };
};
