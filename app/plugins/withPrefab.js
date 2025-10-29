// plugins/withPrefab.js
const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Ensures:
 * android {
 *   buildFeatures {
 *     prefab true
 *   }
 * }
 */
module.exports = function withPrefab(config) {
  return withAppBuildGradle(config, (cfg) => {
    const src = cfg.modResults.contents;

    // If buildFeatures already has prefab true, do nothing
    if (/buildFeatures\s*\{[^}]*prefab\s+true/m.test(src)) {
      return cfg;
    }

    // Inject buildFeatures { prefab true } at top of the existing android { ... } block
    const updated = src.replace(
      /android\s*\{/,
      `android {
    buildFeatures {
        prefab true
    }`
    );

    cfg.modResults.contents = updated;
    return cfg;
  });
};

