const path = require('path')

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  target: 'electron-main',
  entry: {
    background: './main/background.ts',
    preload: './main/preload.ts',
  },
  output: {
    path: path.resolve(__dirname, '../app'),
    filename: '[name].js',
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
            configFile: path.resolve(__dirname, '../tsconfig.json'),
          },
        },
      },
    ],
  },
  externals: {
    // Electron и Node.js модули не бандлятся
    electron: 'commonjs electron',
    // TypeScript — не нужен в runtime
    typescript: 'commonjs typescript',
    // Нативные (.node) модули добавляй сюда по мере необходимости (sharp, canvas...) —
    // см. .claude/rules/electron.md § «Грабли» про транзитивные зависимости под Bun
  },
  node: {
    __dirname: false,
    __filename: false,
  },
}
