const { DefinePlugin } = require('webpack');
const path = require('path');
require('dotenv').config({ path: './.env' });

const HtmlWebpackPlugin = require("html-webpack-plugin");
module.exports = {
  output: {
    path: path.join(__dirname, "/dist"), // the bundle output path
    filename: "bundle.js", // the name of the bundle
  },
  watchOptions: {
    ignored: /node_modules/,
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "src/index.html", // to import index.html file inside index.js
    }),
    new DefinePlugin({
      "process.env": JSON.stringify(process.env),
    }),
  ],
  devServer: {
    port: 3030, // you can change the port
    // proxy: {
    //   '/api': {
    //     target: 'http://localhost:3133',
    //   },
    //   '/ws': {
    //     target: 'ws://localhost:3133',
    //     ws: true
    //   },
    // }
    proxy: [
      {
        context: ['/api'],
        target: 'http://localhost:3133',
      },
      {
        context: ['/progress'],
        target: 'ws://localhost:3133',
        ws: true
      },
    ]
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/, // .js and .jsx files
        exclude: /node_modules/, // excluding the node_modules folder
        use: {
          loader: "babel-loader",
        },
      },
      {
        test: /\.(sa|sc|c)ss$/, // styles files
        use: ["style-loader", "css-loader", "sass-loader"],
      },
      {
        test: /\.(png|woff|woff2|eot|ttf|svg)$/, // to import images and fonts
        loader: "url-loader",
        options: { limit: false },
      },
    ],
  },
};