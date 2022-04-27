const { merge } = require("webpack-merge");
const config = require("./webpack.config");

module.exports = merge(config, {
  mode: "development",
  devServer: {
    port: 9200,
    open: true,
    hot: true
  },
  devtool: "eval-nosources-cheap-module-source-map",
  performance: {
    hints: false
  }
});