// Modern Webpack 5 Configuration for Server (Node.js)
const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const clientConfig = require('./webpack.client.config')();

const serverConfig = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  context: path.resolve(__dirname, 'server'),
  
  entry: {
    app: './app.ts'
  },
  
  output: {
    path: path.resolve(__dirname, 'dist/server'),
    filename: '[name].js',
    libraryTarget: 'commonjs2'
  },
  
  devtool: process.env.NODE_ENV === 'production' ? 'source-map' : 'eval-source-map',
  
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json'],
    modules: [path.resolve(__dirname, 'node_modules')]
  },
  
  target: 'node',
  
  node: {
    __dirname: false,
    __filename: false,
    global: false
  },
  
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              configFile: path.resolve(__dirname, 'server/tsconfig.json')
            }
          }
        ]
      }
    ]
  },
  
  externals: {
    // Don't bundle Node.js built-ins
    express: 'commonjs express',
    compression: 'commonjs compression',
    path: 'commonjs path',
    os: 'commonjs os'
  },
  
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { 
          from: 'package.json',
          to: 'package.json',
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

module.exports = [serverConfig, clientConfig];
