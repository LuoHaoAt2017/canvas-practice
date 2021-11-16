const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");

function resolve(src) {
  return path.resolve(__dirname, src);
}

module.exports = {
  mode: "development",
  entry: resolve("src/index.ts"),
  output: {
    filename: "[name].bundle.js",
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: ['babel-loader'],
      },
      {
        test: /\.ts$/,
        use: ['ts-loader'],
      },
      {
        test: /\.(png|jpg|svg)$/,
        loader: "file-loader",
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      filename: "index.html",
      template: resolve("public/index.html"),
    }),
  ],
  resolve: {
    alias: {
      "@": resolve("src"),
    },
    extensions: [".ts", ".js", ".json"],
  },
  externals: {
  },
  devServer: {
    port: 9200,
  },
};