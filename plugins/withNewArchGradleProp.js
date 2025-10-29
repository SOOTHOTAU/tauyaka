
// plugins/withNewArchGradleProp.js
const { withGradleProperties } = require("@expo/config-plugins");

module.exports = function withNewArchGradleProp(config) {
  return withGradleProperties(config, (cfg) => {
    const props = cfg.modResults.filter(
      (p) => p.type !== "property" || p.key !== "newArchEnabled"
    );
    props.push({ type: "property", key: "newArchEnabled", value: "true" });
    cfg.modResults = props;
    return cfg;
  });
};
