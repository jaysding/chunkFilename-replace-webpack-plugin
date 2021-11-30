# chunk-filename-replace-webpack-plugin

针对webpack4修改js和css的ChunkFilename名称，也可以修改动态导入的chunk名称(路径)，自定义你想修改的名字并输出到dist目录中。

⚠️ 这个插件是基于webpack4的 MainTemplate/ChunkTemplate实现，由于webpack5打包模板已经重构。MainTemplate/ChunkTemplate/ModuleTemplate 被废弃，所以本插件并不支持webpack5，而webpack5本身也不支持chunkFilename的修改，chunkFilename的修改都由插件实现(mini-css-extract-plugin已经支持webpack5中定制修改chunkFilename)

## 优势

 - 即使是webpack4，你也可以自定义的修改任意的chunkFilename(MiniCssExtractPlugin: 你们看我干啥?).
 - 对目标文件的修改，你可以用字符串来精准匹配，也可以用正则表达式来模糊匹配你想要修改的文件
 - 这个插件也可以对动态引入的chunk名称进行修改(修改runtime文件中异步引入src的路径)
 - 你仍然可以使用chunk文件的命名模版，例如：[contenthash], [chunkhash] 和 [name]等



## 开始使用

你需要安装 `chunkFilename-replace-webpack-plugin`并执行如下命令:

```
npm install chunk-filename-replace-webpack-plugin --save-dev
```



## 使用实例

**webpack.config.js**

```javascript
const ChunkFilenameReplaceWebpackPlugin = require('chunk-filename-replace-webpack-plugin');
module.exports = {
	// ...
	plugins: [
        new ChunkFilenameReplaceWebpackPlugin([{
            from: {
                css: 'marvo'
            }, // Match chunkName to marvo CSS file
            to: {
                css: 'css/[name].ironman.[contenthash:4].css'
            }, // modified into css/[name].ironman.[contenthash:4].css
        },
        {
            from: {
                css: 'spiderman',
                js: 'spiderman'
            }
            to: {
            	css: 'css/marvo.chunk.spiderman.css',
            	js: 'js/marvo.chunk.[chunkhash:6].spiderman.js'
        	}
        }])
	]
}
```



```
⚠️ ‘from’字段里填写的css或js必须是chunkId！(一般是代码分割时产生的[name])
```



## 插件配置项

#### 选项可以是对象也可以是对象数组: Object, Array\<Object>

如果选项是对象数组，那么可以修改多个chunk名称

| 名称 | 类型     | 默认                                   | 描述                                                         |
| ---- | -------- | -------------------------------------- | ------------------------------------------------------------ |
| from | {Object} | {css: String\|RegExp,<br />js: string} | 需要修改的目标chunkFilename，可以是字符串，也可以是正则表达式。字符串是精准匹配，正则表达式是模糊匹配. 匹配的目标是由Webpack分割代码生成的chunk文件，因此其实from选项匹配Webpack中的**chunkId** |
| to   | {Object} | {css: string,<br />js: string}         | 你想要修改的文件名称(路径)                                   |



## 使用场景

有时你的工程里使用了代码分割，你可能会抽出一些库文件或公共文件，比如从业务中抽离elementUI组件库的js文件和css文件，一般在后端/前端的模版里引入elementUI的js和css，所以你可能需要将elementUI的名称定制成'ElementUI.js' 和 'ElementUI.css '，当然，你可以在splitChunks.cacheGroups里修改分包的代码名称，但是这只能对js的chunk文件名称进行定制化的修改，css的chunk文件名称需要用到mini-extract-css-plugin来修改（例如：chunkFilename: css/[name].css），但是一般在业务中我们经常要更改业务代码的css，这样就需要在css的chunk中添加contenthash等字符，这样就不能实现ElementUI.css了，这是你不希望的。在webpack4中mini-extract-css-plugin不能同时满足两种chunkFilename，有了css/[name].css就不能用css/[name].[contenthash].css，所以你可以用本插件来实现两种甚至多种chunkFilename命名。

