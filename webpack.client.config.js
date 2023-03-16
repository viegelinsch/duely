const path = require('path');
const ProgressPlugin = require('webpack/lib/ProgressPlugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const autoprefixer = require('autoprefixer');
const postcssUrl = require('postcss-url');

const { NoEmitOnErrorsPlugin, LoaderOptionsPlugin } = require('webpack');
//TODO const { BaseHrefWebpackPlugin } = require('@angular/cli/plugins/webpack');
//TODO const { CommonsChunkPlugin } = require('webpack').optimize;
//TODO const { AotPlugin } = require('@ngtools/webpack');

const CopyWebpackPlugin = require("copy-webpack-plugin");
const WorkboxWebpackPlugin = require('workbox-webpack-plugin');

const nodeModules = path.join(process.cwd(), 'node_modules');
const entryPoints = ["inline","polyfills","sw-register","styles","vendor","main"];
const baseHref = "";
const deployUrl = "";

const isProduction = process.argv.indexOf('-p') !== -1;

module.exports = function(isElectron) {
  let environmentPath = isElectron ? "environments/environment.electron" : "environments/environment.server";
  environmentPath += isProduction ? "-prod.ts" : ".ts";

  const target = isElectron ? "electron-renderer" : undefined;
  const outputPath = isElectron ? "dist/electron/static" : "dist/server/static";

  return {
    "target": target,
    "devtool": "source-map",
    "resolve": {
      "mainFields": ["browser", "main", "module"],
      "extensions": [
        ".ts",
        ".js"
      ],
      "modules": [
        "./node_modules"
      ]
    },
    "resolveLoader": {
      "modules": [
        "./node_modules"
      ]
    },
    "entry": {
      "main": [
        "./client/main.ts"
      ],
      "polyfills": [
        "./client/polyfills.ts"
      ],
      "styles": [
        "./client/styles.scss"
      ]
    },
    "output": {
      "path": path.join(__dirname, outputPath),
      "filename": "[name].bundle.js",
      "chunkFilename": "[id].chunk.js"
    },
    "module": {
      "rules": [
        {
          "enforce": "pre",
          "test": /\.js$/,
          "loader": "source-map-loader",
          "exclude": [
            /\/node_modules\//
          ]
        },
        {
          "test": /\.json$/,
          "loader": "json-loader"
        },
        {
          "test": /\.html$/,
          "loaders": [
            "raw-loader",
            {
              "loader": "html-minify-loader",
              "options": {
                "quotes": true,
                "dom": {
                  "lowerCaseAttributeNames": false
                }
              }
            }
          ]
        },
        {
          "test": /\.(eot|svg)$/,
          "loader": "file-loader?name=[name].[hash:20].[ext]"
        },
        {
          "test": /\.(jpg|png|gif|otf|ttf|woff|woff2|cur|ani)$/,
          "loader": "file-loader?name=[name].[hash:20].[ext]"
        },
        {
          "exclude": [
            path.join(__dirname, "client/styles.scss")
          ],
          "test": /\.css$/,
          "loaders": [
            "exports-loader?module.exports.toString()",
            "css-loader?{\"sourceMap\":false,\"importLoaders\":1}",
            "postcss-loader"
          ]
        },
        {
          "exclude": [
            path.join(__dirname, "client/styles.scss")
          ],
          "test": /\.scss$|\.sass$/,
          "loaders": [
            "exports-loader?module.exports.toString()",
            "css-loader?{\"sourceMap\":false,\"importLoaders\":1}",
            "postcss-loader",
            "sass-loader"
          ]
        },
        {
          "include": [
            path.join(__dirname, "client/styles.scss")
          ],
          "test": /\.css$/,
          "use": [MiniCssExtractPlugin.loader, "css-loader"],
          "fallback": "style-loader",
          "publicPath": ""
        },
        {
          "include": [
            path.join(__dirname, "client/styles.scss")
          ],
          "test": /\.scss$|\.sass$/,
          "use": [MiniCssExtractPlugin.loader, "css-loader"],
          "fallback": "style-loader",
          "publicPath": ""
        },
        {
          "test": /\.ts$/,
          "loader": "@ngtools/webpack"
        }
      ]
    },
    "plugins": [
      new NoEmitOnErrorsPlugin(),
      new CopyWebpackPlugin({
        patterns: [
          {from: 'client/assets', to: 'assets'},
          {from: 'client/favicon.ico', to: 'favicon.ico'},
      ]}),
      new ProgressPlugin(),
      new HtmlWebpackPlugin({
        "template": "./client/index.html",
        "filename": "./index.html",
        "hash": false,
        "inject": true,
        "compile": true,
        "favicon": false,
        "minify": false,
        "cache": true,
        "showErrors": true,
        "chunks": "all",
        "excludeChunks": [],
        "title": "Duely",
        "xhtml": true,
        "chunksSortMode": function sort(left, right) {
          const leftIndex = entryPoints.indexOf(left.names[0]);
          const rightindex = entryPoints.indexOf(right.names[0]);
          return leftIndex > rightindex ? 1 : leftIndex < rightindex ? -1 : 0;
        }
      }),
      /**TODO new BaseHrefWebpackPlugin({}),
      new CommonsChunkPlugin({
        "name": "inline",
        "minChunks": null
      }),
      **/
      /** TODO new CommonsChunkPlugin({
        "name": "vendor",
        "minChunks": (module) => module.resource && module.resource.startsWith(nodeModules),
        "chunks": [
          "main"
        ]
      }),
      **/
      new MiniCssExtractPlugin({
        filename: "[name].bundle.css",
        chunkFilename: "[id].css"
      }),
      new LoaderOptionsPlugin({
        "sourceMap": false,
        "options": {
          "postcss": [
            autoprefixer(),
            postcssUrl({"url": (URL) => {
              // Only convert root relative URLs, which CSS-Loader won't process into require().
              if (!URL.startsWith('/') || URL.startsWith('//')) {
                  return URL;
              }
              if (deployUrl.match(/:\/\//)) {
                  // If deployUrl contains a scheme, ignore baseHref use deployUrl as is.
                  return `${deployUrl.replace(/\/$/, '')}${URL}`;
              }
              else if (baseHref.match(/:\/\//)) {
                  // If baseHref contains a scheme, include it as is.
                  return baseHref.replace(/\/$/, '') +
                      `/${deployUrl}/${URL}`.replace(/\/\/+/g, '/');
              }
              else {
                  // Join together base-href, deploy-url and the original URL.
                  // Also dedupe multiple slashes into single ones.
                  return `/${baseHref}/${deployUrl}/${URL}`.replace(/\/\/+/g, '/');
              }
          }})
          ],
          "sassLoader": {
            "sourceMap": false,
            "includePaths": []
          },
          "lessLoader": {
            "sourceMap": false
          }/** ,
          "context": "" */
        }
      }),
      /** TODO
      new AotPlugin({
        "mainPath": "main.ts",
        "exclude": [],
        "tsConfigPath": "client/tsconfig.app.json",
        "skipCodeGeneration": true,
        "hostReplacementPaths": {
          "environments/environment.ts": environmentPath
        },
      }),
      */
      new WorkboxWebpackPlugin.GenerateSW({
       cacheId: 'duely',
       swDest: 'service-worker.js',
       navigateFallback: '/index.html',
       runtimeCaching: [{
         urlPattern: /\/vendor\.bundle\.js/,
         handler: 'StaleWhileRevalidate'
       }]
     })
    ],
    "node": {
      "fs": "empty",
      "global": true,
      "crypto": "empty",
      "tls": "empty",
      "net": "empty",
      "process": true,
      "module": false,
      "clearImmediate": false,
      "setImmediate": false
    }
  };
};
