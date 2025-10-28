module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // …any other plugins you use
      'react-native-reanimated/plugin'
    ]
  };
};
