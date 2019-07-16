const path = require('path');
var WebpackNotifierPlugin = require('webpack-notifier');

module.exports = {
  target: 'node',
  entry: './src/server.js',
  // node: {
  //   fs: 'empty',
  //   net:'empty',
  //   tls:'empty'
  // },
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist')
  },
  mode: 'development',
  stats: {
    warnings: false
  },
  // watch: true,
  plugins: [
    new WebpackNotifierPlugin(),
  ],
  optimization: {
    minimize: false // save time
  }
  // devServer: {
  //   contentBase: path.join(__dirname, 'dist'),
  //   compress: false,
  //   port: 8081
  // }
}
