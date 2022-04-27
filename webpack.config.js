const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const fs = require("fs");

module.exports = {
  entry: fs
    .readdirSync(path.resolve(__dirname, "src"))
    .filter((dir) =>
      fs.statSync(path.join(__dirname, `src/${dir}`)).isDirectory()
    )
    .filter((dir) => fs.existsSync(path.join(__dirname, `src/${dir}/index.tsx`)))
    .reduce((accumulator, key) => {
      accumulator[key] = path.join(__dirname, `src/${key}/index.tsx`);
      return accumulator;
    }, {}),
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "build"),
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: "babel-loader",
      },
      {
        test: /\.(ts|tsx)$/,
        loader: "ts-loader",
      },
      {
        test: /\.(css|less)$/,
        use: ["css-loader", 'less-loader'],
      },
      {
        test: /\.(png|jpg|svg)$/,
        loader: "file-loader",
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    ...fs
      .readdirSync(path.join(__dirname, "src"))
      .filter((elem) =>
        fs.statSync(path.join(__dirname, `src/${elem}`)).isDirectory()
      )
      .map(function (item) {
        return new HtmlWebpackPlugin({
          template: path.join(__dirname, "public/index.html"),
          favicon: path.join(__dirname, "public/favicon.ico"),
          chunks: [item],
          title: item,
          filename: `${item}.html`
        });
      }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
    extensions: [".js", ".ts", ".tsx"],
  },
};