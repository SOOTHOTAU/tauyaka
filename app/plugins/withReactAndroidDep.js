// plugins/withReactAndroidDep.js
const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withReactAndroidDep(config) {
  return withAppBuildGradle(config, (cfg) => {
    const src = cfg.modResults.contents;
    if (/com\.facebook\.react:react-android/.test(src)) {
      return cfg; // already present
    }
    cfg.modResults.contents = src.replace(
      /dependencies\s*\{/,
      `dependencies {
    implementation("com.facebook.react:react-android")`
    );
    return cfg;
  });
};
