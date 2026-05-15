module.exports = {
  presets: ['@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['.'],
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        alias: {
          '@': './src',
          '@letar/exoplayer-ass': '../../libs/exoplayer-ass/src',
          '@letar/exoplayer-sync': '../../libs/exoplayer-sync/src',
        },
      },
    ],
  ],
}
