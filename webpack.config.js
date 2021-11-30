const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const FilenameReplaceWebpackPlugin = require('./plugins/chunkFilename-replace-webpack-plugin.js');

module.exports = {
    mode: 'development',
	entry: {
		main: './src/index.js',
	},
	module: {
		rules: [{ 
			test: /\.js$/, 
			exclude: /node_modules/, 
			loader: 'babel-loader',
		},{
			test: /\.scss$/,
			use: [
				MiniCssExtractPlugin.loader, 
				{
					loader: 'css-loader',
					options: {
						importLoaders: 2
					}
				},
				'sass-loader'
			]
		}, {
			test: /\.css$/,
			use: [
				MiniCssExtractPlugin.loader,
				'css-loader'
			]
		}]
	},
	plugins: [
		new HtmlWebpackPlugin({
			template: 'src/index.html'
		}), 
		new CleanWebpackPlugin(),
        new MiniCssExtractPlugin({
			filename: 'css/[name].css',
			chunkFilename: 'css/[name].chunk.@@@@.[contenthash:4].css'
		}),
        new FilenameReplaceWebpackPlugin([
            {
                from: {
                    js: 'zhengxiStyle',
                    css: 'zhengxiStyle'
                },
                to: {
                    css: 'css/hahaha.css',
                    js: 'axi.[chunkhash:4].[contenthash:4].js'
                }
            }
        ])
	],
	optimization: {
        splitChunks: {
            cacheGroups: {
                zhengxiStyles: {
                    name: 'zhengxiStyle', 
                    test: (modules, chunks, entry = 'zhengxi') => {
                            return modules.type === 'css/mini-extract' && chunks.find(chunk => chunk.name === entry);
                        },
                    chunks: 'all',
                    enforce: true
                }
            }
        }
      },
	output: {
		filename: '[name].[hash:5].js',
		chunkFilename: '[name].chunk.[chunkhash:5].js',
		path: path.resolve(__dirname, 'dist')
	}
}