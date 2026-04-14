// Modern Webpack 5 Configuration for Angular 19
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { ProgressPlugin, DefinePlugin } = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = function(isElectron) {
  const isProduction = process.env.NODE_ENV === 'production';
  const environmentPath = isElectron 
    ? './environments/environment.electron' 
    : './environments/environment.server';
  
  const outputPath = isElectron ? 'dist/electron/static' : 'dist/server/static';
  const target = isElectron ? 'electron-renderer' : 'web';

  return {
    mode: isProduction ? 'production' : 'development',
    target: target,
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.json'],
      modules: ['node_modules', './client']
    },
    
    entry: {
      main: './client/main.ts',
      polyfills: './client/polyfills.ts',
      styles: './client/styles.scss'
    },
    
    output: {
      path: path.join(__dirname, outputPath),
      filename: '[name].[contenthash].bundle.js',
      chunkFilename: '[name].[contenthash].chunk.js',
      clean: true,
      publicPath: '/'
    },
    
    module: {
      rules: [
        // TypeScript
        {
          test: /\.ts$/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                transpileOnly: true,
                configFile: 'client/tsconfig.app.json',
                compilerOptions: {
                  outDir: './dist/out-tsc',
                  declaration: false,
                  sourceMap: true
                }
              }
            }
          ]
        },
        // JSON
        {
          test: /\.json$/,
          type: 'asset/resource'
        },
        // HTML
        {
          test: /\.html$/,
          loader: 'html-loader',
          options: {
            sources: false,
            minimize: isProduction
          }
        },
        // CSS
        {
          test: /\.css$/,
          exclude: [path.join(__dirname, 'client/styles.scss')],
          use: [
            'style-loader',
            {
              loader: 'css-loader',
              options: {
                importLoaders: 1,
                sourceMap: !isProduction
              }
            },
            'postcss-loader'
          ]
        },
        // SCSS/SASS (global styles)
        {
          test: /\.(scss|sass)$/,
          include: [path.join(__dirname, 'client/styles.scss')],
          use: [
            MiniCssExtractPlugin.loader,
            {
              loader: 'css-loader',
              options: {
                importLoaders: 2,
                sourceMap: !isProduction
              }
            },
            'postcss-loader',
            {
              loader: 'sass-loader',
              options: {
                implementation: require('sass'),
                sourceMap: !isProduction
              }
            }
          ]
        },
        // SCSS/SASS (component styles)
        {
          test: /\.(scss|sass)$/,
          exclude: [path.join(__dirname, 'client/styles.scss')],
          use: [
            'style-loader',
            {
              loader: 'css-loader',
              options: {
                importLoaders: 2,
                sourceMap: !isProduction
              }
            },
            'postcss-loader',
            {
              loader: 'sass-loader',
              options: {
                implementation: require('sass'),
                sourceMap: !isProduction
              }
            }
          ]
        },
        // Assets
        {
          test: /\.(png|jpg|jpeg|gif|svg|webp)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'assets/images/[hash][ext][query]'
          }
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'assets/fonts/[hash][ext][query]'
          }
        },
        // Source maps for existing JS
        {
          enforce: 'pre',
          test: /\.js$/,
          loader: 'source-map-loader',
          exclude: [/node_modules/]
        }
      ]
    },
    
    plugins: [
      new HtmlWebpackPlugin({
        template: './client/index.html',
        filename: './index.html',
        inject: 'body',
        minify: isProduction ? {
          collapseWhitespace: true,
          removeComments: true,
          minifyCSS: true,
          minifyJS: true
        } : false,
        chunksSortMode: 'auto'
      }),
      
      new MiniCssExtractPlugin({
        filename: '[name].[contenthash].bundle.css',
        chunkFilename: '[id].[contenthash].chunk.css'
      }),
      
      new CopyWebpackPlugin({
        patterns: [
          { 
            from: 'client/assets', 
            to: 'assets',
            noErrorOnMissing: true 
          },
          { 
            from: 'client/favicon.ico', 
            to: 'favicon.ico',
            noErrorOnMissing: true 
          }
        ]
      }),
      
      new ProgressPlugin(),
      
      // Environment-specific defines
      new DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
        'process.env.ELECTRON': JSON.stringify(isElectron ? 'true' : 'false')
      })
    ],
    
    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            format: {
              comments: false,
            },
          },
          extractComments: false,
        })
      ],
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          defaultVendors: {
            test: /[\\/]node_modules[\\/]/,
            priority: -10,
            name: 'vendor',
            chunks: 'all'
          },
          common: {
            name: 'common',
            minChunks: 2,
            priority: -20,
            chunks: 'all',
            reuseExistingChunk: true
          }
        }
      },
      runtimeChunk: 'single'
    },
    
    devServer: {
      static: {
        directory: path.join(__dirname, 'client'),
        watch: true
      },
      port: 4200,
      hot: true,
      open: false,
      historyApiFallback: true
    },
    
    stats: {
      children: true,
      chunks: false,
      modules: false,
      colors: true
    },
    
    node: {
      global: true
    }
  };
};
