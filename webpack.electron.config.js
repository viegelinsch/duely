// Modern Webpack 5 Configuration for Electron
const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const clientConfig = require('./webpack.client.config')(true);

const electronConfig = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  context: path.resolve(__dirname, 'electron'),
  
  entry: {
    index: './main.ts'
  },
  
  output: {
    path: path.resolve(__dirname, 'dist/electron'),
    filename: '[name].js',
    libraryTarget: 'commonjs2'
  },
  
  devtool: process.env.NODE_ENV === 'production' ? 'source-map' : 'eval-source-map',
  
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json'],
    modules: [path.resolve(__dirname, 'node_modules')]
  },
  
  target: 'electron-main',
  
  node: {
    __dirname: false,
    __filename: false,
    global: true
  },
  
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true
            }
          }
        ]
      }
    ]
  },
  
  externals: {
    // Don't bundle Electron/Node.js built-ins
    electron: 'commonjs electron',
    express: 'commonjs express',
    compression: 'commonjs compression'
  },
  
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { 
          from: 'package.json',
          to: 'package.json',
          noErrorOnMissing: true 
        },
        { 
          from: 'manifest.json',
          to: 'manifest.json',
          noErrorOnMissing: true 
        },
        { 
          from: path.resolve(__dirname, 'LICENSE'),
          to: 'LICENSE',
          noErrorOnMissing: true 
        }
      ]
    }),
    
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
    })
  ],
  
  optimization: {
    minimize: process.env.NODE_ENV === 'production'
  },
  
  stats: {
    colors: true,
    chunks: false,
    modules: false
  }
};

module.exports = [electronConfig, clientConfig];
