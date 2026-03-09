// Babel config for Expo SDK 52 + Expo Router.
// babel-preset-expo handles JSX transform, React Native, and Expo Router integration.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
