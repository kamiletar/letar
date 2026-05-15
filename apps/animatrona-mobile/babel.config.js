module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // Path aliases
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        alias: {
          '@': './src',
        },
      },
    ],
    // Reanimated ДОЛЖЕН быть последним плагином
    'react-native-reanimated/plugin',
  ],
}
