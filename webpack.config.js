//@ts-check

"use strict";

const webpack = require("webpack");
const path = require("path");

/**@type {import('webpack').Configuration}*/
const config = {
  mode: "none",
  target: "node",
  entry: { extension: "./src/extension.ts" },
  output: {
    path: path.resolve(__dirname, "out"),
    filename: "[name].js",
    libraryTarget: "commonjs",
    devtoolModuleFilenameTemplate: "../[resource-path]",
  },
  devtool: "source-map",
  externals: {
    vscode: "commonjs vscode",
  },
  resolve: {
    mainFields: ["main"],
    extensions: [".ts", ".js", ".mjs"],
    alias: {},
    fallback: {},
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "ts-loader",
          },
        ],
      },
    ],
  },
};

/**@type {import('webpack').Configuration}*/
const webConfig = {
  mode: "none",
  target: "webworker",
  entry: { webExtension: "./src/extension.ts" },
  output: {
    path: path.resolve(__dirname, "out"),
    filename: "[name].js",
    libraryTarget: "commonjs",
  },
  devtool: "source-map",
  externals: {
    vscode: "commonjs vscode",
  },
  resolve: {
    mainFields: ["browser", "module", "main"],
    extensions: [".ts", ".js"],
    alias: {
      "@hapi/joi": path.join(__dirname, "./node_modules/@hapi/joi/lib/index.js"),
    },
    aliasFields: [],
    fallback: {
      url: require.resolve("url"),
      http: require.resolve("stream-http"),
      https: require.resolve("https-browserify"),
      util: require.resolve("util"),
      assert: require.resolve("assert"),
      stream: require.resolve("stream-browserify"),
      buffer: require.resolve("buffer"),
      zlib: require.resolve("browserify-zlib"),
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "ts-loader",
          },
        ],
      },
    ],
  },
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
    }),
    new webpack.ProvidePlugin({
      process: "process/browser",
    }),
  ],
};

module.exports = [config, webConfig];
