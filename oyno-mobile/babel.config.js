module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['.'],
          alias: {
            '@': '.',
            '@components': './components',
            '@stores': './stores',
            '@services': './services',
            '@constants': './constants',
            '@hooks': './hooks',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
