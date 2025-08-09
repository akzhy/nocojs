const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  entry: "./src/index.ts",
  mode: "development",
  devtool: "source-map",

  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].[contenthash].js",
    clean: true,
  },

  resolve: {
    extensions: [".ts", ".js"],
  },

  module: {
    rules: [
      {
        test: /\.(ts|js)$/,
        exclude: /node_modules/,
        use: [
          "ts-loader",
          {
            loader: "@nocojs/webpack-loader",
            options: {
              publicDir: "public",
              cacheFileDir: ".nocojs",
              logLevel: "verbose",
              placeholderType: "blurred",
            },
          },
        ],
      },
    ],
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: "./public/index.html",
    }),
  ],

  devServer: {
    static: {
      directory: path.join(__dirname, "public"),
    },
    port: 3000,
    open: true,
    hot: true,
  },
};
