const webpack = require('webpack');
var sandboxConfig = {
  target: 'web',
  mode: 'development',
  devtool: 'eval-source-map',
  entry: './samples/main.js',
  output: {
    filename: '../samples/main_pack.js'
  },
  plugins: [
    new webpack.optimize.OccurrenceOrderPlugin(true)
  ]
};

module.exports = [sandboxConfig];
