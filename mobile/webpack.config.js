const { createWebpackConfigAsync } = require('@expo/webpack-config');

module.exports = async function(env, argv) {
  const config = await createWebpackConfigAsync(env, argv);

  // Alias để thay thế lottie-react-native với lottie-react trên Web
  config.resolve.alias = {
    ...config.resolve.alias,
    'lottie-react-native': 'lottie-react'
  };

  return config;
};
