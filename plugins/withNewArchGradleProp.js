const { withGradleProperties } = require("@expo/config-plugins");

module.exports = function withNewArchGradleProp(config) {
  return withGradleProperties(config, async ({ modResults }) => {
    modResults = modResults || [];
    const key = "newArchEnabled";
    const existing = modResults.find((p) => p.type === "property" && p.key === key);
    if (existing) {
      existing.value = "true";
    } else {
      modResults.push({ type: "property", key, value: "true" });
    }
    return { modResults };
  });
};
