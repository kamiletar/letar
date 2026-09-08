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
    // libs/ipfs-kubo-core компилируется под node16/nodenext — относительные импорты внутри неё
    // пишут явный '.js' (per TS-конвенцию), extensionAlias учит webpack резолвить его в '.ts'
    extensionAlias: {
      '.js': ['.ts', '.js'],
    },
    alias: {
      // SHARED IPFS/Kubo-логика (только READ-часть нужна плееру) — та же схема алиаса,
      // что apps/animatrona/main/webpack.config.js
      '@letar/ipfs-kubo-core': path.resolve(__dirname, '../../../libs/ipfs-kubo-core/src'),
    },
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
    // libsql — native SQLite driver для Prisma 7 (N-API pre-built binding), не бандлится
    // webpack'ом (README.md/.node внутри платформенных пакетов не парсятся как модули) —
    // тот же паттерн, что apps/animatrona/main/webpack.config.js
    libsql: 'commonjs libsql',
    // Нативные (.node) модули добавляй сюда по мере необходимости (sharp, canvas...) —
    // см. .claude/rules/electron.md § «Грабли» про транзитивные зависимости под Bun
  },
  node: {
    __dirname: false,
    __filename: false,
  },
}
