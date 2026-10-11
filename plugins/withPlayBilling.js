const { withAppBuildGradle, withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

function withPlayBilling(config) {
  // 1. Add Billing Client 8.0.0 dependency to app/build.gradle
  config = withAppBuildGradle(config, (modConfig) => {
    let contents = modConfig.modResults.contents;
    const dependency = "    implementation 'com.android.billingclient:billing:8.0.0'";
    if (!contents.includes('com.android.billingclient:billing')) {
      if (contents.includes('dependencies {')) {
        contents = contents.replace(
          'dependencies {',
          `dependencies {\n${dependency}`
        );
      } else {
        contents += `\ndependencies {\n${dependency}\n}\n`;
      }
      modConfig.modResults.contents = contents;
    }
    return modConfig;
  });

  // 2. Add BILLING permission to AndroidManifest.xml
  config = withAndroidManifest(config, (modConfig) => {
    AndroidConfig.Permissions.addPermission(modConfig.modResults, 'com.android.vending.BILLING');
    return modConfig;
  });

  return config;
}

module.exports = withPlayBilling;
